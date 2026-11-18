'use client';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

/** Safety net so the bar never sticks if a navigation is cancelled. */
const MAX_VISIBLE_MS = 10000;

function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const routeKey = `${pathname}?${searchParams.toString()}`;

  // Route committed: finish the bar.
  useEffect(() => {
    setActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [routeKey]);

  // Start the bar as soon as an internal link is clicked, before the new route renders.
  useEffect(() => {
    const start = () => {
      setActive(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setActive(false), MAX_VISIBLE_MS);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page or hash-only jump: no route change, so no bar.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };

    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="route-progress"
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-accent"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.9 }}
          exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.2 } }}
          transition={{ duration: reduce ? 0 : 0.8, ease: 'easeOut' }}
        />
      )}
    </AnimatePresence>
  );
}

/** Thin amber bar at the top of the viewport that animates while a route transition is in flight. */
export function RouteProgress() {
  return (
    <Suspense fallback={null}>
      <RouteProgressBar />
    </Suspense>
  );
}
