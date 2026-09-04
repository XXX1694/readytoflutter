import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { TAB_ROOTS } from '../lib/routes';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useIsMobile } from '../lib/useMediaQuery';
import { cn } from '../lib/cn';

/**
 * Route transitions + scroll handling — in CSS, with no animation library
 * in the app shell.
 *
 * Three navigation tiers:
 *
 *   1. **Tab swap** (between the nav roots: Today, Roadmap, Topics, Sources,
 *      Progress, Me, Session…) — an instant swap, no animation at all. This
 *      used to be a fade-out-then-fade-in (framer's `mode="wait"`): the old
 *      page dimmed for ~110 ms, then the new one faded up over ~180 ms, and
 *      every click on the rail read as a 300 ms lag. Native tab bars don't
 *      animate between tabs, and neither do we.
 *   2. **Push to detail** (e.g. / → /topic/foo) — on phones a short
 *      horizontal slide of the incoming page, fully opaque, from the right;
 *      on desktop a 100 ms fade-in of the incoming page only.
 *   3. **Pop / back** — the same slide from the left.
 *
 * The outgoing page never animates: keying the wrapper on the pathname
 * unmounts it at once, so the incoming page is laid out and interactive on
 * the first frame. The keyframes live in tailwind.config.js; index.css
 * collapses them under `prefers-reduced-motion`, so nothing here has to.
 *
 * Scroll: a new page starts at the top; a page reached with Back (or
 * Forward) comes back at the offset it was left at, the way a native stack
 * does.
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

/** The incoming page's animation class per navigation kind and device. */
const enterClass = (kind: NavKind, isMobile: boolean): string | undefined => {
  if (kind === 'same' || kind === 'tab') return undefined;
  if (!isMobile) return 'animate-page-fade';
  return kind === 'pop' ? 'animate-page-in-left' : 'animate-page-in-right';
};

export interface RouteTransitionProps {
  children: ReactNode;
}

export default function RouteTransition({ children }: RouteTransitionProps) {
  const location = useLocation();
  const navType = useNavigationType(); // 'PUSH' | 'POP' | 'REPLACE'
  const isMobile = useIsMobile();

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
  // after the switch is too late: the outgoing page is already gone and the
  // scroller has been clamped to the incoming one.
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
  // its data-route marker. Layout effect so the page never paints a frame at
  // the wrong offset.
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

  // Keyed on the pathname: a new page is a new element, so its enter
  // animation plays from the first frame and the old one is simply gone.
  return (
    <div
      key={location.pathname}
      data-route={location.pathname}
      className={cn('h-full', enterClass(navKind, isMobile))}
    >
      {children}
    </div>
  );
}
