/**
 * Route prefetch. Each registered destination in lib/routes carries an
 * `import()` thunk for its page chunk. Calling a thunk twice is fine —
 * Vite/Rollup reuse the already-resolved module, so spamming
 * `prefetch('/study')` is cheap.
 *
 * BottomNav fires `prefetch(path)` on pointerdown so the chunk starts
 * downloading before the click handler runs (~50-150ms of headstart on
 * touch devices). `prefetchIdle()` warms the tab roots once the first screen
 * has its data and the main thread has a moment to spare.
 */
import { ROUTES, TAB_ROUTES } from './routes';

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
 * Warm the tab roots during genuine browser idle — no timeout forcing the
 * callback while the thread is busy. Only the five tabs: everything else is
 * reached from a menu or the palette, where pointerdown prefetch covers the
 * latency, and warming all ten routes put 22 chunk requests ahead of the
 * seed bundle the first screen was waiting on. Skipped on slow connections
 * (Save-Data / 2G) to avoid burning the user's data plan.
 */
export function prefetchIdle(): void {
  if (typeof window === 'undefined') return;
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (conn?.saveData) return;
  if (conn?.effectiveType && /^(slow-2g|2g)$/.test(conn.effectiveType)) return;

  const run = () => {
    TAB_ROUTES.forEach((route) => prefetch(route.path));
  };
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => void };
  if (w.requestIdleCallback) {
    w.requestIdleCallback(run);
  } else {
    setTimeout(run, 1500);
  }
}
