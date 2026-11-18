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
import { OrdersService } from '../src/modules/orders/orders.service';
import { PaymentsModule } from '../src/modules/payments/payments.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

const BACKEND_DIR = path.resolve(__dirname, '..');
const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://brewlite:brewlite@localhost:5432/brewlite_test';
const newKey = () => `key-${randomUUID()}`;

/**
 * Vouchers and loyalty. Uses its own product (category "voucher-e2e") and vouchers with a per-run suffix
 * so parallel e2e files never see these rows. BREW10 and WELCOME20K are upserted with the seed rules.
 */
describe('Vouchers and loyalty (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const productId = `voucher-e2e-${suffix.toLowerCase()}`;
  const cheapId = `${productId}-cheap`;
  const limitCode = `LIMIT1-${suffix}`;
  const expiredCode = `EXPIRED5-${suffix}`;

  /** Each test registers its own user so loyalty balances and order lists stay isolated. */
  async function registerUser(): Promise<{ token: string; id: string }> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `voucher-e2e-${randomUUID()}@example.com`, password: 'voucher-password' })
      .expect(201);
    return { token: res.body.accessToken, id: res.body.user.id };
  }

  const quote = (token: string, items: { productId: string; qty: number }[], voucherCode?: string) =>
    request(app.getHttpServer())
      .post('/api/orders/quote')
      .set('Authorization', `Bearer ${token}`)
      .send({ items, ...(voucherCode !== undefined ? { voucherCode } : {}) });

  const placeOrder = (
    token: string,
    items: { productId: string; qty: number }[],
    voucherCode?: string,
    key = newKey(),
  ) =>
    request(app.getHttpServer())
      .post('/api/orders')
      .set('Idempotency-Key', key)
      .set('Authorization', `Bearer ${token}`)
      .send({ items, ...(voucherCode !== undefined ? { voucherCode } : {}) });

  const pay = (token: string, orderId: string, body: { method: 'WALLET' | 'CARD'; cardNumber?: string }, key = newKey()) =>
    request(app.getHttpServer())
      .post('/api/payments')
      .set('Idempotency-Key', key)
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, ...body });

  const cancel = (token: string, orderId: string) =>
    request(app.getHttpServer()).post(`/api/orders/${orderId}/cancel`).set('Authorization', `Bearer ${token}`);

  const voucherUses = async (code: string) =>
    (await prisma.voucher.findUniqueOrThrow({ where: { code } })).usedCount;

  const loyaltyOf = async (userId: string) =>
    (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).loyaltyPoints;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
    execSync('npx prisma migrate deploy', { cwd: BACKEND_DIR, env, stdio: 'inherit' });

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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const productRow = (id: string, price: number) => ({
      id,
      name: `Voucher ${id}`,
      description: 'voucher e2e product',
      // Drink shape, so the products e2e (which checks every product row) still passes while these exist.
      category: 'coffee',
      price,
      imageUrl: 'https://example.com/x.png',
      stock: 1000,
      available: true,
      sizes: [
        { code: 'S', delta: 0 },
        { code: 'M', delta: 5000 },
        { code: 'L', delta: 10000 },
      ],
      toppings: [
        { id: 'tran-chau', name: 'Trân châu', price: 8000 },
        { id: 'kem-cheese', name: 'Kem cheese', price: 10000 },
        { id: 'thach-dua', name: 'Thạch dừa', price: 7000 },
      ],
    });
    await prisma.product.createMany({ data: [productRow(productId, 100000), productRow(cheapId, 25000)] });
    // Seed rules for the shared codes, plus test-only vouchers.
    await prisma.voucher.upsert({
      where: { code: 'BREW10' },
      create: { code: 'BREW10', type: 'PERCENT', value: 10, minSubtotal: 50000, maxDiscount: 30000 },
      update: { type: 'PERCENT', value: 10, minSubtotal: 50000, maxDiscount: 30000, active: true },
    });
    await prisma.voucher.upsert({
      where: { code: 'WELCOME20K' },
      create: { code: 'WELCOME20K', type: 'FIXED', value: 20000, minSubtotal: 60000 },
      update: { type: 'FIXED', value: 20000, minSubtotal: 60000, maxDiscount: null, active: true },
    });
    await prisma.voucher.create({
      data: { code: limitCode, type: 'FIXED', value: 5000, usageLimit: 1 },
    });
    await prisma.voucher.create({
      data: { code: expiredCode, type: 'PERCENT', value: 5, expiresAt: new Date('2020-01-01T00:00:00Z') },
    });
  }, 120_000);

  afterAll(async () => {
    const ours = { items: { some: { productId: { in: [productId, cheapId] } } } };
    await prisma.payment.deleteMany({ where: { order: ours } });
    await prisma.order.deleteMany({ where: ours });
    await prisma.product.deleteMany({ where: { id: { in: [productId, cheapId] } } });
    await prisma.voucher.deleteMany({ where: { code: { in: [limitCode, expiredCode] } } });
    await app.close();
  });

  describe('voucher pricing', () => {
    it('applies BREW10 to a 100000 cart: discount 10000, total 90000, stored on the order', async () => {
      const user = await registerUser();
      const res = await placeOrder(user.token, [{ productId, qty: 1 }], 'BREW10').expect(201);

      expect(res.body).toMatchObject({ total: 90000, discount: 10000, voucherCode: 'BREW10', pointsEarned: 0 });
      const row = await prisma.order.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(row).toMatchObject({ total: 90000, discount: 10000, voucherCode: 'BREW10' });
    });

    it('caps BREW10 at maxDiscount on a large cart', async () => {
      const user = await registerUser();
      const res = await placeOrder(user.token, [{ productId, qty: 5 }], 'BREW10').expect(201);

      expect(res.body).toMatchObject({ total: 470000, discount: 30000 });
    });

    it('normalizes the voucher code to uppercase', async () => {
      const user = await registerUser();
      const res = await placeOrder(user.token, [{ productId, qty: 1 }], ' brew10 ').expect(201);

      expect(res.body.voucherCode).toBe('BREW10');
    });

    it('answers 400 with a reason for an unknown code', async () => {
      const user = await registerUser();
      const res = await placeOrder(user.token, [{ productId, qty: 1 }], 'NOPE-NOT-REAL').expect(400);

      expect(res.body.code).toBe('VOUCHER_NOT_FOUND');
    });

    it('answers 400 for an expired voucher', async () => {
      const user = await registerUser();
      const res = await placeOrder(user.token, [{ productId, qty: 1 }], expiredCode).expect(400);

      expect(res.body.code).toBe('VOUCHER_EXPIRED');
    });

    it('answers 400 when the subtotal is below minSubtotal', async () => {
      const user = await registerUser();
      // Cheap cart: 25000. WELCOME20K needs 60000 and BREW10 needs 50000.
      const welcome = await placeOrder(user.token, [{ productId: cheapId, qty: 1 }], 'WELCOME20K').expect(400);
      expect(welcome.body.code).toBe('VOUCHER_MIN_SUBTOTAL');
      const brew = await placeOrder(user.token, [{ productId: cheapId, qty: 1 }], 'BREW10').expect(400);
      expect(brew.body.code).toBe('VOUCHER_MIN_SUBTOTAL');
      expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);
    });

    it('applies WELCOME20K as a fixed amount when the minimum is met', async () => {
      const user = await registerUser();
      const res = await placeOrder(user.token, [{ productId, qty: 1 }], 'WELCOME20K').expect(201);

      expect(res.body).toMatchObject({ total: 80000, discount: 20000, voucherCode: 'WELCOME20K' });
    });

    it('quote returns the priced total without writing an order, reserving stock or counting a use', async () => {
      const user = await registerUser();
      const before = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
      const usesBefore = await voucherUses('BREW10');

      const res = await quote(user.token, [{ productId, qty: 1 }], 'BREW10').expect(200);

      expect(res.body).toEqual({
        subtotal: 100000,
        discount: 10000,
        total: 90000,
        voucher: { code: 'BREW10', type: 'PERCENT', value: 10 },
        pointsToEarn: 9,
      });
      expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);
      expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(before.stock);
      expect(await voucherUses('BREW10')).toBe(usesBefore);
    });
  });

  describe('usage limits and idempotency', () => {
    it('a voucher with usageLimit 1 is used by exactly one of 5 concurrent orders', async () => {
      const users = await Promise.all(Array.from({ length: 5 }, () => registerUser()));
      const responses = await Promise.all(
        users.map((u) => placeOrder(u.token, [{ productId, qty: 1 }], limitCode)),
      );

      const created = responses.filter((r) => r.status === 201);
      const rejected = responses.filter((r) => r.status === 400);
      expect(created).toHaveLength(1);
      expect(rejected).toHaveLength(4);
      expect(rejected.every((r) => r.body.code === 'VOUCHER_EXHAUSTED')).toBe(true);
      expect(await voucherUses(limitCode)).toBe(1);
    });

    it('a replayed Idempotency-Key does not consume the voucher again', async () => {
      const user = await registerUser();
      const key = newKey();
      const usesBefore = await voucherUses('BREW10');

      await placeOrder(user.token, [{ productId, qty: 1 }], 'BREW10', key).expect(201);
      const replay = await placeOrder(user.token, [{ productId, qty: 1 }], 'BREW10', key).expect(200);

      expect(replay.headers['idempotency-replayed']).toBe('true');
      expect(await voucherUses('BREW10')).toBe(usesBefore + 1);
    });

    it('the SQL guard refuses an expired voucher that expired after pricing', async () => {
      const code = `RACE-${suffix}`;
      await prisma.voucher.create({
        data: { code, type: 'FIXED', value: 1000, expiresAt: new Date(Date.now() + 60_000) },
      });
      // Simulate the race: the voucher expires between the JS pre-check and the transactional UPDATE.
      await prisma.voucher.update({ where: { code }, data: { expiresAt: new Date(Date.now() - 1000) } });
      const orders = app.get(OrdersService) as unknown as {
        consumeVoucher(tx: PrismaService, code: string): Promise<void>;
      };

      await expect(prisma.$transaction((tx) => orders.consumeVoucher(tx as unknown as PrismaService, code))).rejects.toMatchObject({
        response: { code: 'VOUCHER_EXHAUSTED' },
      });
      expect(await voucherUses(code)).toBe(0);
      await prisma.voucher.delete({ where: { code } });
    });

    it('the same key with a different voucher is rejected with 422', async () => {
      const user = await registerUser();
      const key = newKey();
      await placeOrder(user.token, [{ productId, qty: 1 }], 'BREW10', key).expect(201);

      await placeOrder(user.token, [{ productId, qty: 1 }], undefined, key).expect(422);
    });
  });

  describe('loyalty points', () => {
    it('pays once: points are added on PAID, a replayed payment adds nothing, and /auth/me shows them', async () => {
      const user = await registerUser();
      const order = await placeOrder(user.token, [{ productId, qty: 1 }], 'BREW10').expect(201);
      const payKey = newKey();

      await pay(user.token, order.body.id, { method: 'WALLET' }, payKey).expect(201);
      expect(await loyaltyOf(user.id)).toBe(9);

      const replay = await pay(user.token, order.body.id, { method: 'WALLET' }, payKey).expect(200);
      expect(replay.headers['idempotency-replayed']).toBe('true');
      expect(await loyaltyOf(user.id)).toBe(9);

      const me = await request(app.getHttpServer()).get('/api/auth/me').set('Authorization', `Bearer ${user.token}`).expect(200);
      expect(me.body.loyaltyPoints).toBe(9);

      const row = await prisma.order.findUniqueOrThrow({ where: { id: order.body.id } });
      expect(row.pointsEarned).toBe(9);
    });

    it('a retry from PAYMENT_FAILED to PAID awards points only once', async () => {
      const user = await registerUser();
      const order = await placeOrder(user.token, [{ productId, qty: 1 }], 'BREW10').expect(201);

      await pay(user.token, order.body.id, { method: 'CARD', cardNumber: '4111111111110000' }).expect(402);
      expect(await loyaltyOf(user.id)).toBe(0);

      await pay(user.token, order.body.id, { method: 'WALLET' }).expect(201);
      expect(await loyaltyOf(user.id)).toBe(9);
    });

    it('cancelling a PAID order reverses its points and its voucher use', async () => {
      const user = await registerUser();
      const order = await placeOrder(user.token, [{ productId, qty: 1 }], 'BREW10').expect(201);
      await pay(user.token, order.body.id, { method: 'WALLET' }).expect(201);
      const usesBefore = await voucherUses('BREW10');
      expect(await loyaltyOf(user.id)).toBe(9);

      await cancel(user.token, order.body.id).expect(200);

      expect(await loyaltyOf(user.id)).toBe(0);
      expect(await voucherUses('BREW10')).toBe(usesBefore - 1);
      // A second cancel is a state error and must not reverse anything again.
      await cancel(user.token, order.body.id).expect(409);
      expect(await loyaltyOf(user.id)).toBe(0);
      expect(await voucherUses('BREW10')).toBe(usesBefore - 1);
    });

    it('cancelling a PENDING order with a voucher releases the voucher use', async () => {
      const user = await registerUser();
      const usesBefore = await voucherUses('BREW10');
      const order = await placeOrder(user.token, [{ productId, qty: 1 }], 'BREW10').expect(201);
      expect(await voucherUses('BREW10')).toBe(usesBefore + 1);

      await cancel(user.token, order.body.id).expect(200);
      expect(await voucherUses('BREW10')).toBe(usesBefore);
    });
  });
});
