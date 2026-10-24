import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProductsService],
    }).compile();
    service = module.get(ProductsService);
  });

  describe('findAll', () => {
    it('returns the full seeded list', () => {
      const products = service.findAll();
      expect(products.length).toBeGreaterThanOrEqual(10);
      for (const p of products) {
        expect(Number.isInteger(p.price)).toBe(true);
        expect(Number.isInteger(p.stock)).toBe(true);
        expect(typeof p.available).toBe('boolean');
        expect(['coffee', 'tea', 'pastry']).toContain(p.category);
        expect(Array.isArray(p.sizes)).toBe(true);
        expect(Array.isArray(p.toppings)).toBe(true);
      }
    });

    it('gives drinks S/M/L sizes and toppings, pastries neither', () => {
      const products = service.findAll();
      for (const p of products) {
        if (p.category === 'pastry') {
          expect(p.sizes).toEqual([]);
          expect(p.toppings).toEqual([]);
        } else {
          expect(p.sizes).toEqual([
            { code: 'S', delta: 0 },
            { code: 'M', delta: 5000 },
            { code: 'L', delta: 10000 },
          ]);
          expect(p.toppings.length).toBeGreaterThan(0);
          for (const t of p.toppings) {
            expect(typeof t.id).toBe('string');
            expect(typeof t.name).toBe('string');
            expect(Number.isInteger(t.price)).toBe(true);
          }
        }
      }
    });

    it('filters by category', () => {
      const teas = service.findAll('tea');
      expect(teas.length).toBeGreaterThan(0);
      expect(teas.every((p) => p.category === 'tea')).toBe(true);
    });
  });

  describe('findOne', () => {
    it('returns the product with the given id', () => {
      const product = service.findOne('1');
      expect(product.id).toBe('1');
      expect(product.name).toBeTruthy();
    });

    it('throws NotFoundException for an unknown id', () => {
      expect(() => service.findOne('does-not-exist')).toThrow(NotFoundException);
    });
  });
});
