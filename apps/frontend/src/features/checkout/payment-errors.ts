import { ApiError, GENERIC_ERROR_MESSAGE } from '@/lib/api';

export type PaymentErrorKind =
  | 'declined'
  | 'conflict'
  | 'unauthorized'
  | 'invalid'
  | 'stale'
  | 'unknown';

export interface PaymentErrorInfo {
  kind: PaymentErrorKind;
  message: string;
}

/**
 * Maps a failed order/payment request to a user-facing message.
 * 402 = card/wallet declined (order is now PAYMENT_FAILED; cart must be kept).
 * 403/404 = the remembered order is not usable any more (e.g. another account's leftover).
 */
export function mapPaymentError(err: unknown): PaymentErrorInfo {
  if (!(err instanceof ApiError)) {
    return { kind: 'unknown', message: GENERIC_ERROR_MESSAGE };
  }

  switch (err.status) {
    case 401:
      return { kind: 'unauthorized', message: 'Your session has expired. Please log in again.' };
    case 402: {
      const reason = err.reason ?? err.message;
      return {
        kind: 'declined',
        message: `Payment failed: ${reason}. Your cart is unchanged. Try again or switch payment method.`,
      };
    }
    case 409:
      return {
        kind: 'conflict',
        message: err.message || 'This order is already paid or a payment is in progress. Check your orders.',
      };
    case 400:
      return { kind: 'invalid', message: err.message };
    case 403:
    case 404:
      return {
        kind: 'stale',
        message: 'This order is no longer available. Press Confirm payment to place a new order from your cart.',
      };
    default:
      return { kind: 'unknown', message: err.message || GENERIC_ERROR_MESSAGE };
  }
}
