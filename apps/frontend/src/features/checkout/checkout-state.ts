import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartLine } from '@/store/cart';

export interface CheckoutSnapshot {
  /** Order created from the cart and not yet paid. Reused on retry so a failed payment never creates a second order. */
  orderId: string | null;
  /**
   * Idempotency-Key of the in-flight order creation for this cart. Kept across reloads and retries so a
   * creation that may have reached the server (network error) is replayed by the server, not duplicated.
   */
  orderKey: string | null;
  /** Signature of the cart the order was created from; a different cart invalidates orderId and orderKey. */
  cartSignature: string | null;
  /** Voucher the pending order (or its creation attempt) was sent with; locked while that order is pending. */
  voucherCode: string | null;
}

export interface CheckoutState extends CheckoutSnapshot {
  rememberOrder: (orderId: string, cartSignature: string, voucherCode?: string | null) => void;
  rememberOrderKey: (orderKey: string, cartSignature: string, voucherCode?: string | null) => void;
  /** Drops the creation key after a definitive answer, so the next attempt creates a new order. */
  forgetOrderKey: () => void;
  /** Drops the remembered order when the cart no longer matches it. */
  syncWithCart: (cartSignature: string) => void;
  reset: () => void;
}

const EMPTY_SNAPSHOT: CheckoutSnapshot = { orderId: null, orderKey: null, cartSignature: null, voucherCode: null };

/** Stable description of cart contents (line key and quantity), independent of line order. */
export function cartSignature(lines: readonly Pick<CartLine, 'key' | 'qty'>[]): string {
  return JSON.stringify(lines.map((l) => [l.key, l.qty]).sort());
}

/** Returns the remembered order only while the cart is unchanged since it was created. */
export function pendingOrderId(snapshot: CheckoutSnapshot, signature: string): string | null {
  return snapshot.orderId !== null && snapshot.cartSignature === signature ? snapshot.orderId : null;
}

/** Returns the creation key remembered for the same cart, or null (a new key is then generated). */
export function pendingCreateKey(snapshot: CheckoutSnapshot, signature: string): string | null {
  return snapshot.orderKey !== null && snapshot.cartSignature === signature ? snapshot.orderKey : null;
}

/** True while a pending order (or its creation attempt) exists for this cart; its voucher can no longer change. */
export function isVoucherLocked(snapshot: CheckoutSnapshot, signature: string): boolean {
  return pendingOrderId(snapshot, signature) !== null || pendingCreateKey(snapshot, signature) !== null;
}

/** Voucher code of the pending order for this cart, or null when none is locked. */
export function lockedVoucherCode(snapshot: CheckoutSnapshot, signature: string): string | null {
  return isVoucherLocked(snapshot, signature) ? (snapshot.voucherCode ?? null) : null;
}

/** Returns the snapshot as-is when it belongs to this cart, otherwise an empty snapshot. */
export function reconcileCheckout(snapshot: CheckoutSnapshot, signature: string): CheckoutSnapshot {
  return snapshot.cartSignature === signature ? snapshot : EMPTY_SNAPSHOT;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      ...EMPTY_SNAPSHOT,

      rememberOrder: (orderId, cartSignature, voucherCode = null) =>
        set({ orderId, orderKey: null, cartSignature, voucherCode }),

      rememberOrderKey: (orderKey, cartSignature, voucherCode = null) =>
        set({ orderKey, cartSignature, voucherCode }),

      forgetOrderKey: () => set({ orderKey: null }),

      // Returning the same state object is a no-op for zustand, so matching carts cause no update.
      syncWithCart: (signature) => set((state) => reconcileCheckout(state, signature)),

      reset: () => set({ ...EMPTY_SNAPSHOT }),
    }),
    {
      name: 'brewlite-checkout',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        orderId: state.orderId,
        orderKey: state.orderKey,
        cartSignature: state.cartSignature,
        voucherCode: state.voucherCode,
      }),
    },
  ),
);
