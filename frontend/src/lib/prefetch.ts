/**
 * Route prefetch. Each registered destination in lib/routes carries an
 * `import()` thunk for its page chunk. Calling a thunk twice is fine —
 * Vite/Rollup reuse the already-resolved module, so spamming
 * `prefetch('/study')` is cheap.
 *
 * BottomNav fires `prefetch(path)` on pointerdown so the chunk starts
 * downloading before the click handler runs (~50-150ms of headstart on
 * touch devices). `prefetchIdle()` warms the likeliest next tap once the
 * first screen has its data and the main thread has a moment to spare.
 */
import { ROUTES } from './routes';

const REGISTRY: Record<string, () => Promise<unknown>> = Object.fromEntries(
  ROUTES.map((r) => [r.path, r.load]),
);

const fired = new Set<string>();

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

export function prefetch(path: string): void {
  const thunk = REGISTRY[path];
  if (!thunk || fired.has(path)) return;
  fired.add(path);
  // Don't `await` — start the download and forget. Errors are non-fatal:
  // the eventual real navigation will surface them via Suspense.
  thunk().catch(() => fired.delete(path));
}

/**
 * The two destinations a first visit actually goes to next: Start — the one
 * action the product exists for, and the centre of the tab bar — and the
 * catalogue.
 */
const WARM_PATHS = ['/study', '/topics'];

/**
 * Warm the next tap during genuine browser idle, no timeout forcing the
 * callback while the thread is busy.
 *
 * Warming every chrome destination (the phone's tabs plus the desktop rail,
 * eight in all) pulled their transitive chunks — Radix, Shiki, the markdown
 * parser — with them: 54 JS requests and ~1.25 MB on a cold first load, all
 * queued behind the seed bundle the first screen is waiting on. An earlier,
 * broader version put 22 chunk requests ahead of it. So the warm-up is the
 * two destinations above plus the topic page, and everything else is left to
 * the pointer prefetch — `onPointerEnter`/`onFocus` on the desktop rail,
 * `onPointerDown`/`onTouchStart` on the phone's tab bar.
 *
 * That covers every destination on desktop, and the five tabs on a phone.
 * Sources and Progress are in neither the tab bar nor a prefetching menu, so
 * on a phone their first tap pays the chunk fetch behind a Suspense fallback.
 * Deliberate: they are secondary destinations, and warming them is what put
 * their transitive chunks in front of the first screen's data.
 *
 * Skipped on slow connections (Save-Data / 2G / 3G): there the queue is the
 * cost, not the bytes, and the pointer prefetch still does its job.
 */
export function prefetchIdle(): void {
  if (typeof window === 'undefined') return;
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (conn?.saveData) return;
  if (conn?.effectiveType && /^(slow-2g|2g|3g)$/.test(conn.effectiveType)) return;

  const run = () => {
    WARM_PATHS.forEach(prefetch);
    // The topic page is where every catalogue row and Today's "next" card
    // lead; it is not a registered destination (the path carries a slug),
    // so it is warmed by hand. Vite pulls QuestionCard in with it.
    void import('../pages/TopicPage').catch(() => {});
  };
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => void };
  if (w.requestIdleCallback) {
    w.requestIdleCallback(run);
  } else {
    setTimeout(run, 1500);
  }
}
