import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, PenLine, X } from 'lucide-react';
import { useQuestions, useTopics } from '../lib/queries';
import { pickDueQueue, rateCard, getCardState, previewInterval } from '../lib/srs';
import { goBack } from '../lib/navigation';
import { buildPlan } from '../lib/plan';
import { filterTopicsByPlatform } from '../lib/platform';
import { usePrefs } from '../store/prefs';
import { filterQuestionsByPlatform } from '../lib/platform';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { useSessionCopy, type SessionCopy } from '../i18n/sessionPage';
import { Button, PageShell, Pill, ProgressBar, FullPageLoader, difficultyTone } from '../ui/index';
import CodeBlock from '../components/CodeBlock';
import AnswerText from '../components/AnswerText';
import InlineMarkdown from '../components/InlineMarkdown';
import VoiceInputButton from '../components/VoiceInputButton';
import AnswerGrader, {
  SelfGrade, useAiHealth, type SelfGradeOption,
} from '../components/AnswerGrader';
import { useQuestionSession, countOutcomes, RATING_ORDER, type OutcomeCounts } from '../lib/useQuestionSession';
import { cn } from '../lib/cn';
import { tapMedium } from '../lib/haptics';
import { track } from '../lib/analytics';
import { reportState } from '../lib/push';

import type { Level, Question, Topic } from '../types/domain';
import { useDocumentMeta } from '../lib/useDocumentMeta';

// Stable empty defaults. A fresh `[]` per render would give `pool` a new
// identity every time, and the queue below is derived from that identity.
const NO_QUESTIONS: Question[] = [];
const NO_TOPICS: Topic[] = [];

/** A session is deliberately finite: you finish it and come back tomorrow. */
const QUEUE_SIZE = { limit: 20, freshCap: 10 };

/** A gist is meant to be a sentence, not an essay. */
const GIST_LIMIT = 280;

const LEVELS: readonly string[] = ['junior', 'mid', 'senior'];
const isLevel = (value: string | null): value is Level =>
  value !== null && LEVELS.includes(value);

/** The interval is what makes a grade meaningful, so each button shows the
    one the scheduler would actually set for this card. */
const grades = (c: SessionCopy, questionId: number): SelfGradeOption[] =>
  RATING_ORDER.map((rating) => ({
    rating,
    label: c.grades[rating],
    hint: c.intervalHint(previewInterval(questionId, rating)),
  }));

export default function StudyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const levelScope = searchParams.get('level');
  const topicScope = searchParams.get('topic');
  const idsScope = searchParams.get('ids');
  const scopeLabel = searchParams.get('label');

  const { lang } = useLang();
  const t = useT(lang);
  useDocumentMeta({ title: `${t.nav.session} — Onsite` });
  const c = useSessionCopy(lang);
  const { questionText, answerText, topicTitle } = useContent(lang);
  const recallMode = usePrefs((s) => s.recallMode);
  const toggleRecallMode = usePrefs((s) => s.toggleRecallMode);
  const platform = usePrefs((s) => s.platform);
  // Pre-warm /ai/health so the grader appears the instant the answer is
  // revealed in recall mode, instead of after a 200ms probe race.
  useAiHealth();

  const { data: allQuestions = NO_QUESTIONS, isLoading } = useQuestions();
  const { data: allTopics = NO_TOPICS } = useTopics();

  // ── Build the queue ──────────────────────────────────────────────────────
  const pool = useMemo(() => {
    // Explicit `?ids=` deep-links bypass the platform filter — the caller
    // already curated the set, and its order (a rung's nodes, the saved
    // list) is the order to run it in.
    if (idsScope) {
      const byId = new Map(allQuestions.map((q) => [q.id, q]));
      return idsScope.split(',')
        .map((id) => byId.get(Number(id)))
        .filter((q): q is Question => Boolean(q));
    }
    const scoped = filterQuestionsByPlatform(allQuestions, allTopics, platform);
    return scoped.filter((q) => {
      if (levelScope && q.level !== levelScope) return false;
      if (topicScope && q.topic_slug !== topicScope) return false;
      return true;
    });
  }, [allQuestions, allTopics, platform, levelScope, topicScope, idsScope]);

  const hasScope = Boolean(levelScope || topicScope || idsScope);
  const scopeText = scopeLabel
    || (topicScope && allQuestions.find((q) => q.topic_slug === topicScope)?.topic_title)
    || (isLevel(levelScope) && t[levelScope].label)
    || (idsScope && c.bookmarksScope)
    || null;

  // A new pool is a new set of cards. Deriving the queue during render rather
  // than in an effect keeps it out of a second render pass, and keeps the SRS
  // read to exactly one per pool — a `useMemo` could re-run it mid-session and
  // reshuffle the cards under the user.
  // A curated `?ids=` list runs whole: the roadmap's "practice this level"
  // and the saved list are finite already, and the due-queue's cap on fresh
  // cards silently cut a 21-question level down to ten.
  // Without a scope this is the tab bar's Start: open with today's plan (the
  // exact set the Today card names), and let "One more set" draw from the
  // whole stack afterwards.
  const firstQueue = (): Question[] => {
    if (idsScope) return pool;
    if (hasScope) return pickDueQueue(pool, QUEUE_SIZE);
    const plan = buildPlan(pool, filterTopicsByPlatform(allTopics, platform));
    if (plan.ids.length === 0) return pickDueQueue(pool, QUEUE_SIZE);
    const byId = new Map(pool.map((q) => [q.id, q]));
    return plan.ids.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
  };
  const [seenPool, setSeenPool] = useState(pool);
  const [queue, setQueue] = useState<Question[]>(firstQueue);
  if (seenPool !== pool) {
    setSeenPool(pool);
    setQueue(firstQueue());
  }

  // ── Run the session ──────────────────────────────────────────────────────
  const session = useQuestionSession<Question>({
    queue,
    revealHotkey: 'space',
    draftLimit: GIST_LIMIT,
    onExit: () => goBack(navigate),
    onGrade: (question, rating) => {
      tapMedium();
      rateCard(question.id, rating);
    },
  });
  const { current, revealed, total, draftRef } = session;
  // In recall mode the draft textarea takes focus after each grade; with it
  // off there is no textarea, so focus fell to <body> silently. Move it to
  // the question heading instead — an aria-live region reads the new one out.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!recallMode && !revealed) headingRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
  const counts = useMemo(() => countOutcomes(session.outcomes), [session.outcomes]);

  // What the queue was narrowed to, as a stable machine value. The on-screen
  // `scopeText` is localized ("Bookmarks" / "Закладки") and would split one
  // funnel across two labels, so it never goes into a payload.
  const scopeKind = idsScope ? 'ids' : topicScope ? 'topic' : levelScope ? 'level' : 'today';

  // Session lifecycle analytics. Refs keep the calls idempotent across the
  // re-renders a single session goes through.
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const startedAtRef = useRef(0);
  useEffect(() => {
    if (total > 0 && !startedRef.current) {
      startedRef.current = true;
      completedRef.current = false;
      startedAtRef.current = Date.now();
      track('study_session_start', {
        count: total,
        scope: scopeKind,
        topic: topicScope,
        level: levelScope,
        recall: recallMode,
      });
    }
  }, [total, scopeKind, topicScope, levelScope, recallMode]);
  useEffect(() => {
    if (session.finished && !completedRef.current) {
      completedRef.current = true;
      startedRef.current = false;
      // Carries its own scope + duration so "how do sessions on topic X go?"
      // is one query, not a join against study_session_start.
      track('study_session_complete', {
        total,
        ...counts,
        scope: scopeKind,
        topic: topicScope,
        recall: recallMode,
        elapsed_sec: startedAtRef.current
          ? Math.round((Date.now() - startedAtRef.current) / 1000)
          : 0,
      });
      // Finishing a session is the only moment the due snapshot actually
      // changes, and the server schedules reminders from what we report — it
      // cannot compute due dates itself, since SM-2 state lives in this
      // browser. Deliberately not next to rateCard: that runs per card, and
      // twenty snapshots a session would burn the server's rate limit.
      // reportState() self-guards on signed-out / no permission / no
      // subscription and never throws, so it needs no await or catch.
      void reportState();
    }
  }, [session.finished, total, counts, scopeKind, topicScope, recallMode]);

  if (isLoading) return <FullPageLoader />;

  if (pool.length === 0) {
    // An `?ids=` link whose questions are gone has no level or topic control
    // to offer; the way out is today's session.
    return idsScope ? (
      <Notice
        title={c.staleTitle}
        body={c.staleBody}
        label={t.nav.startSession}
        onClose={() => navigate('/study', { replace: true })}
      />
    ) : (
      <Notice
        title={c.emptyTitle}
        body={c.emptyBody}
        label={c.dashboard}
        onClose={() => navigate('/')}
      />
    );
  }

  if (session.finished) {
    // A curated list runs again as it is; an open scope draws the next set,
    // and offers nothing when every card has just been scheduled away —
    // "One more set" leading to "All caught up" is a dead end.
    const nextSet = idsScope ? queue : pickDueQueue(pool, QUEUE_SIZE);
    return (
      <Recap
        counts={counts}
        meta={c.cardsReviewed(total)}
        c={c}
        onAgain={nextSet.length === 0 ? undefined : () => (idsScope ? session.restart() : setQueue(nextSet))}
        onClose={() => navigate('/')}
      />
    );
  }

  if (!current) {
    return (
      <Notice
        title={c.caughtUpTitle}
        body={c.caughtUpBody}
        label={c.dashboard}
        onClose={() => navigate('/')}
      />
    );
  }

  const difficultyLabel = { easy: t.easy, medium: t.medium, hard: t.hard }[current.difficulty];
  const isFresh = getCardState(current.id).reps === 0;

  return (
    <PageShell width="reading">
      {/* Title and close are hidden under sm: the mobile header already
          carries both for this route. */}
      <header className="mb-5 flex items-center gap-3">
        <h1 className="sr-only sm:not-sr-only font-display text-lg font-semibold text-ink sm:block">
          {t.nav.session}
        </h1>
        {hasScope && scopeText && <Pill size="xs">{scopeText}</Pill>}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={toggleRecallMode}
            aria-pressed={recallMode}
            title={c.writeItFirstHint}
            className={cn(
              'touch-target inline-flex items-center gap-1.5 rounded-lg px-2.5 text-[13px]',
              'transition-colors duration-150',
              recallMode ? 'bg-ink text-paper' : 'text-muted hover:bg-rule/8 hover:text-ink',
            )}
          >
            <PenLine className="h-3.5 w-3.5" aria-hidden />
            {t.nav.writeItFirst}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
            onClick={() => goBack(navigate)}
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">{c.close}</span>
          </Button>
        </div>
      </header>

      <div className="mb-9 flex items-center gap-3">
        <ProgressBar
          value={session.index}
          max={total}
          size="xs"
          tone="ink"
          label={c.sessionProgress}
        />
        <span className="num shrink-0 text-[12px] text-muted">{session.index}/{total}</span>
      </div>

      <div className="mb-9 sr-only" aria-live="polite">{`${session.index + 1}/${total}`}</div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Pill tone={difficultyTone[current.difficulty]} size="xs">{difficultyLabel}</Pill>
        <span className="eyebrow">
          {topicTitle({ id: current.topic_id, title: current.topic_title || '' })}
          {isFresh && ` · ${c.isNew}`}
        </span>
      </div>

      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[26px] font-semibold leading-[1.18] text-ink outline-none sm:text-[34px]"
      >
        <InlineMarkdown text={questionText(current)} />
      </h2>

      {!revealed && (
        <>
          {recallMode && (
            <div className="mt-8">
              <label htmlFor="gist" className="eyebrow mb-2 block">
                {c.gistPrompt}
              </label>
              <textarea
                id="gist"
                ref={draftRef}
                value={session.draft}
                onChange={(e) => session.setDraft(e.target.value)}
                placeholder={c.gistPlaceholder}
                rows={3}
                autoFocus
                autoCorrect="off"
                spellCheck={false}
                autoCapitalize="off"
                className="w-full resize-none rounded-lg border border-rule/12 bg-paper-2 px-4 py-3 font-serif text-[17px] leading-relaxed text-ink outline-none placeholder:text-muted-2"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <VoiceInputButton lang={lang} onAppend={session.appendDraft} size="sm" />
                <span className="num text-[11px] text-muted-2">
                  {session.draft.length}/{GIST_LIMIT}
                </span>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button variant="brand" onClick={session.reveal}>
              {c.showAnswer}
            </Button>
            <span className="hidden text-[13px] text-muted sm:inline">
              {c.or}{' '}
              <kbd className="rounded border border-rule/15 px-1.5 py-0.5 font-mono text-[11px]">
                space
              </kbd>
            </span>
          </div>
        </>
      )}

      {revealed && (
        <div className="mt-8">
          {recallMode && (
            <AnswerGrader
              key={current.id}
              questionId={current.id}
              userAnswer={session.draft}
              lang={lang}
            />
          )}

          {recallMode && session.draft.trim() && (
            <div className="mb-7 border-l-2 border-rule/15 pl-4">
              <div className="eyebrow mb-1.5">{c.whatYouWrote}</div>
              <p className="answer-text">{session.draft}</p>
            </div>
          )}

          <div className="eyebrow mb-2">{t.answer}</div>
          <AnswerText text={answerText(current)} />

          {current.code_example && (
            <details key={current.id} className="group mt-6">
              <summary className="eyebrow inline-flex cursor-pointer list-none items-center gap-1.5 hover:text-ink">
                <ChevronDown
                  className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
                  aria-hidden
                />
                <span className="group-open:hidden">{c.showCode}</span>
                <span className="hidden group-open:inline">{c.hideCode}</span>
              </summary>
              <div className="mt-3">
                <CodeBlock
                  code={current.code_example}
                  language={current.code_language || 'dart'}
                />
              </div>
            </details>
          )}

          <div className="mt-10 border-t border-rule/12 pt-5">
            <p className="eyebrow mb-2">{c.howDidThatGo}</p>
            <SelfGrade options={grades(c, current.id)} onGrade={session.grade} />
          </div>
        </div>
      )}
    </PageShell>
  );
}

interface NoticeProps {
  title: string;
  body: string;
  label: string;
  onClose: () => void;
}

function Notice({ title, body, label, onClose }: NoticeProps) {
  return (
    <div className="bg-page flex h-full items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-start gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
        <p className="text-sm text-muted">{body}</p>
        <Button variant="brand" size="sm" onClick={onClose} className="mt-1">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          {label}
        </Button>
      </div>
    </div>
  );
}

interface RecapProps {
  counts: OutcomeCounts;
  meta: string;
  c: SessionCopy;
  /** Omitted when there is no next set to offer. */
  onAgain?: () => void;
  onClose: () => void;
}

/** The recap all three runners wear: title, one meta line, the four grades. */
function Recap({ counts, meta, c, onAgain, onClose }: RecapProps) {
  return (
    <div className="bg-page flex h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl font-semibold text-ink">{c.recapTitle}</h1>
        <p className="mt-2 text-sm text-muted">{meta}</p>

        <RecapCounts counts={counts} c={c} className="mt-7" />

        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          {onAgain && (
            <Button variant="brand" className="flex-1" onClick={onAgain}>
              {c.again}
            </Button>
          )}
          <Button variant={onAgain ? 'outline' : 'brand'} className="flex-1" onClick={onClose}>
            <ArrowRight className="h-4 w-4" aria-hidden />
            {c.dashboard}
          </Button>
        </div>
      </div>
    </div>
  );
}

const RECAP_ROWS = [
  { key: 'again', ink: 'text-coral' },
  { key: 'hard', ink: 'text-[rgb(var(--amber))]' },
  { key: 'good', ink: 'text-mint' },
  { key: 'easy', ink: 'text-mint' },
] as const;

interface RecapCountsProps {
  counts: OutcomeCounts;
  c: SessionCopy;
  className?: string;
}

/** The four grades as a tally. The timed session and the follow-ups render
    the same block from their own files — the shared thing is the vocabulary,
    not a component. */
function RecapCounts({ counts, c, className }: RecapCountsProps) {
  return (
    <dl className={cn('grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-rule/12 bg-rule/10', className)}>
      {RECAP_ROWS.map((row) => (
        <div key={row.key} className="flex flex-col gap-1 bg-paper-2 px-2 py-4 text-center">
          <dd className={cn('num text-2xl', row.ink)}>{counts[row.key]}</dd>
          <dt className="text-[12px] text-muted">{c.grades[row.key]}</dt>
        </div>
      ))}
    </dl>
  );
}
