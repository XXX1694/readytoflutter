/**
 * Route prefetch. Each registered destination in lib/routes carries an
 * `import()` thunk for its page chunk. Calling a thunk twice is fine —
 * Vite/Rollup reuse the already-resolved module, so spamming
 * `prefetch('/study')` is cheap.
 *
 * BottomNav fires `prefetch(path)` on pointerdown so the chunk starts
 * downloading before the click handler runs (~50-150ms of headstart on
 * touch devices). `prefetchIdle()` warms the tab roots once the main thread
 * has a moment to spare.
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
 * Warm every registered route during browser idle time. Skipped on slow
 * connections (Save-Data / 2G) to avoid burning the user's data plan.
 */
export function prefetchIdle(): void {
  if (typeof window === 'undefined') return;
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (conn?.saveData) return;
  if (conn?.effectiveType && /^(slow-2g|2g)$/.test(conn.effectiveType)) return;

  const run = () => {
    Object.keys(REGISTRY).forEach(prefetch);
  };
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void };
  if (w.requestIdleCallback) {
    w.requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 1500);
  }
}
