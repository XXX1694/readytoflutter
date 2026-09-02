import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronRight, X } from 'lucide-react';
import { useQuestions, useTopics } from '../lib/queries';
import { useLang, type Lang } from '../i18n/LangContext';
import { UI, useT, type UICopy } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { Button, Pill, ProgressBar, FullPageLoader, difficultyTone } from '../ui/index';
import PlatformFilter from '../components/PlatformFilter';
import { usePrefs } from '../store/prefs';
import { filterQuestionsByPlatform } from '../lib/platform';
import VoiceInputButton from '../components/VoiceInputButton';
import AnswerText from '../components/AnswerText';
import CodeBlock from '../components/CodeBlock';
import AnswerGrader, {
  SelfGrade, useAiHealth, type SelfGradeOption,
} from '../components/AnswerGrader';
import {
  useQuestionSession, countOutcomes, type Outcome, type OutcomeCounts,
} from '../lib/useQuestionSession';
import { cn } from '../lib/cn';
import { track } from '../lib/analytics';

import type { Level, Question, Topic } from '../types/domain';

/** Stable empty defaults, so the pool memo isn't invalidated every render. */
const NO_QUESTIONS: Question[] = [];
const NO_TOPICS: Topic[] = [];

type LevelScope = 'all' | Level;

interface MockConfig {
  level: LevelScope;
  count: number;
  timer: number;
  topic: string | null;
  ids: number[] | null;
}

const COUNT_OPTIONS = [5, 10, 15, 20];

const LEVEL_OPTIONS: readonly LevelScope[] = ['all', 'junior', 'mid', 'senior'];
const isLevelScope = (value: string | null): value is LevelScope =>
  value !== null && (LEVEL_OPTIONS as readonly string[]).includes(value);

const levelLabel = (level: LevelScope, lang: Lang): string => {
  if (level !== 'all') return UI[lang][level].short;
  return lang === 'ru' ? 'Все' : 'Mixed';
};

const timerOptions = (lang: Lang): Array<{ seconds: number; label: string }> => [
  { seconds: 0, label: lang === 'ru' ? 'Без таймера' : 'No timer' },
  { seconds: 180, label: lang === 'ru' ? '3 мин' : '3 min' },
  { seconds: 300, label: lang === 'ru' ? '5 мин' : '5 min' },
];

/** Interview wording — you are grading a performance, not scheduling a card. */
const grades = (lang: Lang): SelfGradeOption[] => [
  { rating: 'again', label: lang === 'ru' ? 'Провалил' : 'Bombed' },
  { rating: 'hard', label: lang === 'ru' ? 'С трудом' : 'Rough' },
  { rating: 'good', label: lang === 'ru' ? 'Уверенно' : 'Solid' },
  { rating: 'easy', label: lang === 'ru' ? 'Идеально' : 'Nailed' },
];

const OUTCOME_TONE = {
  easy: 'mint',
  good: 'mint',
  hard: 'amber',
  again: 'coral',
  skipped: 'neutral',
} as const;

const outcomeLabel = (outcome: Outcome, lang: Lang): string => ({
  again: lang === 'ru' ? 'провалил' : 'bombed',
  hard: lang === 'ru' ? 'с трудом' : 'rough',
  good: lang === 'ru' ? 'уверенно' : 'solid',
  easy: lang === 'ru' ? 'идеально' : 'nailed',
  skipped: lang === 'ru' ? 'пропуск' : 'skipped',
}[outcome]);

const shuffle = <T,>(items: T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const clock = (seconds: number): string => {
  // Clamped: the tick lags a fresh start by up to a second, and a negative
  // clock reads as broken.
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function MockPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialLevel = searchParams.get('level');
  const initialIds = searchParams.get('ids');

  const { lang } = useLang();
  const ru = lang === 'ru';
  const t = useT(lang);
  const { questionText, answerText } = useContent(lang);
  const { data: allQuestions = NO_QUESTIONS, isLoading } = useQuestions();
  const { data: allTopics = NO_TOPICS } = useTopics();
  const platform = usePrefs((s) => s.platform);
  // Warm the AI-health probe on mount, so the first grade after a reveal
  // doesn't race the /api/ai/health response.
  useAiHealth();

  const [config, setConfig] = useState<MockConfig>({
    level: isLevelScope(initialLevel) ? initialLevel : 'all',
    count: 10,
    timer: 0,
    topic: searchParams.get('topic'),
    ids: initialIds ? initialIds.split(',').map(Number).filter(Boolean) : null,
  });
  const [started, setStarted] = useState(false);
  const [queue, setQueue] = useState<Question[]>([]);
  const [questionStartedAt, setQuestionStartedAt] = useState(0);
  const [sessionStartedAt, setSessionStartedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // ── Build the queue ──────────────────────────────────────────────────────
  // Honour the persisted stack so someone prepping for iOS isn't handed
  // Flutter questions. A `?ids=` deep-link bypasses it — that caller already
  // curated the set.
  const available = useMemo(() => {
    if (config.ids?.length) {
      const wanted = new Set(config.ids);
      return allQuestions.filter((q) => wanted.has(q.id));
    }
    let pool = filterQuestionsByPlatform(allQuestions, allTopics, platform);
    if (config.topic) pool = pool.filter((q) => q.topic_slug === config.topic);
    if (config.level !== 'all') pool = pool.filter((q) => q.level === config.level);
    return pool;
  }, [allQuestions, allTopics, platform, config]);

  const start = () => {
    if (available.length === 0) return;
    const picked = shuffle(available).slice(0, config.count);
    setQueue(picked);
    setQuestionStartedAt(Date.now());
    setSessionStartedAt(Date.now());
    setStarted(true);
    track('mock_session_start', {
      count: picked.length,
      level: config.level,
      timer: config.timer,
      topic: config.topic || null,
    });
  };

  // ── Run the session ──────────────────────────────────────────────────────
  const onQuestionSec = questionStartedAt
    ? Math.max(0, Math.floor((now - questionStartedAt) / 1000))
    : 0;
  const timedOut = config.timer > 0 && onQuestionSec >= config.timer;

  const session = useQuestionSession<Question>({
    queue,
    revealHotkey: 'mod+enter',
    // The per-question timer running out shows the answer, exactly as if the
    // user had asked for it — the grade hotkeys have to work from there too.
    autoRevealed: timedOut,
    onAdvance: () => setQuestionStartedAt(Date.now()),
    onExit: () => {
      if (!started) navigate(-1);
      else if (window.confirm(ru ? 'Закончить сессию?' : 'End the session?')) navigate('/');
    },
  });
  const { current, revealed, draft, draftRef } = session;
  const counts = useMemo(() => countOutcomes(session.outcomes), [session.outcomes]);

  // One tick a second: seconds are the smallest unit shown anywhere here.
  useEffect(() => {
    if (!started || session.finished) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [started, session.finished]);

  const completedRef = useRef(false);
  useEffect(() => {
    if (!session.finished) {
      completedRef.current = false;
      return;
    }
    if (completedRef.current) return;
    completedRef.current = true;
    track('mock_complete', {
      total: queue.length,
      elapsed_sec: sessionStartedAt ? Math.floor((Date.now() - sessionStartedAt) / 1000) : 0,
      ...counts,
    });
  }, [session.finished, queue.length, sessionStartedAt, counts]);

  if (isLoading) return <FullPageLoader />;

  if (!started) {
    return (
      <Setup
        config={config}
        onChange={setConfig}
        onStart={start}
        onCancel={() => navigate(-1)}
        available={available.length}
        lang={lang}
        showPlatformFilter={!config.ids?.length}
      />
    );
  }

  if (session.finished) {
    return (
      <Recap
        queue={queue}
        drafts={session.drafts}
        outcomes={session.outcomes}
        counts={counts}
        startedAt={sessionStartedAt}
        lang={lang}
        t={t}
        questionText={questionText}
        answerText={answerText}
        onAgain={start}
        onHome={() => navigate('/')}
      />
    );
  }

  if (!current) return null;

  const timeLeft = config.timer > 0 ? Math.max(0, config.timer - onQuestionSec) : null;
  const difficultyLabel = { easy: t.easy, medium: t.medium, hard: t.hard }[current.difficulty];

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-4 sm:px-6 sm:pt-10 lg:px-8">
        {/* Title and close are hidden under sm: the mobile header carries
            both for this route. */}
        <header className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="hidden font-display text-lg font-semibold text-ink sm:block">
            {ru ? 'Mock-собеседование' : 'Mock interview'}
          </h1>
          <span className="num text-[13px] text-muted">
            {session.index + 1}/{queue.length}
          </span>
          <div className="ml-auto flex items-center gap-4">
            <Clock label={ru ? 'Всего' : 'Total'} seconds={Math.floor((now - sessionStartedAt) / 1000)} />
            {timeLeft !== null && (
              <Clock label={ru ? 'Осталось' : 'Left'} seconds={timeLeft} urgent={timeLeft < 30} />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              onClick={() => navigate('/')}
            >
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">{ru ? 'Закрыть' : 'Close'}</span>
            </Button>
          </div>
        </header>

        <ProgressBar
          value={session.index}
          max={queue.length}
          size="xs"
          tone="ink"
          className="mb-9"
          label={ru ? 'Прогресс сессии' : 'Session progress'}
        />

        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Pill tone={difficultyTone[current.difficulty]} size="xs">{difficultyLabel}</Pill>
          <span className="eyebrow">
            {current.topic_title}
            {current.level && ` · ${t[current.level].short}`}
          </span>
        </div>

        <h2 className="font-display text-[26px] font-semibold leading-[1.18] text-ink sm:text-[32px]">
          <span
            className={cn(
              'marker [box-decoration-break:clone] [-webkit-box-decoration-break:clone]',
              'transition-[background-size] duration-500 ease-out motion-reduce:transition-none',
              revealed ? 'bg-[length:100%_0.72em]' : 'bg-[length:0%_0.72em]',
            )}
          >
            {questionText(current)}
          </span>
        </h2>

        {!revealed && (
          <div className="mt-8">
            <label htmlFor="attempt" className="eyebrow mb-2 block">
              {ru ? 'Отвечай так, как сказал бы вслух' : 'Answer the way you would say it out loud'}
            </label>
            <textarea
              id="attempt"
              ref={draftRef}
              value={draft}
              onChange={(e) => session.setDraft(e.target.value)}
              rows={8}
              autoFocus
              autoCorrect="off"
              spellCheck={false}
              autoCapitalize="off"
              className="w-full resize-y rounded-lg border border-rule/12 bg-paper-2 px-4 py-3 font-serif text-[17px] leading-relaxed text-ink outline-none placeholder:text-muted-2"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <VoiceInputButton lang={lang} onAppend={session.appendDraft} size="sm" />
                <span className="num text-[11px] text-muted-2">
                  {draft.length}
                  {ru ? ' знаков' : ' chars'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="md" onClick={session.skip}>
                  {ru ? 'Пропустить' : 'Skip'}
                </Button>
                <Button variant="brand" size="md" onClick={session.reveal}>
                  {ru ? 'Показать ответ' : 'Show answer'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {revealed && (
          <div className="mt-8">
            {/* Feedback first, then the side-by-side, then the self-grade —
                the same order the round uses, so the muscle memory carries. */}
            <AnswerGrader
              key={current.id}
              questionId={current.id}
              userAnswer={draft}
              lang={lang}
            />

            <Compare
              draft={draft}
              question={current}
              answerText={answerText}
              lang={lang}
            />

            <div className="mt-10 border-t border-rule/12 pt-5">
              <p className="eyebrow mb-2">{ru ? 'Как прошло?' : 'How did that go?'}</p>
              <SelfGrade options={grades(lang)} onGrade={session.grade} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Clock({ label, seconds, urgent }: { label: string; seconds: number; urgent?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-[12px]">
      <span className="text-muted">{label}</span>
      <span className={cn('font-mono tabular-nums', urgent ? 'text-coral' : 'text-ink')}>
        {clock(seconds)}
      </span>
    </span>
  );
}

interface CompareProps {
  draft: string;
  question: Question;
  answerText: (question: Question) => string;
  lang: Lang;
}

/** The user's attempt beside the reference. Mobile puts the reference first —
    that is what you want to see the second you stop writing. */
function Compare({ draft, question, answerText, lang }: CompareProps) {
  const ru = lang === 'ru';
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
      <section className="order-2 lg:order-1">
        <div className="eyebrow mb-2">{ru ? 'Ты написал' : 'What you wrote'}</div>
        {draft.trim() ? (
          <p className="answer-text">{draft}</p>
        ) : (
          <p className="text-sm italic text-muted-2">{ru ? 'Ничего' : 'Nothing written'}</p>
        )}
      </section>
      <section className="order-1 lg:order-2 lg:border-l lg:border-rule/12 lg:pl-10">
        <div className="eyebrow mb-2">{ru ? 'Эталон' : 'Reference'}</div>
        <AnswerText text={answerText(question)} />
        {question.code_example && (
          <div className="mt-4">
            <CodeBlock code={question.code_example} language={question.code_language || 'dart'} />
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Setup ──────────────────────────────────────────────────────────────── */

interface SetupProps {
  config: MockConfig;
  onChange: (config: MockConfig) => void;
  onStart: () => void;
  onCancel: () => void;
  available: number;
  lang: Lang;
  showPlatformFilter: boolean;
}

function Setup({
  config, onChange, onStart, onCancel, available, lang, showPlatformFilter,
}: SetupProps) {
  const ru = lang === 'ru';
  const update = (patch: Partial<MockConfig>) => onChange({ ...config, ...patch });
  const empty = available === 0;

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-display text-display-xs font-semibold text-ink">
          {ru ? 'Mock-собеседование' : 'Mock interview'}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">
          {ru
            ? 'Случайный набор вопросов, таймер по желанию и честная самооценка. Чем чаще проходишь, тем спокойнее на настоящем собеседовании.'
            : 'A random set, an optional timer, an honest self-grade. The more of these you run, the calmer the real one gets.'}
        </p>

        <div className="mt-10 space-y-8">
          {showPlatformFilter && (
            <Field label={ru ? 'Стек' : 'Stack'}>
              <PlatformFilter hideLabel />
            </Field>
          )}

          <Field label={ru ? 'Уровень' : 'Level'}>
            {LEVEL_OPTIONS.map((level) => (
              <Chip
                key={level}
                active={config.level === level}
                onClick={() => update({ level })}
              >
                {levelLabel(level, lang)}
              </Chip>
            ))}
          </Field>

          <Field label={ru ? 'Сколько вопросов' : 'How many questions'}>
            {COUNT_OPTIONS.map((count) => (
              <Chip key={count} active={config.count === count} onClick={() => update({ count })}>
                {count}
              </Chip>
            ))}
          </Field>

          <Field label={ru ? 'Таймер на вопрос' : 'Timer per question'}>
            {timerOptions(lang).map((option) => (
              <Chip
                key={option.seconds}
                active={config.timer === option.seconds}
                onClick={() => update({ timer: option.seconds })}
              >
                {option.label}
              </Chip>
            ))}
          </Field>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-rule/12 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className={cn('text-[13px]', empty ? 'text-coral' : 'text-muted')}>
            {empty
              ? (ru
                  ? 'Под эти фильтры вопросов нет. Смягчи их.'
                  : 'No questions match these filters. Loosen one.')
              : (ru
                  ? `${Math.min(config.count, available)} из ${available} доступных`
                  : `${Math.min(config.count, available)} of ${available} available`)}
          </p>
          {/* On a phone the pair fills the row so Start is a thumb-sized target. */}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1 sm:flex-none" onClick={onCancel}>
              {ru ? 'Отмена' : 'Cancel'}
            </Button>
            <Button variant="brand" className="flex-[2] sm:flex-none" disabled={empty} onClick={onStart}>
              {ru ? 'Начать' : 'Start'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-2.5">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-[40px] items-center rounded-lg border px-4 text-[14px] transition-colors duration-150',
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-rule/12 bg-paper-2 text-ink-2 hover:border-rule/25 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

/* ── Recap ──────────────────────────────────────────────────────────────── */

interface RecapProps {
  queue: Question[];
  drafts: Readonly<Record<number, string>>;
  outcomes: Readonly<Record<number, Outcome>>;
  counts: OutcomeCounts;
  startedAt: number;
  lang: Lang;
  t: UICopy;
  questionText: (question: Question) => string;
  answerText: (question: Question) => string;
  onAgain: () => void;
  onHome: () => void;
}

function Recap({
  queue, drafts, outcomes, counts, startedAt, lang, t, questionText, answerText, onAgain, onHome,
}: RecapProps) {
  const ru = lang === 'ru';
  // Frozen at mount: a recap that ticks upward while you read it is noise.
  const [totalSec] = useState(() => Math.floor((Date.now() - startedAt) / 1000));
  const scorePct = Math.round(((counts.good + counts.easy * 1.5) / queue.length / 1.5) * 100);

  const buckets = [
    { key: 'easy', label: ru ? 'Идеально' : 'Nailed', ink: 'text-mint' },
    { key: 'good', label: ru ? 'Уверенно' : 'Solid', ink: 'text-mint' },
    { key: 'hard', label: ru ? 'С трудом' : 'Rough', ink: 'text-[rgb(var(--amber))]' },
    { key: 'again', label: ru ? 'Провалил' : 'Bombed', ink: 'text-coral' },
    { key: 'skipped', label: ru ? 'Пропущено' : 'Skipped', ink: 'text-muted' },
  ] as const;

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <header className="border-b border-rule/12 pb-7">
          <div className="eyebrow">{ru ? 'Mock-собеседование · итоги' : 'Mock interview · recap'}</div>
          <h1 className="mt-3 font-display text-display-xs font-semibold text-ink sm:text-display-sm">
            {scorePct >= 80
              ? (ru ? 'Сильно.' : 'Strong.')
              : scorePct >= 50
              ? (ru ? 'Хорошая база.' : 'Solid base.')
              : (ru ? 'Есть что подтянуть.' : 'Room to grow.')}
          </h1>
          <p className="num mt-2 text-[13px] font-normal text-muted">
            {queue.length} {ru ? 'вопросов' : 'questions'} · {clock(totalSec)} · {scorePct}%
          </p>
        </header>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule/12 bg-rule/10 sm:grid-cols-5">
          {buckets.map((bucket) => (
            <div key={bucket.key} className="flex flex-col gap-1 bg-paper-2 px-4 py-5">
              <dd className={cn('num text-3xl', bucket.ink)}>{counts[bucket.key]}</dd>
              <dt className="text-[12px] text-muted">{bucket.label}</dt>
            </div>
          ))}
        </dl>

        <div className="eyebrow mb-3 mt-10">{ru ? 'По вопросам' : 'Question by question'}</div>
        <div className="divide-y divide-rule/12 border-y border-rule/12">
          {queue.map((question, i) => (
            <details key={question.id} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <span className="num w-6 shrink-0 text-[13px] text-muted-2">{i + 1}</span>
                <span className="flex-1 truncate text-sm text-ink-2">
                  {questionText(question)}
                </span>
                <Pill tone={OUTCOME_TONE[outcomes[question.id]]} size="xs">
                  {outcomeLabel(outcomes[question.id], lang)}
                </Pill>
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-open:rotate-90"
                  aria-hidden
                />
              </summary>
              <div className="mt-4 grid grid-cols-1 gap-6 pl-9 lg:grid-cols-2">
                <div>
                  <div className="eyebrow mb-1.5">{ru ? 'Ты написал' : 'What you wrote'}</div>
                  {drafts[question.id]?.trim() ? (
                    <p className="answer-text">{drafts[question.id]}</p>
                  ) : (
                    <p className="text-sm italic text-muted-2">{ru ? 'Ничего' : 'Nothing written'}</p>
                  )}
                </div>
                <div>
                  <div className="eyebrow mb-1.5">
                    {ru ? 'Эталон' : 'Reference'}
                    {' · '}
                    {{ easy: t.easy, medium: t.medium, hard: t.hard }[question.difficulty]}
                  </div>
                  <AnswerText text={answerText(question)} />
                  {question.code_example && (
                    <div className="mt-3">
                      <CodeBlock
                        code={question.code_example}
                        language={question.code_language || 'dart'}
                      />
                    </div>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 sm:flex-row">
          <Button variant="brand" className="flex-1" onClick={onAgain}>
            {ru ? 'Ещё подход' : 'Run it again'}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onHome}>
            <ArrowRight className="h-4 w-4" aria-hidden />
            {ru ? 'На главную' : 'Dashboard'}
          </Button>
        </div>
      </div>
    </div>
  );
}
