import { api } from '@/lib/api';
import { fetchMe, type AuthResponse } from '@/lib/auth';
import type { AuthUser } from '@/store/auth';
import { useAuthStore } from '@/store/auth';

/** Empty when Google sign-in is not configured; the UI then hides the button. */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/** Exchanges a Google ID token (credential) for a BrewLite session, same as /auth/login. */
export async function loginWithGoogle(idToken: string): Promise<AuthUser> {
  const res = await api<AuthResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
  useAuthStore.getState().login(res.accessToken, res.user);
  // Loyalty points are not always part of the login response; refresh them from /auth/me.
  void fetchMe().catch(() => undefined);
  return res.user;
}
