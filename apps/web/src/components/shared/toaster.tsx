'use client';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useToastStore } from '@/store/toast';

/** Bottom-center stack of transient toasts. Announced politely to assistive tech. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const reduce = useReducedMotion();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : 8 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
            className="pointer-events-auto flex items-center gap-3 border border-border bg-background px-5 py-3 text-sm text-foreground shadow-lg"
          >
            <span aria-hidden className="h-2 w-2 bg-accent" />
            <span className="font-medium">{t.message}</span>
            {t.action && (
              <Link
                href={t.action.href}
                className="font-semibold text-foreground underline underline-offset-4 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t.action.label}
              </Link>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
