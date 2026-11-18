import { describe, expect, it } from 'vitest';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/lib/api';
import { mapPaymentError } from './payment-errors';

describe('mapPaymentError', () => {
  it('maps 402 to a declined error that includes the decline reason', () => {
    const info = mapPaymentError(new ApiError(402, 'Payment failed', 'Card declined'));
    expect(info.kind).toBe('declined');
    expect(info.message).toContain('Card declined');
    expect(info.message).toContain('Your cart is unchanged');
  });

  it('falls back to the 402 message when no reason is given', () => {
    expect(mapPaymentError(new ApiError(402, 'Payment failed')).message).toContain('Payment failed');
  });

  it('maps 409 to a conflict with the server message', () => {
    expect(mapPaymentError(new ApiError(409, 'Order already paid'))).toEqual({
      kind: 'conflict',
      message: 'Order already paid',
    });
  });

  it('maps 401 to an unauthorized error asking for login', () => {
    const info = mapPaymentError(new ApiError(401, 'Unauthorized'));
    expect(info.kind).toBe('unauthorized');
    expect(info.message).toMatch(/log in/i);
  });

  it('passes validation messages (400) through', () => {
    expect(mapPaymentError(new ApiError(400, 'items must not be empty'))).toEqual({
      kind: 'invalid',
      message: 'items must not be empty',
    });
  });

  it('treats 403 and 404 as a stale remembered order', () => {
    expect(mapPaymentError(new ApiError(404, 'Order not found')).kind).toBe('stale');
    expect(mapPaymentError(new ApiError(403, 'Forbidden')).kind).toBe('stale');
  });

  it('uses the generic message for non-API errors', () => {
    expect(mapPaymentError(new TypeError('Failed to fetch'))).toEqual({
      kind: 'unknown',
      message: GENERIC_ERROR_MESSAGE,
    });
  });
});
