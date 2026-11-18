import Image from 'next/image';
import Link from 'next/link';
import { ImageFrame } from '@/components/shared/image-frame';
import { formatVND } from '@/lib/utils';
import type { Product } from '@/types/product';

export function ProductCard({ product }: { product: Product }) {
  const soldOut = !product.available || product.stock === 0;

  return (
    <Link
      href={`/menu/${product.id}`}
      className="group flex flex-col border border-border bg-background transition-[transform,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-primary motion-reduce:transform-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
            className={`object-cover transition-transform duration-200 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100 ${soldOut ? 'grayscale' : ''}`}
          />
        ) : (
          <ImageFrame alt={product.name} brief={product.name} className="h-full w-full" />
        )}
        {soldOut && (
          <span className="absolute left-3 top-3 bg-primary px-3 py-1 text-[10px] font-medium uppercase tracking-label text-primary-foreground">
            Sold out
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-2xl font-semibold">{product.name}</h3>
        <p className="mt-2 line-clamp-2 text-muted-foreground">{product.description}</p>
        <p className="mt-auto pt-4 text-sm font-medium text-accent">{formatVND(product.price)}</p>
      </div>
    </Link>
  );
}
