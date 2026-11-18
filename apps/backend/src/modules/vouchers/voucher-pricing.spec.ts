import { BadRequestException } from '@nestjs/common';
import {
  assertVoucherApplicable,
  computeDiscount,
  normalizeVoucherCode,
  pointsForTotal,
  VoucherRules,
} from './voucher-pricing';

const base: VoucherRules = {
  code: 'TEST',
  type: 'PERCENT',
  value: 10,
  minSubtotal: 0,
  maxDiscount: null,
  expiresAt: null,
  active: true,
  usageLimit: null,
  usedCount: 0,
};

const NOW = new Date('2026-10-24T00:00:00Z');

/** Runs the check and returns the reason code of the 400 it throws. */
function reasonOf(fn: () => unknown): string {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(BadRequestException);
    return ((err as BadRequestException).getResponse() as { code: string }).code;
  }
  throw new Error('expected a BadRequestException');
}

describe('computeDiscount', () => {
  it('floors a percent discount', () => {
    expect(computeDiscount({ type: 'PERCENT', value: 10, maxDiscount: null }, 55555)).toBe(5555);
  });

  it('caps a percent discount at maxDiscount', () => {
    expect(computeDiscount({ type: 'PERCENT', value: 10, maxDiscount: 30000 }, 500000)).toBe(30000);
  });

  it('does not cap a percent discount below maxDiscount', () => {
    expect(computeDiscount({ type: 'PERCENT', value: 10, maxDiscount: 30000 }, 100000)).toBe(10000);
  });

  it('returns the fixed value when it is below the subtotal', () => {
    expect(computeDiscount({ type: 'FIXED', value: 20000, maxDiscount: null }, 60000)).toBe(20000);
  });

  it('caps a fixed discount at the subtotal', () => {
    expect(computeDiscount({ type: 'FIXED', value: 20000, maxDiscount: null }, 15000)).toBe(15000);
  });

  it('never returns more than the subtotal for a 100% percent voucher', () => {
    expect(computeDiscount({ type: 'PERCENT', value: 100, maxDiscount: null }, 42000)).toBe(42000);
  });
});

describe('assertVoucherApplicable', () => {
  it('returns the discount for a valid voucher', () => {
    expect(assertVoucherApplicable(base, 100000, NOW)).toBe(10000);
  });

  it('rejects a missing voucher as not found', () => {
    expect(reasonOf(() => assertVoucherApplicable(null, 100000, NOW))).toBe('VOUCHER_NOT_FOUND');
  });

  it('treats an inactive voucher as not found', () => {
    expect(reasonOf(() => assertVoucherApplicable({ ...base, active: false }, 100000, NOW))).toBe('VOUCHER_NOT_FOUND');
  });

  it('rejects an expired voucher', () => {
    const expired = { ...base, expiresAt: new Date('2026-10-23T23:59:59Z') };
    expect(reasonOf(() => assertVoucherApplicable(expired, 100000, NOW))).toBe('VOUCHER_EXPIRED');
  });

  it('accepts a voucher that expires later', () => {
    const later = { ...base, expiresAt: new Date('2026-12-31T00:00:00Z') };
    expect(assertVoucherApplicable(later, 100000, NOW)).toBe(10000);
  });

  it('rejects a subtotal below minSubtotal', () => {
    const min = { ...base, minSubtotal: 50000 };
    expect(reasonOf(() => assertVoucherApplicable(min, 49999, NOW))).toBe('VOUCHER_MIN_SUBTOTAL');
    expect(assertVoucherApplicable(min, 50000, NOW)).toBe(5000);
  });

  it('rejects a voucher whose usage limit is reached', () => {
    const spent = { ...base, usageLimit: 1, usedCount: 1 };
    expect(reasonOf(() => assertVoucherApplicable(spent, 100000, NOW))).toBe('VOUCHER_EXHAUSTED');
  });

  it('accepts a voucher with one use left', () => {
    const last = { ...base, usageLimit: 2, usedCount: 1 };
    expect(assertVoucherApplicable(last, 100000, NOW)).toBe(10000);
  });

  it('has no usage cap when usageLimit is null', () => {
    const many = { ...base, usedCount: 1_000_000 };
    expect(assertVoucherApplicable(many, 100000, NOW)).toBe(10000);
  });
});

describe('loyalty and voucher code helpers', () => {
  it('earns one point per 10000 of total, rounded down', () => {
    expect(pointsForTotal(9999)).toBe(0);
    expect(pointsForTotal(10000)).toBe(1);
    expect(pointsForTotal(90000)).toBe(9);
  });

  it('normalizes voucher codes to trimmed uppercase, and blank means none', () => {
    expect(normalizeVoucherCode(' brew10 ')).toBe('BREW10');
    expect(normalizeVoucherCode('   ')).toBeNull();
    expect(normalizeVoucherCode(undefined)).toBeNull();
  });
});
