import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
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
  let prisma: { product: { findMany: jest.Mock }; order: { create: jest.Mock }; $transaction: jest.Mock };
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      product: { findMany: jest.fn().mockResolvedValue([coffee]) },
      order: {
        create: jest.fn().mockResolvedValue({
          id: 'ord1',
          status: 'PENDING',
          total: 2 * (40000 + 10000 + 8000),
          createdAt: new Date('2026-10-24T00:00:00Z'),
        }),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    service = new OrdersService(prisma as unknown as PrismaService);
  });

  it('persists a PENDING order with server-computed total and returns it', async () => {
    const res = await service.createOrder(dto);

    expect(res).toEqual(
      expect.objectContaining({ id: 'ord1', status: 'PENDING', total: 116000 }),
    );
    expect(res.items[0]).toEqual(expect.objectContaining({ size: 'L', lineTotal: 116000 }));
    const data = prisma.order.create.mock.calls[0][0].data;
    expect(data.userId).toBeNull();
    expect(data.total).toBe(116000);
    expect(data.items.create[0]).toEqual(expect.objectContaining({ product: { connect: { id: '1' } }, qty: 2, lineTotal: 116000 }));
  });

  it('does not write anything when validation fails', async () => {
    await expect(
      service.createOrder({ items: [item({ productId: 'nope' })] }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });
});
