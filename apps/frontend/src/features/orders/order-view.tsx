'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Shake } from '@/components/shared/shake';
import { Button } from '@/components/ui/button';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';
import { formatVND } from '@/lib/utils';
import type { OrderDetail } from '@/types/order';
import { getOrder } from './api';
import { OrderStatusBadge } from './status-badge';

export function OrderView({ orderId, justPaid }: { orderId: string; justPaid: boolean }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getOrder(orderId)
      .then((o) => {
        if (active) setOrder(o);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : GENERIC_ERROR_MESSAGE);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  if (error) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-red-700">{error}</p>
        <Link href="/orders" className="underline hover:text-accent">Back to my orders</Link>
      </div>
    );
  }

  if (!order) return <p aria-busy="true" className="text-muted-foreground">Loading order…</p>;

  const paid = order.status === 'PAID';
  const canPay = order.status === 'PAYMENT_FAILED' || order.status === 'PENDING';

  return (
    <div className="grid gap-12 md:grid-cols-[1fr_20rem]">
      <section className="space-y-6">
        {paid && justPaid ? (
          <h2 className="flex items-center gap-3 font-display text-3xl italic text-primary">
            <SuccessCheck />
            Order placed successfully
          </h2>
        ) : (
          <h2 className="font-display text-3xl italic text-primary">Order details</h2>
        )}

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Order code</dt>
          <dd><code>{order.id}</code></dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd><OrderStatusBadge status={order.status} /></dd>
          <dt className="text-muted-foreground">Placed</dt>
          <dd>{new Date(order.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</dd>
        </dl>

        {paid && (
          <p className="border border-border p-4 font-medium">Pick up your drinks at the bar.</p>
        )}
        {canPay && (
          <Shake shake={order.status === 'PAYMENT_FAILED'} className="space-y-3 border border-border p-4">
            <p className="text-sm">
              {order.status === 'PAYMENT_FAILED'
                ? 'Payment failed. Your order is saved and has not been charged.'
                : 'This order is waiting for payment.'}
            </p>
            <Button asChild>
              <Link href={`/checkout?orderId=${encodeURIComponent(order.id)}`}>
                {order.status === 'PAYMENT_FAILED' ? 'Pay again' : 'Pay now'}
              </Link>
            </Button>
          </Shake>
        )}

        <div className="flex flex-wrap gap-6 text-sm">
          <Link href="/" className="underline hover:text-accent">Back to home</Link>
          <Link href="/orders" className="underline hover:text-accent">All orders</Link>
        </div>
      </section>

      <aside className="h-fit space-y-4 border border-border p-6">
        <h3 className="text-lg font-semibold">Items</h3>
        <ul className="divide-y divide-border">
          {order.items.map((item, i) => {
            const options = [item.size, ...item.toppings.map((t) => t.name)].filter(Boolean).join(' · ');
            return (
              <li key={i} className="flex justify-between gap-4 py-3 text-sm">
                <span>
                  {item.productName} × {item.qty}
                  {options && <span className="block text-muted-foreground">{options}</span>}
                </span>
                <span>{formatVND(item.lineTotal)}</span>
              </li>
            );
          })}
        </ul>
        <div className="space-y-2 text-sm">
          <p className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatVND(order.total + order.discount)}</span>
          </p>
          {order.discount > 0 && (
            <p className="flex justify-between">
              <span className="text-muted-foreground">
                Discount{order.voucherCode && <> (<code>{order.voucherCode}</code>)</>}
              </span>
              <span data-testid="order-discount">−{formatVND(order.discount)}</span>
            </p>
          )}
        </div>
        <p className="flex items-baseline justify-between font-semibold">
          <span>Total</span>
          <span data-testid="order-total">{formatVND(order.total)}</span>
        </p>
        {order.pointsEarned > 0 && (
          <p className="text-sm text-muted-foreground" data-testid="order-points">
            {paid ? 'Points earned' : "You'll earn"} {order.pointsEarned} points
          </p>
        )}
      </aside>
    </div>
  );
}

/** Checkmark drawn stroke by stroke once the order is confirmed. */
function SuccessCheck() {
  const reduce = useReducedMotion();
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-8 w-8 shrink-0 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d="M4.5 12.5 9.5 17.5 19.5 6.5"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </svg>
  );
}
