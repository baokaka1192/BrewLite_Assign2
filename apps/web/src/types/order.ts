export type PaymentMethod = 'WALLET' | 'CARD';

export interface OrderPayloadItem {
  productId: string;
  size?: string;
  toppingIds?: string[];
  qty: number;
}

/** Body for POST /orders: ids, size and quantities only (prices are computed server-side). */
export interface OrderPayload {
  items: OrderPayloadItem[];
  note?: string;
  voucherCode?: string;
}

/** Body for POST /orders/quote: same items as an order plus an optional voucher code. */
export type QuoteRequest = OrderPayload;

export interface VoucherInfo {
  code: string;
  type: string;
  value: number;
}

/** Response of POST /orders/quote; the server is the only source of totals and discounts. */
export interface QuoteResponse {
  subtotal: number;
  discount: number;
  total: number;
  voucher: VoucherInfo | null;
  pointsToEarn: number;
}

export interface CreatedOrder {
  id: string;
  status: string;
  total: number;
  discount: number;
  voucherCode: string | null;
  pointsEarned: number;
  createdAt: string;
}

export interface ToppingSnapshot {
  id: string;
  name: string;
  price: number;
}

export interface OrderDetailItem {
  productName: string;
  size: string;
  toppings: ToppingSnapshot[];
  qty: number;
  lineTotal: number;
}

/** Response of GET /orders/:id and each entry of GET /orders/me. */
export interface OrderDetail {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  latestPaymentStatus: string | null;
  items: OrderDetailItem[];
  /** Amount before the voucher discount; the server sends total and discount, so subtotal is total + discount. */
  discount: number;
  voucherCode: string | null;
  pointsEarned: number;
}

export interface OrderHistoryPage {
  items: OrderDetail[];
  page: number;
  limit: number;
  total: number;
}

export interface PaymentInput {
  orderId: string;
  method: PaymentMethod;
  /** Raw card number as typed; only sent for CARD. */
  cardNumber?: string;
}

export interface PaymentResult {
  payment: unknown;
  order: { id: string; status: string };
}
