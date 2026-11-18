import Link from 'next/link';

interface ProductDetailBreadcrumbProps {
  name: string;
}

export function ProductDetailBreadcrumb({ name }: ProductDetailBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-x-2">
        <li>
          <Link
            href="/menu"
            className="inline-flex min-h-11 items-center font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            &larr; Back to menu
          </Link>
        </li>
        <li aria-hidden="true" className="text-border">/</li>
        <li aria-current="page" className="truncate text-foreground">
          {name}
        </li>
      </ol>
    </nav>
  );
}
