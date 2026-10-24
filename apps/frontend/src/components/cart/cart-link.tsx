'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { totalItems, useCartStore } from '@/store/cart';

/**
 * Navbar cart link with item-count badge. The count is only read after mount so
 * the server render (empty cart) and the first client render always match.
 */
export function CartLink({ onNavigate }: { onNavigate?: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = useCartStore((s) => totalItems(s));
  const shown = mounted ? count : 0;

  return (
    <Link
      href="/cart"
      onClick={onNavigate}
      className="relative inline-flex items-center gap-2 text-sm transition-colors duration-200 hover:text-accent"
      aria-label={shown > 0 ? `Cart, ${shown} items` : 'Cart'}
    >
      <ShoppingBag className="h-4 w-4" aria-hidden />
      <span>Cart</span>
      {shown > 0 && (
        <span
          data-testid="cart-badge"
          className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold leading-5 text-primary-foreground"
        >
          {shown}
        </span>
      )}
    </Link>
  );
}
