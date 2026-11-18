import { ApiError, api } from '@/lib/api';
import type { CreatedOrder, OrderPayload, PaymentInput, PaymentResult, QuoteRequest, QuoteResponse } from '@/types/order';
import { buildPaymentPayload } from './payload';

/** A fresh Idempotency-Key (UUID, within the backend's 8-128 [A-Za-z0-9_-] rule). */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

/** True when the request may or may not have reached the server (no HTTP answer). Such keys must be reused. */
export function isUnknownOutcome(err: unknown): boolean {
  return !(err instanceof ApiError);
}

/** The key must be the one remembered for this creation attempt, so a retry replays instead of duplicating. */
export function createOrder(payload: OrderPayload, idempotencyKey: string) {
  return api<CreatedOrder>('/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  });
}

/** One key per payment attempt; the caller reuses it only after an unknown-outcome error. */
export function payOrder(input: PaymentInput, idempotencyKey: string) {
  return api<PaymentResult>('/payments', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(buildPaymentPayload(input)),
  });
}

/** Server-side price preview; never trust client-computed totals. */
export function quoteOrder(payload: QuoteRequest) {
  return api<QuoteResponse>('/orders/quote', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
