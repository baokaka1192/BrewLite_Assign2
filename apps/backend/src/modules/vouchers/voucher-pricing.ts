import { BadRequestException } from '@nestjs/common';

export type VoucherKind = 'PERCENT' | 'FIXED';

/** Fields of a Voucher row that pricing needs. */
export interface VoucherRules {
  code: string;
  type: VoucherKind;
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  expiresAt: Date | null;
  active: boolean;
  usageLimit: number | null;
  usedCount: number;
}

/** Spend that earns one loyalty point. */
export const POINTS_UNIT = 10_000;

/** Trims and uppercases a client voucher code. Empty input means "no voucher". */
export function normalizeVoucherCode(code: string | null | undefined): string | null {
  const normalized = code?.trim().toUpperCase() ?? '';
  return normalized === '' ? null : normalized;
}

/** Points granted for a PAID order total: floor(total / 10000). */
export function pointsForTotal(total: number): number {
  return Math.floor(total / POINTS_UNIT);
}

/**
 * Discount in VND for a subtotal. PERCENT is floored and capped by maxDiscount; FIXED is the value.
 * Both are capped at the subtotal, so the total never goes negative.
 */
export function computeDiscount(voucher: Pick<VoucherRules, 'type' | 'value' | 'maxDiscount'>, subtotal: number): number {
  let discount = voucher.type === 'PERCENT' ? Math.floor((subtotal * voucher.value) / 100) : voucher.value;
  if (voucher.type === 'PERCENT' && voucher.maxDiscount !== null) {
    discount = Math.min(discount, voucher.maxDiscount);
  }
  return Math.max(0, Math.min(discount, subtotal));
}

/**
 * Checks a voucher against a subtotal and returns its discount. Throws 400 with a machine-readable
 * `code` for: VOUCHER_NOT_FOUND (missing or inactive), VOUCHER_EXPIRED, VOUCHER_MIN_SUBTOTAL,
 * VOUCHER_EXHAUSTED.
 */
export function assertVoucherApplicable(
  voucher: VoucherRules | null,
  subtotal: number,
  now: Date = new Date(),
): number {
  if (!voucher || !voucher.active) {
    throw voucherError('VOUCHER_NOT_FOUND', 'Voucher code not found');
  }
  if (voucher.expiresAt !== null && voucher.expiresAt.getTime() <= now.getTime()) {
    throw voucherError('VOUCHER_EXPIRED', 'Voucher has expired');
  }
  if (subtotal < voucher.minSubtotal) {
    throw voucherError('VOUCHER_MIN_SUBTOTAL', `Order subtotal must be at least ${voucher.minSubtotal}`);
  }
  if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
    throw voucherError('VOUCHER_EXHAUSTED', 'Voucher usage limit reached');
  }
  return computeDiscount(voucher, subtotal);
}

export function voucherError(code: string, message: string): BadRequestException {
  return new BadRequestException({ statusCode: 400, error: 'Bad Request', code, message });
}
