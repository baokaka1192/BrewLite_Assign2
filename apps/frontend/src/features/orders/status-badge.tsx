import { cn } from '@/lib/utils';

const LABELS: Record<string, string> = {
  PENDING: 'Awaiting payment',
  PAID: 'Paid',
  PAYMENT_FAILED: 'Payment failed',
};

const STYLES: Record<string, string> = {
  PAID: 'border-emerald-600 text-emerald-700',
  PAYMENT_FAILED: 'border-red-600 text-red-700',
};

export function orderStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-block border px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
        STYLES[status] ?? 'border-border text-muted-foreground',
      )}
    >
      {orderStatusLabel(status)}
    </span>
  );
}
