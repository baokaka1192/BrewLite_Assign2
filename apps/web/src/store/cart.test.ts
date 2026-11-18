import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeLineKey, subtotal, totalItems, useCartStore } from './cart';

// Node has no localStorage; provide an in-memory stand-in before the store is created.
vi.hoisted(() => {
  const data = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  } as Storage;
});

const base = { productId: 'latte', name: 'Latte', imageUrl: '', unitPrice: 50000 };

const lines = () => useCartStore.getState().lines;

beforeEach(() => {
  useCartStore.getState().clear();
});

describe('cart store', () => {
  it('adds a new line with qty 1 by default', () => {
    useCartStore.getState().add({ ...base, sizeCode: 'M', toppingIds: [], toppingNames: [] });
    expect(lines()).toHaveLength(1);
    expect(lines()[0]).toMatchObject({ productId: 'latte', sizeCode: 'M', unitPrice: 50000, qty: 1 });
  });

  it('merges lines with same product, size and toppings regardless of topping order', () => {
    const { add } = useCartStore.getState();
    add({ ...base, toppingIds: ['b', 'a'], toppingNames: ['B', 'A'], qty: 2 });
    add({ ...base, toppingIds: ['a', 'b'], toppingNames: ['A', 'B'], qty: 3 });
    expect(lines()).toHaveLength(1);
    expect(lines()[0].qty).toBe(5);
    expect(lines()[0].toppingIds).toEqual(['a', 'b']);
  });

  it('keeps separate lines when size or toppings differ', () => {
    const { add } = useCartStore.getState();
    add({ ...base, sizeCode: 'S', toppingIds: [] });
    add({ ...base, sizeCode: 'L', toppingIds: [] });
    add({ ...base, sizeCode: 'S', toppingIds: ['a'] });
    expect(lines()).toHaveLength(3);
  });

  it('caps merged quantity at stock when provided', () => {
    const { add } = useCartStore.getState();
    add({ ...base, qty: 3, stock: 4 });
    add({ ...base, qty: 5, stock: 4 });
    expect(lines()[0].qty).toBe(4);
    add({ ...base, qty: 1, stock: 4 });
    expect(lines()[0].qty).toBe(4);
  });

  it('setQty updates quantity and removes the line when qty <= 0', () => {
    const { add, setQty } = useCartStore.getState();
    add({ ...base, toppingIds: [] });
    const key = lines()[0].key;

    setQty(key, 7);
    expect(lines()[0].qty).toBe(7);

    setQty(key, 0);
    expect(lines()).toHaveLength(0);
  });

  it('stores stock on the line and setQty caps at it', () => {
    const { add, setQty } = useCartStore.getState();
    add({ ...base, toppingIds: [], stock: 3 });
    const key = lines()[0].key;
    expect(lines()[0].stock).toBe(3);

    setQty(key, 10);
    expect(lines()[0].qty).toBe(3);

    setQty(key, -2);
    expect(lines()).toHaveLength(0);
  });

  it('setQty is uncapped when stock is unknown', () => {
    const { add, setQty } = useCartStore.getState();
    add({ ...base, toppingIds: [] });
    const key = lines()[0].key;
    setQty(key, 50);
    expect(lines()[0].qty).toBe(50);
  });

  it('merge refreshes stock and caps the merged quantity at it', () => {
    const { add } = useCartStore.getState();
    add({ ...base, toppingIds: [], qty: 2, stock: 10 });
    add({ ...base, toppingIds: [], qty: 1, stock: 2 });
    expect(lines()[0]).toMatchObject({ qty: 2, stock: 2 });
  });

  it('setQty on a missing key is a no-op', () => {
    const { add, setQty } = useCartStore.getState();
    add({ ...base, toppingIds: [] });
    const before = lines();
    setQty('missing', 4);
    expect(lines()).toBe(before);
  });

  it('remove deletes only the matching line', () => {
    const { add, remove } = useCartStore.getState();
    add({ ...base, sizeCode: 'S', toppingIds: [] });
    add({ ...base, sizeCode: 'M', toppingIds: [] });
    const keyS = makeLineKey('latte', 'S', []);
    remove(keyS);
    expect(lines().map((l) => l.sizeCode)).toEqual(['M']);
  });

  it('clear empties the cart', () => {
    const { add, clear } = useCartStore.getState();
    add({ ...base, toppingIds: [] });
    add({ ...base, productId: 'tea', name: 'Tea', toppingIds: [] });
    clear();
    expect(lines()).toHaveLength(0);
  });

  it('totalItems sums quantities across lines', () => {
    const { add } = useCartStore.getState();
    add({ ...base, qty: 2, toppingIds: [] });
    add({ ...base, productId: 'tea', name: 'Tea', qty: 3, toppingIds: [] });
    expect(totalItems(useCartStore.getState())).toBe(5);
    expect(totalItems({ lines: [] })).toBe(0);
  });

  it('subtotal sums unitPrice * qty across lines', () => {
    const { add } = useCartStore.getState();
    add({ ...base, unitPrice: 55000, qty: 2, toppingIds: [] });
    add({ ...base, productId: 'tea', name: 'Tea', unitPrice: 30000, qty: 1, toppingIds: [] });
    expect(subtotal(useCartStore.getState())).toBe(140000);
    expect(subtotal({ lines: [] })).toBe(0);
  });
});
