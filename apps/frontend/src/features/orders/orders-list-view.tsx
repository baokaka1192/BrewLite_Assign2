'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';
import { formatVND } from '@/lib/utils';
import type { OrderHistoryPage } from '@/types/order';
import { listMyOrders, ORDERS_PAGE_SIZE } from './api';
import { OrderStatusBadge } from './status-badge';

export function OrdersListView() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<OrderHistoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listMyOrders(page, ORDERS_PAGE_SIZE)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : GENERIC_ERROR_MESSAGE);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, attempt]);

  if (error) {
    return (
      <div role="alert" className="space-y-4">
        <p className="text-red-700">{error}</p>
        <Button type="button" variant="ghost" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  if (!data) return <p aria-busy="true" className="text-muted-foreground">Loading your orders…</p>;

  if (data.items.length === 0) {
    return (
      <section className="py-16 text-center">
        <h2 className="font-display text-3xl italic text-primary">No orders yet</h2>
        <p className="mt-3 text-muted-foreground">Your paid and pending orders will show up here.</p>
        <Button asChild className="mt-8">
          <Link href="/menu">Browse the menu</Link>
        </Button>
      </section>
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div className="space-y-6" aria-busy={loading}>
      <ul className="divide-y divide-border border-y border-border">
        {data.items.map((order) => (
          <li key={order.id}>
            <Link
              href={`/orders/${order.id}`}
              className="flex flex-col gap-2 py-5 transition-colors hover:text-accent sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="space-y-1">
                <span className="block text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <span className="block font-medium">
                  {order.items.map((item) => `${item.productName} × ${item.qty}`).join(', ')}
                </span>
                {order.voucherCode && (
                  <span className="block text-sm text-muted-foreground">
                    Voucher {order.voucherCode} · −{formatVND(order.discount)}
                    {order.pointsEarned > 0 && ` · ${order.pointsEarned} points`}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-4">
                <OrderStatusBadge status={order.status} />
                <span className="font-semibold">{formatVND(order.total)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <nav aria-label="Order pages" className="flex items-center justify-between text-sm">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loading || page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ← Previous
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loading || page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next →
        </Button>
      </nav>
    </div>
  );
}
