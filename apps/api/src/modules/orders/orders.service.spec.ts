import { BadRequestException, ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartItemDto, CreateOrderDto } from './dto/create-order.dto';
import { OrdersService, priceCart } from './orders.service';

const coffee = {
  id: '1',
  name: 'Latte',
  price: 40000,
  available: true,
  stock: 10,
  sizes: [
    { code: 'S', delta: 0 },
    { code: 'M', delta: 5000 },
    { code: 'L', delta: 10000 },
  ],
  toppings: [
    { id: 't1', name: 'Trân châu', price: 5000 },
    { id: 't2', name: 'Kem cheese', price: 8000 },
  ],
};
const pastry = { id: '9', name: 'Croissant', price: 30000, available: true, stock: 5, sizes: [], toppings: [] };
const soldOut = { ...pastry, id: '8', available: false };

const products = new Map([coffee, pastry, soldOut].map((p) => [p.id, p]));
const item = (over: Partial<CartItemDto>): CartItemDto => ({ productId: '1', qty: 1, ...over }) as CartItemDto;

describe('priceCart', () => {
  it('computes (price + size delta + toppings) * qty', () => {
    const [line] = priceCart(
      [item({ size: 'M', toppingIds: ['t1', 't2'], qty: 2 })],
      products,
    );
    expect(line.unitPrice).toBe(40000 + 5000 + 5000 + 8000);
    expect(line.lineTotal).toBe(116000);
    expect(line.size).toBe('M');
    expect(line.toppings.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('defaults to base size when size is omitted and product has sizes', () => {
    const [line] = priceCart([item({})], products);
    expect(line.size).toBe('S');
    expect(line.lineTotal).toBe(40000);
  });

  it('uses empty size and no delta for pastry', () => {
    const [line] = priceCart([item({ productId: '9', qty: 3 })], products);
    expect(line.size).toBe('');
    expect(line.lineTotal).toBe(90000);
  });

  it('throws 404 for unknown product', () => {
    expect(() => priceCart([item({ productId: 'nope' })], products)).toThrow(NotFoundException);
  });

  it('throws 400 for unavailable product', () => {
    expect(() => priceCart([item({ productId: '8' })], products)).toThrow(BadRequestException);
  });

  it('throws 400 for size not offered by the product', () => {
    expect(() => priceCart([item({ size: 'XL' as never })], products)).toThrow(BadRequestException);
  });

  it('throws 400 for size on a product without sizes', () => {
    expect(() => priceCart([item({ productId: '9', size: 'S' })], products)).toThrow(BadRequestException);
  });

  it('throws 400 for topping not offered by the product', () => {
    expect(() => priceCart([item({ toppingIds: ['zzz'] })], products)).toThrow(BadRequestException);
  });

  it('rejects oversized toppingIds at DTO level', async () => {
    const { validate } = await import('class-validator');
    const { plainToInstance } = await import('class-transformer');
    const { CreateOrderDto: Dto } = await import('./dto/create-order.dto');
    const dto = plainToInstance(Dto, {
      items: [{ productId: '1', qty: 1, toppingIds: Array.from({ length: 11 }, (_, i) => `t${i}`) }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('throws 409 when total requested qty exceeds stock', () => {
    const cart = [item({ productId: '9', qty: 3 }), item({ productId: '9', qty: 3 })];
    expect(() => priceCart(cart, products)).toThrow(ConflictException);
  });
});

describe('OrdersService.createOrder', () => {
  const dto: CreateOrderDto = { items: [item({ size: 'L', toppingIds: ['t2'], qty: 2 })], note: 'ít đường' };
  let prisma: {
    product: { findMany: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock };
    order: { create: jest.Mock; findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([coffee]),
        findUnique: jest.fn().mockResolvedValue({ id: '1', name: 'Latte', stock: 10, version: 3 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      order: {
        create: jest.fn().mockResolvedValue({
          id: 'ord1',
          status: 'PENDING',
          total: 2 * (40000 + 10000 + 8000),
          createdAt: new Date('2026-10-24T00:00:00Z'),
        }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    service = new OrdersService(prisma as unknown as PrismaService);
  });

  it('persists a PENDING order with server-computed total and returns it', async () => {
    const { order: res, replayed } = await service.createOrder(dto, 'u1', 'key-aaaa1111');

    expect(replayed).toBe(false);
    expect(res).toEqual(
      expect.objectContaining({ id: 'ord1', status: 'PENDING', total: 116000 }),
    );
    expect(res.items[0]).toEqual(expect.objectContaining({ size: 'L', lineTotal: 116000 }));
    const data = prisma.order.create.mock.calls[0][0].data;
    expect(data.userId).toBe('u1');
    expect(data.total).toBe(116000);
    expect(data.idempotencyKey).toBe('key-aaaa1111');
    expect(typeof data.requestHash).toBe('string');
    expect(data.items.create[0]).toEqual(expect.objectContaining({ product: { connect: { id: '1' } }, qty: 2, lineTotal: 116000 }));
  });

  it('reserves stock with a version-checked decrement before creating the order', async () => {
    await service.createOrder(dto, 'u1', 'key-aaaa1111');

    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: '1', version: 3, stock: { gte: 2 } },
      data: { stock: { decrement: 2 }, version: { increment: 1 } },
    });
    expect(prisma.order.create).toHaveBeenCalledTimes(1);
    expect(prisma.product.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.order.create.mock.invocationCallOrder[0],
    );
  });

  it('reserves each product once with the summed qty, in sorted id order', async () => {
    prisma.product.findMany.mockResolvedValue([coffee, pastry]);
    prisma.product.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ id: where.id, name: where.id === '1' ? 'Latte' : 'Croissant', stock: 10, version: 0 }),
    );
    const cart: CreateOrderDto = {
      items: [item({ productId: '9', qty: 2 }), item({ productId: '1', qty: 1 }), item({ productId: '9', qty: 1 })],
    };

    await service.createOrder(cart, 'u1', 'key-aaaa1111');

    const reserves = prisma.product.updateMany.mock.calls
      .filter(([args]) => args.data.stock)
      .map(([args]) => [args.where.id, args.data.stock.decrement]);
    expect(reserves).toEqual([
      ['1', 1],
      ['9', 3],
    ]);
  });

  it('re-reads and retries when the version lock is lost, then succeeds', async () => {
    prisma.product.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValue({ count: 1 });

    const { replayed } = await service.createOrder(dto, 'u1', 'key-aaaa1111');

    expect(replayed).toBe(false);
    expect(prisma.product.findUnique).toHaveBeenCalledTimes(3);
    expect(prisma.order.create).toHaveBeenCalledTimes(1);
  });

  it('answers 409 with the product name when stock dropped below qty on re-read', async () => {
    prisma.product.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.product.findUnique
      .mockResolvedValueOnce({ id: '1', name: 'Latte', stock: 10, version: 3 })
      .mockResolvedValueOnce({ id: '1', name: 'Latte', stock: 1, version: 4 });

    await expect(service.createOrder(dto, 'u1', 'key-aaaa1111')).rejects.toThrow(
      new ConflictException('Insufficient stock for Latte'),
    );
    expect(prisma.product.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('answers 409 after five lost races and never creates the order', async () => {
    prisma.product.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.createOrder(dto, 'u1', 'key-aaaa1111')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.product.findUnique).toHaveBeenCalledTimes(5);
    expect(prisma.product.updateMany).toHaveBeenCalledTimes(5);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('hides the product when the reservation empties its stock', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: '1', name: 'Latte', stock: 2, version: 3 });

    await service.createOrder(dto, 'u1', 'key-aaaa1111');

    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: '1', stock: 0, available: true },
      data: { available: false },
    });
  });

  it('does not reserve stock again when the Idempotency-Key replays a stored order', async () => {
    const { hashRequest } = await import('../../common/idempotency');
    prisma.order.findUnique.mockResolvedValue({
      id: 'ord1',
      status: 'PENDING',
      total: 116000,
      createdAt: new Date(),
      requestHash: hashRequest({ items: [{ productId: '1', size: 'L', toppingIds: ['t2'], qty: 2 }], note: 'ít đường', voucherCode: null }),
      items: [],
    });

    const { replayed } = await service.createOrder(dto, 'u1', 'key-aaaa1111');

    expect(replayed).toBe(true);
    expect(prisma.product.findUnique).not.toHaveBeenCalled();
    expect(prisma.product.updateMany).not.toHaveBeenCalled();
  });

  it('does not write anything when validation fails', async () => {
    await expect(
      service.createOrder({ items: [item({ productId: 'nope' })] }, 'u1', 'key-aaaa1111'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('returns the stored order without pricing or writing when the key was already used', async () => {
    const hash = (await import('../../common/idempotency')).hashRequest({
      items: [{ productId: '1', size: 'L', toppingIds: ['t2'], qty: 2 }],
      note: 'ít đường',
    voucherCode: null,
    });
    prisma.order.findUnique.mockResolvedValue({
      id: 'ord1',
      status: 'PAID',
      total: 116000,
      note: 'ít đường',
      createdAt: new Date('2026-10-24T00:00:00Z'),
      requestHash: hash,
      items: [
        { productId: '1', size: 'L', toppings: [{ id: 't2', name: 'Kem cheese', price: 8000 }], qty: 2, lineTotal: 116000, product: { name: 'Latte' } },
      ],
    });

    const { order, replayed } = await service.createOrder(dto, 'u1', 'key-aaaa1111');

    expect(replayed).toBe(true);
    expect(order).toEqual(expect.objectContaining({ id: 'ord1', status: 'PAID', total: 116000 }));
    expect(order.items[0]).toEqual(expect.objectContaining({ name: 'Latte', unitPrice: 58000, lineTotal: 116000 }));
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(prisma.order.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_idempotencyKey: { userId: 'u1', idempotencyKey: 'key-aaaa1111' } } }),
    );
  });

  it('answers 422 when the same key is sent with a different body', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'ord1', requestHash: 'other-hash', items: [] });

    await expect(service.createOrder(dto, 'u1', 'key-aaaa1111')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('resolves a unique-key race by returning the winner order', async () => {
    const { hashRequest } = await import('../../common/idempotency');
    const winnerHash = hashRequest({
      items: [{ productId: '1', size: 'L', toppingIds: ['t2'], qty: 2 }],
      note: 'ít đường',
    voucherCode: null,
    });
    prisma.order.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'winner', status: 'PENDING', total: 116000, createdAt: new Date(), requestHash: winnerHash, items: [] });
    prisma.order.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));

    const { order, replayed } = await service.createOrder(dto, 'u1', 'key-aaaa1111');

    expect(replayed).toBe(true);
    expect(order.id).toBe('winner');
  });
});

describe('OrdersService.cancelMyOrder stock restore', () => {
  let prisma: {
    order: { findFirst: jest.Mock; updateMany: jest.Mock };
    payment: { count: jest.Mock };
    orderItem: { findMany: jest.Mock };
    product: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue({ id: 'ord1', status: 'PENDING', version: 0 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: { count: jest.fn().mockResolvedValue(0) },
      orderItem: {
        findMany: jest.fn().mockResolvedValue([
          { productId: '9', qty: 2 },
          { productId: '1', qty: 1 },
          { productId: '9', qty: 1 },
        ]),
      },
      product: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    // Second findFirst call (detail read after cancel) returns the cancelled order.
    prisma.order.findFirst.mockResolvedValueOnce({ id: 'ord1', status: 'PENDING', version: 0 }).mockResolvedValue({
      id: 'ord1',
      status: 'CANCELLED',
      total: 0,
      createdAt: new Date(),
      items: [],
      payments: [],
    });
    service = new OrdersService(prisma as unknown as PrismaService);
  });

  it('moves the order to CANCELLED and adds each product qty back in the same transaction', async () => {
    await service.cancelMyOrder('ord1', 'u1');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'ord1', userId: 'u1', status: 'PENDING', version: 0 },
      data: { status: 'CANCELLED', version: { increment: 1 } },
    });
    expect(prisma.product.update.mock.calls.map(([a]) => [a.where.id, a.data.stock.increment])).toEqual([
      ['1', 1],
      ['9', 3],
    ]);
  });

  it('restores nothing when the status guard rejects the move', async () => {
    prisma.order.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.cancelMyOrder('ord1', 'u1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });
});

describe('OrdersService order history', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    id: 'ord1',
    status: 'PAID',
    total: 116000,
    createdAt: new Date('2026-10-24T10:00:00Z'),
    items: [
      {
        size: 'M',
        toppings: [{ id: 't1', name: 'Trân châu', price: 5000 }],
        qty: 2,
        lineTotal: 116000,
        product: { name: 'Latte' },
      },
    ],
    payments: [{ status: 'SUCCESS' }],
    ...over,
  });
  let prisma: {
    order: { count: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      order: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([row()]),
        findFirst: jest.fn().mockResolvedValue(row()),
      },
      $transaction: jest.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    service = new OrdersService(prisma as unknown as PrismaService);
  });

  it('listMyOrders filters by owner, sorts newest first and paginates', async () => {
    const res = await service.listMyOrders('u1', { page: 2, limit: 5 });

    const args = prisma.order.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: 'u1' });
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(args.skip).toBe(5);
    expect(args.take).toBe(5);
    expect(prisma.order.count).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(res).toEqual({ page: 2, limit: 5, total: 1, items: [expect.any(Object)] });
  });

  it('listMyOrders defaults to page 1 and limit 20', async () => {
    const res = await service.listMyOrders('u1', {});
    const args = prisma.order.findMany.mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(20);
    expect(res.page).toBe(1);
    expect(res.limit).toBe(20);
  });

  it('maps items with product name, size, toppings, qty, lineTotal and latest payment status', async () => {
    const res = await service.listMyOrders('u1', {});
    expect(res.items[0]).toEqual({
      id: 'ord1',
      status: 'PAID',
      total: 116000,
      createdAt: new Date('2026-10-24T10:00:00Z'),
      latestPaymentStatus: 'SUCCESS',
      items: [
        {
          productName: 'Latte',
          size: 'M',
          toppings: [{ id: 't1', name: 'Trân châu', price: 5000 }],
          qty: 2,
          lineTotal: 116000,
        },
      ],
    });
  });

  it('reports latestPaymentStatus null when the order has no payment', async () => {
    prisma.order.findMany.mockResolvedValueOnce([row({ payments: [] })]);
    const res = await service.listMyOrders('u1', {});
    expect(res.items[0].latestPaymentStatus).toBeNull();
  });

  it('getMyOrder scopes the lookup to the owner', async () => {
    const res = await service.getMyOrder('ord1', 'u1');
    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ord1', userId: 'u1' } }),
    );
    expect(res.id).toBe('ord1');
    expect(res.latestPaymentStatus).toBe('SUCCESS');
  });

  it('getMyOrder answers 404 without querying for malformed ids', async () => {
    await expect(service.getMyOrder('%00', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.order.findFirst).not.toHaveBeenCalled();
  });

  it('getMyOrder throws 404 when the order is not found or belongs to someone else', async () => {
    prisma.order.findFirst.mockResolvedValueOnce(null);
    await expect(service.getMyOrder('ord2', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
