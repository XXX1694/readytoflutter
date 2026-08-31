import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, X } from 'lucide-react';
import { useTopic } from '../lib/queries';
import { buildRound, chainConcepts } from '../lib/roundBuilder';
import { useLang, type Lang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { Button, Pill, FullPageLoader, difficultyTone } from '../ui/index';
import AnswerText from '../components/AnswerText';
import CodeBlock from '../components/CodeBlock';
import AnswerGrader, {
  SelfGrade, useAiHealth, type SelfGradeOption,
} from '../components/AnswerGrader';
import {
  useQuestionSession, countOutcomes, type Outcome, type OutcomeCounts,
} from '../lib/useQuestionSession';
import { cn } from '../lib/cn';

import type { Difficulty, Question, Topic } from '../types/domain';

/** How many questions an interviewer gets through on one thread. */
const ROUND_LENGTH = 5;

interface FollowUp {
  key: string;
  label: string;
  body: string;
}

/* The same three prompts every time, on purpose: the value is in being pushed
   to think further, not in the prompt being novel. */
const FOLLOW_UPS: Record<Lang, FollowUp[]> = {
  ru: [
    { key: 'why', label: 'А почему так?', body: 'Объясни механизм. Почему именно так, а не иначе?' },
    { key: 'edge', label: 'Граничный случай?', body: 'Какой сценарий ломает решение? Что с null, пустым, огромным вводом?' },
    { key: 'scale', label: 'Масштаб 10×?', body: 'Что происходит при росте нагрузки на порядок? Что станет узким местом?' },
  ],
  en: [
    { key: 'why', label: 'But why?', body: 'Explain the mechanism. Why this approach over the others?' },
    { key: 'edge', label: 'Edge case?', body: 'What input breaks this — null, empty, enormous?' },
    { key: 'scale', label: '10× the scale?', body: 'What happens an order of magnitude up? Where does it bottleneck first?' },
  ],
};

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

const tagsOf = (question: Question): string[] =>
  (question.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);

export default function RoundPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const ru = lang === 'ru';
  const t = useT(lang);
  const { topicTitle, questionText, answerText } = useContent(lang);
  const { data: topic, isLoading, error } = useTopic(slug);

  // ── Build the queue ──────────────────────────────────────────────────────
  const chain = useMemo(() => buildRound(topic?.questions || [], ROUND_LENGTH), [topic]);
  const concepts = useMemo(() => chainConcepts(chain), [chain]);
  // Pre-warm /ai/health so the first grade after a reveal doesn't race the probe.
  useAiHealth();

  // ── Run the session ──────────────────────────────────────────────────────
  const toTopic = () => navigate(`/topic/${slug}`);
  // Escape leaves straight away once the round is over, and asks first while
  // one is still running. Read through a ref so the handler doesn't close over
  // the session object it is being passed to.
  const finishedRef = useRef(false);
  const session = useQuestionSession<Question>({
    queue: chain,
    revealHotkey: 'mod+enter',
    onExit: () => {
      if (finishedRef.current || window.confirm(ru ? 'Закончить раунд?' : 'End the round?')) {
        toTopic();
      }
    },
  });
  const { current, revealed, draft, draftRef, outcomes, finished } = session;
  const counts = useMemo(() => countOutcomes(outcomes), [outcomes]);
  useEffect(() => { finishedRef.current = finished; }, [finished]);

  if (isLoading) return <FullPageLoader />;

  if (error || !topic) {
    return (
      <Notice title={t.topicNotFound} action={{ label: 'Dashboard', onClick: () => navigate('/') }} />
    );
  }

  if (chain.length === 0) {
    return (
      <Notice
        title={ru ? 'В этой теме пока нет вопросов' : 'This topic has no questions yet'}
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
        lang={lang}
        t={t}
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
          <h1 className="hidden font-display text-lg font-semibold text-ink sm:block">
            {ru ? 'Раунд' : 'Round'}
          </h1>
          <span className="eyebrow">{topicTitle(topic)}</span>
          <span className="num text-[13px] text-muted">
            {session.index + 1}/{chain.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto hidden sm:inline-flex"
            onClick={toTopic}
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">{ru ? 'Закрыть' : 'Close'}</span>
          </Button>
        </header>

        <ChainStrip chain={chain} index={session.index} outcomes={session.outcomes} lang={lang} />

        <div className="mb-4 mt-9 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Pill tone={difficultyTone[current.difficulty]} size="xs">{difficultyLabel}</Pill>
          {tags.length > 0 && <span className="eyebrow">{tags.join(' · ')}</span>}
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
            <FollowUps key={current.id} lang={lang} />

            <label htmlFor="attempt" className="eyebrow mb-2 mt-8 block">
              {ru ? 'Отвечай так, как сказал бы вслух' : 'Answer the way you would say it out loud'}
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
              <span className="num text-[11px] text-muted-2">
                {draft.length}
                {ru ? ' знаков' : ' chars'}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={session.skip}>
                  {ru ? 'Пропустить' : 'Skip'}
                </Button>
                <Button variant="brand" size="sm" onClick={session.reveal}>
                  {ru ? 'Показать ответ' : 'Show answer'}
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
                <div className="eyebrow mb-2">{ru ? 'Ты написал' : 'What you wrote'}</div>
                {draft.trim() ? (
                  <p className="answer-text">{draft}</p>
                ) : (
                  <p className="text-sm italic text-muted-2">{ru ? 'Ничего' : 'Nothing written'}</p>
                )}
              </section>
              <section className="order-1 lg:order-2 lg:border-l lg:border-rule/12 lg:pl-10">
                <div className="eyebrow mb-2">{ru ? 'Эталон' : 'Reference'}</div>
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
              <p className="eyebrow mb-2">{ru ? 'Как прошло?' : 'How did that go?'}</p>
              <SelfGrade options={grades(lang)} onGrade={session.grade} />
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
function FollowUps({ lang }: { lang: Lang }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const prompts = FOLLOW_UPS[lang];
  const open = prompts.find((prompt) => prompt.key === openKey);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1">{lang === 'ru' ? 'Копни глубже' : 'Dig deeper'}</span>
        {prompts.map((prompt) => (
          <button
            key={prompt.key}
            type="button"
            aria-pressed={prompt.key === openKey}
            onClick={() => setOpenKey(prompt.key === openKey ? null : prompt.key)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-[13px] transition-colors duration-150',
              prompt.key === openKey
                ? 'border-ink bg-ink text-paper'
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
  lang: Lang;
}

/** The round as a ramp: each marker's height is its question's difficulty, its
    fill is the grade it earned, and the outlined one is where you are. */
function ChainStrip({ chain, index, outcomes, lang }: ChainStripProps) {
  return (
    <div
      className="flex items-end gap-1.5"
      aria-label={lang === 'ru' ? 'Цепочка вопросов' : 'Question chain'}
    >
      {chain.map((question, i) => {
        const outcome = outcomes[question.id];
        return (
          <div
            key={question.id}
            className={cn(
              'flex-1 rounded-sm',
              DIFFICULTY_HEIGHT[question.difficulty],
              outcome ? OUTCOME_FILL[outcome] : 'bg-rule/10',
              i === index && 'ring-1 ring-ink ring-offset-2 ring-offset-paper',
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
  lang: Lang;
  t: UICopy;
  onRestart: () => void;
  onTopic: () => void;
  onHome: () => void;
}

function Recap({
  chain, drafts, outcomes, counts, concepts, topic, topicTitle, questionText, answerText,
  lang, t, onRestart, onTopic, onHome,
}: RecapProps) {
  const ru = lang === 'ru';
  const scorePct = Math.round(((counts.good + counts.easy * 1.5) / chain.length / 1.5) * 100);

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
          <div className="eyebrow">{ru ? 'Раунд · итоги' : 'Round · recap'}</div>
          <h1 className="mt-3 font-display text-display-xs font-semibold text-ink sm:text-display-sm">
            {scorePct >= 80
              ? (ru ? 'Сильный раунд.' : 'Strong round.')
              : scorePct >= 50
              ? (ru ? 'Достойно.' : 'Solid.')
              : (ru ? 'Есть что подтянуть.' : 'Room to grow.')}
          </h1>
          <p className="num mt-2 text-[13px] font-normal text-muted">
            {topicTitle(topic)} · {chain.length} {ru ? 'вопросов' : 'questions'} · {scorePct}%
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

        {concepts.length > 0 && (
          <section className="mt-10">
            <div className="eyebrow mb-2">{ru ? 'Что было затронуто' : 'Concepts covered'}</div>
            <div className="flex flex-wrap gap-1.5">
              {concepts.map((concept) => (
                <Pill key={concept} size="xs">{concept}</Pill>
              ))}
            </div>
          </section>
        )}

        <div className="eyebrow mb-3 mt-10">{ru ? 'Цепочка' : 'The chain'}</div>
        <div className="divide-y divide-rule/12 border-y border-rule/12">
          {chain.map((question, i) => (
            <details key={question.id} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <span className="num w-6 shrink-0 text-[13px] text-muted-2">{i + 1}</span>
                <Pill tone={difficultyTone[question.difficulty]} size="xs">
                  {{ easy: t.easy, medium: t.medium, hard: t.hard }[question.difficulty]}
                </Pill>
                <span className="flex-1 truncate text-sm text-ink-2">{questionText(question)}</span>
                <Pill tone={OUTCOME_TONE[outcomes[question.id]]} size="xs">
                  {outcomeLabel(outcomes[question.id], lang)}
                </Pill>
                <ChevronDown
                  className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-open:rotate-180"
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
                  <div className="eyebrow mb-1.5">{ru ? 'Эталон' : 'Reference'}</div>
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
            {ru ? 'Ещё подход' : 'Run it again'}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onTopic}>
            {topicTitle(topic)}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onHome}>
            <ArrowRight className="h-4 w-4" aria-hidden />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
