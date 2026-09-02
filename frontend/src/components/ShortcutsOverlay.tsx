import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useHotkeys } from 'react-hotkeys-hook';
import { Keyboard, X } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const M = isMac ? '⌘' : 'Ctrl';

interface Shortcut {
  keys: string[];
  en: string;
  ru: string;
}

interface ShortcutGroup {
  group: { en: string; ru: string };
  items: Shortcut[];
}

const SHORTCUTS: ShortcutGroup[] = [
  { group: { en: 'Navigation', ru: 'Навигация' }, items: [
    { keys: [M, 'K'], en: 'Open command bar', ru: 'Открыть палитру' },
    { keys: [M, 'S'], en: 'Start session', ru: 'Начать сессию' },
    { keys: [M, 'M'], en: 'Timed session', ru: 'Сессия на время' },
    { keys: [M, 'B'], en: 'Saved', ru: 'Сохранённое' },
    { keys: [M, ','], en: 'Me', ru: 'Профиль' },
    { keys: ['/'],    en: 'Search or run a command', ru: 'Поиск или команда' },
    { keys: ['?'],    en: 'This panel', ru: 'Эта панель' },
    { keys: ['Esc'],  en: 'Close / leave', ru: 'Закрыть / уйти' },
  ]},
  { group: { en: 'Quick jump (g …)', ru: 'Быстрый переход (g …)' }, items: [
    { keys: ['G', 'H'], en: 'Today', ru: 'Сегодня' },
    { keys: ['G', 'R'], en: 'Roadmap', ru: 'Маршрут' },
    { keys: ['G', 'T'], en: 'Topics', ru: 'Темы' },
    { keys: ['G', 'P'], en: 'Progress', ru: 'Прогресс' },
    { keys: ['G', 'Y'], en: 'Session', ru: 'Сессия' },
    { keys: ['G', 'M'], en: 'Timed session', ru: 'Сессия на время' },
    { keys: ['G', 'K'], en: 'Sources', ru: 'Источники' },
    { keys: ['G', 'B'], en: 'Saved', ru: 'Сохранённое' },
    { keys: ['G', 'S'], en: 'Search', ru: 'Поиск' },
    { keys: ['G', 'A'], en: 'Me', ru: 'Профиль' },
  ]},
  { group: { en: 'Toggles', ru: 'Переключатели' }, items: [
    { keys: ['T'], en: 'Toggle theme · light ↔ dark', ru: 'Тема · светлая ↔ тёмная' },
    { keys: ['R'], en: '"Write it first" on / off', ru: '«Сначала своими словами» вкл / выкл' },
  ]},
  { group: { en: 'Topic page', ru: 'Страница темы' }, items: [
    { keys: ['J / ↓'], en: 'Next question', ru: 'Следующий вопрос' },
    { keys: ['K / ↑'], en: 'Previous question', ru: 'Предыдущий вопрос' },
    { keys: ['Space'], en: 'Toggle expand', ru: 'Раскрыть / свернуть' },
  ]},
  { group: { en: 'Study (SRS)', ru: 'Учить (SRS)' }, items: [
    { keys: ['Space'], en: 'Reveal answer', ru: 'Показать ответ' },
    { keys: ['1'],     en: 'Again', ru: 'Снова' },
    { keys: ['2'],     en: 'Hard',  ru: 'Тяжело' },
    { keys: ['3'],     en: 'Good',  ru: 'Хорошо' },
    { keys: ['4'],     en: 'Easy',  ru: 'Легко' },
  ]},
  { group: { en: 'Timed session', ru: 'Сессия на время' }, items: [
    { keys: [M, '↵'], en: 'Reveal answer', ru: 'Показать эталон' },
    { keys: ['1–4'],  en: 'Self-grade after reveal', ru: 'Самооценка после ответа' },
  ]},
];

/**
 * Power-user keyboard shortcuts overlay. Press `?` anywhere to open. Keys are
 * one of the few places the mono face is the right call — a keycap is a
 * fixed-width glyph.
 *
 * Skipped entirely on touch-only devices: there's no physical keyboard to
 * hit Shift+/, and none of the listed shortcuts apply on mobile anyway.
 */
const isTouchOnly = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Coarse pointer + no fine pointer = touch device with no mouse/trackpad.
  return window.matchMedia?.('(hover: none) and (pointer: coarse)').matches ?? false;
};

const KEYCAP = 'rounded border border-rule/15 bg-paper px-1.5 py-0.5 font-mono text-[11px] text-ink-2';

export interface ShortcutsOverlayProps {
  /**
   * Start open. LazyOverlays only mounts this component *because* the user
   * pressed `?`, and that keypress is already spent by the time the lazy
   * chunk resolves — without this the first press only downloaded the chunk
   * and the user had to press `?` a second time to actually see it.
   */
  defaultOpen?: boolean;
}

export default function ShortcutsOverlay({ defaultOpen = false }: ShortcutsOverlayProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { lang } = useLang();
  const isRu = lang === 'ru';

  // Hooks must run unconditionally — gate the listener with `enabled` and
  // skip render later, instead of early-returning before the hook.
  const touchOnly = isTouchOnly();

  // react-hotkeys-hook matches on `event.code`, so the key half has to be
  // `slash`, not `/` — `'shift+/'` silently never fires.
  useHotkeys('shift+slash', (e: KeyboardEvent) => {
    // `?` lives on Shift+/ on most layouts. Don't fire while typing in a field.
    const target = e.target as HTMLElement | null;
    const tag = (target?.tagName || '').toLowerCase();
    if (['input', 'textarea'].includes(tag) || target?.isContentEditable) return;
    e.preventDefault();
    setOpen((v) => !v);
  }, { enabled: !touchOnly });

  // Don't render on phones — saves a Radix subtree.
  if (touchOnly) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 outline-none data-[state=open]:animate-slide-up">
          <div className="overflow-hidden rounded-xl border border-rule/12 bg-paper-2 shadow-codex-lg">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-rule/12 px-5 py-3.5">
              <div className="flex items-center gap-2 text-ink">
                <Keyboard className="h-4 w-4 text-muted" aria-hidden />
                <Dialog.Title className="font-display text-base font-semibold">
                  {isRu ? 'Горячие клавиши' : 'Keyboard shortcuts'}
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-rule/8 hover:text-ink"
                  aria-label={isRu ? 'Закрыть' : 'Close'}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Body */}
            <div className="grid max-h-[70vh] grid-cols-1 gap-x-8 gap-y-6 overflow-y-auto p-6 sm:grid-cols-2">
              {SHORTCUTS.map((g) => (
                <section key={g.group.en}>
                  <h3 className="eyebrow mb-3">{isRu ? g.group.ru : g.group.en}</h3>
                  <ul className="space-y-2">
                    {g.items.map((it) => (
                      <li key={it.en} className="flex items-center justify-between gap-3">
                        <span className="text-[13px] text-ink-2">
                          {isRu ? it.ru : it.en}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {it.keys.map((k) => (
                            <kbd key={k} className={KEYCAP}>{k}</kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {/* Footer — doubles as the dialog's accessible description. */}
            <Dialog.Description asChild>
              <p className="border-t border-rule/12 px-5 py-3 text-center text-[13px] text-muted">
                {isRu ? 'Жми' : 'Press'}{' '}
                <kbd className={KEYCAP}>?</kbd>{' '}
                {isRu ? 'чтобы вызвать снова' : 'anywhere to bring this back'}
              </p>
            </Dialog.Description>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
