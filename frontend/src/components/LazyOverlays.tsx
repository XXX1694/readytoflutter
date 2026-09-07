import { lazy, Suspense, useEffect, useState } from 'react';

/**
 * Lazy-loaded global overlays, each downloaded only when its trigger first
 * fires:
 *   - ShortcutsOverlay → first time the user presses `?`
 *
 * There is no command palette: ⌘K, `/` and the header's search field all
 * open the search page. First-run onboarding is not a dialog either: the
 * stack picker renders inline on Today until a stack is chosen, so nothing
 * covers the page.
 */

const ShortcutsOverlayLazy = lazy(() => import('./ShortcutsOverlay'));

// Shortcuts overlay opens via `?` keypress. We listen for the key here, mount
// the lazy component, and hand it `defaultOpen` — the keypress that got us
// here is already consumed, and the overlay's own hotkey was not registered
// yet to see it.
function LazyShortcutsOverlay() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.metaKey || e.ctrlKey) return;
      const target = e.target as HTMLElement | null;
      const tag = (target?.tagName || '').toLowerCase();
      if (['input', 'textarea'].includes(tag) || target?.isContentEditable) return;
      setMounted(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted]);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <ShortcutsOverlayLazy defaultOpen />
    </Suspense>
  );
}

export default function LazyOverlays() {
  return <LazyShortcutsOverlay />;
}
