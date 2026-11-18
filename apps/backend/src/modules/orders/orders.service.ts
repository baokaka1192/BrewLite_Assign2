import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hashRequest } from '../../common/idempotency';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductSize, SizeCode, Topping } from '../products/product.entity';
import { CartItemDto, CreateOrderDto } from './dto/create-order.dto';
import { MY_ORDERS_DEFAULT_LIMIT } from './dto/list-my-orders-query.dto';
import { StaffTargetStatus } from './dto/update-order-status.dto';
import { assertTransition } from './order-state';
import {
  assertVoucherApplicable,
  normalizeVoucherCode,
  pointsForTotal,
  voucherError,
  VoucherRules,
} from '../vouchers/voucher-pricing';

type ProductRow = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  stock: number;
  sizes: unknown;
  toppings: unknown;
};

export interface PricedLine {
  productId: string;
  name: string;
  size: string;
  toppings: Topping[];
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderResponse {
  id: string;
  status: string;
  total: number;
  discount: number;
  voucherCode: string | null;
  pointsEarned: number;
  items: PricedLine[];
  createdAt: Date;
}

export interface OrderQuote {
  subtotal: number;
  discount: number;
  total: number;
  voucher: { code: string; type: string; value: number } | null;
  pointsToEarn: number;
}

export interface CreateOrderOutcome {
  order: OrderResponse;
  /** True when the Idempotency-Key was already used and the stored order was returned. */
  replayed: boolean;
}

export interface OrderDetailItem {
  productName: string;
  size: string;
  toppings: Topping[];
  qty: number;
  lineTotal: number;
}

export interface OrderDetail {
  id: string;
  status: string;
  total: number;
  discount: number;
  voucherCode: string | null;
  pointsEarned: number;
  createdAt: Date;
  latestPaymentStatus: string | null;
  items: OrderDetailItem[];
}

export interface OrderHistoryPage {
  items: OrderDetail[];
  page: number;
  limit: number;
  total: number;
}

const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Optimistic-lock attempts per product before the order answers 409. */
export const STOCK_RESERVE_MAX_ATTEMPTS = 5;
/** Base backoff between attempts; each retry adds a random jitter of up to the same amount. */
export const STOCK_RESERVE_BACKOFF_MS = 5;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Sums qty per product id and returns the ids sorted, so every transaction locks rows in the same order. */
function qtyByProductSorted(lines: { productId: string; qty: number }[]): [string, number][] {
  const qty = new Map<string, number>();
  for (const line of lines) {
    qty.set(line.productId, (qty.get(line.productId) ?? 0) + line.qty);
  }
  return [...qty.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

const ORDER_DETAIL_INCLUDE = {
  items: {
    orderBy: { id: 'asc' },
    include: { product: { select: { name: true } } },
  },
  payments: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { status: true },
  },
} satisfies Prisma.OrderInclude;

type OrderWithDetail = Prisma.OrderGetPayload<{ include: typeof ORDER_DETAIL_INCLUDE }>;

const IDEMPOTENT_ORDER_INCLUDE = {
  items: {
    orderBy: { id: 'asc' },
    include: { product: { select: { name: true } } },
  },
} satisfies Prisma.OrderInclude;

type IdempotentOrder = Prisma.OrderGetPayload<{ include: typeof IDEMPOTENT_ORDER_INCLUDE }>;

/** Interactive transactions with stock locks; the default 5s timeout is too tight under a burst of orders. */
const TX_OPTIONS = { timeout: 10_000, maxWait: 10_000 };

/** Canonical request fingerprint for Idempotency-Key reuse checks. Field order is fixed. */
function orderRequestPayload(dto: CreateOrderDto): unknown {
  return {
    items: dto.items.map((i) => ({
      productId: i.productId,
      size: i.size ?? null,
      toppingIds: [...(i.toppingIds ?? [])].sort(),
      qty: i.qty,
    })),
    note: dto.note ?? null,
    voucherCode: normalizeVoucherCode(dto.voucherCode),
  };
}

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === 'P2002';
}

/**
 * Prices every cart line from the DB product rows. Pure function so the
 * price rules can be unit tested without a database.
 */
export function priceCart(
  items: CartItemDto[],
  products: Map<string, ProductRow>,
): PricedLine[] {
  const requestedQty = new Map<string, number>();
  for (const item of items) {
    requestedQty.set(item.productId, (requestedQty.get(item.productId) ?? 0) + item.qty);
  }

  return items.map((item) => {
    const product = products.get(item.productId);
    if (!product) {
      throw new NotFoundException(`Product ${item.productId} not found`);
    }
    // Stock before availability: a sold-out product is hidden (available=false), but callers still get 409 for it.
    if ((requestedQty.get(item.productId) ?? 0) > product.stock) {
      throw new ConflictException(`Insufficient stock for product ${item.productId}`);
    }
    if (!product.available) {
      throw new BadRequestException(`Product ${item.productId} is not available`);
    }

    const sizes = (product.sizes as ProductSize[]) ?? [];
    let sizeCode = '';
    let sizeDelta = 0;
    if (sizes.length > 0) {
      // Default to the product's base size when the client omits it.
      const requested: SizeCode = item.size ?? sizes[0].code;
      const match = sizes.find((s) => s.code === requested);
      if (!match) {
        throw new BadRequestException(`Size ${requested} is not available for product ${item.productId}`);
      }
      sizeCode = match.code;
      sizeDelta = match.delta;
    } else if (item.size !== undefined) {
      throw new BadRequestException(`Product ${item.productId} does not have sizes`);
    }

    const available = (product.toppings as Topping[]) ?? [];
    const toppings: Topping[] = (item.toppingIds ?? []).map((id) => {
      const topping = available.find((t) => t.id === id);
      if (!topping) {
        throw new BadRequestException(`Topping ${id} is not available for product ${item.productId}`);
      }
      return { id: topping.id, name: topping.name, price: topping.price };
    });

    const unitPrice =
      product.price + sizeDelta + toppings.reduce((sum, t) => sum + t.price, 0);
    return {
      productId: product.id,
      name: product.name,
      size: sizeCode,
      toppings,
      qty: item.qty,
      unitPrice,
      lineTotal: unitPrice * item.qty,
    };
  });
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Orders of one user, newest first. Sorting by id breaks ties between equal timestamps. */
  async listMyOrders(
    userId: string,
    query: { page?: number; limit?: number },
  ): Promise<OrderHistoryPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? MY_ORDERS_DEFAULT_LIMIT;
    const where = { userId };

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: ORDER_DETAIL_INCLUDE,
      }),
    ]);

    return { items: orders.map((o) => this.toOrderDetail(o)), page, limit, total };
  }

  /** Single order for the confirmation page. Other users' orders answer 404, not 403. */
  async getMyOrder(orderId: string, userId: string): Promise<OrderDetail> {
    return this.findDetail(orderId, { userId });
  }

  /**
   * Owner cancel. Allowed from PENDING, PAYMENT_FAILED, PAID and PREPARING per the state machine.
   * Refunds are out of scope: a PAID order is cancelled without money moving back.
   */
  async cancelMyOrder(orderId: string, userId: string): Promise<OrderDetail> {
    const order = await this.findOrderState(orderId, { userId });
    assertTransition(order.status, 'CANCELLED');

    const inFlight = await this.prisma.payment.count({ where: { orderId, status: 'PROCESSING' } });
    if (inFlight > 0) {
      throw new ConflictException('Order has a payment in progress and cannot be cancelled');
    }

    await this.prisma.$transaction(async (tx) => {
      // The status guard makes this the only path that can move the order to CANCELLED, so stock, voucher usage and points are reversed once.
      const moved = await tx.order.updateMany({
        where: { id: orderId, userId, status: order.status, version: order.version },
        data: { status: 'CANCELLED', version: { increment: 1 } },
      });
      if (moved.count === 0) {
        throw new ConflictException('Order changed while cancelling, please retry');
      }
      await this.restoreStock(tx, orderId);
      if (order.voucherCode) {
        await tx.voucher.updateMany({
          where: { code: order.voucherCode, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }
      if (order.pointsEarned > 0) {
        // Clamped at zero so the balance never goes negative.
        await tx.$executeRaw`UPDATE "User" SET "loyaltyPoints" = GREATEST("loyaltyPoints" - ${order.pointsEarned}, 0) WHERE "id" = ${userId}`;
      }
    }, TX_OPTIONS);
    return this.getMyOrder(orderId, userId);
  }

  /** Gives the reserved quantities of an order back to stock. Must run in the same transaction as the CANCELLED move. */
  private async restoreStock(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
    const items = await tx.orderItem.findMany({ where: { orderId }, select: { productId: true, qty: true } });
    for (const [productId, qty] of qtyByProductSorted(items)) {
      // Sold-out products were hidden when stock hit 0; show them again once stock comes back.
      await tx.product.updateMany({
        where: { id: productId, stock: 0, available: false },
        data: { available: true },
      });
      await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: qty }, version: { increment: 1 } },
      });
    }
  }

  /** Staff advancement (PAID -> PREPARING -> READY -> COMPLETED). Access is checked by StaffKeyGuard. */
  async advanceStatus(orderId: string, to: StaffTargetStatus): Promise<OrderDetail> {
    const order = await this.findOrderState(orderId, {});
    assertTransition(order.status, to);

    const moved = await this.prisma.order.updateMany({
      where: { id: orderId, status: order.status, version: order.version },
      data: { status: to, version: { increment: 1 } },
    });
    if (moved.count === 0) {
      throw new ConflictException('Order changed while updating, please retry');
    }
    return this.findDetail(orderId, {});
  }

  private async findOrderState(orderId: string, scope: { userId?: string }) {
    // Ids are cuids. Anything else (e.g. NUL bytes) cannot exist and would make Postgres fail, so answer 404.
    if (!ORDER_ID_PATTERN.test(orderId)) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, ...scope },
      select: { id: true, status: true, version: true, voucherCode: true, pointsEarned: true },
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    return order;
  }

  private async findDetail(orderId: string, scope: { userId?: string }): Promise<OrderDetail> {
    if (!ORDER_ID_PATTERN.test(orderId)) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, ...scope },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    return this.toOrderDetail(order);
  }

  private toOrderDetail(order: OrderWithDetail): OrderDetail {
    return {
      id: order.id,
      status: order.status,
      total: order.total,
      discount: order.discount,
      voucherCode: order.voucherCode,
      pointsEarned: order.pointsEarned,
      createdAt: order.createdAt,
      latestPaymentStatus: order.payments[0]?.status ?? null,
      items: order.items.map((item) => ({
        productName: item.product.name,
        size: item.size,
        toppings: item.toppings as unknown as Topping[],
        qty: item.qty,
        lineTotal: item.lineTotal,
      })),
    };
  }

  /** Prices a cart with an optional voucher without writing anything. Shared by quote and create. */
  async quoteOrder(dto: CreateOrderDto): Promise<OrderQuote> {
    const priced = await this.priceWithVoucher(dto);
    return {
      subtotal: priced.subtotal,
      discount: priced.discount,
      total: priced.total,
      voucher: priced.voucher
        ? { code: priced.voucher.code, type: priced.voucher.type, value: priced.voucher.value }
        : null,
      pointsToEarn: pointsForTotal(priced.total),
    };
  }

  /** Prices the cart and validates the voucher (400 with a reason code when it does not apply). Reads only. */
  private async priceWithVoucher(dto: CreateOrderDto) {
    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const rows = await this.prisma.product.findMany({ where: { id: { in: ids } } });
    const products = new Map<string, ProductRow>(rows.map((r) => [r.id, r]));

    const lines = priceCart(dto.items, products);
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

    const voucherCode = normalizeVoucherCode(dto.voucherCode);
    const voucher = voucherCode
      ? await this.prisma.voucher.findUnique({ where: { code: voucherCode } })
      : null;
    const discount = voucherCode ? assertVoucherApplicable(voucher as VoucherRules | null, subtotal) : 0;
    return { lines, subtotal, discount, total: subtotal - discount, voucherCode, voucher };
  }

  /**
   * Creates a PENDING order. Same Idempotency-Key + same user returns the stored order (replayed);
   * the same key with a different body is rejected with 422. Concurrent duplicates are resolved by
   * the (userId, idempotencyKey) unique index: the loser re-reads the winner's order.
   */
  async createOrder(dto: CreateOrderDto, userId: string, idempotencyKey: string): Promise<CreateOrderOutcome> {
    const requestHash = hashRequest(orderRequestPayload(dto));

    // Checked before pricing so a replay returns the original order even if prices or stock changed since.
    const existing = await this.findIdempotentOrder(userId, idempotencyKey);
    if (existing) {
      return this.replayOrder(existing, requestHash);
    }

    const { lines, discount, total, voucherCode } = await this.priceWithVoucher(dto);

    // Stock and voucher usage are reserved in the same transaction as the order, so a failure anywhere rolls back all of them.
    let order: { id: string; status: string; total: number; discount: number; voucherCode: string | null; pointsEarned: number; createdAt: Date };
    try {
      order = await this.prisma.$transaction(async (tx) => {
        await this.reserveStock(tx, lines);
        if (voucherCode) {
          await this.consumeVoucher(tx, voucherCode);
        }
        return tx.order.create({
          data: {
            userId,
            status: 'PENDING',
            total,
            discount,
            voucherCode,
            note: dto.note ?? null,
            idempotencyKey,
            requestHash,
            items: {
              create: lines.map((l) => ({
                product: { connect: { id: l.productId } },
                size: l.size,
                toppings: l.toppings.map((t) => ({ id: t.id, name: t.name, price: t.price })),
                qty: l.qty,
                lineTotal: l.lineTotal,
              })),
            },
          },
          select: { id: true, status: true, total: true, discount: true, voucherCode: true, pointsEarned: true, createdAt: true },
        });
      }, TX_OPTIONS);
    } catch (err) {
      if (isUniqueViolation(err)) {
        const winner = await this.findIdempotentOrder(userId, idempotencyKey);
        if (winner) {
          return this.replayOrder(winner, requestHash);
        }
      }
      throw err;
    }

    return {
      order: {
        id: order.id,
        status: order.status,
        total: order.total,
        discount: order.discount,
        voucherCode: order.voucherCode,
        pointsEarned: order.pointsEarned,
        items: lines,
        createdAt: order.createdAt,
      },
      replayed: false,
    };
  }

  /**
   * Counts one use of a voucher. A single conditional UPDATE takes the row lock, so concurrent checkouts
   * cannot both pass the usage limit. Throwing here rolls back the stock reservation and the order too.
   */
  private async consumeVoucher(tx: Prisma.TransactionClient, code: string): Promise<void> {
    // Expiry is compared against UTC wall-clock time: Voucher.expiresAt is timestamp(3) without a time zone (stored as UTC).
    const used = await tx.$executeRaw`UPDATE "Voucher" SET "usedCount" = "usedCount" + 1 WHERE "code" = ${code} AND "active" = true AND ("expiresAt" IS NULL OR "expiresAt" > (NOW() AT TIME ZONE 'UTC')) AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
    if (used === 0) {
      throw voucherError('VOUCHER_EXHAUSTED', 'Voucher usage limit reached');
    }
  }

  /**
   * Decrements stock for every product in the cart. Each product is reserved with an optimistic lock
   * (UPDATE ... WHERE version = read version AND stock >= qty). A lost race re-reads the row and retries.
   */
  private async reserveStock(tx: Prisma.TransactionClient, lines: PricedLine[]): Promise<void> {
    for (const [productId, qty] of qtyByProductSorted(lines)) {
      await this.reserveProductStock(tx, productId, qty);
    }
  }

  private async reserveProductStock(tx: Prisma.TransactionClient, productId: string, qty: number): Promise<void> {
    for (let attempt = 1; attempt <= STOCK_RESERVE_MAX_ATTEMPTS; attempt++) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, stock: true, version: true },
      });
      if (!product) {
        throw new NotFoundException(`Product ${productId} not found`);
      }
      if (product.stock < qty) {
        throw new ConflictException(`Insufficient stock for ${product.name}`);
      }

      const reserved = await tx.product.updateMany({
        where: { id: productId, version: product.version, stock: { gte: qty } },
        data: { stock: { decrement: qty }, version: { increment: 1 } },
      });
      if (reserved.count === 1) {
        // Hide the product once it sells out. Same transaction, so the flag and stock never disagree.
        await tx.product.updateMany({
          where: { id: productId, stock: 0, available: true },
          data: { available: false },
        });
        return;
      }

      // Another transaction changed the row between our read and update: back off, then re-read.
      if (attempt < STOCK_RESERVE_MAX_ATTEMPTS) {
        const jitter = Math.floor(Math.random() * STOCK_RESERVE_BACKOFF_MS);
        await sleep(STOCK_RESERVE_BACKOFF_MS * attempt + jitter);
      }
    }
    throw new ConflictException('Stock changed while ordering, please retry');
  }

  private findIdempotentOrder(userId: string, idempotencyKey: string): Promise<IdempotentOrder | null> {
    return this.prisma.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      include: IDEMPOTENT_ORDER_INCLUDE,
    });
  }

  private replayOrder(order: IdempotentOrder, requestHash: string): CreateOrderOutcome {
    if (order.requestHash !== requestHash) {
      throw new UnprocessableEntityException('Idempotency-Key was already used with a different request');
    }
    return {
      order: {
        id: order.id,
        status: order.status,
        total: order.total,
        discount: order.discount,
        voucherCode: order.voucherCode,
        pointsEarned: order.pointsEarned,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          productId: item.productId,
          name: item.product.name,
          size: item.size,
          toppings: item.toppings as unknown as Topping[],
          qty: item.qty,
          unitPrice: item.lineTotal / item.qty,
          lineTotal: item.lineTotal,
        })),
      },
      replayed: true,
    };
  }
}
