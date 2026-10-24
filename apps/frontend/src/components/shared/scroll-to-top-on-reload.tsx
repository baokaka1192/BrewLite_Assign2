'use client';

import { useEffect } from 'react';

// Browsers restore the previous scroll position on reload; BrewLite always starts at the top.
export function ScrollToTopOnReload() {
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === 'reload') {
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      window.scrollTo(0, 0);
    }
  }, []);

  return null;
}
