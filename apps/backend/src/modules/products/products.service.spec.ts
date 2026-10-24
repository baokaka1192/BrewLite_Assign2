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
        expect(Number.isInteger(p.priceVND)).toBe(true);
        expect(Number.isInteger(p.stock)).toBe(true);
        expect(typeof p.available).toBe('boolean');
        expect(['coffee', 'tea', 'pastry']).toContain(p.category);
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
