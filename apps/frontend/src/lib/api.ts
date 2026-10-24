import { notFound } from 'next/navigation';
import type { Product, ProductCategory } from '@/types/product';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
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
