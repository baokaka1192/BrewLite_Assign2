import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from './products.service';

const DRINK_SIZES = [
  { code: 'S', delta: 0 },
  { code: 'M', delta: 5000 },
  { code: 'L', delta: 10000 },
];
const TOPPINGS = [
  { id: 'tran-chau', name: 'Trân châu', price: 8000 },
  { id: 'kem-cheese', name: 'Kem cheese', price: 10000 },
];

type ProductRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  sizes: unknown[];
  toppings: unknown[];
};

const row = (overrides: ProductRow) => ({
  description: 'desc',
  imageUrl: '/images/menu/x.jpg',
  stock: 10,
  available: true,
  version: 0,
  ...overrides,
});

const ROWS: ProductRow[] = [
  row({ id: '10', name: 'Bánh mì', category: 'pastry', price: 38000, sizes: [], toppings: [] }),
  row({ id: '2', name: 'Cà phê sữa đá', category: 'coffee', price: 29000, sizes: DRINK_SIZES, toppings: TOPPINGS }),
  row({ id: '1', name: 'Cà phê đen đá', category: 'coffee', price: 25000, sizes: DRINK_SIZES, toppings: TOPPINGS }),
  row({ id: '7', name: 'Trà đào cam sả', category: 'tea', price: 42000, sizes: DRINK_SIZES, toppings: TOPPINGS }),
];

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: { product: { findMany: jest.Mock; findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(async ({ where }: { where?: { category?: string } } = {}) =>
          where?.category ? ROWS.filter((r) => r.category === where.category) : ROWS,
        ),
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
          ROWS.find((r) => r.id === where.id) ?? null,
        ),
      },
    };

    const module = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ProductsService);
  });

  describe('findAll', () => {
    it('returns products in seed id order with the API shape (no version)', async () => {
      const products = await service.findAll();
      expect(products.map((p) => p.id)).toEqual(['1', '2', '7', '10']);
      for (const p of products) {
        expect(Number.isInteger(p.price)).toBe(true);
        expect(Number.isInteger(p.stock)).toBe(true);
        expect(typeof p.available).toBe('boolean');
        expect(['coffee', 'tea', 'pastry']).toContain(p.category);
        expect(Array.isArray(p.sizes)).toBe(true);
        expect(Array.isArray(p.toppings)).toBe(true);
        expect(p).not.toHaveProperty('version');
      }
    });

    it('passes the category filter to Prisma', async () => {
      const teas = await service.findAll('tea');
      expect(prisma.product.findMany).toHaveBeenLastCalledWith({ where: { category: 'tea' } });
      expect(teas.map((p) => p.id)).toEqual(['7']);
    });

    it('does not filter when no category is given', async () => {
      await service.findAll();
      expect(prisma.product.findMany).toHaveBeenLastCalledWith({ where: undefined });
    });
  });

  describe('findOne', () => {
    it('returns the product with the given id', async () => {
      const product = await service.findOne('1');
      expect(product.id).toBe('1');
      expect(product.name).toBe('Cà phê đen đá');
      expect(product.sizes).toEqual(DRINK_SIZES);
    });

    it('throws NotFoundException for an unknown id', async () => {
      await expect(service.findOne('does-not-exist')).rejects.toThrow(NotFoundException);
    });
  });
});
