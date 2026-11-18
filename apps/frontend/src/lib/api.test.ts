import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, GENERIC_ERROR_MESSAGE, api } from './api';

function mockFetch(body: string, status: number) {
  const fetchMock = vi.fn(async () => new Response(body, { status, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api error normalization', () => {
  it('uses the message string from a JSON error body', async () => {
    mockFetch(JSON.stringify({ message: 'Email already registered', statusCode: 409 }), 409);
    const err = await api('/auth/register').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, message: 'Email already registered' });
  });

  it('joins validation message arrays', async () => {
    mockFetch(JSON.stringify({ message: ['email must be an email', 'password too short'] }), 400);
    await expect(api('/auth/register')).rejects.toMatchObject({
      status: 400,
      message: 'email must be an email, password too short',
    });
  });

  it('uses a generic message when the body is not JSON', async () => {
    mockFetch('<html>502 Bad Gateway</html>', 502);
    await expect(api('/products')).rejects.toMatchObject({ status: 502, message: GENERIC_ERROR_MESSAGE });
  });

  it('sends the Authorization header only when a session exists', async () => {
    const fetchMock = mockFetch(JSON.stringify({ ok: true }), 200);
    await api('/products');
    const headers = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});
