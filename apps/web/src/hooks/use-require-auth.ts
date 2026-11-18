'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthHydration } from '@/hooks/use-auth-hydration';
import { useAuthStore } from '@/store/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

/**
 * Redirects to /login?next=<current path> when there is no session.
 * Returns 'loading' until persisted auth state has been read on the client.
 */
export function useRequireAuth(): AuthStatus {
  useAuthHydration();
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const authenticated = Boolean(token);

  useEffect(() => {
    if (!hydrated || authenticated) return;
    const current = `${window.location.pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(current)}`);
  }, [hydrated, authenticated, router]);

  if (!hydrated) return 'loading';
  return authenticated ? 'authenticated' : 'anonymous';
}
