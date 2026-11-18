'use client';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useReducer, useRef, useState, type FormEvent } from 'react';
import { RollValue } from '@/components/shared/roll-value';
import { Shake } from '@/components/shared/shake';
import { Button } from '@/components/ui/button';
import { getOrder } from '@/features/orders/api';
import { OrderStatusBadge } from '@/features/orders/status-badge';
import { formatVND } from '@/lib/utils';
import { fetchMe } from '@/lib/auth';
import { useCartStore } from '@/store/cart';
import type { CreatedOrder, OrderDetail, PaymentMethod, QuoteRequest } from '@/types/order';
import { createOrder, isUnknownOutcome, newIdempotencyKey, payOrder, quoteOrder } from './api';
import {
  cartSignature,
  isVoucherLocked,
  lockedVoucherCode,
  pendingCreateKey,
  pendingOrderId,
  useCheckoutStore,
} from './checkout-state';
import { buildOrderPayload, buildQuoteRequest, normalizeCardNumber } from './payload';
import { mapPaymentError } from './payment-errors';
import { VoucherField } from './voucher-field';
import {
  canConfirmPayment,
  currentQuote,
  currentQuoteError,
  INITIAL_VOUCHER_STATE,
  mapQuoteError,
  voucherReducer,
} from './voucher-state';

interface CheckoutViewProps {
  /** Set when paying an existing order (e.g. "Pay again" from the order page); the cart is then ignored. */
  pinnedOrderId?: string;
}

export function CheckoutView({ pinnedOrderId }: CheckoutViewProps) {
  const router = useRouter();
  const isPinned = pinnedOrderId !== undefined;
  const lines = useCartStore((s) => s.lines);
  const clearCart = useCartStore((s) => s.clear);
  const sig = cartSignature(lines);
  const rememberOrder = useCheckoutStore((s) => s.rememberOrder);
  const rememberOrderKey = useCheckoutStore((s) => s.rememberOrderKey);
  const forgetOrderKey = useCheckoutStore((s) => s.forgetOrderKey);
  const syncCheckout = useCheckoutStore((s) => s.syncWithCart);
  const resetCheckout = useCheckoutStore((s) => s.reset);
  // A voucher bound to a pending order (or its creation attempt) cannot change until that order is paid or cart changes.
  const voucherLocked = useCheckoutStore((s) => !isPinned && isVoucherLocked(s, sig));
  const lockedCode = useCheckoutStore((s) => lockedVoucherCode(s, sig));

  const [method, setMethod] = useState<PaymentMethod>('WALLET');
  const [cardNumber, setCardNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pinnedOrder, setPinnedOrder] = useState<OrderDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [voucher, dispatchVoucher] = useReducer(voucherReducer, INITIAL_VOUCHER_STATE);
  const busyRef = useRef(false);
  const paidRef = useRef(false);
  // Payment key whose outcome is unknown (network error) for one order; reused by the next attempt on that order.
  const unknownPaymentRef = useRef<{ orderId: string; key: string } | null>(null);

  // Forget a remembered order as soon as the cart no longer matches it.
  useEffect(() => {
    if (!isPinned) syncCheckout(sig);
  }, [isPinned, sig, syncCheckout]);

  // Voucher code that applies to this checkout: the locked one for a pending order, otherwise the one applied here.
  const effectiveCode = isPinned ? null : voucherLocked ? lockedCode : voucher.code;

  // A decline only applies to the cart and voucher it happened with.
  useEffect(() => {
    setFailed(false);
  }, [sig, effectiveCode]);

  // Totals always come from the server quote; re-quoted whenever the cart or the voucher changes.
  // Intended: an applied voucher persists across cart edits (it is simply re-quoted). If the server rejects it
  // for the new cart, the voucher is cleared and the field error explains why.

  const quoteKey = isPinned || lines.length === 0 ? null : JSON.stringify(buildQuoteRequest(lines, effectiveCode));
  useEffect(() => {
    if (quoteKey === null) return;
    let active = true;
    const body = JSON.parse(quoteKey) as QuoteRequest;
    quoteOrder(body)
      .then((quote) => {
        if (active) dispatchVoucher({ type: 'quoted', requestKey: quoteKey, quote });
      })
      .catch((err: unknown) => {
        if (active) dispatchVoucher({ type: 'failed', requestKey: quoteKey, ...mapQuoteError(err, body.voucherCode !== undefined) });
      });
    return () => {
      active = false;
    };
  }, [quoteKey]);
  const quote = quoteKey === null ? null : currentQuote(voucher, quoteKey);
  const quoteError = quoteKey === null ? null : currentQuoteError(voucher, quoteKey);

  // Empty cart: nothing to pay (a successful payment clears the cart on purpose, hence paidRef).
  useEffect(() => {
    if (!isPinned && lines.length === 0 && !paidRef.current) router.replace('/cart');
  }, [isPinned, lines.length, router]);

  useEffect(() => {
    if (!pinnedOrderId) return;
    let active = true;
    getOrder(pinnedOrderId)
      .then((o) => {
        if (active) setPinnedOrder(o);
      })
      .catch((err: unknown) => {
        if (active) setLoadError(mapPaymentError(err).message);
      });
    return () => {
      active = false;
    };
  }, [pinnedOrderId]);

  async function confirm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busyRef.current) return;

    const digits = normalizeCardNumber(cardNumber);
    if (method === 'CARD' && !/^\d{12,19}$/.test(digits)) {
      setError('Enter a valid card number (12 to 19 digits).');
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setError(null);
    setFailed(false);

    let orderId: string | null = null;
    try {
      orderId = pinnedOrderId ?? pendingOrderId(useCheckoutStore.getState(), sig);
      if (!orderId) {
        // The creation key is persisted before the request, so a retry after a lost response replays the same order.
        const orderKey = pendingCreateKey(useCheckoutStore.getState(), sig) ?? newIdempotencyKey();
        rememberOrderKey(orderKey, sig, effectiveCode);
        let created: CreatedOrder;
        try {
          created = await createOrder(buildOrderPayload(lines, effectiveCode), orderKey);
        } catch (err) {
          if (!isUnknownOutcome(err)) forgetOrderKey();
          throw err;
        }
        orderId = created.id;
        if (!isPinned) rememberOrder(created.id, sig, effectiveCode);
      }

      // A new key per payment attempt; the previous key is reused only when its outcome was unknown.
      const paymentKey =
        unknownPaymentRef.current?.orderId === orderId ? unknownPaymentRef.current.key : newIdempotencyKey();
      try {
        await payOrder({ orderId, method, cardNumber: digits }, paymentKey);
      } catch (err) {
        unknownPaymentRef.current = isUnknownOutcome(err) ? { orderId, key: paymentKey } : null;
        throw err;
      }
      unknownPaymentRef.current = null;

      paidRef.current = true;
      void fetchMe().catch(() => undefined); // Refresh loyalty points shown in the navbar.
      if (isPinned) {
        if (useCheckoutStore.getState().orderId === orderId) resetCheckout();
      } else {
        clearCart();
        resetCheckout();
      }
      router.replace(`/orders/${orderId}?paid=1`);
    } catch (err) {
      const info = mapPaymentError(err);
      setError(info.message);
      setFailed(info.kind === 'declined');
      if (info.kind === 'declined') setPinnedOrder((o) => (o ? { ...o, status: 'PAYMENT_FAILED' } : o));
      if (info.kind === 'stale' && !isPinned) resetCheckout();
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (isPinned) {
    if (loadError) return <p role="alert" className="text-red-700">{loadError}</p>;
    if (!pinnedOrder) return <p aria-busy="true" className="text-muted-foreground">Loading order…</p>;
    if (pinnedOrder.status === 'PAID') {
      return (
        <section className="space-y-4">
          <p>This order is already paid.</p>
          <Button asChild>
            <Link href={`/orders/${pinnedOrder.id}`}>View order</Link>
          </Button>
        </section>
      );
    }
  }

  if (!isPinned && lines.length === 0) return null;

  const summary = isPinned
    ? pinnedOrder && {
        subtotal: pinnedOrder.total + pinnedOrder.discount,
        discount: pinnedOrder.discount,
        total: pinnedOrder.total,
        pointsToEarn: pinnedOrder.pointsEarned,
      }
    : quote && { subtotal: quote.subtotal, discount: quote.discount, total: quote.total, pointsToEarn: quote.pointsToEarn };

  return (
    <div className="grid gap-12 md:grid-cols-[1fr_22rem]">
      <section aria-labelledby="order-summary-title" className="space-y-6">
        <h2 id="order-summary-title" className="text-xl font-semibold">Order summary</h2>
        {isPinned && pinnedOrder ? (
          <>
            <p className="text-sm text-muted-foreground">
              Order <code>{pinnedOrder.id}</code> <OrderStatusBadge status={pinnedOrder.status} />
            </p>
            <ul className="divide-y divide-border border-y border-border">
              {pinnedOrder.items.map((item, i) => (
                <li key={i} className="flex justify-between gap-4 py-4">
                  <span>
                    {item.productName} × {item.qty}
                    {(item.size || item.toppings.length > 0) && (
                      <span className="block text-sm text-muted-foreground">
                        {[item.size, ...item.toppings.map((t) => t.name)].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{formatVND(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {lines.map((line) => {
              const options = [line.sizeCode, ...line.toppingNames].filter(Boolean).join(' · ');
              return (
                <li key={line.key} className="flex justify-between gap-4 py-4">
                  <span>
                    {line.name} × {line.qty}
                    {options && <span className="block text-sm text-muted-foreground">{options}</span>}
                  </span>
                  <span className="font-medium">{formatVND(line.unitPrice * line.qty)}</span>
                </li>
              );
            })}
          </ul>
        )}
        {quoteError && (
          <p role="alert" className="text-sm text-red-700">
            {quoteError}
          </p>
        )}
        {(!isPinned || pinnedOrder?.voucherCode) && (
          <VoucherField
            appliedCode={isPinned ? pinnedOrder?.voucherCode ?? null : effectiveCode}
            locked={isPinned || voucherLocked}
            fieldError={isPinned ? null : voucher.fieldError}
            onApply={(code) => dispatchVoucher({ type: 'apply', code })}
            onRemove={() => dispatchVoucher({ type: 'remove' })}
            onEdit={() => dispatchVoucher({ type: 'edit' })}
          />
        )}
        <div className="space-y-2 text-sm">
          <AnimatePresence initial={false}>
            {summary && summary.discount > 0 && (
              <motion.div
                key="discount"
                className="space-y-2"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <p className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatVND(summary.subtotal)}</span>
                </p>
                <p className="flex justify-between text-accent">
                  <span>Discount</span>
                  <span data-testid="checkout-discount">−{formatVND(summary.discount)}</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="flex items-baseline justify-between text-xl font-semibold">
          <span>Total</span>
          <span data-testid="checkout-total">
            <RollValue value={summary ? formatVND(summary.total) : '—'} />
          </span>
        </p>
        {summary && summary.pointsToEarn > 0 && (
          <p className="text-sm text-muted-foreground">You&apos;ll earn {summary.pointsToEarn} points</p>
        )}
      </section>

      <form onSubmit={confirm} noValidate className="h-fit space-y-6 border border-border p-6">
        <fieldset disabled={busy} className="space-y-4">
          <legend className="mb-3 text-lg font-semibold">Payment method</legend>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="method"
              value="WALLET"
              checked={method === 'WALLET'}
              onChange={() => setMethod('WALLET')}
            />
            E-wallet
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="method"
              value="CARD"
              checked={method === 'CARD'}
              onChange={() => setMethod('CARD')}
            />
            Bank card
          </label>

          {method === 'CARD' && (
            <div className="space-y-2">
              <label htmlFor="card-number" className="block text-sm font-medium">
                Card number
              </label>
              <input
                id="card-number"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4111 1111 1111 1111"
                className="w-full border border-border bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Test tip: card numbers ending in 0000 simulate a failed payment.
              </p>
            </div>
          )}
        </fieldset>

        <p className="text-sm text-muted-foreground">Cashless only. Cash is not accepted.</p>

        {error && (
          <Shake>
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          </Shake>
        )}
        {failed && (
          <p className="text-sm">
            Order status: <OrderStatusBadge status="PAYMENT_FAILED" />
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={!canConfirmPayment({ busy, pinned: isPinned, hasLines: lines.length > 0, quote })}
          aria-disabled={busy}
        >
          {busy ? 'Processing…' : 'Confirm payment'}
        </Button>
      </form>
    </div>
  );
}
