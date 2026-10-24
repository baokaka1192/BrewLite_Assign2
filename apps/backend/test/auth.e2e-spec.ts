import { execSync } from 'child_process';
import * as path from 'path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import configuration from '../src/config/configuration';
import { AuthModule } from '../src/modules/auth/auth.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

const BACKEND_DIR = path.resolve(__dirname, '..');
const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://brewlite:brewlite@localhost:5432/brewlite_test';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now();
  const email = `auth-e2e-${runId}@example.com`;
  const password = 'correct-horse-battery';

  beforeAll(async () => {
    // Never run e2e against the development database.
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
    execSync('npx prisma migrate deploy', { cwd: BACKEND_DIR, env, stdio: 'inherit' });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] }), PrismaModule, AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/register returns 201 with user and token, without the password hash', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, name: 'Auth Tester' })
      .expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toEqual({
      id: expect.any(String),
      email,
      name: 'Auth Tester',
      loyaltyPoints: 0,
    });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.passwordHash).not.toBe(password);
    expect(await bcrypt.compare(password, stored.passwordHash)).toBe(true);
  });

  it('POST /api/auth/register returns 409 for a duplicate email, ignoring case', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: email.toUpperCase(), password })
      .expect(409);
  });

  it('POST /api/auth/register returns 400 for an invalid email', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password })
      .expect(400);
  });

  it('POST /api/auth/register returns 400 for a password shorter than 8 characters', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `short-${runId}@example.com`, password: 'short7!' })
      .expect(400);
  });

  it('POST /api/auth/register returns 400 for a password longer than 72 bytes', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `long-${runId}@example.com`, password: 'a'.repeat(73) })
      .expect(400);
  });

  it('POST /api/auth/register returns 400 for a name longer than 100 characters', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `name-${runId}@example.com`, password, name: 'n'.repeat(101) })
      .expect(400);
  });

  it('POST /api/auth/login returns 200 with a token for correct credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: email.toUpperCase(), password })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(email);
  });

  it('POST /api/auth/login returns 401 for a wrong password', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401)
      .expect((res) => expect(res.body.message).toBe('Invalid email or password'));
  });

  it('POST /api/auth/login returns the same 401 for an unknown email', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: `nobody-${runId}@example.com`, password })
      .expect(401)
      .expect((res) => expect(res.body.message).toBe('Invalid email or password'));
  });

  it('GET /api/auth/me returns 401 without a token', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('GET /api/auth/me returns 401 with an invalid token', () => {
    return request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('GET /api/auth/me returns 401 when the token user no longer exists', async () => {
    const ghostEmail = `ghost-${runId}@example.com`;
    const registered = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: ghostEmail, password })
      .expect(201);
    await prisma.user.delete({ where: { id: registered.body.user.id } });

    return request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .expect(401);
  });

  it('GET /api/auth/me returns the current user with a valid token', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(res.body).toEqual({ id: login.body.user.id, email, name: 'Auth Tester', loyaltyPoints: 0 });
  });
});
