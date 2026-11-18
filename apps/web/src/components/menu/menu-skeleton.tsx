export function MenuSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading menu" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-shimmer relative overflow-hidden border border-border bg-background">
          <div className="aspect-[4/3] bg-surface" />
          <div className="space-y-3 p-6">
            <div className="h-6 w-2/3 bg-surface" />
            <div className="h-4 w-full bg-surface" />
            <div className="h-4 w-1/3 bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}
