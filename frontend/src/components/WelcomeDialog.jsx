import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Command, Brain, Target, ArrowRight, X, Bookmark, TrendingUp } from 'lucide-react';
import { useLang } from '../i18n/LangContext.jsx';
import { Button, Pill } from '../ui/index.js';
import { cn } from '../lib/cn.js';

const STORAGE_KEY = 'rtf:welcome:v1';
const STACK_PICKER_KEY = 'rtf:stackpicker:v1';

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

const STEPS = [
  {
    icon: Command,
    en: {
      title: 'Cmd+K is everything',
      body: 'One palette to navigate, switch theme, jump to any topic, start a study session. Press it from anywhere.',
      kbd: ['⌘', 'K'],
    },
    ru: {
      title: 'Cmd+K — твой пульт',
      body: 'Одна палитра: навигация, тема, любой топик, запуск сессии. Работает из любого экрана.',
      kbd: ['⌘', 'K'],
    },
  },
  {
    icon: Brain,
    en: {
      title: 'Spaced repetition (SRS)',
      body: 'The dashboard shows cards due today. Drilling rates each card and SuperMemo SM-2 schedules the next review. The more often you study, the smaller the daily queue.',
      kbd: ['⌘', 'S'],
    },
    ru: {
      title: 'Интервальное повторение',
      body: 'На главной — карточки на сегодня. Каждая оценка пересчитывает следующую дату по SM-2. Регулярно повторяешь — очередь становится меньше.',
      kbd: ['⌘', 'S'],
    },
  },
  {
    icon: Target,
    en: {
      title: 'Mock interview',
      body: 'Pick level + count + timer, type your answer, reveal the reference, self-rate. The recap screen scores you and breaks down by question.',
      kbd: ['⌘', 'M'],
    },
    ru: {
      title: 'Mock-собеседование',
      body: 'Уровень + количество + таймер. Печатаешь ответ → раскрываешь эталон → self-grade. На финале — итоговый счёт и разбор по вопросам.',
      kbd: ['⌘', 'M'],
    },
  },
  {
    icon: Bookmark,
    en: {
      title: 'Tough questions',
      body: 'Star any card to bookmark it. Then drill or mock JUST your bookmarks — perfect for the day before the interview.',
      kbd: ['⌘', 'B'],
    },
    ru: {
      title: 'Закладки',
      body: 'Звёздочка на любой карточке = в закладки. Потом — drill/mock только по закладкам. Идеально за день до собеса.',
      kbd: ['⌘', 'B'],
    },
  },
];

export default function WelcomeDialog() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Defer to the stack picker — it owns first-launch attention. Only show
    // the tour after the picker has been dismissed (this run or before).
    if (!localStorage.getItem(STACK_PICKER_KEY)) return;
    const id = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(id);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* quota */ }
    setOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else dismiss();
  };

  const skip = () => dismiss();
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 outline-none data-[state=open]:animate-slide-up">
          <div className="overflow-hidden rounded-2xl border border-rule/12 glass shadow-[0_8px_16px_-4px_rgb(var(--shadow)/0.15),0_24px_64px_-12px_rgb(var(--shadow)/0.30)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-rule/15 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
                  {lang === 'ru' ? 'Знакомство · 4 шага' : 'Quick tour · 4 steps'}
                </span>
              </div>
              <Dialog.Title className="sr-only">
                {lang === 'ru' ? 'Гайд по приложению' : 'App tour'}
              </Dialog.Title>
              <button
                type="button"
                onClick={skip}
                aria-label={lang === 'ru' ? 'Закрыть' : 'Close'}
                className="text-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step body */}
            <Step step={STEPS[step]} lang={lang} />

            {/* Dots + actions */}
            <div className="flex items-center justify-between border-t border-rule/15 px-5 py-3">
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Step ${i + 1}`}
                    onClick={() => setStep(i)}
                    className={cn(
                      'h-1.5 w-6 rounded-full transition-colors',
                      i === step ? 'bg-ink' : 'bg-rule/15 hover:bg-rule/30',
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={skip}>
                  {lang === 'ru' ? 'Пропустить' : 'Skip'}
                </Button>
                <Button variant="brand" size="sm" onClick={next}>
                  {isLast
                    ? (lang === 'ru' ? 'Поехали' : 'Got it')
                    : (lang === 'ru' ? 'Дальше' : 'Next')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Step({ step, lang }) {
  const Icon = step.icon;
  const text = lang === 'ru' ? step.ru : step.en;
  return (
    <div className="px-6 py-7 sm:px-7">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/15 to-brand/5 text-brand ring-1 ring-brand/20">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="font-display text-2xl font-medium leading-tight tracking-tight text-ink">
        {text.title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">{text.body}</p>
      {text.kbd && (
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-rule/12 bg-paper-2 px-2.5 py-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-2">
            {lang === 'ru' ? 'Хоткей' : 'Hotkey'}
          </span>
          {text.kbd.map((k, i) => (
            <kbd
              key={i}
              className="rounded-md border border-rule/15 bg-paper-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-2"
            >
              {k === '⌘' ? mod : k}
            </kbd>
          ))}
        </div>
      )}
    </div>
  );
}
