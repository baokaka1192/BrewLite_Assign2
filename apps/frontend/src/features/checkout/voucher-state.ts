import { ApiError } from '@/lib/api';
import type { QuoteResponse } from '@/types/order';
import { mapPaymentError } from './payment-errors';

export interface VoucherState {
  /** Normalized code applied to the cart; null when no voucher is applied. */
  code: string | null;
  /** Server quote for the request described by quoteFor; ignored when quoteFor does not match the current request. */
  quote: QuoteResponse | null;
  quoteFor: string | null;
  /** Field-level message for the voucher input (e.g. invalid code). */
  fieldError: string | null;
  /** Message for a failed quote that is not caused by the voucher. */
  quoteError: string | null;
  /** Request key the quoteError belongs to; the error is shown only while that request is still current. */
  quoteErrorFor: string | null;
}

export const INITIAL_VOUCHER_STATE: VoucherState = {
  code: null,
  quote: null,
  quoteFor: null,
  fieldError: null,
  quoteError: null,
  quoteErrorFor: null,
};

export type VoucherAction =
  | { type: 'apply'; code: string }
  | { type: 'remove' }
  | { type: 'edit' }
  | { type: 'quoted'; requestKey: string; quote: QuoteResponse }
  | { type: 'failed'; requestKey: string; message: string; voucherError: boolean };

/**
 * Pure transitions for the checkout voucher. Changing or removing the voucher drops the previous quote and
 * errors, so a stale total or message is never shown for a different voucher.
 */
export function voucherReducer(state: VoucherState, action: VoucherAction): VoucherState {
  switch (action.type) {
    case 'apply':
      return { ...INITIAL_VOUCHER_STATE, code: action.code };
    case 'remove':
      return { ...INITIAL_VOUCHER_STATE };
    case 'edit':
      return { ...state, fieldError: null };
    case 'quoted':
      // fieldError is kept: the re-quote that follows a rejected voucher must not hide its message.
      return { ...state, quote: action.quote, quoteFor: action.requestKey, quoteError: null, quoteErrorFor: null };
    case 'failed':
      if (action.voucherError) {
        // The rejected code is not kept as applied; the cart is quoted again without it.
        return { ...INITIAL_VOUCHER_STATE, fieldError: action.message };
      }
      return { ...state, quote: null, quoteFor: null, quoteError: action.message, quoteErrorFor: action.requestKey };
  }
}

/** Maps a failed quote request. A 400 while a voucher was sent means the voucher itself was rejected. */
export function mapQuoteError(err: unknown, sentVoucher: boolean): { voucherError: boolean; message: string } {
  if (sentVoucher && err instanceof ApiError && err.status === 400) {
    return { voucherError: true, message: err.message };
  }
  return { voucherError: false, message: mapPaymentError(err).message };
}

/** Non-voucher quote error, only while it belongs to the request that is currently wanted. */
export function currentQuoteError(state: VoucherState, requestKey: string): string | null {
  return state.quoteError !== null && state.quoteErrorFor === requestKey ? state.quoteError : null;
}

/** Payment can be confirmed once the current cart total is known from the server (or for a pinned order). */
export function canConfirmPayment(input: { busy: boolean; pinned: boolean; hasLines: boolean; quote: QuoteResponse | null }): boolean {
  if (input.busy) return false;
  if (input.pinned) return true;
  return input.hasLines && input.quote !== null;
}

/** Quote is usable only when it was produced for the request that is currently wanted. */
export function currentQuote(state: VoucherState, requestKey: string): QuoteResponse | null {
  return state.quote !== null && state.quoteFor === requestKey ? state.quote : null;
}
