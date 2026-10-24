'use client';
import { useEffect, useState } from 'react';
import { ProductOptions, type ProductSelection } from '@/components/menu/product-options';
import { useCartStore } from '@/store/cart';
import type { Product } from '@/types/product';

const FEEDBACK_MS = 1800;

/** Client bridge between the server-rendered product page and the cart store. */
export function AddToCartOptions({ product }: { product: Product }) {
  const add = useCartStore((s) => s.add);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [added]);

  const handleAdd = (selection: ProductSelection) => {
    add({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      sizeCode: selection.sizeCode,
      toppingIds: selection.toppingIds,
      toppingNames: selection.toppingIds.map((id) => product.toppings.find((t) => t.id === id)?.name ?? id),
      unitPrice: selection.unitPrice,
      qty: selection.quantity,
      stock: product.stock,
    });
    setAdded(true);
  };

  return (
    <>
      <ProductOptions product={product} onAdd={handleAdd} />
      <p role="status" aria-live="polite" className="mt-4 text-sm font-medium text-accent">
        {added ? 'Added to your cart.' : ''}
      </p>
    </>
  );
}
