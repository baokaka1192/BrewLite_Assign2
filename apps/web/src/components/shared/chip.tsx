import { cn } from '@/lib/utils';

export function Chip({ children, tone = 'espresso' }: { children: React.ReactNode; tone?: 'espresso' | 'amber' }) {
  return (
    <span
      className={cn(
        'inline-block px-3 py-1 text-[10px] font-medium uppercase tracking-label',
        tone === 'espresso' ? 'bg-primary text-primary-foreground' : 'bg-accent/20 text-primary',
      )}
    >
      {children}
    </span>
  );
}
