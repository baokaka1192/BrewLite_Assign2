'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImageFrame } from '@/components/shared/image-frame';
import { formatVND } from '@/lib/utils';
import { subtotal, useCartStore, type CartLine } from '@/store/cart';

export function CartView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const lines = useCartStore((s) => s.lines);
  const total = useCartStore((s) => subtotal(s));

  // Avoid hydration mismatch: render nothing cart-specific until the persisted state is read.
  if (!mounted) return <div className="min-h-[12rem]" aria-busy="true" />;

  if (lines.length === 0) {
    return (
      <section aria-labelledby="cart-empty-title" className="py-16 text-center">
        <h2 id="cart-empty-title" className="font-display text-3xl italic text-primary">Your cart is empty</h2>
        <p className="mt-3 text-muted-foreground">Pick something from the menu to get started.</p>
        <Button asChild className="mt-8">
          <Link href="/menu">Browse the menu</Link>
        </Button>
      </section>
    );
  }

  return (
    <div className="grid gap-12 md:grid-cols-[1fr_20rem]">
      <ul className="divide-y divide-border border-y border-border">
        {lines.map((line) => (
          <CartLineItem key={line.key} line={line} />
        ))}
      </ul>

      <aside className="h-fit space-y-6 border border-border p-6">
        <p className="flex items-baseline justify-between text-xl font-semibold">
          <span>Subtotal</span>
          <span data-testid="cart-subtotal">{formatVND(total)}</span>
        </p>
        <Button asChild className="w-full">
          <Link href="/checkout">Checkout</Link>
        </Button>
        <Link href="/menu" className="block text-center text-sm text-muted-foreground hover:text-primary">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}

function CartLineItem({ line }: { line: CartLine }) {
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const options = [line.sizeCode, ...line.toppingNames].filter(Boolean).join(' · ');

  return (
    <li className="flex gap-4 py-6">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden border border-border">
        {line.imageUrl ? (
          <Image src={line.imageUrl} alt={line.name} fill sizes="96px" className="object-cover" />
        ) : (
          <ImageFrame alt={line.name} brief={line.name} className="h-full w-full" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">{line.name}</p>
            {options && <p className="mt-1 text-sm text-muted-foreground">{options}</p>}
            <p className="mt-1 text-sm text-muted-foreground">{formatVND(line.unitPrice)}</p>
          </div>
          <p className="font-semibold">{formatVND(line.unitPrice * line.qty)}</p>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div role="group" aria-label={`Quantity for ${line.name}`} className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Decrease quantity of ${line.name}`}
              onClick={() => setQty(line.key, line.qty - 1)}
            >
              −
            </Button>
            <span className="w-8 text-center text-sm" aria-live="polite">{line.qty}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Increase quantity of ${line.name}`}
              disabled={line.stock !== undefined && line.qty >= line.stock}
              onClick={() => setQty(line.key, line.qty + 1)}
            >
              +
            </Button>
          </div>
          <button
            type="button"
            aria-label={`Remove ${line.name} from cart`}
            onClick={() => remove(line.key)}
            className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
