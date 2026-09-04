import { useEffect, useState } from 'react';

/**
 * Reactive `matchMedia` hook. Reads the query synchronously on first render
 * (the app is client-rendered, so there is no hydration to keep in step) and
 * updates whenever the breakpoint flips (rotation, browser resize, IDE
 * simulator change).
 *
 * Starting from `false` and correcting in an effect painted one frame of the
 * desktop layout on every phone load — the sidebar drawer sat open at x=0 and
 * then sprang off-screen.
 */
const read = (query: string): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches;

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => read(query));
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
export const useIsMobile = (): boolean => useMediaQuery('(max-width: 767px)');
// Sidebar drawer / bottom nav are gated at lg (1024px) — anything below is
// the "compact" layout where the desktop chrome collapses.
