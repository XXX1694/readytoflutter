import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useQuestions, useTopics } from '../lib/queries';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { useSessionCopy, type SessionCopy } from '../i18n/sessionPage';
import {
  Button, Chip, ChipGroup, PageHeader, PageShell, Pill, ProgressBar, FullPageLoader, difficultyTone,
} from '../ui/index';
import { usePrefs } from '../store/prefs';
import { filterQuestionsByPlatform, PLATFORMS } from '../lib/platform';
import { StackIcon } from '../lib/stackIcons';
import VoiceInputButton from '../components/VoiceInputButton';
import AnswerText from '../components/AnswerText';
import InlineMarkdown from '../components/InlineMarkdown';
import CodeBlock from '../components/CodeBlock';
import AnswerGrader, {
  SelfGrade, useAiHealth, type SelfGradeOption,
} from '../components/AnswerGrader';
import {
  useQuestionSession, countOutcomes, type Outcome, type OutcomeCounts,
} from '../lib/useQuestionSession';
import { goBack } from '../lib/navigation';
import { cn } from '../lib/cn';
import { track } from '../lib/analytics';

import type { Level, Question, Topic } from '../types/domain';
import { useDocumentMeta } from '../lib/useDocumentMeta';

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

/** A timed session is timed: three minutes a question unless you say otherwise. */
const DEFAULT_TIMER = 180;

const LEVEL_OPTIONS: readonly LevelScope[] = ['all', 'junior', 'mid', 'senior'];
const isLevelScope = (value: string | null): value is LevelScope =>
  value !== null && (LEVEL_OPTIONS as readonly string[]).includes(value);

const levelLabel = (level: LevelScope, t: UICopy, c: SessionCopy): string =>
  (level === 'all' ? c.levelMixed : t[level].short);

const timerOptions = (c: SessionCopy): Array<{ seconds: number; label: string }> => [
  { seconds: 0, label: c.noTimer },
  { seconds: 180, label: c.minutes(3) },
  { seconds: 300, label: c.minutes(5) },
];

/** One scale everywhere: the same four words the session and the follow-ups use. */
const grades = (c: SessionCopy): SelfGradeOption[] => [
  { rating: 'again', label: c.grades.again },
  { rating: 'hard', label: c.grades.hard },
  { rating: 'good', label: c.grades.good },
  { rating: 'easy', label: c.grades.easy },
];

const outcomeLabel = (outcome: Outcome, c: SessionCopy): string =>
  (outcome === 'skipped' ? c.skippedShort : c.grades[outcome]);

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
  const t = useT(lang);
  useDocumentMeta({ title: `${t.nav.timed} — Onsite` });
  const c = useSessionCopy(lang);
  const { questionText, answerText, topicTitle } = useContent(lang);
  const { data: allQuestions = NO_QUESTIONS, isLoading } = useQuestions();
  const { data: allTopics = NO_TOPICS } = useTopics();
  const platform = usePrefs((s) => s.platform);
  // Warm the AI-health probe on mount, so the first grade after a reveal
  // doesn't race the /api/ai/health response.
  useAiHealth();

  const [config, setConfig] = useState<MockConfig>({
    level: isLevelScope(initialLevel) ? initialLevel : 'all',
    count: 10,
    timer: DEFAULT_TIMER,
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
      if (!started) goBack(navigate);
      else if (window.confirm(c.endConfirm)) navigate('/');
    },
  });
  const { current, revealed, draft, draftRef } = session;
  const counts = useMemo(() => countOutcomes(session.outcomes), [session.outcomes]);

  // Nothing about a running timed session is persisted, so a reload or a
  // closed tab throws away every answer and the clock. The browser asks first.
  useEffect(() => {
    if (!started || session.finished) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [started, session.finished]);

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
        available={available.length}
        t={t}
        c={c}
        showStack={!config.ids?.length}
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
        t={t}
        c={c}
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
          <h1 className="sr-only sm:not-sr-only font-display text-lg font-semibold text-ink sm:block">
            {t.nav.timed}
          </h1>
          <span className="num text-[13px] text-muted">
            {session.index + 1}/{queue.length}
          </span>
          <div className="ml-auto flex items-center gap-4">
            <Clock label={c.clockTotal} seconds={Math.floor((now - sessionStartedAt) / 1000)} />
            {timeLeft !== null && (
              <Clock label={c.clockLeft} seconds={timeLeft} urgent={timeLeft < 30} />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              onClick={() => { if (!started || window.confirm(c.endConfirm)) navigate('/'); }}
            >
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">{c.close}</span>
            </Button>
          </div>
        </header>

        <ProgressBar
          value={session.index}
          max={queue.length}
          size="xs"
          tone="brand"
          className="mb-9"
          label={c.sessionProgress}
        />

        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Pill tone={difficultyTone[current.difficulty]} size="xs">{difficultyLabel}</Pill>
          <span className="eyebrow">
            {topicTitle({ id: current.topic_id, title: current.topic_title || '' })}
            {current.level && ` · ${t[current.level].short}`}
          </span>
        </div>

        <h2 className="font-display text-[26px] font-semibold leading-[1.18] text-ink sm:text-[32px]">
          <InlineMarkdown text={questionText(current)} />
        </h2>

        {!revealed && (
          <div className="mt-8">
            <label htmlFor="attempt" className="eyebrow mb-2 block">
              {c.answerPrompt}
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
                <span className="num text-[11px] text-muted-2">{c.chars(draft.length)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="md" onClick={session.skip}>
                  {c.skip}
                </Button>
                <Button variant="brand" size="md" onClick={session.reveal}>
                  {c.showAnswer}
                </Button>
              </div>
            </div>
          </div>
        )}

        {revealed && (
          <div className="mt-8">
            {/* Feedback first, then the side-by-side, then the self-grade —
                the same order the follow-ups use, so the muscle memory carries. */}
            <AnswerGrader
              key={current.id}
              questionId={current.id}
              userAnswer={draft}
              lang={lang}
            />

            <Compare draft={draft} question={current} answerText={answerText} c={c} />

            <div className="mt-10 border-t border-rule/12 pt-5">
              <p className="eyebrow mb-2">{c.howDidThatGo}</p>
              <SelfGrade options={grades(c)} onGrade={session.grade} />
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
  c: SessionCopy;
}

/** The user's attempt beside the reference. Mobile puts the reference first —
    that is what you want to see the second you stop writing. */
function Compare({ draft, question, answerText, c }: CompareProps) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
      <section className="order-2 lg:order-1">
        <div className="eyebrow mb-2">{c.whatYouWrote}</div>
        {draft.trim() ? (
          <p className="answer-text">{draft}</p>
        ) : (
          <p className="text-sm italic text-muted-2">{c.nothingWritten}</p>
        )}
      </section>
      <section className="order-1 lg:order-2 lg:border-l lg:border-rule/12 lg:pl-10">
        <div className="eyebrow mb-2">{c.reference}</div>
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
  available: number;
  t: UICopy;
  c: SessionCopy;
  showStack: boolean;
}

/**
 * One sentence, one button. The four knobs are all readable in the sentence
 * itself; Options exists for the person who wants to see them as a list.
 */
function Setup({ config, onChange, onStart, available, t, c, showStack }: SetupProps) {
  const update = (patch: Partial<MockConfig>) => onChange({ ...config, ...patch });
  const empty = available === 0;

  const slots: Record<string, ReactNode> = {
    count: (
      <InlineSelect
        label={c.optionCount}
        value={String(config.count)}
        onChange={(value) => update({ count: Number(value) })}
        options={COUNT_OPTIONS.map((count) => ({ value: String(count), label: String(count) }))}
      />
    ),
    level: (
      <InlineSelect
        label={c.optionLevel}
        value={config.level}
        onChange={(value) => isLevelScope(value) && update({ level: value })}
        options={LEVEL_OPTIONS.map((level) => ({ value: level, label: levelLabel(level, t, c) }))}
      />
    ),
    timer: (
      <InlineSelect
        label={c.optionTimer}
        value={String(config.timer)}
        onChange={(value) => update({ timer: Number(value) })}
        options={timerOptions(c).map((o) => ({ value: String(o.seconds), label: o.label }))}
      />
    ),
  };

  return (
    <PageShell width="reading">
      <PageHeader title={t.nav.timed} subtitle={c.setupIntro} />

      {/* Each clause holds together on its own line; the separator is glued to
          the clause before it with a non-breaking space, so a wrap never
          starts a line with a stray dot. */}
      <p className="font-display text-[20px] leading-[2] text-ink sm:text-[22px]">
        {c.setupSentence.map((segment, i) => (
          <span key={segment.slot}>
            {i > 0 && <span className="text-muted-2">{' · '}</span>}
            <span className="whitespace-nowrap">
              {segment.before}
              {slots[segment.slot]}
              {segment.after}
            </span>
          </span>
        ))}
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="brand" size="lg" disabled={empty} onClick={onStart}>
          {c.start}
        </Button>
        <p className={cn('text-[13px]', empty ? 'text-coral' : 'text-muted')}>
          {empty ? c.noneMatch : c.availableOf(Math.min(config.count, available), available)}
        </p>
      </div>

      <details className="group mt-10 border-t border-rule/12 pt-5">
        <summary className="eyebrow inline-flex cursor-pointer list-none items-center gap-1.5 hover:text-ink">
          <ChevronDown
            className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
            aria-hidden
          />
          {c.optionsToggle}
        </summary>

        <div className="mt-6 space-y-7">
          {showStack && <StackChips label={c.optionStack} t={t} />}

          <ChipGroup label={c.optionLevel} ariaLabel={c.optionLevel}>
            {LEVEL_OPTIONS.map((level) => (
              <Chip key={level} active={config.level === level} onClick={() => update({ level })}>
                {levelLabel(level, t, c)}
              </Chip>
            ))}
          </ChipGroup>

          <ChipGroup label={c.optionCount} ariaLabel={c.optionCount}>
            {COUNT_OPTIONS.map((count) => (
              <Chip key={count} active={config.count === count} onClick={() => update({ count })}>
                {count}
              </Chip>
            ))}
          </ChipGroup>

          <ChipGroup label={c.optionTimer} ariaLabel={c.optionTimer}>
            {timerOptions(c).map((option) => (
              <Chip
                key={option.seconds}
                active={config.timer === option.seconds}
                onClick={() => update({ timer: option.seconds })}
              >
                {option.label}
              </Chip>
            ))}
          </ChipGroup>
        </div>
      </details>
    </PageShell>
  );
}

/** The global stack, wearing the same chip as the other three options. */
function StackChips({ label, t }: { label: string; t: UICopy }) {
  const platform = usePrefs((s) => s.platform);
  const setPlatform = usePrefs((s) => s.setPlatform);

  return (
    <ChipGroup label={label} ariaLabel={label}>
      {PLATFORMS.map((p) => (
        <Chip
          key={p.key}
          active={platform === p.key}
          icon={<StackIcon stack={p.key} />}
          onClick={() => {
            // Re-picking the active stack is a no-op, so it sends nothing.
            if (p.key !== platform) track('stack_selected', { stack: p.key, source: 'filter' });
            setPlatform(p.key);
          }}
        >
          {t[p.labelKey]}
        </Chip>
      ))}
    </ChipGroup>
  );
}

interface InlineSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

/** A word in the sentence that happens to be a control. */
function InlineSelect({ label, value, onChange, options }: InlineSelectProps) {
  return (
    <span className="relative inline-flex items-center">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-md bg-brand/10 py-1 pl-2.5 pr-7 font-display text-[inherit] font-semibold text-brand outline-none transition-colors hover:bg-brand/15"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-brand/70" aria-hidden />
    </span>
  );
}

/* ── Recap ──────────────────────────────────────────────────────────────── */

const RECAP_ROWS = [
  { key: 'again', ink: 'text-coral' },
  { key: 'hard', ink: 'text-[rgb(var(--amber))]' },
  { key: 'good', ink: 'text-mint' },
  { key: 'easy', ink: 'text-mint' },
] as const;

interface RecapProps {
  queue: Question[];
  drafts: Readonly<Record<number, string>>;
  outcomes: Readonly<Record<number, Outcome>>;
  counts: OutcomeCounts;
  startedAt: number;
  t: UICopy;
  c: SessionCopy;
  questionText: (question: Question) => string;
  answerText: (question: Question) => string;
  onAgain: () => void;
  onHome: () => void;
}

function Recap({
  queue, drafts, outcomes, counts, startedAt, t, c, questionText, answerText, onAgain, onHome,
}: RecapProps) {
  // Frozen at mount: a recap that ticks upward while you read it is noise.
  const [totalSec] = useState(() => Math.floor((Date.now() - startedAt) / 1000));
  const meta = [
    c.questionsCount(queue.length),
    clock(totalSec),
    ...(counts.skipped > 0 ? [c.skippedCount(counts.skipped)] : []),
  ].join(' · ');

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <h1 className="font-display text-3xl font-semibold text-ink">{c.recapTitle}</h1>
        <p className="num mt-2 text-sm text-muted">{meta}</p>

        <dl className="mt-7 grid max-w-2xl grid-cols-4 gap-px overflow-hidden rounded-lg border border-rule/12 bg-rule/10">
          {RECAP_ROWS.map((row) => (
            <div key={row.key} className="flex flex-col gap-1 bg-paper-2 px-2 py-4 text-center">
              <dd className={cn('num text-2xl', row.ink)}>{counts[row.key]}</dd>
              <dt className="text-[12px] text-muted">{c.grades[row.key]}</dt>
            </div>
          ))}
        </dl>

        <div className="eyebrow mb-3 mt-10">{c.questionByQuestion}</div>
        <div className="divide-y divide-rule/12 border-y border-rule/12">
          {queue.map((question, i) => (
            <details key={question.id} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <span className="num w-6 shrink-0 text-[13px] text-muted-2">{i + 1}</span>
                <span className="flex-1 truncate text-sm text-ink-2">
                  <InlineMarkdown text={questionText(question)} />
                </span>
                <span className="shrink-0 text-[13px] text-muted">
                  {outcomeLabel(outcomes[question.id], c)}
                </span>
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-open:rotate-90"
                  aria-hidden
                />
              </summary>
              <div className="mt-4 grid grid-cols-1 gap-6 pl-9 lg:grid-cols-2">
                <div>
                  <div className="eyebrow mb-1.5">{c.whatYouWrote}</div>
                  {drafts[question.id]?.trim() ? (
                    <p className="answer-text">{drafts[question.id]}</p>
                  ) : (
                    <p className="text-sm italic text-muted-2">{c.nothingWritten}</p>
                  )}
                </div>
                <div>
                  <div className="eyebrow mb-1.5">
                    {c.reference}
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
            {c.again}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onHome}>
            <ArrowRight className="h-4 w-4" aria-hidden />
            {c.dashboard}
          </Button>
        </div>
      </div>
    </div>
  );
}
