import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  loyaltyPoints: number;
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  /** True once persisted state has been read on the client. */
  hydrated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  get length() {
    return 0;
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'brewlite-auth',
      // Server (and first client render) has no storage, so the store stays logged out
      // until useAuthHydration() calls rehydrate() after mount.
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? noopStorage : window.localStorage,
      ),
      partialize: (s) => ({ token: s.token, user: s.user }),
      skipHydration: true,
      onRehydrateStorage: () => () => useAuthStore.setState({ hydrated: true }),
    },
  ),
);
