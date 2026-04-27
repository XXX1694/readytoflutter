import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Smooth route transitions + scroll restoration.
 *
 * Wraps `<Outlet />` so each path swap fades the next page in. Honours
 * `prefers-reduced-motion` — collapsed to a 0ms swap so motion-sensitive
 * users don't feel the parallax. Scroll position is reset to top on every
 * forward navigation, except when only the search/hash changed (filters,
 * anchors) — those keep the user where they were.
 */
export default function RouteTransition({ children }) {
  const location = useLocation();
  const lastPath = useRef(location.pathname);
  const reduce = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const pathChanged = lastPath.current !== location.pathname;
    lastPath.current = location.pathname;
    if (!pathChanged) return;
    // Defer to next frame so it happens after the new tree mounts.
    requestAnimationFrame(() => {
      const main = document.querySelector('main');
      if (main && typeof main.scrollTo === 'function') main.scrollTo({ top: 0, behavior: 'instant' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }, [location.pathname]);

  if (reduce) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
