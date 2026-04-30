import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Eye, RotateCcw, ArrowRight, Layers, ChevronDown, SkipForward, MessagesSquare,
  CornerDownRight,
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTopic } from '../lib/queries.js';
import { buildRound, chainConcepts } from '../lib/roundBuilder.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { Button, Pill, ProgressBar, Eyebrow, FullPageLoader, difficultyTone } from '../ui/index.js';
import AnswerText from '../components/AnswerText.jsx';
import CodeBlock from '../components/CodeBlock.jsx';
import { cn } from '../lib/cn.js';

/* Static follow-up prompts shown under each question — same set every time
   because the value is *prompting deeper thought*, not generating tailored
   follow-ups (which would need an LLM). */
const FOLLOW_UPS = {
  ru: [
    { key: 'why', label: 'А почему так?', body: 'Объясни механизм. Почему именно так, а не иначе?' },
    { key: 'edge', label: 'Edge case?', body: 'Какой граничный сценарий ломает решение? Что делать с null / пустым / огромным вводом?' },
    { key: 'scale', label: 'Масштаб 10×?', body: 'Что происходит при росте нагрузки на порядок? Что станет узким местом?' },
  ],
  en: [
    { key: 'why', label: 'But why?', body: 'Explain the mechanism. Why this approach over others?' },
    { key: 'edge', label: 'Edge case?', body: 'What boundary input breaks this? null, empty, huge?' },
    { key: 'scale', label: '10× scale?', body: 'What happens under load that\'s an order of magnitude bigger? Where does it bottleneck?' },
  ],
};

const RATINGS = [
  { key: 'again', tone: 'coral',  hotkey: '1', labelEn: 'Bombed', labelRu: 'Провалил' },
  { key: 'hard',  tone: 'amber',  hotkey: '2', labelEn: 'Rough',  labelRu: 'С трудом' },
  { key: 'good',  tone: 'brand',  hotkey: '3', labelEn: 'Solid',  labelRu: 'Уверенно' },
  { key: 'easy',  tone: 'mint',   hotkey: '4', labelEn: 'Nailed', labelRu: 'Идеально' },
];

const DIFF_PROGRESSION = ['easy', 'medium', 'hard'];

export default function RoundPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const { topicTitle, questionText, answerText } = useContent(lang);
  const { data: topic, isLoading, error } = useTopic(slug);

  const chain = useMemo(() => buildRound(topic?.questions || [], 5), [topic]);
  const concepts = useMemo(() => chainConcepts(chain), [chain]);

  const [phase, setPhase] = useState('running'); // running | done
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState({}); // { id: { text, rating } }
  const [revealed, setRevealed] = useState(false);
  const [openFollowUp, setOpenFollowUp] = useState(null);
  const textareaRef = useRef(null);

  const current = chain[cursor];
  const userText = answers[current?.id]?.text || '';
  const followUps = FOLLOW_UPS[lang === 'ru' ? 'ru' : 'en'];

  // Reset per-card transient state when moving forward
  useEffect(() => {
    setRevealed(false);
    setOpenFollowUp(null);
    if (current) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [cursor, current]);

  const reveal = () => setRevealed(true);

  const rate = (rating) => {
    if (!current) return;
    const text = answers[current.id]?.text || '';
    setAnswers((prev) => ({ ...prev, [current.id]: { text, rating } }));
    if (cursor + 1 >= chain.length) {
      setPhase('done');
    } else {
      setCursor((c) => c + 1);
    }
  };

  const skip = () => {
    if (!current) return;
    setAnswers((prev) => ({
      ...prev,
      [current.id]: { text: prev[current.id]?.text || '', rating: 'skipped' },
    }));
    if (cursor + 1 >= chain.length) {
      setPhase('done');
    } else {
      setCursor((c) => c + 1);
    }
  };

  const updateAnswer = (text) =>
    current && setAnswers((prev) => ({ ...prev, [current.id]: { ...prev[current.id], text } }));

  const restart = () => {
    setPhase('running');
    setCursor(0);
    setAnswers({});
    setRevealed(false);
    setOpenFollowUp(null);
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
    if (phase === 'done') navigate(`/topic/${slug}`);
    else if (window.confirm(lang === 'ru' ? 'Закончить раунд?' : 'End round?')) navigate(`/topic/${slug}`);
  }, [phase, slug, lang, navigate]);

  if (isLoading) return <FullPageLoader />;
  if (error || !topic) {
    return (
      <div className="bg-page flex h-full items-center justify-center px-4">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <Layers className="h-10 w-10 text-muted" aria-hidden />
          <p className="font-display text-2xl text-ink">{t.topicNotFound}</p>
          <Button variant="codex" size="sm" onClick={() => navigate('/')}>
            <ArrowRight className="h-3.5 w-3.5" /> Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (chain.length === 0) {
    return (
      <div className="bg-page flex h-full items-center justify-center px-4">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <Layers className="h-10 w-10 text-muted" aria-hidden />
          <p className="font-display text-2xl text-ink">
            {lang === 'ru' ? 'В теме нет вопросов' : 'Topic has no questions'}
          </p>
          <Button variant="codex" size="sm" onClick={() => navigate(`/topic/${slug}`)}>
            <ArrowRight className="h-3.5 w-3.5" /> {topicTitle(topic)}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <DoneScreen
        chain={chain}
        answers={answers}
        topic={topic}
        topicTitle={topicTitle}
        questionText={questionText}
        answerText={answerText}
        concepts={concepts}
        lang={lang}
        t={t}
        onRestart={restart}
        onTopic={() => navigate(`/topic/${slug}`)}
        onHome={() => navigate('/')}
      />
    );
  }

  const difficultyLabel = { easy: t.easy, medium: t.medium, hard: t.hard }[current.difficulty];

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[1400px] flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Top bar */}
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-rule/15 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <MessagesSquare className="h-5 w-5 text-brand" aria-hidden />
            <span className="font-display text-xl font-medium text-ink">
              {lang === 'ru' ? 'Раунд' : 'Round'}
            </span>
            <Pill tone="ghost" size="xs">
              {String(cursor + 1).padStart(2, '0')} / {String(chain.length).padStart(2, '0')}
            </Pill>
            <Pill tone="brand" size="xs">{topicTitle(topic)}</Pill>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/topic/${slug}`)} aria-label="End">
            <X className="h-4 w-4" />
          </Button>
        </header>

        {/* Progression bar — chain markers ramping difficulty */}
        <ChainStrip chain={chain} cursor={cursor} answers={answers} />

        {/* Question */}
        <section className="mb-5 mt-5 rounded-md border border-rule/15 bg-paper-2 p-5 shadow-codex sm:p-7">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Pill tone={difficultyTone[current.difficulty] || 'neutral'} size="xs">
              {difficultyLabel}
            </Pill>
            {(current.tags || '').split(',').map((tag, i) => {
              const t = tag.trim();
              if (!t) return null;
              return (
                <Pill key={`${t}-${i}`} tone="ghost" size="xs">{t}</Pill>
              );
            })}
          </div>
          <p className="font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-3xl">
            {questionText(current)}
          </p>

          {/* Follow-up prompts */}
          {!revealed && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                {lang === 'ru' ? 'покопай:' : 'dig:'}
              </span>
              {followUps.map((fu) => {
                const open = openFollowUp === fu.key;
                return (
                  <button
                    key={fu.key}
                    type="button"
                    onClick={() => setOpenFollowUp(open ? null : fu.key)}
                    aria-pressed={open}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors',
                      open
                        ? 'border-ink bg-ink text-paper'
                        : 'border-rule/15 bg-paper-2 text-muted hover:border-rule/15 hover:text-ink',
                    )}
                  >
                    <CornerDownRight className="h-3 w-3" aria-hidden />
                    {fu.label}
                  </button>
                );
              })}
            </div>
          )}
          <AnimatePresence>
            {!revealed && openFollowUp && (
              <motion.div
                key={openFollowUp}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-md border border-brand/30 bg-brand/5 px-3 py-2 text-[13px] leading-relaxed text-ink-2 dark:bg-brand/10">
                  {followUps.find((f) => f.key === openFollowUp)?.body}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Answer area */}
        {!revealed ? (
          <section>
            <label className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              {lang === 'ru' ? 'Твой ответ' : 'Your answer'}
              <span className="h-px flex-1 bg-rule" />
            </label>
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
              placeholder={lang === 'ru'
                ? 'Печатай так, как стал бы говорить вслух…'
                : 'Type the way you would speak aloud…'}
              rows={6}
              autoFocus
              autoCorrect="off"
              spellCheck={false}
              autoCapitalize="off"
              className="w-full resize-y rounded-md border border-rule/15 bg-paper-2 px-4 py-3 text-base text-ink placeholder:text-muted-2 outline-none shadow-codex-sm focus:shadow-codex"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-2">
                {userText.length} chars · <kbd className="rounded border border-rule/15 px-1.5 py-0.5">⌘↵</kbd>{' '}
                {lang === 'ru' ? 'показать ответ' : 'reveal answer'}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={skip}>
                  <SkipForward className="h-3.5 w-3.5" /> {lang === 'ru' ? 'Пропустить' : 'Skip'}
                </Button>
                <Button variant="brand" size="sm" onClick={reveal}>
                  <Eye className="h-3.5 w-3.5" /> {lang === 'ru' ? 'Показать ответ' : 'Reveal'}
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Mobile: reference first so the user can compare against truth
                immediately; their own attempt sits below for self-review. */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
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
                  {lang === 'ru' ? 'Эталон' : 'Reference'}
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

            <section className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                    r.tone === 'mint'  && 'hover:bg-mint/15',
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

/* ChainStrip — shows the 5-question progression with current cursor + ratings.
   Each marker is one node in the chain; difficulty controls the height
   so the strip visually reads as a ramp. */
function ChainStrip({ chain, cursor, answers }) {
  const heightFor = (diff) => ({ easy: 'h-2', medium: 'h-3', hard: 'h-4' }[diff] || 'h-2.5');
  const ratingTone = (rating) => ({
    again: 'bg-coral',
    hard:  'bg-[rgb(var(--amber))]',
    good:  'bg-brand',
    easy:  'bg-mint',
    skipped: 'bg-rule/30',
  }[rating] || 'bg-rule/20');

  return (
    <div className="flex items-end gap-1.5">
      {chain.map((q, i) => {
        const a = answers[q.id];
        const isCurrent = i === cursor;
        const isPast = i < cursor || (a && a.rating);
        return (
          <div key={q.id} className="flex flex-1 flex-col items-stretch gap-1">
            <div
              className={cn(
                heightFor(q.difficulty),
                'rounded-sm border border-rule/15 transition-all',
                isCurrent && 'border-rule/15 ring-2 ring-brand ring-offset-2 ring-offset-paper',
                isPast && a?.rating ? ratingTone(a.rating) : (isCurrent ? 'bg-brand/20' : 'bg-paper-2'),
              )}
            />
            <span className={cn(
              'text-center font-mono text-[10px] tabular-nums',
              isCurrent ? 'text-brand' : 'text-muted-2',
            )}>
              {String(i + 1).padStart(2, '0')}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DoneScreen({
  chain, answers, topic, topicTitle, questionText, answerText, concepts, lang, t,
  onRestart, onTopic, onHome,
}) {
  const buckets = { again: 0, hard: 0, good: 0, easy: 0, skipped: 0 };
  for (const q of chain) {
    const r = answers[q.id]?.rating || 'skipped';
    buckets[r] = (buckets[r] || 0) + 1;
  }
  const score = (buckets.good + buckets.easy * 1.5) / chain.length;
  const scorePct = Math.round((score / 1.5) * 100);

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="mb-8 border-b border-rule/15 pb-6">
          <Eyebrow accent="brand">
            <MessagesSquare className="mr-1 inline h-3 w-3" />
            {lang === 'ru' ? 'Раунд · Итоги' : 'Round · Recap'}
          </Eyebrow>
          <h1 className="mt-3 font-display text-display-sm font-medium leading-tight tracking-tightest text-ink sm:text-display-md">
            {scorePct >= 80 ? (lang === 'ru' ? 'Сильный раунд.' : 'Strong round.')
              : scorePct >= 50 ? (lang === 'ru' ? 'Достойно.' : 'Solid.')
              : (lang === 'ru' ? 'Есть что подтянуть.' : 'Room to grow.')}
          </h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted">
            {topicTitle(topic)} · {chain.length} {lang === 'ru' ? 'вопросов' : 'questions'} · {scorePct}% score
          </p>
        </header>

        {/* Score buckets */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { key: 'easy',    label: lang === 'ru' ? 'Идеально' : 'Nailed', accent: 'text-mint' },
            { key: 'good',    label: lang === 'ru' ? 'Уверенно' : 'Solid',  accent: 'text-brand' },
            { key: 'hard',    label: lang === 'ru' ? 'С трудом' : 'Rough',  accent: 'text-[rgb(var(--amber))]' },
            { key: 'again',   label: lang === 'ru' ? 'Провалил' : 'Bombed', accent: 'text-coral' },
            { key: 'skipped', label: lang === 'ru' ? 'Скип' : 'Skipped',     accent: 'text-muted' },
          ].map((b) => (
            <div key={b.key} className="rounded-md border border-rule/15 bg-paper-2 p-4 shadow-codex-sm">
              <div className={cn('num text-3xl', b.accent)}>{buckets[b.key] || 0}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">{b.label}</div>
            </div>
          ))}
        </section>

        {/* Concepts touched */}
        {concepts.length > 0 && (
          <section className="mb-8">
            <Eyebrow accent="brand" className="mb-2">
              {lang === 'ru' ? 'Покрытые концепты' : 'Concepts covered'}
            </Eyebrow>
            <div className="flex flex-wrap gap-1.5">
              {concepts.map((c) => (
                <Pill key={c} tone="neutral" size="xs">{c}</Pill>
              ))}
            </div>
          </section>
        )}

        {/* Per-question chain replay */}
        <section className="mb-8">
          <Eyebrow className="mb-2">
            {lang === 'ru' ? 'Цепочка' : 'Chain'}
          </Eyebrow>
          <div className="space-y-2">
            {chain.map((q, i) => {
              const a = answers[q.id];
              const r = a?.rating || 'skipped';
              const tone = r === 'easy' ? 'mint' : r === 'good' ? 'brand' : r === 'hard' ? 'amber' : r === 'again' ? 'coral' : 'ghost';
              return (
                <details key={q.id} className="group rounded-md border border-rule bg-paper-2 px-4 py-3">
                  <summary className="flex cursor-pointer items-center gap-3 list-none">
                    <span className="font-mono text-[11px] tabular-nums text-brand">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <Pill tone={difficultyTone[q.difficulty] || 'neutral'} size="xs">
                      {{ easy: t.easy, medium: t.medium, hard: t.hard }[q.difficulty] || q.difficulty}
                    </Pill>
                    <span className="flex-1 truncate text-sm text-ink-2">{questionText(q)}</span>
                    <Pill tone={tone} size="xs">
                      {r === 'skipped' ? (lang === 'ru' ? 'скип' : 'skip') : r}
                    </Pill>
                    <ChevronDown className="h-3.5 w-3.5 text-muted transition-transform group-open:rotate-180" />
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
          <Button variant="brand" className="flex-1" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" /> {lang === 'ru' ? 'Ещё подход' : 'Run again'}
          </Button>
          <Button variant="codex" className="flex-1" onClick={onTopic}>
            <Layers className="h-4 w-4" /> {topicTitle(topic)}
          </Button>
          <Button variant="codex" className="flex-1" onClick={onHome}>
            <ArrowRight className="h-4 w-4" /> Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
