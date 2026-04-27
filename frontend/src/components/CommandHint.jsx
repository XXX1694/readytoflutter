import { useCallback, useEffect, useState } from 'react';
import { Command, X } from 'lucide-react';
import { usePrefs } from '../store/prefs.js';
import { useLang } from '../i18n/LangContext.jsx';
import { cn } from '../lib/cn.js';

const STORAGE_KEY = 'rtf:cmdk:hint:dismissed:v1';
const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

/**
 * Floating ⌘K hint — appears once for first-time users in the bottom-left,
 * vanishes the moment they open the palette (or after 30s, whichever first).
 * After the first dismiss it never comes back.
 *
 * Two real <button>s side-by-side (open + dismiss) so keyboard users can tab
 * to either, instead of nesting a span[role=button] inside another button.
 */
export default function CommandHint() {
  const commandOpen = usePrefs((s) => s.commandOpen);
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

  // Once the palette opens for the first time, mark dismissed permanently.
  useEffect(() => {
    if (commandOpen && visible) dismiss();
  }, [commandOpen, visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 z-30 hidden lg:flex',
        'group items-center gap-1 rounded-2xl border border-rule/12 glass p-1 pl-2.5',
        'shadow-[0_4px_8px_-2px_rgb(var(--shadow)/0.10),0_16px_40px_-8px_rgb(var(--shadow)/0.18)]',
        'animate-fade-in transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-rule/25',
      )}
    >
      <button
        type="button"
        onClick={() => { setCommandOpen(true); dismiss(); }}
        className="flex items-center gap-2 rounded-xl px-1 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        aria-label={lang === 'ru' ? 'Открыть командную палитру' : 'Open command palette'}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-sky text-white shadow-[0_2px_4px_-1px_rgb(var(--brand)/0.40)]">
          <Command className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="flex flex-col items-start gap-0.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-2">
            {lang === 'ru' ? 'Подсказка' : 'Tip'}
          </span>
          <span className="text-[12px] font-medium text-ink">
            {lang === 'ru' ? 'Жми' : 'Press'}{' '}
            <kbd className="rounded-md border border-rule/15 bg-paper-2 px-1 py-px font-mono text-[10px] text-ink-2">
              {isMac ? '⌘' : 'Ctrl'}
            </kbd>{' '}
            <kbd className="rounded-md border border-rule/15 bg-paper-2 px-1 py-px font-mono text-[10px] text-ink-2">K</kbd>{' '}
            {lang === 'ru' ? 'для меню' : 'for command bar'}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={lang === 'ru' ? 'Скрыть подсказку' : 'Dismiss hint'}
        className="ml-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-2 outline-none transition-colors hover:bg-rule/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/30"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
