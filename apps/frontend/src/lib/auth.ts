import { api } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/store/auth';

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  const body = {
    email: input.email.trim(),
    password: input.password,
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
  };
  const res = await api<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) });
  useAuthStore.getState().login(res.accessToken, res.user);
  return res.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await api<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  useAuthStore.getState().login(res.accessToken, res.user);
  // Loyalty points are not always part of the login response; refresh them from /auth/me.
  void fetchMe().catch(() => undefined);
  return res.user;
}

export async function fetchMe(): Promise<AuthUser> {
  const user = await api<AuthUser>('/auth/me', { cache: 'no-store' });
  const token = useAuthStore.getState().token;
  if (token) useAuthStore.getState().login(token, user);
  return user;
}

export function logout(): void {
  useAuthStore.getState().logout();
}
