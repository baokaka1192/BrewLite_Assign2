import { Button } from '@/components/ui/button';

export function MenuError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="border border-border bg-surface px-6 py-12 text-center">
      <p className="text-lg font-semibold">We couldn&rsquo;t load the menu.</p>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button className="mt-6" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
