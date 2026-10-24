import { ProductCard } from '@/components/menu/product-card';
import type { Product } from '@/types/product';

export function MenuGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
