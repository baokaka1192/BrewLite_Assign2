import { motion } from 'motion/react';
import { ProductCard } from '@/components/menu/product-card';
import { staggerDelay } from '@/lib/motion';
import type { Product } from '@/types/product';

export function MenuGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, i) => (
        <motion.li
          key={product.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: staggerDelay(i) }}
        >
          <ProductCard product={product} />
        </motion.li>
      ))}
    </ul>
  );
}
