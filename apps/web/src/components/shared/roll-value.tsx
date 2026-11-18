'use client';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

/** Swaps text with a short vertical roll. The wrapper clips the roll so neighbouring content never shifts. */
export function RollValue({ value, className }: { value: string | number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={cn('relative inline-flex overflow-hidden', className)}>
      <span className="sr-only">{value}</span>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={String(value)}
          aria-hidden="true"
          className="inline-block"
          initial={reduce ? false : { y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: '-100%', opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
