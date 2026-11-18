'use client';
import Link from 'next/link';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/types/product';

const FILTERS: { label: string; value?: ProductCategory }[] = [
  { label: 'All' },
  ...PRODUCT_CATEGORIES.map((c) => ({ label: c[0].toUpperCase() + c.slice(1), value: c })),
];

export function CategoryFilter({ active }: { active?: ProductCategory }) {
  return (
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
              'relative isolate border px-4 py-2 text-sm font-medium transition-colors duration-200',
              isActive ? 'border-primary text-primary-foreground' : 'border-border hover:border-primary',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="category-indicator"
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            {f.label}
          </Link>
        );
      })}
    </nav>
  );
}
