'use client';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ImageFrame } from '@/components/shared/image-frame';
import { formatVND } from '@/lib/utils';
import type { Product } from '@/types/product';

const MotionLink = motion(Link);
const MotionImage = motion(Image);

const cardVariants = {
  rest: { y: 0 },
  hover: { y: -4 },
};

const imageVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
};

export function ProductCard({ product }: { product: Product }) {
  const soldOut = !product.available || product.stock === 0;
  const reduceMotion = useReducedMotion();

  return (
    <MotionLink
      href={`/menu/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary/40 hover:shadow-[0_12px_30px_-14px_hsl(var(--shadow-card-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      initial="rest"
      variants={cardVariants}
      whileHover={reduceMotion ? undefined : 'hover'}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {product.imageUrl ? (
          <MotionImage
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
            className={`object-cover ${soldOut ? 'grayscale' : ''}`}
            variants={imageVariants}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        ) : (
          <ImageFrame alt={product.name} brief={product.name} className="h-full w-full" />
        )}

        <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-background/90 px-3 py-1 text-[11px] font-medium uppercase tracking-label text-foreground shadow-sm backdrop-blur-sm">
          {product.category}
        </span>

        <span
          className={`absolute right-3 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground shadow-md ${soldOut ? 'bottom-12' : 'bottom-3'}`}
        >
          {formatVND(product.price)}
        </span>

        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-foreground/85 py-2 text-center text-[11px] font-semibold uppercase tracking-label text-background">
            Sold out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-2xl font-semibold">{product.name}</h3>
        <p className="mt-2 line-clamp-2 text-muted-foreground">{product.description}</p>
      </div>
    </MotionLink>
  );
}
