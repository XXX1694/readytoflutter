import { useEffect, useState } from 'react';

/**
 * Reactive `matchMedia` hook. Returns `false` until mounted so SSR /
 * hydration stay deterministic. Updates whenever the breakpoint flips
 * (rotation, browser resize, IDE simulator change).
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    handler();
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, [query]);
  return matches;
}

// Tailwind breakpoints — keep in sync with tailwind.config.js defaults.
// `useIsMobile` follows the brief's <768px main mobile context.
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
// Sidebar drawer / bottom nav are gated at lg (1024px) — anything below is
// the "compact" layout where the desktop chrome collapses.
export const useIsCompact = () => useMediaQuery('(max-width: 1023px)');
