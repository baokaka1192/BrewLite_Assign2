'use client';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { PaymentMethod } from '@/types/order';

const OPTIONS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'WALLET', label: 'E-wallet', hint: 'Pay with your e-wallet' },
  { value: 'CARD', label: 'Bank card', hint: 'Pay with a card number' },
];

interface PaymentMethodSelectProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

/** Card-style radio group; the selection frame glides between options via a shared layoutId. */
export function PaymentMethodSelect({ value, onChange }: PaymentMethodSelectProps) {
  const reduce = useReducedMotion();
  return (
    <div className="grid gap-3">
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={cn(
              'relative flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors duration-200',
              'focus-within:ring-2 focus-within:ring-primary',
              selected ? 'border-transparent bg-surface' : 'border-border hover:border-primary/50',
            )}
          >
            <input
              type="radio"
              name="method"
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {selected && (
              <motion.span
                layoutId="payment-method-frame"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-lg border-2 border-primary"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200',
                selected ? 'border-primary' : 'border-border',
              )}
            >
              {selected && (
                <motion.span
                  className="h-2 w-2 rounded-full bg-primary"
                  initial={reduce ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
                />
              )}
            </span>
            <span className="relative">
              <span className="block font-medium">{option.label}</span>
              <span className="block text-sm text-muted-foreground">{option.hint}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
