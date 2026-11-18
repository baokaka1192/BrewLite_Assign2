'use client';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ProductCard } from '@/components/menu/product-card';
import { staggerDelay } from '@/lib/motion';
import type { Product } from '@/types/product';

export function MenuGrid({ products }: { products: Product[] }) {
  return (
    <MotionConfig reducedMotion="user">
      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {products.map((product, i) => (
            <motion.li
              key={product.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut', delay: staggerDelay(i) } }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2, ease: 'easeIn' } }}
              transition={{ layout: { duration: 0.35, ease: 'easeOut' } }}
            >
              <ProductCard product={product} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </MotionConfig>
  );
}
