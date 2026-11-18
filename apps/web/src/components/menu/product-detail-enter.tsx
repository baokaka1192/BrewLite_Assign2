'use client';
import { motion, useReducedMotion } from 'motion/react';

interface ProductDetailEnterProps {
  children: React.ReactNode;
  /** Seconds before this block starts fading in; used to stagger the page entrance. */
  delay?: number;
  className?: string;
}

/** Staggered fade-up entrance for product detail sections. Reduced motion: shown immediately. */
export function ProductDetailEnter({ children, delay = 0, className }: ProductDetailEnterProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: reduce ? 0 : delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
