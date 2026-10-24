export function MenuEmpty({ category }: { category?: string }) {
  return (
    <div className="border border-border bg-surface px-6 py-12 text-center">
      <p className="text-lg font-semibold">Nothing here yet.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {category ? `No ${category} items are available right now.` : 'The menu is being prepared. Please check back soon.'}
      </p>
    </div>
  );
}
