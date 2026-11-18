import { Chip } from '@/components/shared/chip';
import type { Product } from '@/types/product';

const LOW_STOCK_THRESHOLD = 5;

export function ProductDetailChips({ product }: { product: Product }) {
  const soldOut = !product.available || product.stock === 0;
  const availability = soldOut
    ? 'Sold out'
    : product.stock <= LOW_STOCK_THRESHOLD
      ? `Only ${product.stock} left`
      : 'In stock';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip tone="amber">{product.category}</Chip>
      <Chip tone={soldOut ? 'espresso' : 'amber'}>{availability}</Chip>
    </div>
  );
}
