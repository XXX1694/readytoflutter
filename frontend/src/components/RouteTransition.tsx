import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { TAB_ROOTS } from '../lib/routes';
import { useLocation, useNavigationType } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useIsMobile } from '../lib/useMediaQuery';

/**
 * Smooth route transitions + scroll handling.
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
 * Scroll: a new page starts at the top; a page reached with Back (or
 * Forward) comes back at the offset it was left at, the way a native stack
 * does. Honours `prefers-reduced-motion` — collapses to a 0ms swap.
 */

// Roots that the bottom nav can land on. Switching between any two of
// these counts as a tab swap, not a push/pop.
const isTabRoot = (path: string): boolean => TAB_ROOTS.includes(path);

type NavKind = 'same' | 'tab' | 'push' | 'pop';

/**
 * Scroll offset of every history entry the user has scrolled, keyed by the
 * entry's key. Module scope so it outlives this component; bounded by the
 * number of entries visited this session.
 */
const scrollMemory = new Map<string, number>();

/** Frames to wait for a restored page to grow tall enough for its old offset.
 *  Cached data paints in one or two; a fresh lazy chunk needs a few more. */
const RESTORE_FRAMES = 30;

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_IOS: [number, number, number, number] = [0.32, 0.72, 0, 1];
const SLIDE = { duration: 0.22, ease: EASE_IOS };
const FADE = { duration: 0.12, ease: 'easeOut' as const };

// The page variants take the navigation kind as `custom`. AnimatePresence
// forwards its own `custom` to the *exiting* child, so the page on its way
// out moves with the navigation that removed it — a page popped by Back
// slides right, the same page pushed away slides left — instead of replaying
// whichever direction it happened to arrive by.
const DESKTOP: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: EASE_OUT } },
  // `wait` holds the new page back until this finishes, so the exit is kept
  // to a blink — every millisecond here is felt as latency on a click.
  exit: { opacity: 0, y: -4, transition: { duration: 0.08, ease: 'easeIn' } },
};

// Mobile push/pop get a *light* slide (16% offset, not 100%) so the GPU only
// repaints a strip, not the whole screen, and the motion finishes before
// lazy chunks would otherwise feel sluggish.
const MOBILE: Variants = {
  initial: (kind: NavKind) =>
    kind === 'pop' ? { x: '-16%', opacity: 0.4 }
      : kind === 'push' ? { x: '16%', opacity: 0.4 }
        : { opacity: 0 },
  animate: (kind: NavKind) => ({
    x: 0,
    opacity: 1,
    transition: kind === 'tab' ? FADE : SLIDE,
  }),
  exit: (kind: NavKind) =>
    kind === 'pop' ? { x: '16%', opacity: 0.4, transition: SLIDE }
      : kind === 'push' ? { x: '-16%', opacity: 0.4, transition: SLIDE }
        : { opacity: 0, transition: FADE },
};

export interface RouteTransitionProps {
  children: ReactNode;
}

export default function RouteTransition({ children }: RouteTransitionProps) {
  const location = useLocation();
  const navType = useNavigationType(); // 'PUSH' | 'POP' | 'REPLACE'
  const isMobile = useIsMobile();
  const reduce = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The page being rendered and the one before it. Adjusting state during
  // render (React's own "derive from a prop" pattern) means the render that
  // switches pages already knows where it came from, without a render-phase
  // ref read. Only the pathname counts: a search-param change is the same page.
  const [trail, setTrail] = useState<{ from: string | null; to: string }>({
    from: null,
    to: location.pathname,
  });
  if (trail.to !== location.pathname) {
    setTrail({ from: trail.to, to: location.pathname });
  }

  let navKind: NavKind = 'same';
  if (trail.from !== null && trail.from !== trail.to) {
    if (isTabRoot(trail.from) && isTabRoot(trail.to)) navKind = 'tab';
    else if (navType === 'POP') navKind = 'pop';
    else navKind = 'push';
  }

  // Where the current entry is scrolled to, recorded as it happens. Reading it
  // after the switch is too late on mobile, where the outgoing page is already
  // out of flow and the scroller has been clamped to the incoming one.
  const entryKey = useRef(location.key);
  useEffect(() => {
    entryKey.current = location.key;
  }, [location.key]);
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const onScroll = () => { scrollMemory.set(entryKey.current, main.scrollTop); };
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  // On a page change: a fresh page starts at the top; an entry reached with
  // Back/Forward returns to where it was left. The incoming page is found by
  // its data-route marker, because with `mode="wait"` on desktop it mounts
  // only after the outgoing one has finished leaving. Layout effect so the
  // mobile case (mounted synchronously) never paints a frame at the wrong
  // offset.
  const lastPath = useRef(location.pathname);
  useLayoutEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    const main = document.querySelector('main');
    if (!main) return;

    const remembered = navType === 'POP' ? scrollMemory.get(location.key) : undefined;
    if (remembered === undefined) main.scrollTo({ top: 0, behavior: 'instant' });

    let frame = 0;
    let attempts = 0;
    const settle = () => {
      const mounted = main.querySelector(`[data-route="${CSS.escape(location.pathname)}"]`) !== null;
      const tall = remembered === undefined || main.scrollHeight - main.clientHeight >= remembered;
      if (!(mounted && tall) && attempts < RESTORE_FRAMES) {
        attempts += 1;
        frame = requestAnimationFrame(settle);
        return;
      }
      if (remembered !== undefined) main.scrollTo({ top: remembered, behavior: 'instant' });
      // The element that was clicked has usually just unmounted, which drops
      // focus to <body> — from there a screen reader reads nothing and Tab
      // starts over from the top of the chrome. Park focus on <main> instead
      // (it carries tabIndex=-1) unless the new page already focused a field.
      const active = document.activeElement;
      if (!active || active === document.body) main.focus({ preventScroll: true });
    };
    settle();
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.key, navType]);

  if (reduce) {
    return (
      <div data-route={location.pathname} className="h-full">
        {children}
      </div>
    );
  }

  // Tab swaps and slides run on `popLayout` so the incoming page never waits
  // for the outgoing one — that is the path every BottomNav tap takes.
  const mode = isMobile ? 'popLayout' : 'wait';

  return (
    <AnimatePresence mode={mode} initial={false} custom={navKind}>
      <motion.div
        key={location.pathname}
        data-route={location.pathname}
        custom={navKind}
        variants={isMobile ? MOBILE : DESKTOP}
        initial="initial"
        animate="animate"
        exit="exit"
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
