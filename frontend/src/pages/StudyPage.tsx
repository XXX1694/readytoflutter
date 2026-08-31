import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, PenLine, X } from 'lucide-react';
import { useQuestions, useTopics } from '../lib/queries';
import { pickDueQueue, rateCard, getCardState } from '../lib/srs';
import { usePrefs } from '../store/prefs';
import { filterQuestionsByPlatform } from '../lib/platform';
import { useLang, type Lang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { Button, Pill, ProgressBar, FullPageLoader, difficultyTone } from '../ui/index';
import CodeBlock from '../components/CodeBlock';
import AnswerText from '../components/AnswerText';
import VoiceInputButton from '../components/VoiceInputButton';
import AnswerGrader, {
  SelfGrade, useAiHealth, type SelfGradeOption,
} from '../components/AnswerGrader';
import { useQuestionSession, countOutcomes, type OutcomeCounts } from '../lib/useQuestionSession';
import { cn } from '../lib/cn';
import { tapMedium } from '../lib/haptics';
import { track } from '../lib/analytics';

import type { Level, Question, Topic } from '../types/domain';

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

/** The intervals are what makes this grade meaningful, so each one shows its. */
const grades = (lang: Lang): SelfGradeOption[] => [
  { rating: 'again', label: lang === 'ru' ? 'Снова' : 'Again', hint: '< 1d' },
  { rating: 'hard', label: lang === 'ru' ? 'Тяжело' : 'Hard', hint: '~1d' },
  { rating: 'good', label: lang === 'ru' ? 'Хорошо' : 'Good', hint: '~6d' },
  { rating: 'easy', label: lang === 'ru' ? 'Легко' : 'Easy', hint: '~14d' },
];

export default function StudyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const levelScope = searchParams.get('level');
  const topicScope = searchParams.get('topic');
  const idsScope = searchParams.get('ids');
  const scopeLabel = searchParams.get('label');

  const { lang } = useLang();
  const ru = lang === 'ru';
  const t = useT(lang);
  const { questionText, answerText } = useContent(lang);
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
    // already curated the set.
    if (idsScope) {
      const wanted = new Set(idsScope.split(',').map(Number).filter(Boolean));
      return allQuestions.filter((q) => wanted.has(q.id));
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
    || (idsScope && (ru ? 'Закладки' : 'Bookmarks'))
    || null;

  // A new pool is a new set of cards. Deriving the queue during render rather
  // than in an effect keeps it out of a second render pass, and keeps the SRS
  // read to exactly one per pool — a `useMemo` could re-run it mid-session and
  // reshuffle the cards under the user.
  const [seenPool, setSeenPool] = useState(pool);
  const [queue, setQueue] = useState<Question[]>(() => pickDueQueue(pool, QUEUE_SIZE));
  if (seenPool !== pool) {
    setSeenPool(pool);
    setQueue(pickDueQueue(pool, QUEUE_SIZE));
  }

  // ── Run the session ──────────────────────────────────────────────────────
  const session = useQuestionSession<Question>({
    queue,
    revealHotkey: 'space',
    draftLimit: GIST_LIMIT,
    onExit: () => navigate(-1),
    onGrade: (question, rating) => {
      tapMedium();
      rateCard(question.id, rating);
    },
  });
  const { current, revealed, total, draftRef } = session;
  const counts = useMemo(() => countOutcomes(session.outcomes), [session.outcomes]);

  // Session lifecycle analytics. Refs keep the calls idempotent across the
  // re-renders a single session goes through.
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  useEffect(() => {
    if (total > 0 && !startedRef.current) {
      startedRef.current = true;
      completedRef.current = false;
      track('study_session_start', {
        count: total,
        scope: hasScope ? scopeText : 'today',
        recall: recallMode,
      });
    }
  }, [total, hasScope, scopeText, recallMode]);
  useEffect(() => {
    if (session.finished && !completedRef.current) {
      completedRef.current = true;
      startedRef.current = false;
      track('study_session_complete', { total, ...counts });
    }
  }, [session.finished, total, counts]);

  if (isLoading) return <FullPageLoader />;

  if (pool.length === 0) {
    return (
      <EmptyState
        title={ru ? 'Здесь пока нет вопросов' : 'Nothing to study here yet'}
        body={ru ? 'Попробуй другой уровень или тему.' : 'Try another level or topic.'}
        onClose={() => navigate('/')}
      />
    );
  }

  if (session.finished) {
    return (
      <Recap
        counts={counts}
        total={total}
        lang={lang}
        onAgain={() => setQueue(pickDueQueue(pool, QUEUE_SIZE))}
        onClose={() => navigate('/')}
      />
    );
  }

  if (!current) {
    return (
      <EmptyState
        title={ru ? 'Всё повторено' : 'All caught up'}
        body={ru ? 'Новые карточки будут завтра.' : 'The next cards come due tomorrow.'}
        onClose={() => navigate('/')}
      />
    );
  }

  const difficultyLabel = { easy: t.easy, medium: t.medium, hard: t.hard }[current.difficulty];
  const isFresh = getCardState(current.id).reps === 0;

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-4 sm:px-6 sm:pt-10">
        {/* Title and close are hidden under sm: the mobile header already
            carries both for this route. */}
        <header className="mb-5 flex items-center gap-3">
          <h1 className="hidden font-display text-lg font-semibold text-ink sm:block">
            {ru ? 'Повторение' : 'Study'}
          </h1>
          {hasScope && scopeText && <Pill size="xs">{scopeText}</Pill>}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={toggleRecallMode}
              aria-pressed={recallMode}
              title={ru ? 'Записывать суть до ответа' : 'Write the gist before the answer'}
              className={cn(
                'touch-target inline-flex items-center gap-1.5 rounded-lg px-2.5 text-[13px]',
                'transition-colors duration-150',
                recallMode ? 'bg-ink text-paper' : 'text-muted hover:bg-rule/8 hover:text-ink',
              )}
            >
              <PenLine className="h-3.5 w-3.5" aria-hidden />
              {ru ? 'Припоминание' : 'Recall'}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              onClick={() => navigate(-1)}
            >
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">{ru ? 'Закрыть' : 'Close'}</span>
            </Button>
          </div>
        </header>

        <div className="mb-9 flex items-center gap-3">
          <ProgressBar
            value={session.index}
            max={total}
            size="xs"
            tone="ink"
            label={ru ? 'Прогресс сессии' : 'Session progress'}
          />
          <span className="num shrink-0 text-[12px] text-muted">{session.index}/{total}</span>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Pill tone={difficultyTone[current.difficulty]} size="xs">{difficultyLabel}</Pill>
          <span className="eyebrow">
            {current.topic_title}
            {isFresh && ` · ${ru ? 'новая' : 'new'}`}
          </span>
        </div>

        {/* The reveal: the citron sweeps across the question you just answered,
            the way you would mark the line in a book once you know it. */}
        <h2 className="font-display text-[26px] font-semibold leading-[1.18] text-ink sm:text-[34px]">
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
          <>
            {recallMode && (
              <div className="mt-8">
                <label htmlFor="gist" className="eyebrow mb-2 block">
                  {ru ? 'Что помнишь? Пара строк' : 'What do you remember? A line or two'}
                </label>
                <textarea
                  id="gist"
                  ref={draftRef}
                  value={session.draft}
                  onChange={(e) => session.setDraft(e.target.value)}
                  placeholder={ru
                    ? 'Даже одно слово фиксирует мысль'
                    : 'Even one word commits the thought'}
                  rows={3}
                  autoFocus
                  autoCorrect="off"
                  spellCheck={false}
                  autoCapitalize="off"
                  className="w-full resize-none rounded-lg border border-rule/12 bg-paper-2 px-4 py-3 font-serif text-[17px] leading-relaxed text-ink outline-none placeholder:text-muted-2"
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <VoiceInputButton lang={lang} onAppend={session.appendDraft} size="xs" />
                  <span className="num text-[11px] text-muted-2">
                    {session.draft.length}/{GIST_LIMIT}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button variant="brand" onClick={session.reveal}>
                {ru ? 'Показать ответ' : 'Show answer'}
              </Button>
              <span className="hidden text-[13px] text-muted sm:inline">
                {ru ? 'или' : 'or'}{' '}
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
                <div className="eyebrow mb-1.5">{ru ? 'Ты написал' : 'What you wrote'}</div>
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
                  <span className="group-open:hidden">
                    {ru ? 'Показать код' : 'Show the code'}
                  </span>
                  <span className="hidden group-open:inline">
                    {ru ? 'Скрыть код' : 'Hide the code'}
                  </span>
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
              <p className="eyebrow mb-2">{ru ? 'Как вспомнилось?' : 'How did that go?'}</p>
              <SelfGrade options={grades(lang)} onGrade={session.grade} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  body: string;
  onClose: () => void;
}

function EmptyState({ title, body, onClose }: EmptyStateProps) {
  return (
    <div className="bg-page flex h-full items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-start gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
        <p className="text-sm text-muted">{body}</p>
        <Button variant="brand" size="sm" onClick={onClose} className="mt-1">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          Dashboard
        </Button>
      </div>
    </div>
  );
}

interface RecapProps {
  counts: OutcomeCounts;
  total: number;
  lang: Lang;
  onAgain: () => void;
  onClose: () => void;
}

function Recap({ counts, total, lang, onAgain, onClose }: RecapProps) {
  const ru = lang === 'ru';
  const rows = [
    { key: 'again', label: ru ? 'Снова' : 'Again', ink: 'text-coral' },
    { key: 'hard', label: ru ? 'Тяжело' : 'Hard', ink: 'text-[rgb(var(--amber))]' },
    { key: 'good', label: ru ? 'Хорошо' : 'Good', ink: 'text-mint' },
    { key: 'easy', label: ru ? 'Легко' : 'Easy', ink: 'text-mint' },
  ] as const;

  return (
    <div className="bg-page flex h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl font-semibold text-ink">
          {ru ? 'Сессия закрыта' : 'Session done'}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {ru ? `${total} карточек повторено` : `${total} cards reviewed`}
        </p>

        <dl className="mt-7 grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-rule/12 bg-rule/10">
          {rows.map((row) => (
            <div key={row.key} className="flex flex-col gap-1 bg-paper-2 px-2 py-4 text-center">
              <dd className={cn('num text-2xl', row.ink)}>{counts[row.key]}</dd>
              <dt className="text-[12px] text-muted">{row.label}</dt>
            </div>
          ))}
        </dl>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <Button variant="brand" className="flex-1" onClick={onAgain}>
            {ru ? 'Ещё подход' : 'One more set'}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <ArrowRight className="h-4 w-4" aria-hidden />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
