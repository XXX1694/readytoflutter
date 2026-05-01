import { lazy, Suspense, useEffect, useState } from 'react';
import { usePrefs } from '../store/prefs.js';

/**
 * Lazy-loaded global overlays. Each one used to live in `Layout` as an
 * eager import — collectively they were ~150kb of cmdk + 4× Radix Dialog
 * + WelcomeDialog content sitting in the entry chunk before the user
 * could possibly need any of it.
 *
 * Now each overlay is gated by its trigger condition and only downloaded
 * when that condition first flips:
 *   - CommandPalette → first time `commandOpen` becomes true
 *   - WelcomeDialog → first time, only if the welcome flag is unset
 *   - StackPickerDialog → only if no stack chosen yet AND not dismissed
 *   - ShortcutsOverlay → first time the user requests it
 *   - CommandHint → first paint after a 4s grace, only if not dismissed
 */

const CommandPaletteLazy = lazy(() => import('./CommandPalette.jsx'));
const WelcomeDialogLazy = lazy(() => import('./WelcomeDialog.jsx'));
const StackPickerDialogLazy = lazy(() => import('./StackPickerDialog.jsx'));
const ShortcutsOverlayLazy = lazy(() => import('./ShortcutsOverlay.jsx'));
const CommandHintLazy = lazy(() => import('./CommandHint.jsx'));

// `commandOpen` flipping to true is the only signal the palette needs.
// Once mounted we keep the chunk loaded for the rest of the session —
// re-opening shouldn't re-pay the network cost.
function LazyCommandPalette() {
  const open = usePrefs((s) => s.commandOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { if (open && !mounted) setMounted(true); }, [open, mounted]);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <CommandPaletteLazy />
    </Suspense>
  );
}

// First-paint dialogs gated by their localStorage flag. We read the flag
// synchronously at mount so the lazy import only fires for users who
// would actually see the dialog. After they dismiss it we keep the
// component mounted (it self-hides) — no need to unmount.
function LazyWelcomeDialog() {
  const [needs] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('rtf:welcome:v1') == null;
  });
  if (!needs) return null;
  return (
    <Suspense fallback={null}>
      <WelcomeDialogLazy />
    </Suspense>
  );
}

function LazyStackPickerDialog() {
  const [needs] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('rtf:stackpicker:v1') == null;
  });
  if (!needs) return null;
  return (
    <Suspense fallback={null}>
      <StackPickerDialogLazy />
    </Suspense>
  );
}

// Shortcuts overlay opens via `?` keypress. We listen for the key and
// flip a state that mounts the lazy component.
function LazyShortcutsOverlay() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (mounted) return;
    const onKey = (e) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target.tagName || '').toLowerCase();
        if (['input', 'textarea'].includes(tag) || e.target.isContentEditable) return;
        setMounted(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted]);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <ShortcutsOverlayLazy />
    </Suspense>
  );
}

// CommandHint shows a tiny "press ⌘K" pill on the first session. We delay
// the import 4 seconds so it doesn't compete with the dashboard's first
// render, and skip entirely if the user has already dismissed it.
function LazyCommandHint() {
  const [shouldMount, setShouldMount] = useState(false);
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem('rtf:cmdk:hint:dismissed:v1')) return;
    const id = setTimeout(() => setShouldMount(true), 4000);
    return () => clearTimeout(id);
  }, []);
  if (!shouldMount) return null;
  return (
    <Suspense fallback={null}>
      <CommandHintLazy />
    </Suspense>
  );
}

export default function LazyOverlays() {
  return (
    <>
      <LazyCommandPalette />
      <LazyCommandHint />
      <LazyShortcutsOverlay />
      <LazyStackPickerDialog />
      <LazyWelcomeDialog />
    </>
  );
}
