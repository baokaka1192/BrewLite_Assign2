'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FlyToCartLayer } from '@/components/cart/fly-to-cart-layer';
import { ProductOptions, type ProductSelection } from '@/components/menu/product-options';
import { requestFlyToCart } from '@/lib/fly-to-cart';
import { useCartStore } from '@/store/cart';
import type { Product } from '@/types/product';

const FEEDBACK_MS = 1800;
const TOAST_MS = 3200;

/** Client bridge between the server-rendered product page and the cart store. */
export function AddToCartOptions({ product }: { product: Product }) {
  const add = useCartStore((s) => s.add);
  const [added, setAdded] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [added]);

  useEffect(() => {
    if (!toastOpen) return;
    const t = setTimeout(() => setToastOpen(false), TOAST_MS);
    return () => clearTimeout(t);
  }, [toastOpen]);

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

    const rect = submitRef.current?.getBoundingClientRect();
    if (rect && rect.width > 0) {
      requestFlyToCart({
        from: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        imageUrl: product.imageUrl,
        alt: product.name,
      });
    }
    setAdded(true);
    setToastOpen(true);
  };

  return (
    <>
      <FlyToCartLayer />
      <ProductOptions product={product} onAdd={handleAdd} justAdded={added} submitRef={submitRef} />
      <AnimatePresence>
        {toastOpen && (
          <motion.div
            key="added-toast"
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 border border-border bg-background px-5 py-3 text-sm shadow-lg"
          >
            <span className="font-medium text-foreground">Added to cart</span>
            <span aria-hidden className="text-muted-foreground">·</span>
            <Link href="/cart" className="font-medium text-accent underline-offset-4 hover:underline">
              View cart
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
