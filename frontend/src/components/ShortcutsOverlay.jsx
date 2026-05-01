import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useHotkeys } from 'react-hotkeys-hook';
import { Keyboard, X } from 'lucide-react';
import { useLang } from '../i18n/LangContext.jsx';
import { cn } from '../lib/cn.js';

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const M = isMac ? '⌘' : 'Ctrl';

const SHORTCUTS = [
  { group: { en: 'Navigation', ru: 'Навигация' }, items: [
    { keys: [M, 'K'], en: 'Open command bar', ru: 'Открыть палитру' },
    { keys: [M, 'S'], en: 'Start study session', ru: 'Начать сессию' },
    { keys: [M, 'M'], en: 'Open mock interview', ru: 'Открыть mock-собес' },
    { keys: [M, 'B'], en: 'Open bookmarks', ru: 'Открыть закладки' },
    { keys: [M, ','], en: 'Settings', ru: 'Настройки' },
    { keys: ['/'],    en: 'Focus global search', ru: 'Фокус на поиск' },
    { keys: ['?'],    en: 'This panel', ru: 'Эта панель' },
    { keys: ['Esc'],  en: 'Close / leave', ru: 'Закрыть / уйти' },
  ]},
  { group: { en: 'Quick jump (g …)', ru: 'Быстрый переход (g …)' }, items: [
    { keys: ['G', 'H'], en: 'Home', ru: 'На главную' },
    { keys: ['G', 'S'], en: 'Search', ru: 'Поиск' },
    { keys: ['G', 'Y'], en: 'Study', ru: 'Учить' },
    { keys: ['G', 'M'], en: 'Mock', ru: 'Mock' },
    { keys: ['G', 'K'], en: 'Knowledge', ru: 'База знаний' },
    { keys: ['G', 'B'], en: 'Bookmarks', ru: 'Закладки' },
    { keys: ['G', 'T'], en: 'Mastery (stats)', ru: 'Статистика' },
    { keys: ['G', 'A'], en: 'Settings', ru: 'Настройки' },
  ]},
  { group: { en: 'Toggles', ru: 'Переключатели' }, items: [
    { keys: ['T'], en: 'Toggle theme · light ↔ dark', ru: 'Тема · светлая ↔ тёмная' },
    { keys: ['R'], en: 'Recall mode on / off', ru: 'Режим recall вкл / выкл' },
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
  { group: { en: 'Mock interview', ru: 'Mock-собес' }, items: [
    { keys: [M, '↵'], en: 'Reveal answer', ru: 'Показать эталон' },
    { keys: ['1–4'],  en: 'Self-grade after reveal', ru: 'Self-grade после reveal' },
  ]},
];

/**
 * Power-user keyboard shortcuts overlay. Press `?` anywhere to open.
 * Glass surface, brand-tinted kbd capsules.
 *
 * Skipped entirely on touch-only devices: there's no physical keyboard to
 * hit Shift+/, and none of the listed shortcuts apply on mobile anyway.
 */
const isTouchOnly = () => {
  if (typeof window === 'undefined') return false;
  // Coarse pointer + no fine pointer = touch device with no mouse/trackpad.
  return window.matchMedia?.('(hover: none) and (pointer: coarse)').matches ?? false;
};

export default function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const { lang } = useLang();
  const isRu = lang === 'ru';

  // Hooks must run unconditionally — gate the listener with `enabled` and
  // skip render later, instead of early-returning before the hook.
  const touchOnly = isTouchOnly();

  useHotkeys('shift+/', (e) => {
    // `?` lives on Shift+/ — most layouts. Don't fire while typing in form fields.
    const tag = (e.target?.tagName || '').toLowerCase();
    if (['input', 'textarea'].includes(tag) || e.target?.isContentEditable) return;
    e.preventDefault();
    setOpen((v) => !v);
  }, { enabled: !touchOnly });

  // Don't render on phones — saves a Radix subtree.
  if (touchOnly) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 outline-none',
            'data-[state=open]:animate-slide-up',
          )}
        >
          <div className="overflow-hidden rounded-2xl border border-rule/12 glass shadow-[0_8px_16px_-4px_rgb(var(--shadow)/0.15),0_24px_64px_-12px_rgb(var(--shadow)/0.30)]">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-rule/8 px-5 py-3.5">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
                <Keyboard className="h-3.5 w-3.5" />
                <Dialog.Title className="font-mono">
                  {isRu ? 'Горячие клавиши' : 'Keyboard shortcuts'}
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-rule/10 hover:text-ink"
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
                  <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    {isRu ? g.group.ru : g.group.en}
                  </div>
                  <ul className="space-y-2">
                    {g.items.map((it, i) => (
                      <li key={i} className="flex items-center justify-between gap-3">
                        <span className="text-[13px] text-ink-2">
                          {isRu ? it.ru : it.en}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {it.keys.map((k, ki) => (
                            <kbd key={ki} className="rounded-md border border-rule/15 bg-paper-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-2">
                              {k}
                            </kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-rule/8 px-5 py-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-2">
              {isRu ? 'Жми' : 'Press'}{' '}
              <kbd className="rounded-md border border-rule/15 bg-paper-2 px-1 py-px font-mono text-[10px] text-ink-2">?</kbd>{' '}
              {isRu ? 'чтобы вызвать снова' : 'anywhere to bring this back'}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
