import { cn } from '@/lib/utils';

const LABELS: Record<string, string> = {
  PENDING: 'Awaiting payment',
  PAID: 'Paid',
  PAYMENT_FAILED: 'Payment failed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

// Light tint + dark text pairs; all clear 4.5:1 contrast.
const STYLES: Record<string, string> = {
  PAID: 'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
  PAYMENT_FAILED: 'border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200',
  PENDING: 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
  PREPARING: 'border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200',
  READY: 'border-teal-300 bg-teal-100 text-teal-900 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-200',
  COMPLETED: 'border-stone-400 bg-stone-200 text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100',
  CANCELLED: 'border-stone-300 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400',
};

export function orderStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}

/** Border/background/text classes for a status, shared with the timeline. */
export function orderStatusTone(status: string): string {
  return STYLES[status] ?? 'border-border bg-surface text-foreground';
}

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
        orderStatusTone(status),
      )}
    >
      {orderStatusLabel(status)}
    </span>
  );
}
