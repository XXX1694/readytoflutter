import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Play, Timer, Target, ChevronRight, RotateCcw, ArrowRight, Eye, SkipForward,
  AlertCircle,
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useQuestions, useTopics } from '../lib/queries.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { Button, Pill, ProgressBar, FullPageLoader, difficultyTone } from '../ui/index.js';
import PlatformFilter from '../components/PlatformFilter.jsx';
import { usePrefs } from '../store/prefs.js';
import { filterQuestionsByPlatform } from '../lib/platform.js';
import VoiceInputButton from '../components/VoiceInputButton.jsx';
import AnswerText from '../components/AnswerText.jsx';
import CodeBlock from '../components/CodeBlock.jsx';
import AnswerGrader, { useAiHealth } from '../components/AnswerGrader.jsx';
import { cn } from '../lib/cn.js';

const COUNT_OPTIONS = [5, 10, 15, 20];
const TIMER_OPTIONS = [
  { key: 0, labelEn: 'Off', labelRu: 'Нет' },
  { key: 180, labelEn: '3 min', labelRu: '3 мин' },
  { key: 300, labelEn: '5 min', labelRu: '5 мин' },
];
const LEVELS = [
  { key: 'all', labelEn: 'Mixed', labelRu: 'Все' },
  { key: 'junior', labelEn: 'Junior' },
  { key: 'mid', labelEn: 'Mid' },
  { key: 'senior', labelEn: 'Senior' },
];

const RATINGS = [
  { key: 'again', tone: 'coral',  hotkey: '1', labelEn: 'Bombed', labelRu: 'Провалил' },
  { key: 'hard',  tone: 'amber',  hotkey: '2', labelEn: 'Rough',  labelRu: 'С трудом' },
  { key: 'good',  tone: 'brand',  hotkey: '3', labelEn: 'Solid',  labelRu: 'Уверенно' },
  { key: 'easy',  tone: 'mint',   hotkey: '4', labelEn: 'Nailed', labelRu: 'Идеально' },
];

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function MockPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialLevel = searchParams.get('level') || 'all';
  const initialTopic = searchParams.get('topic');
  const initialIds = searchParams.get('ids');

  const { lang } = useLang();
  const t = useT(lang);
  const { questionText, answerText } = useContent(lang);
  const { data: allQuestions = [], isLoading } = useQuestions();
  const { data: allTopics = [] } = useTopics();
  const platform = usePrefs((s) => s.platform);
  // Honor the persisted stack so a user prepping for iOS doesn't get Flutter
  // questions in their mock interview. Direct deep-links via `?ids=` bypass
  // this — those callers already curated their set.
  const questions = useMemo(
    () => filterQuestionsByPlatform(allQuestions, allTopics, platform),
    [allQuestions, allTopics, platform],
  );
  // Warm the AI-health probe as soon as the page mounts. Without this the
  // first /api/ai/grade call would race the /api/ai/health response and
  // the AnswerGrader would render `null` for a beat after Reveal.
  useAiHealth();

  const [phase, setPhase] = useState('setup'); // setup | running | review | done
  const [config, setConfig] = useState({
    level: initialLevel,
    count: 10,
    timer: 0,
    topic: initialTopic,
    ids: initialIds ? initialIds.split(',').map(Number).filter(Boolean) : null,
  });
  const [queue, setQueue] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState({}); // { id: { text, rating, elapsed } }
  const [revealed, setRevealed] = useState(false);
  const [perQuestionStart, setPerQuestionStart] = useState(0);
  const [sessionStart, setSessionStart] = useState(0);
  const [now, setNow] = useState(Date.now());
  const textareaRef = useRef(null);

  // Tick clock every second while a session is active. We display seconds,
  // so a 250ms tick was wasted work.
  useEffect(() => {
    if (phase !== 'running' && phase !== 'review') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const start = () => {
    // Deep-link by id bypasses the platform filter — the caller already
    // curated the set (e.g. "drill these 5 bookmarks"). Otherwise scope to
    // the active platform.
    let pool;
    if (config.ids?.length) {
      const idSet = new Set(config.ids);
      pool = allQuestions.filter((q) => idSet.has(q.id));
    } else {
      pool = questions;
      if (config.topic) pool = pool.filter((q) => q.topic_slug === config.topic);
      if (config.level !== 'all') pool = pool.filter((q) => q.level === config.level);
    }
    if (pool.length === 0) return;
    const picked = shuffle(pool).slice(0, config.count);
    setQueue(picked);
    setCursor(0);
    setAnswers({});
    setRevealed(false);
    setPerQuestionStart(Date.now());
    setSessionStart(Date.now());
    setPhase('running');
  };

  const current = queue[cursor];

  // Timer auto-reveal
  useEffect(() => {
    if (phase !== 'running' || config.timer === 0 || !current) return;
    const elapsed = Math.floor((now - perQuestionStart) / 1000);
    if (elapsed >= config.timer && !revealed) {
      setRevealed(true);
    }
  }, [now, phase, config.timer, perQuestionStart, revealed, current]);

  const reveal = () => setRevealed(true);

  const rate = (rating) => {
    if (!current) return;
    const elapsed = Math.floor((Date.now() - perQuestionStart) / 1000);
    const text = answers[current.id]?.text || '';
    setAnswers((prev) => ({
      ...prev,
      [current.id]: { text, rating, elapsed },
    }));
    if (cursor + 1 >= queue.length) {
      setPhase('done');
    } else {
      setCursor((c) => c + 1);
      setRevealed(false);
      setPerQuestionStart(Date.now());
      // Focus textarea on next question
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const skip = () => {
    if (!current) return;
    setAnswers((prev) => ({
      ...prev,
      [current.id]: { text: prev[current.id]?.text || '', rating: 'skipped', elapsed: 0 },
    }));
    if (cursor + 1 >= queue.length) {
      setPhase('done');
    } else {
      setCursor((c) => c + 1);
      setRevealed(false);
      setPerQuestionStart(Date.now());
    }
  };

  const updateAnswer = (text) => {
    if (!current) return;
    setAnswers((prev) => ({
      ...prev,
      [current.id]: { ...prev[current.id], text },
    }));
  };

  const appendVoice = (chunk) => {
    if (!current) return;
    setAnswers((prev) => {
      const existing = prev[current.id]?.text || '';
      const sep = existing && !/\s$/.test(existing) ? ' ' : '';
      return {
        ...prev,
        [current.id]: { ...prev[current.id], text: existing + sep + chunk },
      };
    });
  };

  // Hotkeys
  useHotkeys('mod+enter', (e) => {
    if (phase !== 'running' || !current) return;
    e.preventDefault();
    if (!revealed) reveal();
  }, { enableOnFormTags: true }, [phase, current, revealed]);
  useHotkeys('1', () => revealed && rate('again'), { enableOnFormTags: false }, [revealed, current]);
  useHotkeys('2', () => revealed && rate('hard'),  { enableOnFormTags: false }, [revealed, current]);
  useHotkeys('3', () => revealed && rate('good'),  { enableOnFormTags: false }, [revealed, current]);
  useHotkeys('4', () => revealed && rate('easy'),  { enableOnFormTags: false }, [revealed, current]);
  useHotkeys('escape', () => {
    if (phase === 'setup') navigate(-1);
    else if (window.confirm(lang === 'ru' ? 'Закончить сессию?' : 'End session?')) navigate('/');
  }, [phase]);

  if (isLoading) return <FullPageLoader />;

  if (phase === 'setup') {
    let available;
    if (config.ids?.length) {
      const idSet = new Set(config.ids);
      available = allQuestions.filter((q) => idSet.has(q.id));
    } else {
      available = questions;
      if (config.topic) available = available.filter((q) => q.topic_slug === config.topic);
      if (config.level !== 'all') available = available.filter((q) => q.level === config.level);
    }
    return (
      <SetupScreen
        config={config}
        onConfigChange={setConfig}
        onStart={start}
        onCancel={() => navigate(-1)}
        availableCount={available.length}
        lang={lang}
        showPlatformFilter={!config.ids?.length}
      />
    );
  }

  if (phase === 'done') {
    return (
      <DoneScreen
        queue={queue}
        answers={answers}
        sessionStart={sessionStart}
        lang={lang}
        t={t}
        questionText={questionText}
        answerText={answerText}
        onAgain={start}
        onHome={() => navigate('/')}
      />
    );
  }

  if (!current) {
    return null;
  }

  const elapsedSec = Math.floor((now - perQuestionStart) / 1000);
  const sessionElapsedSec = Math.floor((now - sessionStart) / 1000);
  const timerLeft = config.timer > 0 ? Math.max(0, config.timer - elapsedSec) : null;
  const difficultyLabel = { easy: t.easy, medium: t.medium, hard: t.hard }[current.difficulty];
  const userText = answers[current.id]?.text || '';

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[1400px] flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Top bar */}
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-rule/15 pb-4">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-brand" aria-hidden />
            <span className="font-display text-xl font-medium text-ink">
              {lang === 'ru' ? 'Mock Interview' : 'Mock Interview'}
            </span>
            <Pill tone="ghost" size="xs">
              {String(cursor + 1).padStart(2, '0')} / {String(queue.length).padStart(2, '0')}
            </Pill>
          </div>
          <div className="flex items-center gap-3">
            <ClockBadge label={lang === 'ru' ? 'Сессия' : 'Total'} seconds={sessionElapsedSec} tone="ink" />
            {timerLeft !== null && (
              <ClockBadge
                label={lang === 'ru' ? 'Осталось' : 'Left'}
                seconds={timerLeft}
                tone={timerLeft < 30 ? 'coral' : timerLeft < 60 ? 'amber' : 'brand'}
                pulse={timerLeft < 30}
              />
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} aria-label="End">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Progress */}
        <ProgressBar value={cursor} max={queue.length} size="sm" tone="gradient" className="mb-6" />

        {/* Question */}
        <section className="mb-5 rounded-md border border-rule/15 bg-paper-2 p-5 shadow-codex sm:p-7">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Pill tone={difficultyTone[current.difficulty] || 'neutral'} size="xs">
              {difficultyLabel}
            </Pill>
            <Pill tone="ghost" size="xs">{current.topic_title}</Pill>
            <Pill tone="ghost" size="xs">{t[current.level]?.short}</Pill>
          </div>
          <p className="font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-3xl">
            {questionText(current)}
          </p>
        </section>

        {/* Answer textarea (always present until revealed) */}
        {!revealed && (
          <section className="mb-5">
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              <span>{lang === 'ru' ? 'Твой ответ' : 'Your answer'}</span>
              <span className="h-px flex-1 bg-rule" />
              <VoiceInputButton lang={lang} onAppend={appendVoice} size="xs" />
            </div>
            <textarea
              ref={textareaRef}
              value={userText}
              onChange={(e) => updateAnswer(e.target.value)}
              onFocus={(e) => {
                setTimeout(() => {
                  try { e.target?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
                  catch { /* older Safari */ }
                }, 250);
              }}
              placeholder={lang === 'ru' ? 'Печатай — на собеседовании ты будешь говорить, а тут думаешь пальцами…' : 'Type — at the real interview you would speak, here you think out loud…'}
              rows={8}
              autoFocus
              autoCorrect="off"
              spellCheck={false}
              autoCapitalize="off"
              className="w-full resize-y rounded-md border border-rule/15 bg-paper-2 px-4 py-3 text-base text-ink placeholder:text-muted-2 outline-none shadow-codex-sm focus:shadow-codex"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-2">
                {userText.length} chars · <kbd className="rounded border border-rule/15 px-1.5 py-0.5">⌘↵</kbd> {lang === 'ru' ? 'показать ответ' : 'reveal answer'}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={skip}>
                  <SkipForward className="h-3.5 w-3.5" /> {lang === 'ru' ? 'Пропустить' : 'Skip'}
                </Button>
                <Button variant="brand" size="sm" onClick={reveal}>
                  <Eye className="h-3.5 w-3.5" /> {lang === 'ru' ? 'Показать ответ' : 'Reveal answer'}
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Side-by-side review.
            Mobile: reference first (the user wants the answer immediately), then
            their own attempt for comparison. Desktop: side-by-side, your-answer
            on the left, reference on the right (Western reading order). */}
        {revealed && (
          <>
            {/* AI grader sits ABOVE the side-by-side compare — that's the
                first thing the user sees after Reveal, no scrolling needed.
                Logical flow: AI feedback → visual compare → self-rate. */}
            <AnswerGrader
              key={current.id}
              questionId={current.id}
              userAnswer={userText}
              lang={lang}
            />

            <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
              <div className="order-2 rounded-md border border-rule/15 bg-paper p-4 lg:order-1">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  {lang === 'ru' ? 'Твой ответ' : 'Your answer'}
                </div>
                <div className="answer-text whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
                  {userText || (
                    <span className="italic text-muted-2">
                      {lang === 'ru' ? '— пусто —' : '— empty —'}
                    </span>
                  )}
                </div>
              </div>
              <div className="order-1 rounded-md border border-rule/15 bg-paper-2 p-4 shadow-codex-sm lg:order-2">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
                  {lang === 'ru' ? 'Эталонный ответ' : 'Reference'}
                </div>
                <AnswerText
                  text={answerText(current)}
                  className="answer-text text-sm leading-relaxed text-ink-2"
                />
                {current.code_example && (
                  <div className="mt-3">
                    <CodeBlock
                      code={current.code_example}
                      language={current.code_language || 'dart'}
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RATINGS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => rate(r.key)}
                  className={cn(
                    'group flex flex-col items-center gap-1 rounded-md border border-rule/15 bg-paper-2 px-3 py-3 shadow-codex-sm transition-all',
                    'hover:-translate-x-px hover:-translate-y-px hover:shadow-codex',
                    r.tone === 'coral' && 'hover:bg-coral/15',
                    r.tone === 'amber' && 'hover:bg-amber/15',
                    r.tone === 'brand' && 'hover:bg-brand/15',
                    r.tone === 'mint' && 'hover:bg-mint/15',
                  )}
                >
                  <kbd className="rounded border border-rule/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted">
                    {r.hotkey}
                  </kbd>
                  <span className="font-display text-base font-medium text-ink">
                    {lang === 'ru' ? r.labelRu : r.labelEn}
                  </span>
                </button>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function SetupScreen({ config, onConfigChange, onStart, onCancel, availableCount, lang, showPlatformFilter }) {
  const update = (patch) => onConfigChange({ ...config, ...patch });
  const insufficient = availableCount === 0;
  const realCount = Math.min(config.count, availableCount);

  return (
    <div className="bg-page flex min-h-full items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-rule/8 bg-paper-2 p-8 shadow-[0_2px_4px_0_rgb(var(--shadow)/0.06),0_24px_64px_-12px_rgb(var(--shadow)/0.16)] sm:p-12">
        {/* Aurora glows behind the form */}
        <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-brand/20 via-brand-sky/10 to-transparent blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-gradient-to-tr from-mint/15 via-brand/8 to-transparent blur-3xl" />

        <div className="relative mb-2 inline-flex items-center gap-2 rounded-full border border-rule/12 bg-paper-2/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-brand backdrop-blur">
          <Target className="h-3 w-3" /> Mock Interview · Setup
        </div>
        <h1 className="relative mt-3 font-display text-display-xs font-semibold leading-tight tracking-tightest text-ink sm:text-display-sm">
          {lang === 'ru' ? (
            <>Симулятор <span className="text-gradient-brand">собеседования</span>.</>
          ) : (
            <>Interview <span className="text-gradient-brand">simulator</span>.</>
          )}
        </h1>
        <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-ink-2">
          {lang === 'ru'
            ? 'Случайная подборка вопросов, таймер и self-grade. Чем чаще проходишь — тем спокойнее на реальном собесе.'
            : 'Randomized set, optional timer, self-grade. The more you run it, the cooler you get on the real one.'}
        </p>

        <div className="relative mt-8 space-y-7">
          {showPlatformFilter && (
            <Field label={lang === 'ru' ? 'Стек' : 'Stack'}>
              <PlatformFilter hideLabel />
            </Field>
          )}

          <Field label={lang === 'ru' ? 'Уровень' : 'Level'}>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <ToggleChip
                  key={l.key}
                  active={config.level === l.key}
                  onClick={() => update({ level: l.key })}
                >
                  {lang === 'ru' ? (l.labelRu || l.labelEn) : l.labelEn}
                </ToggleChip>
              ))}
            </div>
          </Field>

          <Field label={lang === 'ru' ? 'Кол-во вопросов' : 'Questions'}>
            <div className="flex flex-wrap gap-2">
              {COUNT_OPTIONS.map((c) => (
                <ToggleChip
                  key={c}
                  active={config.count === c}
                  onClick={() => update({ count: c })}
                >
                  {c}
                </ToggleChip>
              ))}
            </div>
          </Field>

          <Field label={lang === 'ru' ? 'Таймер на вопрос' : 'Per-question timer'}>
            <div className="flex flex-wrap gap-2">
              {TIMER_OPTIONS.map((tm) => (
                <ToggleChip
                  key={tm.key}
                  active={config.timer === tm.key}
                  onClick={() => update({ timer: tm.key })}
                >
                  {lang === 'ru' ? (tm.labelRu || tm.labelEn) : tm.labelEn}
                </ToggleChip>
              ))}
            </div>
          </Field>
        </div>

        <div className="relative mt-8 flex flex-col gap-3 border-t border-rule/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {insufficient ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-coral/30 bg-coral/8 px-3 py-1.5 text-sm text-coral">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {lang === 'ru'
                ? 'Нет вопросов под эти настройки. Смягчи фильтры.'
                : 'No questions match these filters. Loosen them.'}
            </span>
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {lang === 'ru'
                ? `Будет ${realCount} вопросов из ${availableCount}`
                : `${realCount} of ${availableCount} available`}
            </span>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel}>{lang === 'ru' ? 'Отмена' : 'Cancel'}</Button>
            <Button variant="brand" disabled={insufficient} onClick={onStart}>
              <Play className="h-4 w-4" /> {lang === 'ru' ? 'Начать' : 'Start'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
      {children}
    </div>
  );
}

function ToggleChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-[40px] items-center rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all duration-200',
        active
          ? 'border-ink bg-ink text-paper shadow-[0_2px_4px_-1px_rgb(var(--shadow)/0.20)]'
          : 'border-rule/12 bg-paper-2/60 text-muted hover:border-rule/25 hover:text-ink hover:bg-rule/5',
      )}
    >
      {children}
    </button>
  );
}

function ClockBadge({ label, seconds, tone = 'ink', pulse }) {
  const TONE = {
    ink: 'border-rule/15 text-ink',
    brand: 'border-brand text-brand',
    amber: 'border-[rgb(var(--amber))] text-[rgb(var(--amber))]',
    coral: 'border-coral text-[rgb(var(--coral))]',
  };
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-md border bg-paper-2 px-2.5 py-1 font-mono text-xs tabular-nums shadow-codex-sm',
      TONE[tone],
      pulse && 'animate-pulse',
    )}>
      <Timer className="h-3 w-3" aria-hidden />
      <span className="text-[10px] uppercase opacity-60">{label}</span>
      <span>{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>
    </div>
  );
}

function DoneScreen({ queue, answers, sessionStart, lang, t, questionText, answerText, onAgain, onHome }) {
  const totalSec = Math.floor((Date.now() - sessionStart) / 1000);
  const buckets = { again: 0, hard: 0, good: 0, easy: 0, skipped: 0 };
  for (const q of queue) {
    const a = answers[q.id];
    const r = a?.rating || 'skipped';
    buckets[r] = (buckets[r] || 0) + 1;
  }
  const score = (buckets.good + buckets.easy * 1.5) / queue.length;
  const scorePct = Math.round((score / 1.5) * 100);

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="mb-8 border-b border-rule/15 pb-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
            Mock Interview · {lang === 'ru' ? 'Итоги' : 'Recap'}
          </span>
          <h1 className="mt-3 font-display text-display-sm font-medium leading-tight tracking-tightest text-ink sm:text-display-md">
            {scorePct >= 80 ? (lang === 'ru' ? 'Огонь.' : 'Strong.') :
             scorePct >= 50 ? (lang === 'ru' ? 'Достойно.' : 'Solid base.') :
             (lang === 'ru' ? 'Есть что подтянуть.' : 'Room to grow.')}
          </h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted">
            {queue.length} {lang === 'ru' ? 'вопросов' : 'questions'} · {Math.floor(totalSec / 60)}m {totalSec % 60}s · {scorePct}% score
          </p>
        </header>

        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { key: 'easy',    label: lang === 'ru' ? 'Идеально' : 'Nailed', accent: 'text-mint',                     dot: 'bg-mint',                     glow: 'from-mint/[0.10] to-transparent' },
            { key: 'good',    label: lang === 'ru' ? 'Уверенно' : 'Solid',  accent: 'text-brand',                    dot: 'bg-brand',                    glow: 'from-brand/[0.10] to-transparent' },
            { key: 'hard',    label: lang === 'ru' ? 'С трудом' : 'Rough',  accent: 'text-[rgb(var(--amber))]',      dot: 'bg-[rgb(var(--amber))]',      glow: 'from-amber/[0.10] to-transparent' },
            { key: 'again',   label: lang === 'ru' ? 'Провалил' : 'Bombed', accent: 'text-coral',                    dot: 'bg-coral',                    glow: 'from-coral/[0.10] to-transparent' },
            { key: 'skipped', label: lang === 'ru' ? 'Скип' : 'Skipped',    accent: 'text-muted',                    dot: 'bg-muted',                    glow: 'from-muted/[0.06] to-transparent' },
          ].map((b) => (
            <div
              key={b.key}
              className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-rule/8 bg-paper-2 p-5 shadow-[0_1px_2px_0_rgb(var(--shadow)/0.04),0_4px_16px_-4px_rgb(var(--shadow)/0.06)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <span aria-hidden className={cn('pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100', b.glow)} />
              <div className="relative flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{b.label}</span>
                <span className={cn('h-1.5 w-1.5 rounded-full', b.dot)} aria-hidden />
              </div>
              <div className={cn('num relative text-display-xs sm:text-display-sm', b.accent)}>{buckets[b.key] || 0}</div>
            </div>
          ))}
        </section>

        <section className="mb-8">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {lang === 'ru' ? 'По вопросам' : 'Per question'}
          </div>
          <div className="space-y-2">
            {queue.map((q, i) => {
              const a = answers[q.id];
              const r = a?.rating || 'skipped';
              const tone = r === 'easy' ? 'mint' : r === 'good' ? 'brand' : r === 'hard' ? 'amber' : r === 'again' ? 'coral' : 'ghost';
              return (
                <details key={q.id} className="group rounded-md border border-rule bg-paper-2 px-4 py-3">
                  <summary className="flex cursor-pointer items-center gap-3 list-none">
                    <span className="font-mono text-[11px] tabular-nums text-brand">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 truncate text-sm text-ink-2">{questionText(q)}</span>
                    <Pill tone={tone} size="xs">
                      {r === 'skipped' ? (lang === 'ru' ? 'скип' : 'skip') : r}
                    </Pill>
                    <ChevronRight className="h-3.5 w-3.5 text-muted transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="mt-3 grid grid-cols-1 gap-3 border-t border-rule pt-3 lg:grid-cols-2">
                    <div className="rounded border border-rule bg-paper p-3">
                      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                        {lang === 'ru' ? 'Твой ответ' : 'Your answer'}
                      </div>
                      <div className="whitespace-pre-wrap text-xs text-ink-2">
                        {a?.text || (
                          <span className="italic text-muted-2">
                            {lang === 'ru' ? '— пусто —' : '— empty —'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rounded border border-rule bg-paper p-3">
                      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-brand">
                        {lang === 'ru' ? 'Эталон' : 'Reference'}
                      </div>
                      <AnswerText text={answerText(q)} className="text-xs text-ink-2" />
                      {q.code_example && (
                        <div className="mt-2">
                          <CodeBlock
                            code={q.code_example}
                            language={q.code_language || 'dart'}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="brand" className="flex-1" onClick={onAgain}>
            <RotateCcw className="h-4 w-4" /> {lang === 'ru' ? 'Ещё подход' : 'Run again'}
          </Button>
          <Button variant="codex" className="flex-1" onClick={onHome}>
            <ArrowRight className="h-4 w-4" /> Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
