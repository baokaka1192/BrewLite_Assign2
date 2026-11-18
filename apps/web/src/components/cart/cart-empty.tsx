'use client';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';

/** Empty-cart state: a line-drawn cup illustration, a short message and a CTA back to the menu. */
export function CartEmpty() {
  const reduce = useReducedMotion();
  return (
    <motion.section
      aria-labelledby="cart-empty-title"
      className="flex flex-col items-center py-16 text-center"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, ease: 'easeOut' }}
    >
      <CupIllustration />
      <h2 id="cart-empty-title" className="mt-8 font-display text-3xl italic text-primary">
        Your cart is empty
      </h2>
      <p className="mt-3 max-w-sm text-muted-foreground">Pick something from the menu to get started.</p>
      <Button asChild className="mt-8">
        <Link href="/menu">Browse the menu</Link>
      </Button>
    </motion.section>
  );
}

function CupIllustration() {
  return (
    <svg
      viewBox="0 0 120 120"
      width="120"
      height="120"
      aria-hidden="true"
      focusable="false"
      className="text-primary"
    >
      <circle cx="60" cy="60" r="56" className="fill-surface" />
      <ellipse cx="60" cy="96" rx="36" ry="5" className="fill-accent/25" stroke="currentColor" strokeWidth="2" />
      <path
        d="M32 50 H84 V74 Q84 92 66 92 H50 Q32 92 32 74 Z"
        className="fill-background"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M84 58 H92 Q100 58 100 67 Q100 76 92 76 H84"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="motion-safe:animate-pulse"
      >
        <path d="M46 40 Q42 34 46 28" />
        <path d="M58 38 Q54 32 58 24" />
        <path d="M70 40 Q66 34 70 28" />
      </g>
    </svg>
  );
}
