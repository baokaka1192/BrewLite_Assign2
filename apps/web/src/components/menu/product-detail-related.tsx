import { ProductCard } from '@/components/menu/product-card';
import { ProductDetailEnter } from '@/components/menu/product-detail-enter';
import { getProducts } from '@/lib/api';
import { staggerDelay } from '@/lib/motion';
import type { Product } from '@/types/product';

const MAX_RELATED = 4;

/** Same-category products, excluding the current one. Any failure yields an empty list. */
async function loadRelated(product: Product): Promise<Product[]> {
  try {
    const all = await getProducts(product.category);
    if (!Array.isArray(all)) return [];
    return all.filter((p) => p.id !== product.id).slice(0, MAX_RELATED);
  } catch {
    return [];
  }
}

/** Server component. Renders nothing when there are no related products or the fetch fails. */
export async function ProductDetailRelated({ product }: { product: Product }) {
  const items = await loadRelated(product);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="mt-16 border-t border-border pt-12">
      <h2 id="related-heading" className="text-3xl font-bold">
        You may also like
      </h2>
      <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <li key={item.id}>
            <ProductDetailEnter delay={staggerDelay(i, 0.08)}>
              <ProductCard product={item} />
            </ProductDetailEnter>
          </li>
        ))}
      </ul>
    </section>
  );
}
