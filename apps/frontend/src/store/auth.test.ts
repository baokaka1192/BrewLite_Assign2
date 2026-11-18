import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore, type AuthUser } from './auth';

const user: AuthUser = { id: 'u1', email: 'jane@example.com', name: 'Jane', loyaltyPoints: 0 };

beforeEach(() => {
  useAuthStore.getState().logout();
});

describe('auth store', () => {
  it('starts logged out', () => {
    const { token, user: current } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(current).toBeNull();
  });

  it('login stores token and user', () => {
    useAuthStore.getState().login('tok', user);
    expect(useAuthStore.getState()).toMatchObject({ token: 'tok', user });
  });

  it('logout clears token and user', () => {
    useAuthStore.getState().login('tok', user);
    useAuthStore.getState().logout();
    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null });
  });
});
