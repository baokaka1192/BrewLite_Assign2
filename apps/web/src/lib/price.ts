import type { Product } from '@/types/product';

/**
 * Price of one unit: base price + size delta + selected topping prices.
 * Throws if the size or a topping does not belong to the product.
 * Pastries (no sizes) pass `undefined` for sizeCode.
 */
export function unitPrice(product: Product, sizeCode?: string, toppingIds: readonly string[] = []): number {
  let total = product.price;

  if (sizeCode !== undefined) {
    const size = product.sizes.find((s) => s.code === sizeCode);
    if (!size) throw new Error(`Unknown size "${sizeCode}" for product ${product.id}`);
    total += size.delta;
  }

  for (const id of new Set(toppingIds)) {
    const topping = product.toppings.find((t) => t.id === id);
    if (!topping) throw new Error(`Unknown topping "${id}" for product ${product.id}`);
    total += topping.price;
  }

  return total;
}

/** Total for a line item: unit price multiplied by quantity (integer >= 1). */
export function lineTotal(
  product: Product,
  quantity: number,
  sizeCode?: string,
  toppingIds: readonly string[] = [],
): number {
  if (!Number.isInteger(quantity) || quantity < 1) throw new RangeError(`Invalid quantity ${quantity}`);
  return unitPrice(product, sizeCode, toppingIds) * quantity;
}
