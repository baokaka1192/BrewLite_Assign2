import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { createOrder, isUnknownOutcome, newIdempotencyKey, payOrder } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(status: number, body = '{}') {
  const fetchMock = vi.fn(async () => new Response(body, { status, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const headerOf = (fetchMock: ReturnType<typeof stubFetch>) =>
  (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;

describe('checkout API idempotency', () => {
  it('POST /orders sends the given Idempotency-Key', async () => {
    const fetchMock = stubFetch(201, '{"id":"o1"}');

    await createOrder({ items: [{ productId: 'p1', qty: 1 }] }, 'key-order-0001');

    expect(headerOf(fetchMock)['Idempotency-Key']).toBe('key-order-0001');
    expect(String((fetchMock.mock.calls[0] as unknown as [string])[0])).toMatch(/\/orders$/);
  });

  it('POST /payments sends the given Idempotency-Key', async () => {
    const fetchMock = stubFetch(201, '{}');

    await payOrder({ orderId: 'o1', method: 'WALLET' }, 'key-pay-00001');

    expect(headerOf(fetchMock)['Idempotency-Key']).toBe('key-pay-00001');
  });

  it('generates keys that satisfy the backend format', () => {
    expect(newIdempotencyKey()).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });

  it('treats only errors without an HTTP answer as an unknown outcome', () => {
    expect(isUnknownOutcome(new TypeError('Failed to fetch'))).toBe(true);
    expect(isUnknownOutcome(new ApiError(402, 'Payment failed'))).toBe(false);
    expect(isUnknownOutcome(new ApiError(409, 'conflict'))).toBe(false);
  });
});
