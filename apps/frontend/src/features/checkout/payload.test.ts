import { describe, expect, it } from 'vitest';
import type { CartLine } from '@/store/cart';
import { buildOrderPayload, buildPaymentPayload, normalizeCardNumber } from './payload';

function line(overrides: Partial<CartLine>): CartLine {
  return {
    key: 'p1||',
    productId: 'p1',
    name: 'Espresso',
    imageUrl: '',
    toppingIds: [],
    toppingNames: [],
    unitPrice: 45000,
    qty: 1,
    ...overrides,
  };
}

describe('buildOrderPayload', () => {
  it('sends only productId, size, toppingIds and qty per line', () => {
    const payload = buildOrderPayload([
      line({ productId: 'p1', sizeCode: 'L', toppingIds: ['t2', 't1'], qty: 2 }),
      line({ key: 'p2||', productId: 'p2', qty: 1 }),
    ]);

    expect(payload).toEqual({
      items: [
        { productId: 'p1', size: 'L', toppingIds: ['t2', 't1'], qty: 2 },
        { productId: 'p2', qty: 1 },
      ],
    });
  });

  it('never leaks prices or display names', () => {
    const [item] = buildOrderPayload([line({ unitPrice: 99000, name: 'Secret' })]).items;
    expect(item).not.toHaveProperty('unitPrice');
    expect(item).not.toHaveProperty('name');
  });

  it('returns an empty item list for an empty cart', () => {
    expect(buildOrderPayload([])).toEqual({ items: [] });
  });
});

describe('buildPaymentPayload', () => {
  it('omits cardNumber for wallet payments', () => {
    expect(buildPaymentPayload({ orderId: 'o1', method: 'WALLET', cardNumber: '4111' })).toEqual({
      orderId: 'o1',
      method: 'WALLET',
    });
  });

  it('strips spaces and dashes from card numbers', () => {
    expect(buildPaymentPayload({ orderId: 'o1', method: 'CARD', cardNumber: '4111 1111-1111 0000' })).toEqual({
      orderId: 'o1',
      method: 'CARD',
      cardNumber: '4111111111110000',
    });
  });
});

describe('normalizeCardNumber', () => {
  it('keeps only the typed digits', () => {
    expect(normalizeCardNumber(' 4111-1111 1111 0000 ')).toBe('4111111111110000');
  });
});
