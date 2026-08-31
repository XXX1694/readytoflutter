import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';

const STORAGE_KEY = 'rtf:cmdk:hint:dismissed:v1';
const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

const KBD_CLASS = 'rounded border border-rule/12 bg-paper-2 px-1 py-px font-mono text-[11px] text-ink-2';

/**
 * Floating ⌘K hint — appears once for first-time users in the bottom-left,
 * vanishes the moment they open the palette (or after 30s, whichever first).
 * After the first dismiss it never comes back.
 *
 * Two real <button>s side-by-side (open + dismiss) so keyboard users can tab
 * to either, instead of nesting a span[role=button] inside another button.
 */
export default function CommandHint() {
  const setCommandOpen = usePrefs((s) => s.setCommandOpen);
  const { lang } = useLang();
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* noop */ }
  }, []);

  // Only show if not previously dismissed.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss after a long-enough peek so it doesn't linger forever.
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => dismiss(), 30_000);
    return () => clearTimeout(t);
  }, [visible, dismiss]);

  // Subscribe outside React so we can react to "palette opened" without
  // the setState-in-effect cascade pattern. Fires once on the false→true
  // transition; dismiss() is idempotent if already hidden.
  useEffect(() => {
    let prev = usePrefs.getState().commandOpen;
    return usePrefs.subscribe((state) => {
      const open = state.commandOpen;
      if (open && !prev) dismiss();
      prev = open;
    });
  }, [dismiss]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-30 hidden animate-fade-in items-center gap-1 rounded-lg border border-rule/12 glass p-1 pl-3 shadow-codex-lg lg:flex">
      <button
        type="button"
        onClick={() => { setCommandOpen(true); dismiss(); }}
        className="py-1.5 pr-1 text-[13px] text-ink-2 outline-none"
        aria-label={lang === 'ru' ? 'Открыть командную палитру' : 'Open command palette'}
      >
        {lang === 'ru' ? 'Нажмите' : 'Press'}{' '}
        <kbd className={KBD_CLASS}>{isMac ? '⌘' : 'Ctrl'}</kbd>{' '}
        <kbd className={KBD_CLASS}>K</kbd>{' '}
        {lang === 'ru' ? 'для командной строки' : 'for the command bar'}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={lang === 'ru' ? 'Скрыть подсказку' : 'Dismiss hint'}
        className="ml-0.5 inline-flex h-7 w-7 items-center justify-center rounded text-muted-2 outline-none transition-colors hover:bg-rule/8 hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
