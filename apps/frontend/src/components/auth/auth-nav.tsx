'use client';
import Link from 'next/link';
import { useAuthHydration } from '@/hooks/use-auth-hydration';
import { logout } from '@/lib/auth';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';

/** Navbar session controls: Login link when logged out, user label and Logout when logged in. */
export function AuthNav({ onNavigate }: { onNavigate?: () => void }) {
  useAuthHydration();
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <Link
        href="/login"
        onClick={onNavigate}
        className="text-sm transition-colors duration-200 hover:text-accent"
      >
        Log in
      </Link>
    );
  }

  const label = user.name ?? user.email;
  return (
    <div className="flex items-center gap-4">
      <Link
        href="/orders"
        onClick={onNavigate}
        className="text-sm transition-colors duration-200 hover:text-accent"
      >
        Orders
      </Link>
      <span className="text-sm text-muted-foreground" title={user.email}>
        {label}
      </span>
      <span className="text-sm font-medium" data-testid="loyalty-points" title="Loyalty points">
        {user.loyaltyPoints} pts
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          logout();
          onNavigate?.();
        }}
      >
        Log out
      </Button>
    </div>
  );
}
