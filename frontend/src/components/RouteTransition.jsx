import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '../lib/useMediaQuery.js';

/**
 * Smooth route transitions + scroll restoration.
 *
 * Three navigation tiers, each with a different animation:
 *
 *   1. **Tab swap** (between bottom-nav roots: /, /study, /bookmarks,
 *      /knowledge, /settings/login) — instant fade. Native iOS/Android
 *      tab bars don't slide between tabs; trying to do so feels laggy
 *      especially with React.lazy chunk loads in between.
 *   2. **Push to detail** (e.g. / → /topic/foo) — short horizontal slide.
 *      The new page enters from the right.
 *   3. **Pop / back** — slide the new page in from the left.
 *
 * Desktop keeps a single subtle fade for everything.
 *
 * Honours `prefers-reduced-motion` — collapses to a 0ms swap. Scroll is
 * reset to top on every path change.
 */

// Roots that the bottom nav can land on. Switching between any two of
// these counts as a tab swap, not a push/pop.
const TAB_ROOTS = ['/', '/study', '/bookmarks', '/knowledge', '/settings', '/login', '/signup', '/stats', '/search', '/mock'];

const isTabRoot = (path) => TAB_ROOTS.includes(path);

export default function RouteTransition({ children }) {
  const location = useLocation();
  const navType = useNavigationType(); // 'PUSH' | 'POP' | 'REPLACE'
  const lastPath = useRef(location.pathname);
  const isMobile = useIsMobile();
  const reduce = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Classify the navigation that *led to* this render. We compare the path
  // we're rendering now against the path that was rendered last time.
  const navKind = useMemo(() => {
    const from = lastPath.current;
    const to = location.pathname;
    if (from === to) return 'same';
    if (isTabRoot(from) && isTabRoot(to)) return 'tab';
    if (navType === 'POP') return 'pop';
    return 'push';
    // navType is implicitly captured per render; the ref read is intentional
    // — we *want* the previous path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const pathChanged = lastPath.current !== location.pathname;
    lastPath.current = location.pathname;
    if (!pathChanged) return;
    requestAnimationFrame(() => {
      const main = document.querySelector('main');
      if (main && typeof main.scrollTo === 'function') main.scrollTo({ top: 0, behavior: 'instant' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }, [location.pathname]);

  if (reduce) return <>{children}</>;

  // Pick variants by tier. Mobile push/pop get a *light* slide (16% offset,
  // not 100%) so the GPU only repaints a strip, not the whole screen, and
  // the motion finishes before lazy chunks would otherwise feel sluggish.
  let variants;
  let transition;
  let mode;

  if (!isMobile) {
    variants = {
      initial: { opacity: 0, y: 6 },
      animate: { opacity: 1, y: 0 },
      exit:    { opacity: 0, y: -6 },
    };
    transition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] };
    mode = 'wait';
  } else if (navKind === 'tab') {
    // Tab swap — instant fade, no slide, no waiting for the previous page
    // to exit. This is the path that fires on every BottomNav tap.
    variants = {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit:    { opacity: 0 },
    };
    transition = { duration: 0.12, ease: 'easeOut' };
    mode = 'popLayout';
  } else if (navKind === 'pop') {
    // Back — new (older) page from the left.
    variants = {
      initial: { x: '-16%', opacity: 0.4 },
      animate: { x: 0, opacity: 1 },
      exit:    { x: '16%', opacity: 0.4 },
    };
    transition = { duration: 0.22, ease: [0.32, 0.72, 0, 1] };
    mode = 'popLayout';
  } else {
    // Forward push — new page from the right.
    variants = {
      initial: { x: '16%', opacity: 0.4 },
      animate: { x: 0, opacity: 1 },
      exit:    { x: '-16%', opacity: 0.4 },
    };
    transition = { duration: 0.22, ease: [0.32, 0.72, 0, 1] };
    mode = 'popLayout';
  }

  return (
    <AnimatePresence mode={mode} initial={false}>
      <motion.div
        key={location.pathname}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={transition}
        className="h-full"
        // GPU hint — tells the browser to allocate a layer so the transform
        // animation runs on the compositor, not the main thread.
        style={{ willChange: isMobile && navKind !== 'tab' ? 'transform, opacity' : 'opacity' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
