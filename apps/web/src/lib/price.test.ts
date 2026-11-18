import { describe, expect, it } from 'vitest';
import { lineTotal, unitPrice } from './price';
import type { Product } from '../types/product';

const latte: Product = {
  id: 'latte',
  name: 'Latte',
  description: '',
  category: 'coffee',
  price: 50000,
  imageUrl: '',
  stock: 10,
  available: true,
  sizes: [
    { code: 'S', delta: 0 },
    { code: 'M', delta: 10000 },
    { code: 'L', delta: 20000 },
  ],
  toppings: [
    { id: 'pearl', name: 'Pearl', price: 5000 },
    { id: 'foam', name: 'Foam', price: 8000 },
  ],
};

const croissant: Product = { ...latte, id: 'croissant', category: 'pastry', price: 30000, sizes: [], toppings: [] };

describe('unitPrice', () => {
  it('uses base price for the smallest size', () => {
    expect(unitPrice(latte, 'S')).toBe(50000);
  });

  it('adds size delta', () => {
    expect(unitPrice(latte, 'M')).toBe(60000);
    expect(unitPrice(latte, 'L')).toBe(70000);
  });

  it('adds topping prices', () => {
    expect(unitPrice(latte, 'M', ['pearl', 'foam'])).toBe(73000);
  });

  it('ignores duplicate topping ids', () => {
    expect(unitPrice(latte, 'S', ['pearl', 'pearl'])).toBe(55000);
  });

  it('prices pastries with no sizes at base price', () => {
    expect(unitPrice(croissant, undefined, [])).toBe(30000);
  });

  it('throws on unknown size', () => {
    expect(() => unitPrice(latte, 'XL')).toThrow('Unknown size "XL"');
  });

  it('throws when a size is given for a product without sizes', () => {
    expect(() => unitPrice(croissant, 'S')).toThrow('Unknown size "S"');
  });

  it('throws on unknown topping', () => {
    expect(() => unitPrice(latte, 'S', ['sugar'])).toThrow('Unknown topping "sugar"');
  });
});

describe('lineTotal', () => {
  it('multiplies unit price by quantity', () => {
    expect(lineTotal(latte, 3, 'M', ['pearl'])).toBe(195000);
  });

  it('equals unit price for quantity 1', () => {
    expect(lineTotal(croissant, 1)).toBe(30000);
  });

  it('rejects quantity below 1', () => {
    expect(() => lineTotal(latte, 0, 'S')).toThrow(RangeError);
    expect(() => lineTotal(latte, 0, 'S')).toThrow('Invalid quantity 0');
  });

  it('rejects non-integer quantity', () => {
    expect(() => lineTotal(latte, 1.5, 'S')).toThrow(RangeError);
    expect(() => lineTotal(latte, 1.5, 'S')).toThrow('Invalid quantity 1.5');
  });
});
