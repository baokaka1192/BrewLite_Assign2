import { OrderStatus } from '@prisma/client';
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
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

const BACKEND_DIR = path.resolve(__dirname, '..');
/** Fresh Idempotency-Key per request so tests do not replay each other. */
const newKey = () => `key-${randomUUID()}`;
const STAFF_KEY = 'orders-e2e-staff-key';
const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://brewlite:brewlite@localhost:5432/brewlite_test';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;
  let coffeeId: string;
  let coffeePrice: number;
  let mediumSize: number;
  let toppingId: string;
  let toppingPrice: number;
  let pastryId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.STAFF_API_KEY = STAFF_KEY;
    const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
    execSync('npx prisma migrate deploy', { cwd: BACKEND_DIR, env, stdio: 'inherit' });
    execSync('npx prisma db seed', { cwd: BACKEND_DIR, env, stdio: 'inherit' });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] }), PrismaModule, AuthModule, OrdersModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Each run registers a fresh customer and orders as that user.
    const registered = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `orders-e2e-${Date.now()}@example.com`, password: 'orders-password' })
      .expect(201);
    token = registered.body.accessToken;
    userId = registered.body.user.id;

    const coffee = await prisma.product.findFirstOrThrow({
      where: { category: 'coffee', available: true, stock: { gte: 2 } },
    });
    coffeeId = coffee.id;
    coffeePrice = coffee.price;
    mediumSize = (coffee.sizes as { code: string; delta: number }[]).find((s) => s.code === 'M')!.delta;
    const topping = (coffee.toppings as { id: string; price: number }[])[0];
    toppingId = topping.id;
    toppingPrice = topping.price;

    const pastry = await prisma.product.findFirstOrThrow({
      where: { category: 'pastry', available: true, stock: { gte: 2 } },
    });
    pastryId = pastry.id;
  }, 120_000);

  afterAll(async () => {
    delete process.env.STAFF_API_KEY;
    await app.close();
  });

  it('POST /api/orders returns 401 without a token', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .set('Idempotency-Key', newKey())
      .send({ items: [{ productId: coffeeId, qty: 1 }] })
      .expect(401);
  });

  it('POST /api/orders returns 201 with PENDING status and server-computed total', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: coffeeId, size: 'M', toppingIds: [toppingId], qty: 2 }],
        note: 'ít đá',
      })
      .expect(201);

    const expectedTotal = (coffeePrice + mediumSize + toppingPrice) * 2;
    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        status: 'PENDING',
        total: expectedTotal,
        createdAt: expect.any(String),
      }),
    );
    expect(res.body.items[0]).toEqual(
      expect.objectContaining({ productId: coffeeId, size: 'M', qty: 2, lineTotal: expectedTotal }),
    );

    const stored = await prisma.order.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(stored.total).toBe(expectedTotal);
    expect(stored.userId).toBe(userId);
    expect(stored.note).toBe('ít đá');
  });

  it('POST /api/orders reserves stock (decrements by qty)', async () => {
    const before = await prisma.product.findUniqueOrThrow({ where: { id: pastryId } });
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: pastryId, qty: 1 }] })
      .expect(201);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: pastryId } });
    expect(after.stock).toBe(before.stock - 1);
    expect(after.version).toBe(before.version + 1);
  });

  it('POST /api/orders returns 400 for empty items', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [] })
      .expect(400);
  });

  it('POST /api/orders returns 400 for qty 0', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: coffeeId, qty: 0 }] })
      .expect(400);
  });

  it('POST /api/orders returns 400 for invalid size', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: coffeeId, size: 'XXL', qty: 1 }] })
      .expect(400);
  });

  it('POST /api/orders returns 400 for oversized toppingIds', () => {
    const toppingIds = Array.from({ length: 11 }, (_, i) => `t${i}`);
    return request(app.getHttpServer())
      .post('/api/orders')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: coffeeId, toppingIds, qty: 1 }] })
      .expect(400);
  });

  it('POST /api/orders returns 400 for unknown fields', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: coffeeId, qty: 1 }], total: 1 })
      .expect(400);
  });

  it('POST /api/orders returns 404 for unknown product', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .set('Idempotency-Key', newKey())
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: 'unknown-id', qty: 1 }] })
      .expect(404);
  });

  describe('order history (GET /api/orders/me, GET /api/orders/:id)', () => {
    let otherToken: string;
    let olderOrderId: string;
    let newerOrderId: string;
    let foreignOrderId: string;

    const placeOrder = (accessToken: string) =>
      request(app.getHttpServer())
        .post('/api/orders')
        .set('Idempotency-Key', newKey())
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ items: [{ productId: pastryId, qty: 1 }] })
        .expect(201);

    beforeAll(async () => {
      const other = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: `orders-other-${Date.now()}@example.com`, password: 'orders-password' })
        .expect(201);
      otherToken = other.body.accessToken;

      olderOrderId = (await placeOrder(token)).body.id;
      newerOrderId = (await placeOrder(token)).body.id;
      foreignOrderId = (await placeOrder(otherToken)).body.id;

      await prisma.order.update({
        where: { id: olderOrderId },
        data: { createdAt: new Date('2026-01-01T00:00:00Z') },
      });
      await prisma.order.update({
        where: { id: newerOrderId },
        data: { createdAt: new Date('2026-01-02T00:00:00Z') },
      });

      // Two payments on the newer order: the latest one (FAILED) must be reported.
      await prisma.payment.create({
        data: {
          orderId: newerOrderId,
          idempotencyKey: `orders-e2e-${Date.now()}-a`,
          amount: 1,
          method: 'WALLET',
          status: 'SUCCESS',
          createdAt: new Date('2026-01-02T01:00:00Z'),
        },
      });
      await prisma.payment.create({
        data: {
          orderId: newerOrderId,
          idempotencyKey: `orders-e2e-${Date.now()}-b`,
          amount: 1,
          method: 'CARD',
          status: 'FAILED',
          createdAt: new Date('2026-01-02T02:00:00Z'),
        },
      });
    }, 60_000);

    it('GET /api/orders/me returns 401 without a token', () => {
      return request(app.getHttpServer()).get('/api/orders/me').expect(401);
    });

    it('GET /api/orders/:id returns 401 without a token', () => {
      return request(app.getHttpServer()).get(`/api/orders/${olderOrderId}`).expect(401);
    });

    it('GET /api/orders/me lists only the caller orders, newest first', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/orders/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ownCount = await prisma.order.count({ where: { userId } });
      expect(res.body.total).toBe(ownCount);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);

      const ids: string[] = res.body.items.map((o: { id: string }) => o.id);
      expect(ids).not.toContain(foreignOrderId);
      expect(ids.indexOf(newerOrderId)).toBeLessThan(ids.indexOf(olderOrderId));

      const times: number[] = res.body.items.map((o: { createdAt: string }) =>
        new Date(o.createdAt).getTime(),
      );
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeLessThanOrEqual(times[i - 1]);
      }
    });

    it('GET /api/orders/me returns the order shape with items and latest payment status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/orders/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const order = res.body.items.find((o: { id: string }) => o.id === newerOrderId);
      expect(order).toEqual(
        expect.objectContaining({
          status: 'PENDING',
          total: expect.any(Number),
          createdAt: '2026-01-02T00:00:00.000Z',
          latestPaymentStatus: 'FAILED',
        }),
      );
      expect(order.items[0]).toEqual({
        productName: expect.any(String),
        size: '',
        toppings: [],
        qty: 1,
        lineTotal: expect.any(Number),
      });
    });

    it('GET /api/orders/me paginates with page and limit', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/orders/me?page=2&limit=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(1);
    });

    it('GET /api/orders/me returns 400 for limit above 50 or invalid paging', async () => {
      for (const qs of ['limit=51', 'limit=0', 'page=0', 'limit=abc']) {
        await request(app.getHttpServer())
          .get(`/api/orders/me?${qs}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      }
    });

    it('GET /api/orders/me returns an empty page for a user without orders', async () => {
      const fresh = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: `orders-empty-${Date.now()}@example.com`, password: 'orders-password' })
        .expect(201);
      const res = await request(app.getHttpServer())
        .get('/api/orders/me')
        .set('Authorization', `Bearer ${fresh.body.accessToken}`)
        .expect(200);
      expect(res.body).toEqual({ items: [], page: 1, limit: 20, total: 0 });
    });

    it('GET /api/orders/:id returns the owner order', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/orders/${newerOrderId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body).toEqual(
        expect.objectContaining({ id: newerOrderId, latestPaymentStatus: 'FAILED' }),
      );
    });

    it('GET /api/orders/:id returns 404 for another user order', () => {
      return request(app.getHttpServer())
        .get(`/api/orders/${foreignOrderId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('GET /api/orders/:id returns 404 (not 500) for malformed ids', async () => {
      for (const id of ['%27%20OR%201%3D1', 'a'.repeat(300), '%00', '..']) {
        await request(app.getHttpServer())
          .get(`/api/orders/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      }
    });

    it('GET /api/orders/:id returns 404 for an unknown id', () => {
      return request(app.getHttpServer())
        .get('/api/orders/does-not-exist')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('order state machine (e2e)', () => {
    let stateToken: string;
    let stateOtherToken: string;

    const cartBody = () => ({ items: [{ productId: coffeeId, qty: 1 }] });
    const postOrder = (accessToken: string, key: string, body: object = cartBody()) =>
      request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', key)
        .send(body);
    const createOrder = async (accessToken = stateToken) =>
      (await postOrder(accessToken, newKey()).expect(201)).body as { id: string };
    const advance = (orderId: string, status: string, staffKey = STAFF_KEY) =>
      request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set('X-Staff-Key', staffKey)
        .send({ status });
    const cancel = (orderId: string, accessToken = stateToken) =>
      request(app.getHttpServer())
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`);
    const setStatus = (orderId: string, status: OrderStatus) =>
      prisma.order.update({ where: { id: orderId }, data: { status } });

    beforeAll(async () => {
      const a = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: `orders-state-${Date.now()}@example.com`, password: 'orders-password' })
        .expect(201);
      stateToken = a.body.accessToken;
      const b = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: `orders-state-other-${Date.now()}@example.com`, password: 'orders-password' })
        .expect(201);
      stateOtherToken = b.body.accessToken;
    });

    it('blocks PENDING -> PREPARING through the status endpoint with 409', async () => {
      const order = await createOrder();
      const res = await advance(order.id, 'PREPARING').expect(409);
      expect(res.body.message).toContain('PENDING -> PREPARING');
      const stored = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(stored.status).toBe('PENDING');
    });

    it('COMPLETED is terminal: every status change and cancel answer 409', async () => {
      const order = await createOrder();
      await setStatus(order.id, 'COMPLETED');
      for (const status of ['PREPARING', 'READY', 'COMPLETED']) {
        await advance(order.id, status).expect(409);
      }
      await cancel(order.id).expect(409);
    });

    it('CANCELLED is terminal: no staff advancement and no second cancel', async () => {
      const order = await createOrder();
      await cancel(order.id).expect(200);
      await advance(order.id, 'PREPARING').expect(409);
      await cancel(order.id).expect(409);
    });

    it('staff advances PAID -> PREPARING -> READY -> COMPLETED', async () => {
      const order = await createOrder();
      await setStatus(order.id, 'PAID');
      for (const status of ['PREPARING', 'READY', 'COMPLETED']) {
        const res = await advance(order.id, status).expect(200);
        expect(res.body.status).toBe(status);
      }
    });

    it('the status endpoint refuses PAID and CANCELLED targets (400)', async () => {
      const order = await createOrder();
      await advance(order.id, 'PAID').expect(400);
      await advance(order.id, 'CANCELLED').expect(400);
    });

    it('the status endpoint answers 403 without or with a wrong X-Staff-Key, and 404 when STAFF_API_KEY is unset', async () => {
      const order = await createOrder();
      await request(app.getHttpServer()).patch(`/api/orders/${order.id}/status`).send({ status: 'PREPARING' }).expect(403);
      await advance(order.id, 'PREPARING', 'wrong-key').expect(403);

      const saved = process.env.STAFF_API_KEY;
      delete process.env.STAFF_API_KEY;
      try {
        await advance(order.id, 'PREPARING').expect(404);
      } finally {
        process.env.STAFF_API_KEY = saved;
      }
    });

    it('owner cancels PENDING and PAID orders; the other user gets 404', async () => {
      const pending = await createOrder();
      await cancel(pending.id, stateOtherToken).expect(404);
      const res = await cancel(pending.id).expect(200);
      expect(res.body.status).toBe('CANCELLED');

      const paid = await createOrder();
      await setStatus(paid.id, 'PAID');
      await cancel(paid.id).expect(200);
    });

    it('cancel is blocked from READY (409)', async () => {
      const order = await createOrder();
      await setStatus(order.id, 'READY');
      await cancel(order.id).expect(409);
    });
  });

  describe('Idempotency-Key on POST /api/orders', () => {
    let idemToken: string;
    let idemUserId: string;

    const cartBody = () => ({ items: [{ productId: coffeeId, qty: 1 }] });
    const postOrder = (accessToken: string, key: string, body: object = cartBody()) =>
      request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', key)
        .send(body);

    beforeAll(async () => {
      const reg = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: `orders-idem-${Date.now()}@example.com`, password: 'orders-password' })
        .expect(201);
      idemToken = reg.body.accessToken;
      idemUserId = reg.body.user.id;
    });

    it('the same key twice creates ONE order: same id, second 200 with Idempotency-Replayed', async () => {
      const key = newKey();
      const first = await postOrder(idemToken, key).expect(201);
      const second = await postOrder(idemToken, key).expect(200);

      expect(second.headers['idempotency-replayed']).toBe('true');
      expect(second.body.id).toBe(first.body.id);
      expect(second.body.total).toBe(first.body.total);
      expect(first.headers['idempotency-replayed']).toBeUndefined();
      expect(await prisma.order.count({ where: { userId: idemUserId } })).toBe(1);
    });

    it('five concurrent identical requests create exactly one order', async () => {
      const key = newKey();
      const results = await Promise.all([1, 2, 3, 4, 5].map(() => postOrder(idemToken, key)));

      expect(results.map((r) => r.status).filter((c) => c === 201)).toHaveLength(1);
      expect(results.map((r) => r.status).filter((c) => c === 200)).toHaveLength(4);
      expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
      expect(await prisma.order.count({ where: { idempotencyKey: key } })).toBe(1);
    });

    it('the same key with a different body returns 422 and creates nothing', async () => {
      const key = newKey();
      await postOrder(idemToken, key).expect(201);
      await postOrder(idemToken, key, { items: [{ productId: pastryId, qty: 1 }] }).expect(422);

      expect(await prisma.order.count({ where: { idempotencyKey: key } })).toBe(1);
    });

    it('the same key used by another user creates that user its own order', async () => {
      const key = newKey();
      const mine = await postOrder(idemToken, key).expect(201);
      const other = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: `orders-idem-other-${Date.now()}@example.com`, password: 'orders-password' })
        .expect(201);
      const theirs = await postOrder(other.body.accessToken, key).expect(201);

      expect(theirs.body.id).not.toBe(mine.body.id);
    });

    it('returns 400 when the Idempotency-Key header is missing or malformed', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${idemToken}`)
        .send(cartBody())
        .expect(400);
      await postOrder(idemToken, 'short').expect(400);
    });
  });
});
