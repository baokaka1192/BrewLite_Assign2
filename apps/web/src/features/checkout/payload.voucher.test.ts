import { describe, expect, it } from 'vitest';
import type { CartLine } from '@/store/cart';
import { buildOrderPayload, buildQuoteRequest, normalizeVoucherCode } from './payload';

const lines: CartLine[] = [
  {
    key: 'p1||',
    productId: 'p1',
    name: 'Espresso',
    imageUrl: '',
    toppingIds: [],
    toppingNames: [],
    unitPrice: 45000,
    qty: 2,
  },
];

describe('buildQuoteRequest', () => {
  it('uses the order payload and adds the voucher code when present', () => {
    expect(buildQuoteRequest(lines, 'BREW10')).toEqual({ ...buildOrderPayload(lines), voucherCode: 'BREW10' });
  });

  it('omits voucherCode when no voucher is applied', () => {
    expect(buildQuoteRequest(lines, null)).toEqual(buildOrderPayload(lines));
    expect('voucherCode' in buildQuoteRequest(lines)).toBe(false);
  });

  it('never includes client-computed prices', () => {
    expect(JSON.stringify(buildQuoteRequest(lines, 'BREW10'))).not.toContain('45000');
  });
});

describe('normalizeVoucherCode', () => {
  it('trims and upper-cases input', () => {
    expect(normalizeVoucherCode('  brew10 ')).toBe('BREW10');
  });

  it('returns null for blank input', () => {
    expect(normalizeVoucherCode('   ')).toBeNull();
  });
});
