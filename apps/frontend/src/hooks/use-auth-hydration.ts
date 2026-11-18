'use client';
import { useEffect } from 'react';
import { fetchMe } from '@/lib/auth';
import { useAuthStore } from '@/store/auth';

/** Reads persisted auth state after mount so server and first client render match, then refreshes loyalty points. */
export function useAuthHydration(): void {
  useEffect(() => {
    void useAuthStore.persist.rehydrate()?.then(() => {
      if (useAuthStore.getState().token) void fetchMe().catch(() => undefined);
    });
  }, []);
}
