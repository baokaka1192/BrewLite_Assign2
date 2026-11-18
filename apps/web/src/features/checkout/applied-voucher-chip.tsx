'use client';
import { motion, useReducedMotion } from 'motion/react';

/** Small "applied" chip with a check mark, shown next to an applied voucher code. */
export function AppliedVoucherChip({ code }: { code: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="inline-flex items-center gap-1.5 rounded-full border border-accent/60 bg-accent/15 px-3 py-1 text-sm text-accent-text"
      initial={reduce ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
    >
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      <span>
        Voucher <code>{code}</code> applied
      </span>
    </motion.span>
  );
}
