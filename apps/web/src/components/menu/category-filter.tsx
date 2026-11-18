'use client';
import Link from 'next/link';
import { MotionConfig, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/types/product';

const FILTERS: { label: string; value?: ProductCategory }[] = [
  { label: 'All' },
  ...PRODUCT_CATEGORIES.map((c) => ({ label: c[0].toUpperCase() + c.slice(1), value: c })),
];

export function CategoryFilter({ active }: { active?: ProductCategory }) {
  return (
    <MotionConfig reducedMotion="user">
      <nav aria-label="Filter by category" className="flex flex-wrap gap-3">
        {FILTERS.map((f) => {
          const isActive = f.value === active;
          return (
            <Link
              key={f.label}
              href={f.value ? `/menu?category=${f.value}` : '/menu'}
              aria-current={isActive ? 'page' : undefined}
              scroll={false}
              className={cn(
                'relative isolate inline-flex min-h-11 items-center rounded-full border px-5 py-2 text-sm font-medium shadow-sm transition-[color,border-color,transform,box-shadow] duration-200 ease-out hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none',
                isActive ? 'border-primary text-primary-foreground shadow-md' : 'border-border bg-background text-foreground hover:border-primary hover:shadow-md',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="category-indicator"
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              {f.label}
            </Link>
          );
        })}
      </nav>
    </MotionConfig>
  );
}
