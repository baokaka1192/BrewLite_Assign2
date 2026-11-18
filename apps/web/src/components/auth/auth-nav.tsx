'use client';
import Link from 'next/link';
import { useAuthHydration } from '@/hooks/use-auth-hydration';
import { logout } from '@/lib/auth';
import { useAuthStore } from '@/store/auth';

/** Navbar session controls: Login link when logged out, user label and Logout when logged in. */
export function AuthNav({ onNavigate }: { onNavigate?: () => void }) {
  useAuthHydration();
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <Link
        href="/login"
        onClick={onNavigate}
        className="text-sm transition-colors duration-200 hover:text-accent-text"
      >
        Log in
      </Link>
    );
  }

  const label = user.name ?? user.email;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Link
        href="/orders"
        onClick={onNavigate}
        className="inline-flex min-h-11 items-center text-sm transition-colors duration-200 hover:text-accent-text"
      >
        Orders
      </Link>
      <span className="inline-flex min-h-11 items-center gap-2 text-sm">
        <span className="max-w-[10rem] truncate text-muted-foreground" title={user.email}>
          {label}
        </span>
        <span
          className="inline-flex items-center rounded-full bg-accent/25 px-2.5 py-0.5 text-xs font-semibold text-foreground"
          data-testid="loyalty-points"
          title="Loyalty points"
        >
          {user.loyaltyPoints} pts
        </span>
      </span>
      <button
        type="button"
        className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 transition-colors duration-200 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        onClick={() => {
          logout();
          onNavigate?.();
        }}
      >
        Log out
      </button>
    </div>
  );
}
