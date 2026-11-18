import { notFound } from 'next/navigation';
import type { Product, ProductCategory } from '@/types/product';
import { useAuthStore } from '@/store/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Optional machine-readable detail from the body (e.g. a payment decline reason). */
    public reason?: string,
  ) {
    super(message);
  }
}

export const GENERIC_ERROR_MESSAGE = 'Something went wrong, please try again.';

/**
 * Reads a Nest-style error body ({ message: string | string[], reason? }) into one readable message.
 * Non-JSON bodies (e.g. HTML from a proxy) never leak raw text; a generic message is used.
 */
export async function readErrorDetails(res: Response): Promise<{ message: string; reason?: string }> {
  const text = await res.text().catch(() => '');
  try {
    const body = JSON.parse(text) as { message?: unknown; reason?: unknown };
    const reason = typeof body.reason === 'string' && body.reason ? body.reason : undefined;
    if (Array.isArray(body.message)) return { message: body.message.join(', '), reason };
    if (typeof body.message === 'string' && body.message) return { message: body.message, reason };
  } catch {
    // Not JSON: fall through to the generic message.
  }
  return { message: GENERIC_ERROR_MESSAGE };
}

export async function readErrorMessage(res: Response): Promise<string> {
  return (await readErrorDetails(res)).message;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });

  if (!res.ok) {
    // An expired or invalid session must not leave stale auth state behind.
    if (res.status === 401 && token) useAuthStore.getState().logout();
    const { message, reason } = await readErrorDetails(res);
    throw new ApiError(res.status, message, reason);
  }
  return res.json() as Promise<T>;
}

export function getProducts(category?: ProductCategory) {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return api<Product[]>(`/products${query}`, { cache: 'no-store' });
}

export async function getProduct(id: string) {
  try {
    return await api<Product>(`/products/${encodeURIComponent(id)}`, { cache: 'no-store' });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}
