import { execSync } from 'child_process';
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
    await app.close();
  });

  it('POST /api/orders returns 401 without a token', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .send({ items: [{ productId: coffeeId, qty: 1 }] })
      .expect(401);
  });

  it('POST /api/orders returns 201 with PENDING status and server-computed total', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
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

  it('POST /api/orders does not decrement stock', async () => {
    const before = await prisma.product.findUniqueOrThrow({ where: { id: pastryId } });
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: pastryId, qty: 1 }] })
      .expect(201);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: pastryId } });
    expect(after.stock).toBe(before.stock);
  });

  it('POST /api/orders returns 400 for empty items', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [] })
      .expect(400);
  });

  it('POST /api/orders returns 400 for qty 0', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: coffeeId, qty: 0 }] })
      .expect(400);
  });

  it('POST /api/orders returns 400 for invalid size', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: coffeeId, size: 'XXL', qty: 1 }] })
      .expect(400);
  });

  it('POST /api/orders returns 400 for oversized toppingIds', () => {
    const toppingIds = Array.from({ length: 11 }, (_, i) => `t${i}`);
    return request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: coffeeId, toppingIds, qty: 1 }] })
      .expect(400);
  });

  it('POST /api/orders returns 400 for unknown fields', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: coffeeId, qty: 1 }], total: 1 })
      .expect(400);
  });

  it('POST /api/orders returns 404 for unknown product', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: 'unknown-id', qty: 1 }] })
      .expect(404);
  });
});
