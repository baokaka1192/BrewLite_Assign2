import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import configuration from '../src/config/configuration';
import { AuthModule } from '../src/modules/auth/auth.module';
import { OrdersModule } from '../src/modules/orders/orders.module';
import { PaymentsModule } from '../src/modules/payments/payments.module';
import { MockPaymentGateway } from '../src/modules/payments/mock-payment.gateway';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

const BACKEND_DIR = path.resolve(__dirname, '..');
/** Fresh Idempotency-Key per request so tests do not replay each other. */
const newKey = () => `key-${randomUUID()}`;
const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://brewlite:brewlite@localhost:5432/brewlite_test';

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let otherToken: string;
  let coffeeId: string;

  const createOrder = async (accessToken = token) => {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ items: [{ productId: coffeeId, qty: 1 }] })
      .expect(201);
    return res.body as { id: string; total: number; status: string };
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
    execSync('npx prisma migrate deploy', { cwd: BACKEND_DIR, env, stdio: 'inherit' });
    execSync('npx prisma db seed', { cwd: BACKEND_DIR, env, stdio: 'inherit' });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        PrismaModule,
        AuthModule,
        OrdersModule,
        PaymentsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    const registered = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `payments-e2e-${Date.now()}@example.com`, password: 'payments-password' })
      .expect(201);
    token = registered.body.accessToken;

    const other = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `payments-other-${Date.now()}@example.com`, password: 'payments-password' })
      .expect(201);
    otherToken = other.body.accessToken;

    const coffee = await prisma.product.findFirstOrThrow({
      where: { category: 'coffee', available: true, stock: { gte: 1 } },
    });
    coffeeId = coffee.id;
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/payments returns 401 without a token', async () => {
    const order = await createOrder();
    await request(app.getHttpServer())
      .post('/api/payments')
      .set('Idempotency-Key', newKey())
      .send({ orderId: order.id, method: 'WALLET' })
      .expect(401);
  });

  it('POST /api/payments returns 400 for an unknown method', async () => {
    const order = await createOrder();
    await request(app.getHttpServer())
      .post('/api/payments')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, method: 'CASH' })
      .expect(400);
  });

  it('WALLET payment returns 201 and marks the order PAID', async () => {
    const order = await createOrder();
    const res = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, method: 'WALLET' })
      .expect(201);

    expect(res.body.payment).toEqual(expect.objectContaining({ status: 'SUCCESS', amount: order.total }));
    expect(res.body.order).toEqual({ id: order.id, status: 'PAID' });

    const stored = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(stored.status).toBe('PAID');
  });

  it('card ending in 0000 returns 402 and marks the order PAYMENT_FAILED', async () => {
    const order = await createOrder();
    const res = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, method: 'CARD', cardNumber: '4111111111110000' })
      .expect(402);

    expect(res.body).toEqual(
      expect.objectContaining({ reason: 'Card declined', order: { id: order.id, status: 'PAYMENT_FAILED' } }),
    );
    expect(JSON.stringify(res.body)).not.toContain('4111111111110000');

    const stored = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(stored.status).toBe('PAYMENT_FAILED');
    const payments = await prisma.payment.findMany({ where: { orderId: order.id } });
    expect(payments.map((p) => p.status)).toEqual(['FAILED']);
  });

  it('retry after a failed payment succeeds', async () => {
    const order = await createOrder();
    await request(app.getHttpServer())
      .post('/api/payments')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, method: 'CARD', cardNumber: '4111111111110000' })
      .expect(402);

    await request(app.getHttpServer())
      .post('/api/payments')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, method: 'WALLET' })
      .expect(201);

    const stored = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(stored.status).toBe('PAID');
  });

  it('paying an already PAID order returns 409', async () => {
    const order = await createOrder();
    await request(app.getHttpServer())
      .post('/api/payments')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, method: 'WALLET' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/payments')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, method: 'WALLET' })
      .expect(409);
  });

  it("paying another user's order returns 404", async () => {
    const order = await createOrder(otherToken);
    await request(app.getHttpServer())
      .post('/api/payments')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, method: 'WALLET' })
      .expect(404);

    const stored = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(stored.status).toBe('PENDING');
  });

  it('two concurrent pays on one order: one succeeds, one gets 409, one Payment row', async () => {
    const order = await createOrder();
    const pay = () =>
      request(app.getHttpServer())
        .post('/api/payments')
        .set('Idempotency-Key', newKey())
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order.id, method: 'WALLET' });

    const [a, b] = await Promise.all([pay(), pay()]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);

    const payments = await prisma.payment.findMany({ where: { orderId: order.id } });
    expect(payments).toHaveLength(1);
  });

  it('five concurrent pays on one order: exactly one charge, four 409, one non-PROCESSING Payment row', async () => {
    const order = await createOrder();
    const pay = () =>
      request(app.getHttpServer())
        .post('/api/payments')
        .set('Idempotency-Key', newKey())
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order.id, method: 'WALLET' });

    const results = await Promise.all([pay(), pay(), pay(), pay(), pay()]);
    const codes = results.map((r) => r.status).sort();
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(4);

    const payments = await prisma.payment.findMany({ where: { orderId: order.id } });
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe('SUCCESS');
  });

  it('same Idempotency-Key on another order returns 422 and pays nothing', async () => {
    const key = newKey();
    const first = await createOrder();
    const second = await createOrder();
    await request(app.getHttpServer())
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ orderId: first.id, method: 'WALLET' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ orderId: second.id, method: 'WALLET' })
      .expect(422);

    const stored = await prisma.order.findUniqueOrThrow({ where: { id: second.id } });
    expect(stored.status).toBe('PENDING');
  });

  describe('Idempotency-Key replay', () => {
    const payWith = (accessToken: string, key: string, body: Record<string, unknown>) =>
      request(app.getHttpServer())
        .post('/api/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', key)
        .send(body);

    it('returns 400 when the Idempotency-Key header is missing', async () => {
      const order = await createOrder();
      await request(app.getHttpServer())
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order.id, method: 'WALLET' })
        .expect(400);
    });

    it('returns 400 for a malformed Idempotency-Key', async () => {
      const order = await createOrder();
      await payWith(token, 'short', { orderId: order.id, method: 'WALLET' }).expect(400);
      await payWith(token, 'bad key with spaces!', { orderId: order.id, method: 'WALLET' }).expect(400);
    });

    it('same key twice: one Payment row, order paid once, second call replays without a gateway call', async () => {
      const order = await createOrder();
      const gateway = app.get(MockPaymentGateway);
      const spy = jest.spyOn(gateway, 'charge');
      const key = newKey();

      const first = await payWith(token, key, { orderId: order.id, method: 'WALLET' }).expect(201);
      const second = await payWith(token, key, { orderId: order.id, method: 'WALLET' }).expect(200);

      expect(second.headers['idempotency-replayed']).toBe('true');
      expect(second.body.payment.id).toBe(first.body.payment.id);
      expect(second.body.order).toEqual({ id: order.id, status: 'PAID' });
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();

      const payments = await prisma.payment.findMany({ where: { orderId: order.id } });
      expect(payments).toHaveLength(1);
      const stored = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(stored.status).toBe('PAID');
    });

    it('replays a stored decline as the same 402 body without charging again', async () => {
      const order = await createOrder();
      const gateway = app.get(MockPaymentGateway);
      const spy = jest.spyOn(gateway, 'charge');
      const key = newKey();
      const body = { orderId: order.id, method: 'CARD', cardNumber: '4111111111110000' };

      await payWith(token, key, body).expect(402);
      const replay = await payWith(token, key, body).expect(402);

      expect(replay.body).toEqual(expect.objectContaining({ reason: 'Card declined', order: { id: order.id, status: 'PAYMENT_FAILED' } }));
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
      const payments = await prisma.payment.findMany({ where: { orderId: order.id } });
      expect(payments).toHaveLength(1);
    });

    it('same key with a different body returns 422 and does not charge', async () => {
      const order = await createOrder();
      const gateway = app.get(MockPaymentGateway);
      const spy = jest.spyOn(gateway, 'charge');
      const key = newKey();

      await payWith(token, key, { orderId: order.id, method: 'WALLET' }).expect(201);
      await payWith(token, key, { orderId: order.id, method: 'CARD', cardNumber: '4111111111111111' }).expect(422);

      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });

    it("another user's Idempotency-Key answers 409 without revealing the order", async () => {
      const order = await createOrder();
      const key = newKey();
      await payWith(token, key, { orderId: order.id, method: 'WALLET' }).expect(201);

      const other = await createOrder(otherToken);
      const res = await payWith(otherToken, key, { orderId: other.id, method: 'WALLET' }).expect(409);
      expect(JSON.stringify(res.body)).not.toContain(order.id);
    });

    it('a PROCESSING row older than 2 minutes is reaped (FAILED) and the payment proceeds', async () => {
      const order = await createOrder();
      const stale = await prisma.payment.create({
        data: {
          orderId: order.id,
          idempotencyKey: `stale-${randomUUID()}`,
          amount: order.total,
          method: 'WALLET',
          status: 'PROCESSING',
          createdAt: new Date(Date.now() - 5 * 60_000),
        },
      });

      const res = await payWith(token, newKey(), { orderId: order.id, method: 'WALLET' }).expect(201);

      expect(res.body.order).toEqual({ id: order.id, status: 'PAID' });
      const reaped = await prisma.payment.findUniqueOrThrow({ where: { id: stale.id } });
      expect(reaped.status).toBe('FAILED');
    });
  });
});
