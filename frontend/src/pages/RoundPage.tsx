import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, X } from 'lucide-react';
import { useTopic } from '../lib/queries';
import { buildRound, chainConcepts } from '../lib/roundBuilder';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { useSessionCopy, type SessionCopy } from '../i18n/sessionPage';
import { Button, Pill, FullPageLoader, difficultyTone } from '../ui/index';
import AnswerText from '../components/AnswerText';
import InlineMarkdown from '../components/InlineMarkdown';
import CodeBlock from '../components/CodeBlock';
import AnswerGrader, {
  SelfGrade, useAiHealth, type SelfGradeOption,
} from '../components/AnswerGrader';
import {
  useQuestionSession, countOutcomes, type Outcome, type OutcomeCounts,
} from '../lib/useQuestionSession';
import { cn } from '../lib/cn';

import type { Difficulty, Question, Topic } from '../types/domain';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/** How many questions an interviewer gets through on one thread. */
const ROUND_LENGTH = 5;

/** One scale everywhere: the same four words the session and the timed session use. */
const grades = (c: SessionCopy): SelfGradeOption[] => [
  { rating: 'again', label: c.grades.again },
  { rating: 'hard', label: c.grades.hard },
  { rating: 'good', label: c.grades.good },
  { rating: 'easy', label: c.grades.easy },
];

const outcomeLabel = (outcome: Outcome, c: SessionCopy): string =>
  (outcome === 'skipped' ? c.skippedShort : c.grades[outcome]);

const tagsOf = (question: Question): string[] =>
  (question.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);

export default function RoundPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  useDocumentMeta({ title: `${t.nav.followups} — Onsite` });
  const c = useSessionCopy(lang);
  const { topicTitle, questionText, answerText } = useContent(lang);
  const { data: topic, isLoading, error } = useTopic(slug);

  // ── Build the queue ──────────────────────────────────────────────────────
  const chain = useMemo(() => buildRound(topic?.questions || [], ROUND_LENGTH), [topic]);
  const concepts = useMemo(() => chainConcepts(chain), [chain]);
  // Pre-warm /ai/health so the first grade after a reveal doesn't race the probe.
  useAiHealth();

  // ── Run the session ──────────────────────────────────────────────────────
  const toTopic = () => navigate(`/topic/${slug}`);
  // Escape and the X leave straight away once the round is over, and ask
  // first while one is still running. Read through a ref so the handler
  // doesn't close over the session object it is being passed to.
  const finishedRef = useRef(false);
  const leave = () => {
    if (finishedRef.current || window.confirm(c.endConfirm)) toTopic();
  };
  const session = useQuestionSession<Question>({
    queue: chain,
    revealHotkey: 'mod+enter',
    onExit: leave,
  });
  const { current, revealed, draft, draftRef, outcomes, finished } = session;
  const counts = useMemo(() => countOutcomes(outcomes), [outcomes]);
  useEffect(() => { finishedRef.current = finished; }, [finished]);

  if (isLoading) return <FullPageLoader />;

  if (error || !topic) {
    return (
      <Notice
        title={t.topicNotFound}
        action={{ label: c.dashboard, onClick: () => navigate('/') }}
      />
    );
  }

  if (chain.length === 0) {
    return (
      <Notice
        title={c.topicEmpty}
        action={{ label: topicTitle(topic), onClick: toTopic }}
      />
    );
  }

  if (finished) {
    return (
      <Recap
        chain={chain}
        drafts={session.drafts}
        outcomes={session.outcomes}
        counts={counts}
        concepts={concepts}
        topic={topic}
        topicTitle={topicTitle}
        questionText={questionText}
        answerText={answerText}
        t={t}
        c={c}
        onRestart={session.restart}
        onTopic={toTopic}
        onHome={() => navigate('/')}
      />
    );
  }

  if (!current) return null;

  const difficultyLabel = { easy: t.easy, medium: t.medium, hard: t.hard }[current.difficulty];
  const tags = tagsOf(current);

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-4 sm:px-6 sm:pt-10 lg:px-8">
        {/* Title and close are hidden under sm: the mobile header carries
            both for this route. */}
        <header className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="sr-only sm:not-sr-only font-display text-lg font-semibold text-ink sm:block">
            {t.nav.followups}
          </h1>
          <span className="eyebrow">{topicTitle(topic)}</span>
          <span className="num text-[13px] text-muted">
            {session.index + 1}/{chain.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto hidden sm:inline-flex"
            onClick={leave}
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">{c.close}</span>
          </Button>
        </header>

        <ChainStrip chain={chain} index={session.index} outcomes={session.outcomes} c={c} />

        <div className="mb-4 mt-9 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Pill tone={difficultyTone[current.difficulty]} size="xs">{difficultyLabel}</Pill>
          {tags.length > 0 && <span className="eyebrow">{tags.join(' · ')}</span>}
        </div>

        <h2 className="font-display text-[26px] font-semibold leading-[1.18] text-ink sm:text-[32px]">
          <InlineMarkdown text={questionText(current)} />
        </h2>

        {!revealed && (
          <div className="mt-8">
            <FollowUps key={current.id} c={c} />

            <label htmlFor="attempt" className="eyebrow mb-2 mt-8 block">
              {c.answerPrompt}
            </label>
            <textarea
              id="attempt"
              ref={draftRef}
              value={draft}
              onChange={(e) => session.setDraft(e.target.value)}
              rows={6}
              autoFocus
              autoCorrect="off"
              spellCheck={false}
              autoCapitalize="off"
              className="w-full resize-y rounded-lg border border-rule/12 bg-paper-2 px-4 py-3 font-serif text-[17px] leading-relaxed text-ink outline-none placeholder:text-muted-2"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="num text-[11px] text-muted-2">{c.chars(draft.length)}</span>
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
            <AnswerGrader
              key={current.id}
              questionId={current.id}
              userAnswer={draft}
              lang={lang}
            />

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
                <AnswerText text={answerText(current)} />
                {current.code_example && (
                  <div className="mt-4">
                    <CodeBlock
                      code={current.code_example}
                      language={current.code_language || 'dart'}
                    />
                  </div>
                )}
              </section>
            </div>

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

/**
 * The three "dig deeper" prompts. Keyed by question id from the parent, so a
 * new question mounts a fresh one and the open prompt closes on its own.
 */
function FollowUps({ c }: { c: SessionCopy }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = c.followUps.find((prompt) => prompt.key === openKey);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1">{c.digDeeper}</span>
        {c.followUps.map((prompt) => (
          <button
            key={prompt.key}
            type="button"
            aria-pressed={prompt.key === openKey}
            onClick={() => setOpenKey(prompt.key === openKey ? null : prompt.key)}
            className={cn(
              'inline-flex min-h-[36px] items-center rounded-lg border px-3 py-1.5 text-[13px] transition-colors duration-150',
              prompt.key === openKey
                ? 'border-brand bg-brand text-on-brand'
                : 'border-rule/12 bg-paper-2 text-ink-2 hover:border-rule/25 hover:text-ink',
            )}
          >
            {prompt.label}
          </button>
        ))}
      </div>
      {open && (
        <p className="mt-3 border-l-2 border-rule/20 pl-4 font-serif text-[16px] leading-relaxed text-ink-2">
          {open.body}
        </p>
      )}
    </div>
  );
}

const DIFFICULTY_HEIGHT: Record<Difficulty, string> = {
  easy: 'h-2',
  medium: 'h-3',
  hard: 'h-4',
};

const OUTCOME_FILL: Record<Outcome, string> = {
  again: 'bg-coral',
  hard: 'bg-[rgb(var(--amber))]',
  good: 'bg-mint',
  easy: 'bg-mint',
  skipped: 'bg-rule/25',
};

interface ChainStripProps {
  chain: Question[];
  index: number;
  outcomes: Readonly<Record<number, Outcome>>;
  c: SessionCopy;
}

/** The round as a ramp: each marker's height is its question's difficulty, its
    fill is the grade it earned, and the outlined one is where you are. */
function ChainStrip({ chain, index, outcomes, c }: ChainStripProps) {
  return (
    <div className="flex items-end gap-1.5" role="img" aria-label={c.chainAria}>
      {chain.map((question, i) => {
        const outcome = outcomes[question.id];
        return (
          <div
            key={question.id}
            className={cn(
              'flex-1 rounded-sm',
              DIFFICULTY_HEIGHT[question.difficulty],
              outcome ? OUTCOME_FILL[outcome] : 'bg-rule/10',
              i === index && 'ring-2 ring-brand ring-offset-2 ring-offset-paper',
            )}
          />
        );
      })}
    </div>
  );
}

interface NoticeProps {
  title: string;
  action: { label: string; onClick: () => void };
}

function Notice({ title, action }: NoticeProps) {
  return (
    <div className="bg-page flex h-full items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-start gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
        <Button variant="brand" size="sm" onClick={action.onClick}>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          {action.label}
        </Button>
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

interface RecapProps {
  chain: Question[];
  drafts: Readonly<Record<number, string>>;
  outcomes: Readonly<Record<number, Outcome>>;
  counts: OutcomeCounts;
  concepts: string[];
  topic: Topic;
  topicTitle: (topic: Topic) => string;
  questionText: (question: Question) => string;
  answerText: (question: Question) => string;
  t: UICopy;
  c: SessionCopy;
  onRestart: () => void;
  onTopic: () => void;
  onHome: () => void;
}

function Recap({
  chain, drafts, outcomes, counts, concepts, topic, topicTitle, questionText, answerText,
  t, c, onRestart, onTopic, onHome,
}: RecapProps) {
  const meta = [
    topicTitle(topic),
    c.questionsCount(chain.length),
    ...(counts.skipped > 0 ? [c.skippedCount(counts.skipped)] : []),
  ].join(' · ');

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <h1 className="font-display text-3xl font-semibold text-ink">{c.recapTitle}</h1>
        <p className="mt-2 text-sm text-muted">{meta}</p>

        <dl className="mt-7 grid max-w-2xl grid-cols-4 gap-px overflow-hidden rounded-lg border border-rule/12 bg-rule/10">
          {RECAP_ROWS.map((row) => (
            <div key={row.key} className="flex flex-col gap-1 bg-paper-2 px-2 py-4 text-center">
              <dd className={cn('num text-2xl', row.ink)}>{counts[row.key]}</dd>
              <dt className="text-[12px] text-muted">{c.grades[row.key]}</dt>
            </div>
          ))}
        </dl>

        {concepts.length > 0 && (
          <section className="mt-10">
            <div className="eyebrow mb-2">{c.conceptsCovered}</div>
            <div className="flex flex-wrap gap-1.5">
              {concepts.map((concept) => (
                <Pill key={concept} size="xs">{concept}</Pill>
              ))}
            </div>
          </section>
        )}

        <div className="eyebrow mb-3 mt-10">{c.theChain}</div>
        <div className="divide-y divide-rule/12 border-y border-rule/12">
          {chain.map((question, i) => (
            <details key={question.id} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <span className="num w-6 shrink-0 text-[13px] text-muted-2">{i + 1}</span>
                <Pill tone={difficultyTone[question.difficulty]} size="xs">
                  {{ easy: t.easy, medium: t.medium, hard: t.hard }[question.difficulty]}
                </Pill>
                <span className="flex-1 truncate text-sm text-ink-2"><InlineMarkdown text={questionText(question)} /></span>
                <span className="shrink-0 text-[13px] text-muted">
                  {outcomeLabel(outcomes[question.id], c)}
                </span>
                <ChevronDown
                  className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-open:rotate-180"
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
                  <div className="eyebrow mb-1.5">{c.reference}</div>
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
          <Button variant="brand" className="flex-1" onClick={onRestart}>
            {c.again}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onTopic}>
            {topicTitle(topic)}
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
