'use client';
import type { ReactNode } from 'react';
import { useRequireAuth } from '@/hooks/use-require-auth';

/** Renders children only for a logged-in user; anonymous visitors are sent to /login. */
export function RequireAuth({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const status = useRequireAuth();
  return status === 'authenticated' ? <>{children}</> : <>{fallback}</>;
}
