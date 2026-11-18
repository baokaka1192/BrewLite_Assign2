import { describe, expect, it } from 'vitest';
import {
  cartSignature,
  isVoucherLocked,
  lockedVoucherCode,
  pendingCreateKey,
  pendingOrderId,
  reconcileCheckout,
  type CheckoutSnapshot,
} from './checkout-state';

const remembered: CheckoutSnapshot = {
  orderId: 'order-1',
  orderKey: null,
  cartSignature: cartSignature([{ key: 'p1||', qty: 2 }]),
  voucherCode: null,
};

describe('cartSignature', () => {
  it('ignores line order', () => {
    const a = cartSignature([
      { key: 'p1||', qty: 1 },
      { key: 'p2||', qty: 3 },
    ]);
    const b = cartSignature([
      { key: 'p2||', qty: 3 },
      { key: 'p1||', qty: 1 },
    ]);
    expect(a).toBe(b);
  });

  it('changes when a quantity changes', () => {
    expect(cartSignature([{ key: 'p1||', qty: 1 }])).not.toBe(cartSignature([{ key: 'p1||', qty: 2 }]));
  });
});

describe('pendingOrderId', () => {
  it('returns the remembered order for the same cart', () => {
    expect(pendingOrderId(remembered, remembered.cartSignature!)).toBe('order-1');
  });

  it('returns null once the cart has changed', () => {
    const changed = cartSignature([{ key: 'p1||', qty: 3 }]);
    expect(pendingOrderId(remembered, changed)).toBeNull();
  });

  it('returns null when nothing is remembered', () => {
    expect(pendingOrderId({ orderId: null, orderKey: null, cartSignature: null, voucherCode: null }, '[]')).toBeNull();
  });
});

describe('pendingCreateKey', () => {
  const withKey: CheckoutSnapshot = { orderId: null, orderKey: 'key-create-1', cartSignature: remembered.cartSignature, voucherCode: null };

  it('returns the creation key remembered for the same cart', () => {
    expect(pendingCreateKey(withKey, withKey.cartSignature!)).toBe('key-create-1');
  });

  it('returns null once the cart has changed, so a new order gets a new key', () => {
    expect(pendingCreateKey(withKey, cartSignature([{ key: 'p1||', qty: 3 }]))).toBeNull();
  });

  it('returns null when no key is remembered', () => {
    expect(pendingCreateKey(remembered, remembered.cartSignature!)).toBeNull();
  });
});

describe('reconcileCheckout', () => {
  it('keeps the snapshot untouched while the cart matches', () => {
    expect(reconcileCheckout(remembered, remembered.cartSignature!)).toBe(remembered);
  });

  it('resets the snapshot when the cart changes', () => {
    expect(reconcileCheckout(remembered, cartSignature([]))).toEqual({ orderId: null, orderKey: null, cartSignature: null, voucherCode: null });
  });
});

describe('voucher lock', () => {
  const sig = cartSignature([{ key: 'p1||', qty: 2 }]);

  it('is locked while a pending order exists for the same cart', () => {
    const snap: CheckoutSnapshot = { orderId: 'order-1', orderKey: null, cartSignature: sig, voucherCode: 'BREW10' };
    expect(isVoucherLocked(snap, sig)).toBe(true);
    expect(lockedVoucherCode(snap, sig)).toBe('BREW10');
  });

  it('is locked while an order creation key is pending', () => {
    const snap: CheckoutSnapshot = { orderId: null, orderKey: 'key-1', cartSignature: sig, voucherCode: null };
    expect(isVoucherLocked(snap, sig)).toBe(true);
    expect(lockedVoucherCode(snap, sig)).toBeNull();
  });

  it('is unlocked when the cart changed', () => {
    const snap: CheckoutSnapshot = { orderId: 'order-1', orderKey: null, cartSignature: sig, voucherCode: 'BREW10' };
    expect(isVoucherLocked(snap, 'other')).toBe(false);
    expect(lockedVoucherCode(snap, 'other')).toBeNull();
  });
});
