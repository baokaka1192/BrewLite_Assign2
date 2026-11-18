import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import type { QuoteResponse } from '@/types/order';
import {
  canConfirmPayment,
  currentQuote,
  currentQuoteError,
  INITIAL_VOUCHER_STATE,
  mapQuoteError,
  voucherReducer,
  type VoucherState,
} from './voucher-state';

const quote: QuoteResponse = {
  subtotal: 100000,
  discount: 10000,
  total: 90000,
  voucher: { code: 'WELCOME20K', type: 'FIXED', value: 10000 },
  pointsToEarn: 90,
};

function withQuote(code: string | null): VoucherState {
  return { ...INITIAL_VOUCHER_STATE, code, quote, quoteFor: 'key-1' };
}

describe('voucherReducer', () => {
  it('apply resets the previous quote and errors', () => {
    const state: VoucherState = { ...withQuote('BREW10'), quoteError: 'Network down' };
    const next = voucherReducer(state, { type: 'apply', code: 'WELCOME20K' });
    expect(next).toEqual({ ...INITIAL_VOUCHER_STATE, code: 'WELCOME20K' });
  });

  it('keeps the voucher field error when the follow-up quote succeeds', () => {
    const rejected = voucherReducer(
      { ...INITIAL_VOUCHER_STATE, code: 'NOPE' },
      { type: 'failed', requestKey: 'k1', voucherError: true, message: 'Voucher code not found' },
    );
    const requoted = voucherReducer(rejected, { type: 'quoted', requestKey: 'k2', quote });
    expect(requoted.fieldError).toBe('Voucher code not found');
    expect(requoted.quote).toBe(quote);
  });

  it('edit dismisses the field error only', () => {
    const state: VoucherState = { ...INITIAL_VOUCHER_STATE, fieldError: 'Voucher code not found' };
    expect(voucherReducer(state, { type: 'edit' })).toEqual(INITIAL_VOUCHER_STATE);
  });

  it('apply clears a previous field error', () => {
    const state: VoucherState = { ...INITIAL_VOUCHER_STATE, fieldError: 'Voucher code not found' };
    expect(voucherReducer(state, { type: 'apply', code: 'BREW10' }).fieldError).toBeNull();
  });

  it('remove clears the voucher, quote and errors', () => {
    expect(voucherReducer(withQuote('BREW10'), { type: 'remove' })).toEqual(INITIAL_VOUCHER_STATE);
  });

  it('stores a quote with the request it belongs to', () => {
    const next = voucherReducer({ ...INITIAL_VOUCHER_STATE, code: 'BREW10' }, { type: 'quoted', requestKey: 'k', quote });
    expect(next.quote).toBe(quote);
    expect(next.quoteFor).toBe('k');
  });

  it('a rejected voucher clears the applied code and shows a field error', () => {
    const next = voucherReducer(
      { ...INITIAL_VOUCHER_STATE, code: 'NOPE' },
      { type: 'failed', requestKey: 'k', voucherError: true, message: 'Voucher is invalid or expired' },
    );
    expect(next).toEqual({ ...INITIAL_VOUCHER_STATE, fieldError: 'Voucher is invalid or expired' });
  });

  it('a non-voucher failure keeps the code and drops the quote', () => {
    const next = voucherReducer(withQuote('BREW10'), {
      type: 'failed',
      requestKey: 'k',
      voucherError: false,
      message: 'Something went wrong',
    });
    expect(next.code).toBe('BREW10');
    expect(next.quote).toBeNull();
    expect(next.quoteError).toBe('Something went wrong');
  });
});

describe('currentQuote', () => {
  it('returns the quote only for the matching request', () => {
    const state = withQuote('BREW10');
    expect(currentQuote(state, 'key-1')).toBe(quote);
    expect(currentQuote(state, 'key-2')).toBeNull();
  });
});

describe('mapQuoteError', () => {
  it('treats a 400 while a voucher was sent as a voucher error', () => {
    expect(mapQuoteError(new ApiError(400, 'Voucher is invalid or expired'), true)).toEqual({
      voucherError: true,
      message: 'Voucher is invalid or expired',
    });
  });

  it('does not blame the voucher when none was sent', () => {
    expect(mapQuoteError(new ApiError(400, 'Product unavailable'), false).voucherError).toBe(false);
  });

  it('maps unknown failures to a generic message', () => {
    expect(mapQuoteError(new TypeError('fetch failed'), true)).toEqual({
      voucherError: false,
      message: 'Something went wrong, please try again.',
    });
  });
});

describe('quote error scoping', () => {
  it('shows a non-voucher quote error only for the request that failed', () => {
    const state = voucherReducer(
      { ...INITIAL_VOUCHER_STATE, code: 'BREW10' },
      { type: 'failed', requestKey: 'k1', voucherError: false, message: 'Network down' },
    );
    expect(currentQuoteError(state, 'k1')).toBe('Network down');
    expect(currentQuoteError(state, 'k2')).toBeNull();
  });

  it('clears the quote error once a newer quote succeeds', () => {
    const failed = voucherReducer(INITIAL_VOUCHER_STATE, { type: 'failed', requestKey: 'k1', voucherError: false, message: 'x' });
    const ok = voucherReducer(failed, { type: 'quoted', requestKey: 'k2', quote });
    expect(currentQuoteError(ok, 'k1')).toBeNull();
    expect(ok.quoteErrorFor).toBeNull();
  });
});

describe('canConfirmPayment', () => {
  it('blocks confirmation while a quote is loading or missing', () => {
    expect(canConfirmPayment({ busy: false, pinned: false, hasLines: true, quote: null })).toBe(false);
  });

  it('blocks confirmation while busy', () => {
    expect(canConfirmPayment({ busy: true, pinned: false, hasLines: true, quote })).toBe(false);
  });

  it('allows confirmation once the cart has a server quote', () => {
    expect(canConfirmPayment({ busy: false, pinned: false, hasLines: true, quote })).toBe(true);
  });

  it('does not depend on a quote for a pinned order', () => {
    expect(canConfirmPayment({ busy: false, pinned: true, hasLines: false, quote: null })).toBe(true);
  });
});
