import { execSync } from 'child_process';
import * as path from 'path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { PrismaModule } from '../src/prisma/prisma.module';
import { ProductsModule } from '../src/modules/products/products.module';

const BACKEND_DIR = path.resolve(__dirname, '..');
const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://brewlite:brewlite@localhost:5432/brewlite_test';

describe('Products (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Never run e2e against the development database.
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
    execSync('npx prisma migrate deploy', { cwd: BACKEND_DIR, env, stdio: 'inherit' });
    execSync('npx prisma db seed', { cwd: BACKEND_DIR, env, stdio: 'inherit' });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, ProductsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/products returns 200 with a list', () => {
    return request(app.getHttpServer())
      .get('/api/products')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });
  });

  it('GET /api/products items expose price, sizes and toppings', () => {
    return request(app.getHttpServer())
      .get('/api/products')
      .expect(200)
      .expect((res) => {
        for (const p of res.body) {
          expect(typeof p.price).toBe('number');
          expect(p).not.toHaveProperty('priceVND');
          expect(Array.isArray(p.sizes)).toBe(true);
          expect(Array.isArray(p.toppings)).toBe(true);
          if (p.category === 'pastry') {
            expect(p.sizes).toEqual([]);
            expect(p.toppings).toEqual([]);
          } else {
            expect(p.sizes).toEqual([
              { code: 'S', delta: 0 },
              { code: 'M', delta: 5000 },
              { code: 'L', delta: 10000 },
            ]);
            expect(p.toppings[0]).toEqual(
              expect.objectContaining({ id: expect.any(String), name: expect.any(String), price: expect.any(Number) }),
            );
          }
        }
      });
  });

  it('GET /api/products?category=foo returns 400', () => {
    return request(app.getHttpServer()).get('/api/products?category=foo').expect(400);
  });

  it('GET /api/products/unknown-id returns 404', () => {
    return request(app.getHttpServer()).get('/api/products/unknown-id').expect(404);
  });
});
