import Link from 'next/link';
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
              'border px-4 py-2 text-sm font-medium transition-colors duration-200',
              isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary',
            )}
          >
            {f.label}
          </Link>
        );
      })}
    </nav>
  );
}
