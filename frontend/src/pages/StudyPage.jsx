import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, RotateCcw, ArrowRight, Sparkles, Brain, Code2, ChevronDown, Edit3, EyeOff,
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import { useQuestions } from '../lib/queries.js';
import { pickDueQueue, rateCard, getCardState } from '../lib/srs.js';
import { usePrefs } from '../store/prefs.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { Button, Pill, ProgressBar, FullPageLoader, difficultyTone } from '../ui/index.js';
import CodeBlock from '../components/CodeBlock.jsx';
import AnswerText from '../components/AnswerText.jsx';
import VoiceInputButton from '../components/VoiceInputButton.jsx';
import { cn } from '../lib/cn.js';

const RATINGS = [
  { key: 'again', tone: 'coral',  hotkey: '1', labelEn: 'Again', labelRu: 'Снова', description: '< 1d' },
  { key: 'hard',  tone: 'amber',  hotkey: '2', labelEn: 'Hard',  labelRu: 'Тяжело', description: '~1d' },
  { key: 'good',  tone: 'brand',  hotkey: '3', labelEn: 'Good',  labelRu: 'Хорошо', description: '~6d' },
  { key: 'easy',  tone: 'mint',   hotkey: '4', labelEn: 'Easy',  labelRu: 'Легко', description: '~14d' },
];

export default function StudyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const levelScope = searchParams.get('level');
  const topicScope = searchParams.get('topic');
  const idsScope = searchParams.get('ids');
  const scopeLabel = searchParams.get('label');

  const { lang } = useLang();
  const t = useT(lang);
  const { questionText, answerText } = useContent(lang);
  const recallMode = usePrefs((s) => s.recallMode);
  const toggleRecallMode = usePrefs((s) => s.toggleRecallMode);

  const { data: allQuestions = [], isLoading } = useQuestions();

  const pool = useMemo(() => {
    if (idsScope) {
      const idSet = new Set(idsScope.split(',').map(Number).filter(Boolean));
      return allQuestions.filter((q) => idSet.has(q.id));
    }
    return allQuestions.filter((q) => {
      if (levelScope && q.level !== levelScope) return false;
      if (topicScope && q.topic_slug !== topicScope) return false;
      return true;
    });
  }, [allQuestions, levelScope, topicScope, idsScope]);

  const hasScope = Boolean(levelScope || topicScope || idsScope);
  const scopeText = scopeLabel
    || (topicScope && allQuestions.find((q) => q.topic_slug === topicScope)?.topic_title)
    || (levelScope && t[levelScope]?.label)
    || (idsScope && (lang === 'ru' ? 'Закладки' : 'Bookmarks'))
    || null;

  // Build session queue once when pool is ready
  const [queue, setQueue] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  // Per-session gist map: { [questionId]: string }. Lives in memory only;
  // recall is meant to be lightweight, not persisted.
  const [gists, setGists] = useState({});
  const gistRef = useRef(null);

  useEffect(() => {
    if (pool.length === 0) return;
    setQueue(pickDueQueue(pool, { limit: 20, freshCap: 10 }));
    setCursor(0);
    setFlipped(false);
    setShowCode(false);
    setGists({});
  }, [pool]);

  const current = queue[cursor];
  const total = queue.length;
  const finished = total > 0 && cursor >= total;

  // Auto-focus gist input when entering a new card in recall mode
  useEffect(() => {
    if (recallMode && !flipped && current) {
      // Defer to next frame so the textarea is mounted
      const id = setTimeout(() => gistRef.current?.focus(), 60);
      return () => clearTimeout(id);
    }
  }, [recallMode, flipped, current]);

  const next = () => {
    setFlipped(false);
    setShowCode(false);
    setCursor((c) => c + 1);
  };

  const handleRate = (key) => {
    if (!current || !flipped) return;
    rateCard(current.id, key);
    setStats((s) => ({ ...s, [key]: s[key] + 1 }));
    next();
  };

  const updateGist = (text) => {
    if (!current) return;
    setGists((g) => ({ ...g, [current.id]: text }));
  };

  const appendGistVoice = (chunk) => {
    if (!current) return;
    setGists((g) => {
      const existing = g[current.id] || '';
      const sep = existing && !/\s$/.test(existing) ? ' ' : '';
      const next = (existing + sep + chunk).slice(0, 280);
      return { ...g, [current.id]: next };
    });
  };

  // Hotkeys
  useHotkeys('space', (e) => { e.preventDefault(); if (!finished) setFlipped((v) => !v); }, [finished]);
  useHotkeys('1', () => handleRate('again'), [current, flipped]);
  useHotkeys('2', () => handleRate('hard'), [current, flipped]);
  useHotkeys('3', () => handleRate('good'), [current, flipped]);
  useHotkeys('4', () => handleRate('easy'), [current, flipped]);
  useHotkeys('escape', () => navigate(-1));

  if (isLoading) return <FullPageLoader />;

  if (pool.length === 0) {
    return (
      <EmptyShell
        title={lang === 'ru' ? 'Нет вопросов' : 'No questions'}
        subtitle={lang === 'ru' ? 'Попробуй другой уровень или тему' : 'Try a different level or topic'}
        onClose={() => navigate('/')}
      />
    );
  }

  if (finished) {
    return (
      <CompletionScreen
        stats={stats}
        total={total}
        lang={lang}
        onClose={() => navigate('/')}
        onAgain={() => {
          setQueue(pickDueQueue(pool, { limit: 20, freshCap: 10 }));
          setCursor(0);
          setFlipped(false);
          setStats({ again: 0, hard: 0, good: 0, easy: 0 });
        }}
      />
    );
  }

  if (!current) {
    return (
      <EmptyShell
        title={lang === 'ru' ? 'Очередь пуста' : 'Queue empty'}
        subtitle={lang === 'ru' ? 'Все карточки повторены — возвращайся завтра' : 'All caught up — come back tomorrow'}
        onClose={() => navigate('/')}
      />
    );
  }

  const difficultyLabel =
    { easy: t.easy, medium: t.medium, hard: t.hard }[current.difficulty] || current.difficulty;
  const cardState = getCardState(current.id);
  const isFresh = cardState.reps === 0;

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Top bar */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Brain className="h-5 w-5 text-brand" aria-hidden />
            <span className="font-display text-xl font-medium text-ink">
              {lang === 'ru' ? 'Сессия повторения' : 'Study session'}
            </span>
            <Pill tone="ghost" size="xs">
              {lang === 'ru' ? 'SRS · SM-2' : 'SRS · SM-2'}
            </Pill>
            {hasScope && scopeText && (
              <Pill tone="brand" size="xs">
                {lang === 'ru' ? 'Скоуп' : 'Scope'}: {scopeText}
              </Pill>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleRecallMode}
              aria-pressed={recallMode}
              aria-label={lang === 'ru' ? 'Режим активного припоминания' : 'Active recall mode'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-all shadow-codex-sm',
                recallMode
                  ? 'border-ink bg-ink text-paper'
                  : 'border-rule/15 bg-paper-2 text-muted hover:border-rule/15 hover:text-ink',
              )}
              title={lang === 'ru' ? 'Печатать суть до раскрытия' : 'Type a gist before revealing'}
            >
              <Edit3 className="h-3 w-3" aria-hidden />
              {lang === 'ru' ? 'Recall' : 'Recall'}
            </button>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Close">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </header>

        {/* Progress */}
        <div className="mb-6 flex items-center gap-3">
          <ProgressBar value={cursor} max={total} size="sm" tone="gradient" />
          <span className="font-mono text-[11px] tabular-nums text-muted shrink-0">
            {cursor}/{total}
          </span>
        </div>

        {/* Card + (optional) gist input */}
        <div className="flex flex-1 flex-col items-stretch justify-center gap-4">
          <div className="w-full perspective-[1500px]">
            <motion.div
              key={current.id}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full preserve-3d"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front */}
              <button
                type="button"
                onClick={() => setFlipped(true)}
                aria-label={lang === 'ru' ? 'Показать ответ' : 'Reveal answer'}
                className={cn(
                  'group/card block w-full overflow-hidden rounded-3xl border border-rule/8 bg-paper-2 p-7 text-left sm:p-12',
                  'shadow-[0_2px_4px_0_rgb(var(--shadow)/0.06),0_24px_64px_-12px_rgb(var(--shadow)/0.16)]',
                  'transition-shadow duration-300 hover:shadow-[0_4px_8px_0_rgb(var(--shadow)/0.08),0_32px_80px_-16px_rgb(var(--shadow)/0.20)]',
                  'backface-hidden relative',
                  recallMode ? 'min-h-[42vh]' : 'min-h-[60vh]',
                )}
                style={{ backfaceVisibility: 'hidden' }}
              >
                {/* Aurora orb behind the question — subtle ambient lighting */}
                <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-brand/20 via-brand-sky/10 to-transparent blur-3xl" />
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  <Pill tone={difficultyTone[current.difficulty] || 'neutral'} size="xs">
                    {difficultyLabel}
                  </Pill>
                  <Pill tone="ghost" size="xs">
                    {current.topic_title}
                  </Pill>
                  {isFresh && (
                    <Pill tone="brand" size="xs">
                      <Sparkles className="h-2.5 w-2.5" aria-hidden /> {lang === 'ru' ? 'Новая' : 'New'}
                    </Pill>
                  )}
                  {recallMode && (
                    <Pill tone="ink" size="xs">
                      <Edit3 className="h-2.5 w-2.5" aria-hidden /> Recall
                    </Pill>
                  )}
                </div>
                <p className="font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-3xl">
                  {questionText(current)}
                </p>
                <div className="mt-8 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                  <kbd className="rounded border border-rule/15 px-1.5 py-0.5">Space</kbd>
                  {recallMode
                    ? (lang === 'ru' ? 'когда готов — раскрыть' : 'when ready — reveal')
                    : (lang === 'ru' ? 'показать ответ' : 'reveal answer')}
                </div>
              </button>

              {/* Back */}
              <div
                className={cn(
                  'absolute inset-0 overflow-y-auto rounded-3xl border border-rule/8 bg-paper-2 p-7 sm:p-12',
                  'shadow-[0_2px_4px_0_rgb(var(--shadow)/0.06),0_24px_64px_-12px_rgb(var(--shadow)/0.16)]',
                  'backface-hidden',
                  recallMode ? 'min-h-[42vh]' : 'min-h-[60vh]',
                )}
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                {recallMode && gists[current.id]?.trim() && (
                  <div className="mb-4 rounded-md border border-rule/15 bg-paper-2 px-3 py-2">
                    <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                      <Edit3 className="h-2.5 w-2.5" aria-hidden />
                      {lang === 'ru' ? 'Твоя суть' : 'Your gist'}
                    </div>
                    <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">
                      {gists[current.id]}
                    </div>
                  </div>
                )}
                <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
                  {t.answer}
                  <span className="h-px flex-1 bg-rule" aria-hidden />
                </div>
                <AnswerText
                  text={answerText(current)}
                  className="answer-text text-[15px] leading-relaxed text-ink-2"
                />

                {current.code_example && (
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => setShowCode((v) => !v)}
                      className="mb-2 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-brand"
                    >
                      <Code2 className="h-3 w-3" />
                      {showCode ? t.hideCodeExample : t.showCodeExample}
                      <ChevronDown className={cn('h-3 w-3 transition-transform', showCode && 'rotate-180')} />
                    </button>
                    {showCode && (
                      <CodeBlock code={current.code_example} language={current.code_language || 'dart'} />
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Gist input — only on the front side, in recall mode */}
          <AnimatePresence>
            {recallMode && !flipped && (
              <motion.div
                key="gist"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  <Edit3 className="h-2.5 w-2.5" aria-hidden />
                  <span>{lang === 'ru' ? 'Суть в двух словах' : 'Gist — two lines'}</span>
                  <span className="h-px flex-1 bg-rule" aria-hidden />
                  <VoiceInputButton lang={lang} onAppend={appendGistVoice} size="xs" />
                  <span className="font-mono text-[10px] tabular-nums normal-case tracking-normal text-muted-2">
                    {(gists[current.id] || '').length} / 280
                  </span>
                </div>
                <textarea
                  ref={gistRef}
                  value={gists[current.id] || ''}
                  onChange={(e) => updateGist(e.target.value.slice(0, 280))}
                  onFocus={(e) => {
                    setTimeout(() => {
                      try { e.target?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
                      catch { /* older Safari */ }
                    }, 250);
                  }}
                  placeholder={lang === 'ru'
                    ? 'Напечатай ключевую идею пальцами — даже одно слово фиксирует мозг…'
                    : 'Type the key idea — even one word commits your brain…'}
                  rows={3}
                  autoCorrect="off"
                  spellCheck={false}
                  autoCapitalize="off"
                  className="w-full resize-none rounded-md border border-rule/15 bg-paper-2 px-3 py-2 text-sm text-ink-2 placeholder:text-muted-2 outline-none transition-colors focus:border-rule/15 focus:ring-1 focus:ring-brand/30"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rating bar */}
        <AnimatePresence>
          {flipped && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {RATINGS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleRate(r.key)}
                  className={cn(
                    'group/rate relative flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl border border-rule/8 bg-paper-2 px-3 py-4 transition-all duration-200',
                    'shadow-[0_1px_2px_0_rgb(var(--shadow)/0.04)]',
                    'hover:-translate-y-0.5 hover:shadow-[0_2px_4px_0_rgb(var(--shadow)/0.08),0_12px_24px_-6px_rgb(var(--shadow)/0.10)]',
                    r.tone === 'coral'  && 'hover:border-coral/40 hover:bg-coral/8',
                    r.tone === 'amber'  && 'hover:border-amber/40 hover:bg-amber/8',
                    r.tone === 'brand'  && 'hover:border-brand/40 hover:bg-brand/8',
                    r.tone === 'mint'   && 'hover:border-mint/40 hover:bg-mint/8',
                  )}
                >
                  <kbd className="rounded-md border border-rule/15 bg-paper-2 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-2">
                    {r.hotkey}
                  </kbd>
                  <span className="font-display text-[15px] font-semibold text-ink">
                    {lang === 'ru' ? r.labelRu : r.labelEn}
                  </span>
                  <span className="font-mono text-[10px] uppercase text-muted-2">{r.description}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {!flipped && (
          <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-wider text-muted-2">
            {lang === 'ru' ? 'Подумай, потом нажми пробел' : 'Think, then press space'}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyShell({ title, subtitle, onClose }) {
  return (
    <div className="bg-page flex h-full items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <Brain className="h-10 w-10 text-muted" aria-hidden />
        <h1 className="font-display text-2xl text-ink">{title}</h1>
        <p className="text-sm text-muted">{subtitle}</p>
        <Button variant="codex" size="sm" onClick={onClose}>
          <ArrowRight className="h-3.5 w-3.5" /> Dashboard
        </Button>
      </div>
    </div>
  );
}

function CompletionScreen({ stats, total, lang, onClose, onAgain }) {
  return (
    <div className="bg-page flex h-full items-center justify-center px-4">
      <div className="flex max-w-lg flex-col items-center gap-5 rounded-md border border-rule/15 bg-paper-2 p-8 text-center shadow-codex">
        <Sparkles className="h-10 w-10 text-mint" aria-hidden />
        <h1 className="font-display text-3xl font-medium text-ink">
          {lang === 'ru' ? `Готово · ${total} карточек` : `Done · ${total} cards`}
        </h1>
        <div className="grid w-full grid-cols-4 gap-2">
          {[
            { key: 'again', label: lang === 'ru' ? 'Снова' : 'Again', cls: 'text-coral' },
            { key: 'hard',  label: lang === 'ru' ? 'Тяжело' : 'Hard', cls: 'text-[rgb(var(--amber))]' },
            { key: 'good',  label: lang === 'ru' ? 'Хорошо' : 'Good', cls: 'text-brand' },
            { key: 'easy',  label: lang === 'ru' ? 'Легко' : 'Easy', cls: 'text-mint' },
          ].map((r) => (
            <div key={r.key} className="flex flex-col items-center gap-1 rounded-md border border-rule px-2 py-3">
              <span className={cn('num text-2xl', r.cls)}>{stats[r.key]}</span>
              <span className="font-mono text-[10px] uppercase text-muted">{r.label}</span>
            </div>
          ))}
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Button variant="brand" className="flex-1" onClick={onAgain}>
            <RotateCcw className="h-4 w-4" />
            {lang === 'ru' ? 'Ещё раз' : 'One more set'}
          </Button>
          <Button variant="codex" className="flex-1" onClick={onClose}>
            <ArrowRight className="h-4 w-4" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
