import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, X } from 'lucide-react';
import { useLiveTasks, useLiveSolution, useTopics } from '../lib/queries';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { useSessionCopy } from '../i18n/sessionPage';
import { useLiveCopy, type LiveCopy } from '../i18n/livePage';
import {
  Button, Chip, ChipGroup, PageHeader, PageShell, Pill, FullPageLoader, difficultyTone,
} from '../ui/index';
import { usePrefs } from '../store/prefs';
import { PLATFORMS } from '../lib/platform';
import { StackIcon } from '../lib/stackIcons';
import { useChooseStack } from '../lib/useStack';
import AnswerText from '../components/AnswerText';
import InlineMarkdown from '../components/InlineMarkdown';
import CodeBlock from '../components/CodeBlock';
import { SelfGrade, useAiHealth } from '../components/AnswerGrader';
import { GradeNotes, PaywallPanel, VerdictHeading } from '../components/AiVerdict';
import { aiErrorMessage, readFailure, type PaywallInfo } from '../lib/aiErrors';
import {
  filterTasks, dealTask, readDraft, writeDraft, clearDraft, type DifficultyScope,
} from '../lib/liveTasks';
import { aiReviewCode, noBackend } from '../api/api';
import { goBack } from '../lib/navigation';
import { cn } from '../lib/cn';
import { tapMedium } from '../lib/haptics';
import { track } from '../lib/analytics';
import { useDocumentMeta } from '../lib/useDocumentMeta';

import type { Lang } from '../i18n/LangContext';
import type { AiCodeReview, Difficulty, LiveTask, LiveTaskSolution, Topic } from '../types/domain';

/** Stable empty defaults, so the pool memo isn't invalidated every render. */
const NO_TASKS: LiveTask[] = [];
const NO_TOPICS: Topic[] = [];

/** 0 is "no timer". Twelve minutes is what an interviewer actually gives you. */
const BUDGET_OPTIONS = [0, 10, 12, 15] as const;
const DEFAULT_BUDGET = 12;

const DIFFICULTY_OPTIONS: readonly DifficultyScope[] = ['all', 'easy', 'medium', 'hard'];

/** The server refuses less than this, so the button does too. */
const MIN_REVIEW_CHARS = 40;

/** Under two minutes the clock goes amber. */
const URGENT_SEC = 120;

const clock = (seconds: number): string => {
  // Clamped: the tick lags a fresh start by up to a second, and a negative
  // clock reads as broken. Same shape the timed session uses.
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function LivePage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const c = useSessionCopy(lang);
  const l = useLiveCopy(lang);
  useDocumentMeta({ title: `${t.nav.live} — Onsite` });

  const { topicTitle } = useContent(lang);
  const { data: allTasks = NO_TASKS, isLoading } = useLiveTasks();
  const { data: allTopics = NO_TOPICS } = useTopics();
  const platform = usePrefs((s) => s.platform);
  // Warm the AI-health probe on mount, so the first review after a submit
  // doesn't race the /api/ai/health response.
  useAiHealth();

  // ── Resume an interrupted attempt ────────────────────────────────────────
  // Twelve minutes of typing with no autosave anywhere else: a refresh must
  // not cost the work. Read once at mount; the card itself is *derived* from
  // the slug, so the catalogue arriving late needs no effect to reconcile it.
  const [resumed] = useState(readDraft);

  const [difficulty, setDifficulty] = useState<DifficultyScope>('all');
  const [budget, setBudget] = useState<number>(DEFAULT_BUDGET);
  const [activeSlug, setActiveSlug] = useState<string | null>(resumed?.slug ?? null);
  const [code, setCode] = useState(resumed?.code ?? '');
  const [startedAt, setStartedAt] = useState(resumed?.startedAt ?? 0);
  const [submitted, setSubmitted] = useState(false);
  const [seen, setSeen] = useState<ReadonlySet<string>>(
    () => new Set<string>(resumed ? [resumed.slug] : []),
  );
  const [now, setNow] = useState(() => Date.now());

  const pool = useMemo(
    () => filterTasks(allTasks, allTopics, { platform, difficulty }),
    [allTasks, allTopics, platform, difficulty],
  );

  // A saved slug the catalogue no longer knows simply has no card: the setup
  // screen shows, and the next deal overwrites the draft.
  const task = activeSlug ? allTasks.find((item) => item.slug === activeSlug) ?? null : null;

  // ── The clock ────────────────────────────────────────────────────────────
  // Derived, never stored ticking: `startedAt` plus a once-a-second `now` is
  // the whole timer, so a re-render can't drift it and a reload can rebuild
  // it from the saved draft.
  const elapsedSec = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const budgetSec = budget * 60;
  const ranOut = Boolean(task) && !submitted && budgetSec > 0 && elapsedSec >= budgetSec;
  const reviewing = Boolean(task) && (submitted || ranOut);
  const writing = Boolean(task) && !reviewing;

  // One `live_task_submitted` per card, whether the user pressed Submit or
  // the clock did it for them.
  const closedRef = useRef<string | null>(null);

  const deal = () => {
    const next = dealTask(pool, seen);
    if (!next) return;
    const at = Date.now();
    closedRef.current = null;
    setActiveSlug(next.slug);
    setCode(next.starter);
    setStartedAt(at);
    setNow(at);
    setSubmitted(false);
    setSeen((prev) => new Set(prev).add(next.slug));
    writeDraft({ slug: next.slug, code: next.starter, startedAt: at });
    track('live_task_dealt', {
      task: next.slug,
      difficulty: next.difficulty,
      topic: next.topic_slug,
      budget_min: budget,
      pool: pool.length,
    });
  };

  const updateCode = (value: string) => {
    setCode(value);
    if (task) writeDraft({ slug: task.slug, code: value, startedAt });
  };

  // One tick a second: seconds are the smallest unit shown anywhere here.
  useEffect(() => {
    if (!writing) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [writing]);

  // Nothing about a finished attempt is persisted, and the review is the
  // point of the card — so the draft is dropped the moment the clock stops.
  useEffect(() => {
    if (!reviewing || !task) return;
    if (closedRef.current === task.slug) return;
    closedRef.current = task.slug;
    clearDraft();
    track('live_task_submitted', {
      task: task.slug,
      difficulty: task.difficulty,
      elapsed_sec: elapsedSec,
      timed_out: ranOut,
      chars: code.length,
    });
  }, [reviewing, task, elapsedSec, ranOut, code.length]);

  if (isLoading) return <FullPageLoader />;

  if (!task) {
    return (
      <Setup
        t={t}
        l={l}
        difficulty={difficulty}
        onDifficulty={setDifficulty}
        budget={budget}
        onBudget={setBudget}
        available={pool.length}
        onDeal={deal}
      />
    );
  }

  const topic = allTopics.find((item) => item.slug === task.topic_slug);
  const difficultyLabel = { easy: t.easy, medium: t.medium, hard: t.hard }[task.difficulty];
  // The task's own budget belongs beside the *finished* attempt — next to a
  // running clock it would be a second number for the same fact.
  const meta = (withBudget: boolean) => (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
      <Pill tone={difficultyTone[task.difficulty]} size="xs">{difficultyLabel}</Pill>
      {topic && <span className="eyebrow">{topicTitle(topic)}</span>}
      {withBudget && <span className="eyebrow text-muted-2">{l.budgetWas(task.minutes)}</span>}
    </div>
  );

  if (writing) {
    return (
      <PageShell width="reading">
        <header className="mb-5 flex items-start justify-between gap-4">
          <h1 className="min-w-0 font-display text-[22px] font-semibold leading-[1.2] text-ink sm:text-[26px]">
            {task.title}
          </h1>
          <div className="flex shrink-0 items-center gap-3">
            {budgetSec > 0 ? (
              <Clock
                label={l.clockLeft}
                seconds={budgetSec - elapsedSec}
                urgent={budgetSec - elapsedSec < URGENT_SEC}
              />
            ) : (
              <Clock label={l.clockElapsed} seconds={elapsedSec} />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              onClick={() => { clearDraft(); goBack(navigate); }}
            >
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">{c.close}</span>
            </Button>
          </div>
        </header>

        {meta(false)}

        <p className="text-[15px] leading-relaxed text-ink-2">
          <InlineMarkdown text={task.prompt} />
        </p>

        <div className="mt-7">
          <label htmlFor="live-editor" className="eyebrow mb-2 block">{l.editorLabel}</label>
          <Editor id="live-editor" value={code} onChange={updateCode} />
          <p className="mt-2 text-[12px] leading-relaxed text-muted-2">{l.editorHint}</p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="num text-[11px] text-muted-2">{l.chars(code.length)}</span>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="md" onClick={() => setSubmitted(true)}>
              {l.giveUp}
            </Button>
            <Button variant="brand" size="md" onClick={() => { tapMedium(); setSubmitted(true); }}>
              {l.submit}
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="reading">
      <header className="mb-5 flex items-start justify-between gap-4">
        <h1 className="min-w-0 font-display text-[22px] font-semibold leading-[1.2] text-ink sm:text-[26px]">
          {task.title}
        </h1>
        <span className="num shrink-0 text-[12px] text-muted">
          {ranOut ? l.outOfTime : clock(elapsedSec)}
        </span>
      </header>

      {meta(true)}

      <p className="text-[15px] leading-relaxed text-ink-2">
        <InlineMarkdown text={task.prompt} />
      </p>

      <Review
        key={task.slug}
        task={task}
        code={code}
        lang={lang}
        l={l}
        whatYouWrote={c.whatYouWrote}
        nothingWritten={c.nothingWritten}
      />

      <div className="mt-10 border-t border-rule/12 pt-5">
        <p className="eyebrow mb-2">{c.howDidThatGo}</p>
        {/* The same four words the sessions use. A live task is not an SRS
            card, so the grade is a beat of reflection, not a schedule write. */}
        <SelfGrade
          options={[
            { rating: 'again', label: c.grades.again },
            { rating: 'hard', label: c.grades.hard },
            { rating: 'good', label: c.grades.good },
            { rating: 'easy', label: c.grades.easy },
          ]}
          onGrade={() => { tapMedium(); deal(); }}
        />
      </div>

      <div className="mt-6">
        <Button variant="outline" size="md" onClick={deal}>{l.dealAnother}</Button>
      </div>
    </PageShell>
  );
}

function Clock({ label, seconds, urgent }: { label: string; seconds: number; urgent?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-[12px]">
      <span className="text-muted">{label}</span>
      <span className={cn('font-mono tabular-nums', urgent ? 'text-[rgb(var(--amber))]' : 'text-ink')}>
        {clock(seconds)}
      </span>
    </span>
  );
}

/* ── The editor ─────────────────────────────────────────────────────────── */

interface EditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * A plain textarea wearing CodeBlock's clothes — the same hairline-and-wash
 * inset a snippet gets, so writing code and reading it look like one surface.
 * Deliberately not CodeMirror: an editor dependency would put the entry chunk
 * through its ceiling for a screen most visitors never open.
 */
function Editor({ id, value, onChange }: EditorProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab indents. Losing focus mid-thought is worse than losing the
    // keyboard's way out of the field, and Escape still leaves it.
    if (event.key !== 'Tab' || event.shiftKey || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    const el = event.currentTarget;
    const { selectionStart: start, selectionEnd: end } = el;
    onChange(`${value.slice(0, start)}  ${value.slice(end)}`);
    // The value lands on the next render; move the caret once it has.
    requestAnimationFrame(() => {
      el.selectionStart = start + 2;
      el.selectionEnd = start + 2;
    });
  };

  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      rows={16}
      autoCorrect="off"
      spellCheck={false}
      autoCapitalize="off"
      autoComplete="off"
      className={
        'w-full resize-y rounded-md border border-rule/12 bg-rule/4 p-3 sm:p-4 '
        + 'font-mono text-[13px] leading-[1.65] text-ink outline-none placeholder:text-muted-2'
      }
    />
  );
}

/* ── Review ─────────────────────────────────────────────────────────────── */

interface ReviewProps {
  task: LiveTask;
  code: string;
  lang: Lang;
  l: LiveCopy;
  whatYouWrote: string;
  nothingWritten: string;
}

/**
 * What they wrote, the rubric, the reference, the notes, then the AI read.
 * The first four come from the static bundle, so this whole screen is
 * complete with no backend at all — which is the deploy most visitors get.
 */
function Review({ task, code, lang, l, whatYouWrote, nothingWritten }: ReviewProps) {
  const { data: body } = useLiveSolution(task.slug);
  const written = code.trim();

  return (
    <div className="mt-8">
      <section>
        <div className="eyebrow mb-2">{whatYouWrote}</div>
        {written ? (
          <CodeBlock code={code} language={task.code_language} />
        ) : (
          <p className="text-sm italic text-muted-2">{nothingWritten}</p>
        )}
      </section>

      {body && (
        <>
          <Rubric points={body.rubric} l={l} />

          <section className="mt-9">
            <div className="eyebrow mb-1.5">{l.referenceTitle}</div>
            <p className="mb-2.5 text-[13px] text-muted">{l.referenceHint}</p>
            <CodeBlock code={body.solution} language={task.code_language} />
          </section>

          {body.notes && (
            <section className="mt-9">
              <div className="eyebrow mb-2">{l.notesTitle}</div>
              <AnswerText text={body.notes} />
            </section>
          )}

          <CodeReview task={task} code={code} solution={body} lang={lang} l={l} />
        </>
      )}
    </div>
  );
}

/** The grading key, as a checklist the reader ticks against their own code. */
function Rubric({ points, l }: { points: string[]; l: LiveCopy }) {
  const [met, setMet] = useState<ReadonlySet<number>>(() => new Set<number>());

  const toggle = (i: number) => setMet((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    return next;
  });

  return (
    <section className="mt-9">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <div className="eyebrow">{l.rubricTitle}</div>
        <span className="num shrink-0 text-[12px] text-muted">{l.rubricScore(met.size, points.length)}</span>
      </div>
      <p className="mb-3 text-[13px] leading-relaxed text-muted">{l.rubricHint}</p>
      <ul className="divide-y divide-rule/12 border-y border-rule/12">
        {points.map((point, i) => (
          <li key={point}>
            <button
              type="button"
              aria-pressed={met.has(i)}
              onClick={() => toggle(i)}
              className="touch-target flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-rule/4"
            >
              <span
                className={cn(
                  'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border',
                  met.has(i) ? 'border-mint bg-mint text-paper' : 'border-rule/25',
                )}
                aria-hidden
              >
                {met.has(i) && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className={cn('text-[14px] leading-relaxed', met.has(i) ? 'text-ink' : 'text-ink-2')}>
                <InlineMarkdown text={point} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── The AI read ────────────────────────────────────────────────────────── */

type ReviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'paywall'; info: PaywallInfo }
  | { status: 'done'; review: AiCodeReview };

interface CodeReviewProps {
  task: LiveTask;
  code: string;
  solution: LiveTaskSolution;
  lang: Lang;
  l: LiveCopy;
}

/**
 * Sends the attempt to /api/ai/review-code and renders what comes back. When
 * the backend is absent or the key is unset there is simply no panel: the
 * rubric, the reference and the notes above already carry the screen.
 */
function CodeReview({ task, code, solution, lang, l }: CodeReviewProps) {
  const { enabled } = useAiHealth();
  const [state, setState] = useState<ReviewState>({ status: 'idle' });
  const reqIdRef = useRef(0);

  if (!enabled || noBackend) return null;

  const trimmed = code.trim();
  const tooShort = trimmed.length < MIN_REVIEW_CHARS;

  const run = async () => {
    if (tooShort || state.status === 'loading') return;
    const reqId = ++reqIdRef.current;
    setState({ status: 'loading' });
    track('live_review_used', { task: task.slug, length: trimmed.length, lang });
    try {
      const data = await aiReviewCode({ taskSlug: task.slug, code: trimmed, lang });
      if (reqId !== reqIdRef.current) return; // the user dealt another card
      setState(data?.review ? { status: 'done', review: data.review } : { status: 'idle' });
    } catch (err: unknown) {
      if (reqId !== reqIdRef.current) return;
      const { status, body } = readFailure(err);
      if (status === 402 && body.code === 'paywall_required') {
        track('paywall_hit', {
          limit: 'ai_grade_daily',
          reason: body.reason ?? null,
          tier: body.tier ?? null,
          used: body.used ?? null,
          cap: body.cap ?? null,
        });
        setState({ status: 'paywall', info: body });
        return;
      }
      setState({ status: 'error', message: aiErrorMessage(body.code, lang, l.reviewNotFound) });
    }
  };

  if (state.status === 'done') {
    return <ReviewPanel review={state.review} rubric={solution.rubric} l={l} lang={lang} onRetry={run} />;
  }
  if (state.status === 'paywall') {
    return <div className="mt-9"><PaywallPanel info={state.info} lang={lang} /></div>;
  }

  const loading = state.status === 'loading';
  const failed = state.status === 'error';
  const title = loading
    ? l.reviewLoadingTitle
    : failed
    ? l.reviewFailedTitle
    : tooShort
    ? l.reviewShortTitle
    : l.reviewIdleTitle;
  const body = failed
    ? state.message
    : loading
    ? l.reviewLoadingBody
    : tooShort
    ? l.reviewShortBody
    : l.reviewIdleBody;

  return (
    <section className="mt-9 rounded-lg border border-rule/12 bg-paper-2 p-4 shadow-codex-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="font-display text-[15px] font-medium text-ink">{title}</p>
          <p className={cn('mt-1 max-w-[60ch] text-[13px] leading-relaxed', failed ? 'text-coral' : 'text-muted')}>
            {body}
          </p>
        </div>
        {/* A disabled grey button reads as "broken" rather than "not yet", so
            there is simply no button until there is something to review. */}
        {!tooShort && (
          <Button variant="brand" size="sm" disabled={loading} onClick={run} className="shrink-0">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {loading ? l.reviewRunning : failed ? l.reviewRetry : l.reviewRun}
          </Button>
        )}
      </div>
    </section>
  );
}

interface ReviewPanelProps {
  review: AiCodeReview;
  /** The task's own rubric — the fallback wording if the model paraphrased. */
  rubric: string[];
  l: LiveCopy;
  lang: Lang;
  onRetry: () => void;
}

function ReviewPanel({ review, rubric, l, lang, onRetry }: ReviewPanelProps) {
  const strengths = Array.isArray(review.strengths) ? review.strengths : [];
  const gaps = Array.isArray(review.gaps) ? review.gaps : [];
  const points = Array.isArray(review.rubric) ? review.rubric : [];

  return (
    <section className="mt-9 rounded-lg border border-rule/12 bg-paper-2 p-4 shadow-codex-sm sm:p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <VerdictHeading verdict={review.verdict} score={review.score} lang={lang} />
        <button
          type="button"
          onClick={onRetry}
          className="text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          {l.reviewAgain}
        </button>
      </header>

      {points.length > 0 && (
        <div className="mb-4">
          <div className="eyebrow mb-1.5">{l.reviewRubricTitle}</div>
          <ul className="space-y-2">
            {points.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border',
                    point.met ? 'border-mint bg-mint text-paper' : 'border-coral/50 text-coral',
                  )}
                  aria-hidden
                >
                  {point.met
                    ? <Check className="h-3 w-3" strokeWidth={3} />
                    : <X className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 text-[13px] leading-relaxed">
                  <span className="text-ink"><InlineMarkdown text={point.point || rubric[i] || ''} /></span>
                  {point.note && <span className="text-muted"> — {point.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(strengths.length > 0 || gaps.length > 0) && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {strengths.length > 0 && (
            <GradeNotes label={l.reviewStrengths} rule="border-mint/40" items={strengths} />
          )}
          {gaps.length > 0 && (
            <GradeNotes label={l.reviewGaps} rule="border-amber/40" items={gaps} />
          )}
        </div>
      )}

      {review.suggestion && (
        <p className="max-w-[68ch] border-t border-rule/12 pt-3 text-[13px] leading-relaxed text-ink-2">
          {review.suggestion}
        </p>
      )}

      {review.followUp && (
        <div className="mt-3 border-t border-rule/12 pt-3">
          <div className="eyebrow mb-1.5">{l.reviewFollowUp}</div>
          <p className="max-w-[68ch] text-sm leading-relaxed text-ink">{review.followUp}</p>
        </div>
      )}
    </section>
  );
}

/* ── Setup ──────────────────────────────────────────────────────────────── */

interface SetupProps {
  t: UICopy;
  l: LiveCopy;
  difficulty: DifficultyScope;
  onDifficulty: (value: DifficultyScope) => void;
  budget: number;
  onBudget: (value: number) => void;
  available: number;
  onDeal: () => void;
}

/** One sentence, three rows of chips, one button. */
function Setup({ t, l, difficulty, onDifficulty, budget, onBudget, available, onDeal }: SetupProps) {
  const platform = usePrefs((s) => s.platform);
  const chooseStack = useChooseStack('live');
  const empty = available === 0;
  const difficultyLabel = (value: DifficultyScope): string =>
    (value === 'all' ? l.difficultyMixed : { easy: t.easy, medium: t.medium, hard: t.hard }[value as Difficulty]);

  return (
    <PageShell width="reading">
      <PageHeader title={t.nav.live} subtitle={l.intro} />

      <div className="space-y-7">
        <ChipGroup label={t.nav.stack} ariaLabel={t.nav.stack} scroll>
          {PLATFORMS.map((p) => (
            <Chip
              key={p.key}
              active={platform === p.key}
              icon={<StackIcon stack={p.key} />}
              onClick={() => chooseStack(p.key)}
            >
              {t[p.labelKey]}
            </Chip>
          ))}
        </ChipGroup>

        <ChipGroup label={l.optionDifficulty} ariaLabel={l.optionDifficulty}>
          {DIFFICULTY_OPTIONS.map((value) => (
            <Chip key={value} active={difficulty === value} onClick={() => onDifficulty(value)}>
              {difficultyLabel(value)}
            </Chip>
          ))}
        </ChipGroup>

        <ChipGroup label={l.optionBudget} ariaLabel={l.optionBudget}>
          {BUDGET_OPTIONS.map((minutes) => (
            <Chip key={minutes} active={budget === minutes} onClick={() => onBudget(minutes)}>
              {minutes === 0 ? l.noTimer : l.budget(minutes)}
            </Chip>
          ))}
        </ChipGroup>
      </div>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="brand" size="lg" disabled={empty} onClick={onDeal}>{l.deal}</Button>
        <p className={cn('text-[13px]', empty ? 'text-coral' : 'text-muted')}>
          {empty ? l.noneMatch : l.cardsAvailable(available)}
        </p>
      </div>
    </PageShell>
  );
}
