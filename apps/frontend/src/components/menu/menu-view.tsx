'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CategoryFilter } from '@/components/menu/category-filter';
import { MenuEmpty } from '@/components/menu/menu-empty';
import { MenuError } from '@/components/menu/menu-error';
import { MenuGrid } from '@/components/menu/menu-grid';
import { MenuSkeleton } from '@/components/menu/menu-skeleton';
import { getProducts } from '@/lib/api';
import { PRODUCT_CATEGORIES, type Product, type ProductCategory } from '@/types/product';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; products: Product[] };

export function MenuView() {
  const param = useSearchParams().get('category');
  const category = PRODUCT_CATEGORIES.find((c) => c === param);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getProducts(category)
      .then((products) => !cancelled && setState({ status: 'ready', products }))
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        setState({ status: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, [category, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <>
      <div className="mt-10">
        <CategoryFilter active={category} />
      </div>
      <div className="mt-12">
        {state.status === 'loading' && <MenuSkeleton />}
        {state.status === 'error' && <MenuError message={state.message} onRetry={retry} />}
        {state.status === 'ready' && state.products.length === 0 && <MenuEmpty category={category} />}
        {state.status === 'ready' && state.products.length > 0 && <MenuGrid products={state.products} />}
      </div>
    </>
  );
}
