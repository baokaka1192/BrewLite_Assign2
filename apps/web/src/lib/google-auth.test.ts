import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import { loginWithGoogle } from './google-auth';
import { useAuthStore } from '@/store/auth';

const user = { id: 'u1', email: 'a@b.co', name: 'A', loyaltyPoints: 0 };

function mockFetch(handler: (url: string) => Response) {
  const fetchMock = vi.fn(async (url: string) => handler(String(url)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loginWithGoogle', () => {
  it('posts the ID token to /auth/google and stores the session', async () => {
    const fetchMock = mockFetch((url) =>
      url.endsWith('/auth/me')
        ? new Response(JSON.stringify(user), { status: 200 })
        : new Response(JSON.stringify({ user, accessToken: 'tok' }), { status: 200 }),
    );

    await expect(loginWithGoogle('google-id-token')).resolves.toEqual(user);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/auth\/google$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ idToken: 'google-id-token' });
    expect(useAuthStore.getState().token).toBe('tok');
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('surfaces the backend 401 message and leaves the session untouched', async () => {
    mockFetch(() => new Response(JSON.stringify({ message: 'Invalid Google token' }), { status: 401 }));

    const err = await loginWithGoogle('bad').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 401, message: 'Invalid Google token' });
    expect(useAuthStore.getState().token).toBeNull();
  });
});
