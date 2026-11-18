'use client';

import { motion, useReducedMotion } from 'motion/react';

type StateIllustrationVariant = 'empty' | 'error' | 'notfound';

const STEAM_PATHS = ['M34 28 C30 22 38 16 34 8', 'M46 28 C42 22 50 16 46 8', 'M58 28 C54 22 62 16 58 8'];

/**
 * Inline SVG coffee-cup illustration for empty / error / not-found states.
 * Steam wisps drift gently; the animation is disabled when the user prefers reduced motion.
 */
export function StateIllustration({ variant = 'empty', className }: { variant?: StateIllustrationVariant; className?: string }) {
  const reduce = useReducedMotion();
  const steamOn = !reduce;

  return (
    <svg
      viewBox="0 0 96 96"
      width="96"
      height="96"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* steam */}
      {STEAM_PATHS.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="text-accent-text"
          initial={{ opacity: 0.25, pathLength: 0.4 }}
          animate={
            steamOn
              ? { opacity: [0.2, 0.8, 0.2], y: [4, -4, 4], pathLength: [0.4, 1, 0.4] }
              : { opacity: 0.5, pathLength: 0.7 }
          }
          transition={steamOn ? { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 } : { duration: 0 }}
        />
      ))}

      {/* cup body */}
      <path
        d="M22 40 H70 V62 C70 74 62 82 50 82 H42 C30 82 22 74 22 62 Z"
        fill="hsl(var(--surface))"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinejoin="round"
        className="text-primary"
      />
      {/* handle */}
      <path d="M70 46 H78 C86 46 86 62 78 62 H70" fill="none" stroke="currentColor" strokeWidth={3} className="text-primary" />
      {/* saucer */}
      <path d="M12 84 H84" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" className="text-primary" />

      {variant === 'error' && (
        <path d="M40 56 L56 72 M56 56 L40 72" stroke="currentColor" strokeWidth={3} strokeLinecap="round" className="text-red-700 dark:text-red-300" />
      )}
      {variant === 'notfound' && (
        <circle cx="48" cy="60" r="5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeDasharray="4 3" className="text-accent-text" />
      )}
    </svg>
  );
}
