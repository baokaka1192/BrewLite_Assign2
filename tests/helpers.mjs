// Shared helpers for the black-box tests in tests/. They call a running API over HTTP,
// so the stack must be up first (see tests/README.md).
import { randomUUID } from 'node:crypto';

export const API_URL = (process.env.API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
export const WEB_URL = process.env.WEB_URL ? process.env.WEB_URL.replace(/\/$/, '') : undefined;

export function newKey() {
  return `test-${randomUUID()}`;
}

export async function api(method, path, { token, idempotencyKey, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : undefined };
}

/** Registers a fresh customer and returns its access token. */
export async function registerCustomer() {
  const email = `test-${randomUUID()}@example.com`;
  const res = await api('POST', '/auth/register', {
    body: { email, password: 'test-password-123', name: 'Khách test' },
  });
  if (res.status !== 201) {
    throw new Error(`register failed with ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.accessToken, user: res.body.user };
}

/** Picks an available drink, so size and topping options apply. */
export async function pickAvailableDrink() {
  const res = await api('GET', '/products');
  if (res.status !== 200) throw new Error(`GET /products failed with ${res.status}`);
  const drink = res.body.find((p) => p.available && p.category !== 'pastry' && p.toppings.length > 0);
  if (!drink) throw new Error('no available drink in the seed data');
  return drink;
}

/** Creates a PENDING order for one drink and returns it. */
export async function createOrder(token, product) {
  const res = await api('POST', '/orders', {
    token,
    idempotencyKey: newKey(),
    body: { items: [{ productId: product.id, size: 'S', qty: 1 }] },
  });
  if (res.status !== 201) {
    throw new Error(`POST /orders failed with ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body;
}
