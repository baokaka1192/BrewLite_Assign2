import type { CartLine } from '@/store/cart';
import type { OrderPayload, PaymentInput, QuoteRequest } from '@/types/order';

/** Builds POST /orders body from cart lines; only ids, size, toppings and qty are sent. */
export function buildOrderPayload(lines: readonly CartLine[], voucherCode?: string | null): OrderPayload {
  return {
    items: lines.map((line) => ({
      productId: line.productId,
      ...(line.sizeCode ? { size: line.sizeCode } : {}),
      ...(line.toppingIds.length > 0 ? { toppingIds: [...line.toppingIds] } : {}),
      qty: line.qty,
    })),
    ...(voucherCode ? { voucherCode } : {}),
  };
}

/** Builds POST /orders/quote body: the order payload plus the voucher being previewed, if any. */
export function buildQuoteRequest(lines: readonly CartLine[], voucherCode?: string | null): QuoteRequest {
  return buildOrderPayload(lines, voucherCode);
}

/** Trims and upper-cases a voucher code typed by the user; empty input becomes null. */
export function normalizeVoucherCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return code ? code : null;
}

/** Removes spaces and dashes typed into the card number field. */
export function normalizeCardNumber(input: string): string {
  return input.replace(/[\s-]/g, '');
}

/** Body for POST /payments; cardNumber is only included for card payments. */
export function buildPaymentPayload(input: PaymentInput): Record<string, string> {
  if (input.method === 'CARD') {
    return { orderId: input.orderId, method: 'CARD', cardNumber: normalizeCardNumber(input.cardNumber ?? '') };
  }
  return { orderId: input.orderId, method: 'WALLET' };
}
