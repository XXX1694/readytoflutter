import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Play, Timer, Target, ChevronRight, RotateCcw, ArrowRight, Eye, SkipForward,
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useQuestions } from '../lib/queries.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { Button, Pill, ProgressBar, FullPageLoader, difficultyTone } from '../ui/index.js';
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
  const { data: questions = [], isLoading } = useQuestions();

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

  // Tick clock once a second while a session is active
  useEffect(() => {
    if (phase !== 'running' && phase !== 'review') return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);

  const start = () => {
    let pool = questions;
    if (config.ids?.length) {
      const idSet = new Set(config.ids);
      pool = questions.filter((q) => idSet.has(q.id));
    } else {
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
    let available = questions;
    if (config.ids?.length) {
      const idSet = new Set(config.ids);
      available = questions.filter((q) => idSet.has(q.id));
    } else {
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
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Top bar */}
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b-1.5 border-ink pb-4">
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
        <section className="mb-5 rounded-md border-1.5 border-ink bg-paper-2 p-5 shadow-codex sm:p-7">
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
            <label className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              {lang === 'ru' ? 'Твой ответ' : 'Your answer'}
              <span className="h-px flex-1 bg-rule" />
            </label>
            <textarea
              ref={textareaRef}
              value={userText}
              onChange={(e) => updateAnswer(e.target.value)}
              placeholder={lang === 'ru' ? 'Печатай — на собеседовании ты будешь говорить, а тут думаешь пальцами…' : 'Type — at the real interview you would speak, here you think out loud…'}
              rows={8}
              autoFocus
              className="w-full resize-y rounded-md border-1.5 border-ink bg-paper-2 px-4 py-3 text-base text-ink placeholder:text-muted-2 outline-none shadow-codex-sm focus:shadow-codex"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-2">
                {userText.length} chars · <kbd className="rounded border border-rule-strong px-1.5 py-0.5">⌘↵</kbd> {lang === 'ru' ? 'показать ответ' : 'reveal answer'}
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

        {/* Side-by-side review */}
        {revealed && (
          <>
            <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-md border-1.5 border-rule-strong bg-paper p-4">
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
              <div className="rounded-md border-1.5 border-ink bg-paper-2 p-4 shadow-codex-sm">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
                  {lang === 'ru' ? 'Эталонный ответ' : 'Reference'}
                </div>
                <div className="answer-text whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
                  {answerText(current)}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RATINGS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => rate(r.key)}
                  className={cn(
                    'group flex flex-col items-center gap-1 rounded-md border-1.5 border-ink bg-paper-2 px-3 py-3 shadow-codex-sm transition-all',
                    'hover:-translate-x-px hover:-translate-y-px hover:shadow-codex',
                    r.tone === 'coral' && 'hover:bg-coral/15',
                    r.tone === 'amber' && 'hover:bg-amber/15',
                    r.tone === 'brand' && 'hover:bg-brand/15',
                    r.tone === 'mint' && 'hover:bg-mint/15',
                  )}
                >
                  <kbd className="rounded border border-rule-strong px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted">
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

function SetupScreen({ config, onConfigChange, onStart, onCancel, availableCount, lang }) {
  const update = (patch) => onConfigChange({ ...config, ...patch });
  const insufficient = availableCount === 0;
  const realCount = Math.min(config.count, availableCount);

  return (
    <div className="bg-page flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-md border-1.5 border-ink bg-paper-2 p-6 shadow-codex sm:p-10">
        <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
          <Target className="h-3 w-3" /> Mock Interview · Setup
        </div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          {lang === 'ru' ? 'Симулятор собеседования' : 'Interview simulator'}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          {lang === 'ru'
            ? 'Случайная подборка вопросов, таймер и self-grade. Чем чаще проходишь — тем спокойнее на реальном собесе.'
            : 'Randomized set, optional timer, self-grade. The more you run it, the cooler you get on the real one.'}
        </p>

        <div className="mt-7 space-y-6">
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

        <div className="mt-8 flex flex-col gap-3 border-t border-rule pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
            {insufficient
              ? (lang === 'ru' ? 'Нет вопросов в этом скоупе' : 'No questions in this scope')
              : (lang === 'ru' ? `Будет ${realCount} вопросов из ${availableCount}` : `${realCount} of ${availableCount} available`)}
          </span>
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
        'inline-flex items-center rounded-md border-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-all',
        active
          ? 'border-ink bg-ink text-paper shadow-codex-sm'
          : 'border-rule-strong bg-paper-2 text-muted hover:border-ink hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

function ClockBadge({ label, seconds, tone = 'ink', pulse }) {
  const TONE = {
    ink: 'border-ink text-ink',
    brand: 'border-brand text-brand',
    amber: 'border-[rgb(var(--amber))] text-[rgb(var(--amber))]',
    coral: 'border-coral text-[rgb(var(--coral))]',
  };
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-md border-1.5 bg-paper-2 px-2.5 py-1 font-mono text-xs tabular-nums shadow-codex-sm',
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
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="mb-8 border-b-1.5 border-ink pb-6">
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
            { key: 'easy',    label: lang === 'ru' ? 'Идеально' : 'Nailed', accent: 'text-mint' },
            { key: 'good',    label: lang === 'ru' ? 'Уверенно' : 'Solid',  accent: 'text-brand' },
            { key: 'hard',    label: lang === 'ru' ? 'С трудом' : 'Rough',  accent: 'text-[rgb(var(--amber))]' },
            { key: 'again',   label: lang === 'ru' ? 'Провалил' : 'Bombed', accent: 'text-coral' },
            { key: 'skipped', label: lang === 'ru' ? 'Скип' : 'Skipped',     accent: 'text-muted' },
          ].map((b) => (
            <div key={b.key} className="rounded-md border-1.5 border-ink bg-paper-2 p-4 shadow-codex-sm">
              <div className={cn('num text-3xl', b.accent)}>{buckets[b.key] || 0}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">{b.label}</div>
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
                      <div className="whitespace-pre-wrap text-xs text-ink-2">{answerText(q)}</div>
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
