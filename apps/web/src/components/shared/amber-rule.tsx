'use client';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function AmberRule({ className }: { className?: string }) {
  return (
    <motion.span
      aria-hidden
      className={cn('mt-3 block h-[3px] w-16 origin-left bg-accent', className)}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
  );
}
