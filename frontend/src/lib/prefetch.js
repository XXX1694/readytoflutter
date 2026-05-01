/**
 * Route prefetch registry. Each entry is an `import()` thunk for a lazy
 * page chunk. Calling the thunk twice is fine — Vite/Rollup reuse the
 * already-resolved module, so spamming `prefetch('/study')` is cheap.
 *
 * BottomNav fires `prefetch(path)` on pointerdown so the chunk starts
 * downloading before the click handler runs (~50-150ms of headstart on
 * touch devices). `prefetchIdle()` warms the rest of the tab roots once
 * the main thread has a moment to spare.
 */
const REGISTRY = {
  '/':           () => import('../pages/HomePage.jsx'),
  '/study':      () => import('../pages/StudyPage.jsx'),
  '/mock':       () => import('../pages/MockPage.jsx'),
  '/bookmarks':  () => import('../pages/BookmarksPage.jsx'),
  '/knowledge':  () => import('../pages/KnowledgePage.jsx'),
  '/search':     () => import('../pages/SearchPage.jsx'),
  '/stats':      () => import('../pages/StatsPage.jsx'),
  '/settings':   () => import('../pages/SettingsPage.jsx'),
  '/login':      () => import('../pages/LoginPage.jsx'),
  '/signup':     () => import('../pages/SignupPage.jsx'),
};

const fired = new Set();

export function prefetch(path) {
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
export function prefetchIdle() {
  if (typeof window === 'undefined') return;
  const conn = navigator.connection;
  if (conn?.saveData) return;
  if (conn?.effectiveType && /^(slow-2g|2g)$/.test(conn.effectiveType)) return;

  const run = () => {
    Object.keys(REGISTRY).forEach(prefetch);
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 1500);
  }
}
