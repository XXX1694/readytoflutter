import { lazy, Suspense, useEffect, useState } from 'react';
import { usePrefs } from '../store/prefs';

/**
 * Lazy-loaded global overlays. Each is gated by its trigger condition and
 * only downloaded when that condition first flips:
 *   - CommandPalette → first time `commandOpen` becomes true
 *   - ShortcutsOverlay → first time the user presses `?`
 *
 * First-run onboarding is no longer a dialog: the stack picker renders
 * inline on Today until a stack is chosen, so nothing covers the page.
 */

const CommandPaletteLazy = lazy(() => import('./CommandPalette'));
const ShortcutsOverlayLazy = lazy(() => import('./ShortcutsOverlay'));

// `commandOpen` flipping to true is the only signal the palette needs.
// Once mounted we keep the chunk loaded for the rest of the session —
// re-opening shouldn't re-pay the network cost.
function LazyCommandPalette() {
  const open = usePrefs((s) => s.commandOpen);
  const [mounted, setMounted] = useState(false);
  // Adjusting state during render rather than in an effect: this is a pure
  // latch on `open`, and an effect here cost an extra render pass every time
  // the palette was toggled.
  if (open && !mounted) setMounted(true);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <CommandPaletteLazy />
    </Suspense>
  );
}

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
  return (
    <>
      <LazyCommandPalette />
      <LazyShortcutsOverlay />
    </>
  );
}
