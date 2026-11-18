'use client';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

// Module-level so it survives template remounts: only the very first page load skips the fade.
let appLoaded = false;

/** Light opacity fade between pages. The first load is not faded, so nothing flashes in. */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [skipFade] = useState(() => !appLoaded);
  useEffect(() => {
    appLoaded = true;
  }, []);
  return (
    <motion.div
      initial={skipFade || reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
