'use client';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PayState = 'idle' | 'processing' | 'success';

const LABEL: Record<PayState, string> = {
  idle: 'Confirm payment',
  processing: 'Processing…',
  success: 'Payment successful',
};

interface PayButtonProps {
  state: PayState;
  disabled: boolean;
}

/** Submit button with idle, processing (spinner) and success (check) states. Purely visual. */
export function PayButton({ state, disabled }: PayButtonProps) {
  const reduce = useReducedMotion();
  return (
    <Button
      type="submit"
      className={cn('w-full', state === 'success' && 'bg-accent text-foreground hover:bg-accent')}
      disabled={disabled}
      aria-busy={state === 'processing'}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={state}
          className="inline-flex items-center gap-2"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
        >
          {state === 'processing' && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
            />
          )}
          {state === 'success' && (
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M5 12.5l4.5 4.5L19 7.5"
                initial={reduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </svg>
          )}
          {LABEL[state]}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
