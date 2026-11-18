import { api } from '@/lib/api';
import type { OrderDetail, OrderHistoryPage } from '@/types/order';

export const ORDERS_PAGE_SIZE = 10;

export function getOrder(orderId: string) {
  return api<OrderDetail>(`/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' });
}

export function listMyOrders(page: number, limit: number = ORDERS_PAGE_SIZE) {
  return api<OrderHistoryPage>(`/orders/me?page=${page}&limit=${limit}`, { cache: 'no-store' });
}
