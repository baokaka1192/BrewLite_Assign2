'use client';
import { motion, useReducedMotion } from 'motion/react';

/** Gives its content one gentle horizontal shake when it mounts (or when `shake` turns on). */
export function Shake({ children, className, shake = true }: { children: React.ReactNode; className?: string; shake?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      animate={shake && !reduce ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}
