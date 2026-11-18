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
const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://brewlite:brewlite@localhost:5432/brewlite_test';
const STAFF_KEY = 'orders-stock-e2e-staff-key';
const newKey = () => `key-${randomUUID()}`;

/**
 * Stock concurrency. Uses its own products (category "stock-e2e") so the seeded catalogue and the
 * other e2e files, which may reseed in parallel, never touch these rows.
 */
describe('Orders stock reservation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  const suffix = randomUUID().slice(0, 8);
  // Ids are sorted: "a" is locked before "b", so a failing "b" line runs after "a" was already reserved.
  const idA = `stock-e2e-a-${suffix}`;
  const idB = `stock-e2e-b-${suffix}`;

  const productRow = (id: string, stock: number) => ({
    id,
    name: `Stock ${id}`,
    description: 'stock e2e product',
    category: 'stock-e2e',
    price: 10000,
    imageUrl: 'https://example.com/x.png',
    stock,
    available: true,
    sizes: [],
    toppings: [],
  });

  const placeOrder = (items: { productId: string; qty: number }[], key = newKey()) =>
    request(app.getHttpServer())
      .post('/api/orders')
      .set('Idempotency-Key', key)
      .set('Authorization', `Bearer ${token}`)
      .send({ items });

  const stockOf = async (id: string) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.STAFF_API_KEY = STAFF_KEY;
    const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
    execSync('npx prisma migrate deploy', { cwd: BACKEND_DIR, env, stdio: 'inherit' });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] }), PrismaModule, AuthModule, OrdersModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.product.createMany({ data: [productRow(idA, 5), productRow(idB, 1)] });

    const registered = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `stock-e2e-${suffix}@example.com`, password: 'stock-password' })
      .expect(201);
    token = registered.body.accessToken;
  }, 120_000);

  afterAll(async () => {
    // Order items cascade with their order; these test orders have no payments.
    await prisma.order.deleteMany({ where: { items: { some: { productId: { in: [idA, idB] } } } } });
    await prisma.product.deleteMany({ where: { id: { in: [idA, idB] } } });
    delete process.env.STAFF_API_KEY;
    await app.close();
  });

  it('20 concurrent orders for 5 units: exactly 5 succeed, 15 get 409, stock ends at 0', async () => {
    await prisma.product.update({ where: { id: idA }, data: { stock: 5, version: 0, available: true } });
    // Same user, different keys: each request is a distinct order.
    const responses = await Promise.all(
      Array.from({ length: 20 }, () => placeOrder([{ productId: idA, qty: 1 }])),
    );

    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(5);
    expect(statuses.filter((s) => s === 409)).toHaveLength(15);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: idA } });
    expect(product.stock).toBe(0);
    expect(product.available).toBe(false);

    const sold = await prisma.orderItem.aggregate({
      where: { productId: idA, order: { status: 'PENDING' } },
      _sum: { qty: true },
    });
    expect(sold._sum.qty).toBe(5);
  }, 60_000);

  it('a multi-line order for one product reserves the summed qty', async () => {
    await prisma.product.update({ where: { id: idA }, data: { stock: 5, version: 0, available: true } });

    await placeOrder([
      { productId: idA, qty: 1 },
      { productId: idA, qty: 2 },
    ]).expect(201);

    expect(await stockOf(idA)).toBe(2);
  });

  it('a failing second product rolls back the first product reservation', async () => {
    await prisma.product.update({ where: { id: idA }, data: { stock: 5, version: 0, available: true } });
    await prisma.product.update({ where: { id: idB }, data: { stock: 1, version: 0, available: true } });

    await placeOrder([
      { productId: idA, qty: 2 },
      { productId: idB, qty: 2 },
    ]).expect(409);

    expect(await stockOf(idA)).toBe(5);
    expect(await stockOf(idB)).toBe(1);
    // No order row survives the failed request, so none may reference idB.
    expect(await prisma.order.count({ where: { items: { some: { productId: idB } } } })).toBe(0);
  });

  it('cancelling an order restores its stock exactly once', async () => {
    await prisma.product.update({ where: { id: idA }, data: { stock: 5, version: 0, available: true } });
    const created = await placeOrder([{ productId: idA, qty: 3 }]).expect(201);
    expect(await stockOf(idA)).toBe(2);

    await request(app.getHttpServer())
      .post(`/api/orders/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(await stockOf(idA)).toBe(5);

    await request(app.getHttpServer())
      .post(`/api/orders/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
    expect(await stockOf(idA)).toBe(5);
  });

  it('replaying the same Idempotency-Key does not decrement stock a second time', async () => {
    await prisma.product.update({ where: { id: idA }, data: { stock: 5, version: 0, available: true } });
    const key = newKey();

    const first = await placeOrder([{ productId: idA, qty: 2 }], key).expect(201);
    const replay = await placeOrder([{ productId: idA, qty: 2 }], key).expect(200);

    expect(replay.body.id).toBe(first.body.id);
    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(await stockOf(idA)).toBe(3);
  });
});
