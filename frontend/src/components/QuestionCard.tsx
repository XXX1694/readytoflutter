import { useEffect, useRef, useState, useCallback, useMemo, forwardRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bookmark, Check, CheckCircle2, ChevronDown, Circle, CircleDot, EyeOff, Square, Volume2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import CodeBlock from './CodeBlock';
import AnswerText from './AnswerText';
import { useUpdateProgress } from '../lib/queries';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { Button, Pill, difficultyTone } from '../ui/index';
import { cn } from '../lib/cn';
import { useBookmark } from '../lib/useBookmark';
import { speak, stop, subscribe as subscribeTts, isSpeaking, isTtsSupported } from '../lib/tts';
import { extractHint } from '../lib/hint';
import { track } from '../lib/analytics';
import type { ProgressStatus, Question } from '../types/domain';

const STATUS_META: Record<ProgressStatus, { icon: LucideIcon; accent: string }> = {
  not_started: { icon: Circle,       accent: 'text-muted' },
  in_progress: { icon: CircleDot,    accent: 'text-[rgb(var(--amber))]' },
  completed:   { icon: CheckCircle2, accent: 'text-mint' },
};
const STATUS_KEYS: ProgressStatus[] = ['not_started', 'in_progress', 'completed'];

/** Hint ladder. `hidden` is the recall prompt, `full` is the answer itself. */
type Reveal = 'hidden' | 'hint' | 'full';

/** Quiet grotesk text action — used for the header's listen / hide controls. */
const QUIET_ACTION =
  'inline-flex min-h-[36px] items-center gap-1.5 rounded px-2 text-[12px] font-medium ' +
  'transition-colors sm:h-7 sm:min-h-0';

export interface QuestionCardProps {
  question: Question;
  index: number;
  /** Controlled open state. Omit to let the card manage its own. */
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** Keyboard cursor is on this card (j/k navigation on the topic page). */
  focused?: boolean;
  topicSlug?: string;
}

const QuestionCard = forwardRef<HTMLElement, QuestionCardProps>(function QuestionCard(
  { question, index, expanded: controlledExpanded, onToggleExpand, focused, topicSlug },
  ref,
) {
  // Fall back to the slug carried on the question itself (search/bookmarks
  // results include it; topic pages should pass it explicitly).
  const effectiveTopicSlug = topicSlug || question.topic_slug;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledExpanded ?? internalOpen;
  const toggleOpen = onToggleExpand || (() => setInternalOpen((v) => !v));

  const [status, setStatus] = useState<ProgressStatus>(question.status || 'not_started');
  const [showCode, setShowCode] = useState(false);

  // Mirror the prop when the parent re-fetches. Adjusting during render rather
  // than in an effect avoids the extra commit that would flash the old status.
  const [syncedStatus, setSyncedStatus] = useState(question.status);
  if (question.status !== syncedStatus) {
    setSyncedStatus(question.status);
    setStatus(question.status || 'not_started');
  }

  const { lang } = useLang();
  const t = useT(lang);
  const { questionText, answerText } = useContent(lang);
  const update = useUpdateProgress();
  const [bookmarked, toggleBookmark] = useBookmark(question.id);
  const recallMode = usePrefs((s) => s.recallMode);
  const reducedMotion = useReducedMotion();

  // Hint ladder, only walked when recallMode is on: 'hidden' → 'hint' → 'full'.
  const [reveal, setReveal] = useState<Reveal>(recallMode ? 'hidden' : 'full');
  // True while the reveal sweep is playing — see `showAnswer` below.
  const [sweeping, setSweeping] = useState(false);

  // The ladder starts over whenever the card is opened, the question changes or
  // recall mode is toggled. Adjusting during render rather than in an effect
  // means the first paint after opening is already in the right stage.
  const revealSignature = `${open}:${recallMode}:${question.id}`;
  const [lastRevealSignature, setLastRevealSignature] = useState(revealSignature);
  if (revealSignature !== lastRevealSignature) {
    setLastRevealSignature(revealSignature);
    if (open) {
      setReveal(recallMode ? 'hidden' : 'full');
      setSweeping(false);
      setShowCode(false);
    }
  }

  const fullAnswer = answerText(question);
  const hintText = useMemo(() => extractHint(fullAnswer), [fullAnswer]);
  const hasHint = Boolean(hintText) && hintText.length < fullAnswer.trim().length - 4;

  // Reading an answer is the thing this product is for, and on the browse
  // surfaces (topic / search / bookmarks) nothing was measuring it. `recall`
  // separates a deliberate reveal from simply opening a card, and `after_hint`
  // says whether the hint ladder is doing any work.
  const trackReveal = useCallback(
    (afterHint: boolean, recall: boolean) => {
      track('answer_revealed', {
        question_id: question.id,
        topic: effectiveTopicSlug ?? null,
        difficulty: question.difficulty,
        recall,
        after_hint: afterHint,
      });
    },
    [question.id, question.difficulty, effectiveTopicSlug],
  );

  // The reveal is the product's one signature gesture, so it gets exactly one
  // motion: a citron marker wash lies over the answer and is pulled off to the
  // right, leaving clean ink behind. Skipped entirely under reduced motion.
  const showAnswer = useCallback(() => {
    trackReveal(reveal === 'hint', true);
    setReveal('full');
    setSweeping(!reducedMotion);
  }, [reducedMotion, reveal, trackReveal]);

  // Outside recall mode, opening the card *is* the reveal — there is no second
  // step to hang the event on.
  const handleToggle = () => {
    if (!open && !recallMode) trackReveal(false, false);
    toggleOpen();
  };

  // A bookmark is the plainest "I'll come back to this" signal the app has —
  // it feeds a whole page and a study scope, so what earns one is worth knowing.
  const toggleBookmarked = () => {
    const on = toggleBookmark();
    track('bookmark_toggled', {
      question_id: question.id,
      topic: effectiveTopicSlug ?? null,
      on,
    });
  };

  // Subscribe once to the TTS singleton so we can light up the button when
  // *this* card is the one currently being read.
  const [thisSpeakingToken, setThisSpeakingToken] = useState<number | null>(null);
  useEffect(() => {
    const unsub = subscribeTts(() => {
      if (!isSpeaking()) setThisSpeakingToken(null);
    });
    return unsub;
  }, []);

  const STATUS_LABELS = useMemo<Record<ProgressStatus, string>>(
    () => ({
      not_started: t.notStarted,
      in_progress: t.inProgressStatus,
      completed: t.completedStatus,
    }),
    [t],
  );

  const handleStatus = useCallback(
    async (next: ProgressStatus) => {
      if (status === next) return;
      const prev = status;
      setStatus(next);
      try {
        await update.mutateAsync({
          questionId: question.id,
          status: next,
          notes: question.notes || null,
          topicSlug: effectiveTopicSlug,
        });
      } catch {
        setStatus(prev);
        toast.error(t.failedUpdateStatus);
      }
    },
    [status, update, question.id, question.notes, t, effectiveTopicSlug],
  );

  const difficultyLabel =
    { easy: t.easy, medium: t.medium, hard: t.hard }[question.difficulty] || question.difficulty;
  const StatusIcon = STATUS_META[status].icon;

  return (
    <article
      ref={ref}
      data-question-id={question.id}
      className={cn(
        'overflow-hidden rounded-lg border bg-paper-2 transition-colors duration-200',
        open ? 'border-rule/25 shadow-codex' : 'border-rule/12 shadow-codex-sm hover:border-rule/25',
        focused && !open && 'shadow-marker',
      )}
    >
      {/* Header — clickable to toggle */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left sm:gap-4 sm:p-5"
      >
        <span
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-rule/12 bg-paper font-mono text-[11px] tabular-nums text-muted"
          aria-hidden
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug text-ink sm:text-base">{questionText(question)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Pill tone={difficultyTone[question.difficulty] || 'neutral'} size="xs">
              {difficultyLabel}
            </Pill>
            {question.tags &&
              question.tags
                .split(',')
                .map((tag, i) => (
                  <Pill key={`${tag}-${i}`} tone="neutral" size="xs">
                    {tag.trim()}
                  </Pill>
                ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); toggleBookmarked(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                toggleBookmarked();
              }
            }}
            aria-label={bookmarked
              ? (lang === 'ru' ? 'Убрать из закладок' : 'Remove bookmark')
              : (lang === 'ru' ? 'В закладки' : 'Bookmark')}
            aria-pressed={bookmarked}
            // Visible 28×28 stays the same; -m-1.5 + p-1.5 grows the actual
            // hit area to ~44px on touch without nudging adjacent layout.
            className={cn(
              'box-content -m-1.5 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded p-1.5 transition-colors',
              bookmarked ? 'text-[rgb(var(--amber))]' : 'text-muted hover:text-ink',
            )}
          >
            <Bookmark className="h-4 w-4" fill={bookmarked ? 'currentColor' : 'none'} />
          </span>
          <StatusIcon className={cn('h-5 w-5', STATUS_META[status].accent)} aria-hidden />
          <ChevronDown
            className={cn('h-4 w-4 text-muted transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="expand"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-rule/12">
              {/* Status segmented control */}
              <div className="flex flex-wrap items-center gap-2 border-b border-rule/12 bg-paper px-4 py-3 sm:px-5">
                <span className="eyebrow">{t.markAs}</span>
                <div className="inline-flex items-center gap-px rounded border border-rule/12 bg-paper-2 p-0.5">
                  {STATUS_KEYS.map((key) => {
                    const active = status === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleStatus(key)}
                        disabled={update.isPending}
                        aria-pressed={active}
                        className={cn(
                          'rounded-sm px-2.5 py-1 text-[12px] font-medium transition-colors',
                          active
                            ? key === 'completed'
                              ? 'bg-mint text-paper'
                              : key === 'in_progress'
                                ? 'bg-[rgb(var(--amber))] text-paper'
                                : 'bg-ink text-paper'
                            : 'text-muted hover:text-ink',
                        )}
                      >
                        {STATUS_LABELS[key]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Answer — everything below sits in one reading column. */}
              <section className="px-4 py-5 sm:px-5">
                <div className="max-w-[68ch]">
                  <header className="mb-3 flex items-center gap-3">
                    <span className="eyebrow">{t.answer}</span>
                    <span className="h-px flex-1 bg-rule/12" aria-hidden />
                    {reveal !== 'hidden' && isTtsSupported() && (
                      <button
                        type="button"
                        onClick={() => {
                          if (thisSpeakingToken !== null) {
                            stop();
                            setThisSpeakingToken(null);
                          } else {
                            const body = reveal === 'full' ? fullAnswer : hintText;
                            const text = `${questionText(question)}. ${body}`;
                            const tok = speak(text, {
                              lang,
                              onEnd: () => setThisSpeakingToken(null),
                            });
                            setThisSpeakingToken(tok);
                          }
                        }}
                        className={cn(
                          QUIET_ACTION,
                          thisSpeakingToken !== null
                            ? 'text-brand hover:bg-brand/8'
                            : 'text-muted hover:text-ink',
                        )}
                      >
                        {thisSpeakingToken !== null ? (
                          <>
                            <Square className="h-3 w-3" aria-hidden />
                            {lang === 'ru' ? 'Стоп' : 'Stop'}
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-3 w-3" aria-hidden />
                            {lang === 'ru' ? 'Слушать' : 'Listen'}
                          </>
                        )}
                      </button>
                    )}
                    {recallMode && reveal === 'full' && (
                      <button
                        type="button"
                        onClick={() => { setReveal('hidden'); setSweeping(false); }}
                        className={cn(QUIET_ACTION, 'text-muted hover:text-ink')}
                      >
                        <EyeOff className="h-3 w-3" aria-hidden />
                        {lang === 'ru' ? 'Скрыть' : 'Hide'}
                      </button>
                    )}
                  </header>

                  {recallMode && reveal === 'hidden' ? (
                    <div className="rounded-md border border-rule/12 bg-paper px-4 py-6 sm:px-5">
                      <p className="answer-text mb-4">
                        {lang === 'ru' ? (
                          <>Сначала ответь <span className="marker">по памяти</span>.</>
                        ) : (
                          <>Answer it <span className="marker">from memory</span> first.</>
                        )}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" onClick={showAnswer}>
                          {lang === 'ru' ? 'Показать ответ' : 'Show answer'}
                        </Button>
                        {hasHint && (
                          <Button variant="ghost" size="sm" onClick={() => setReveal('hint')}>
                            {lang === 'ru' ? 'Показать подсказку' : 'Show hint'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : recallMode && reveal === 'hint' ? (
                    <div className="space-y-4">
                      {/* A citron rule in the margin — the marker's other job. */}
                      <div className="border-l-2 border-[rgb(var(--marker))] pl-4">
                        <p className="eyebrow mb-1">{lang === 'ru' ? 'Подсказка' : 'Hint'}</p>
                        <p className="answer-text">{hintText}</p>
                      </div>
                      <Button size="sm" onClick={showAnswer}>
                        {lang === 'ru' ? 'Показать ответ' : 'Show answer'}
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <AnswerText text={fullAnswer} />
                      {sweeping && (
                        <motion.span
                          aria-hidden
                          className="pointer-events-none absolute inset-0"
                          // `originX` rather than Tailwind's `origin-right`:
                          // framer writes its own transform-origin and would
                          // overwrite the class.
                          style={{ originX: 1, backgroundColor: 'rgb(var(--marker) / 0.42)' }}
                          initial={{ scaleX: 1 }}
                          animate={{ scaleX: 0 }}
                          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                          onAnimationComplete={() => setSweeping(false)}
                        />
                      )}
                    </div>
                  )}

                  {/* Code — only after full reveal */}
                  {question.code_example && reveal === 'full' && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setShowCode((v) => !v)}
                        aria-expanded={showCode}
                        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand transition-colors hover:text-brand-ink"
                      >
                        {showCode ? t.hideCodeExample : t.showCodeExample}
                        <ChevronDown
                          className={cn('h-3.5 w-3.5 transition-transform', showCode && 'rotate-180')}
                          aria-hidden
                        />
                      </button>
                      {showCode && (
                        <CodeBlock
                          code={question.code_example}
                          language={question.code_language || 'dart'}
                        />
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Notes */}
              <NotesEditor
                key={question.id}
                questionId={question.id}
                initialNotes={question.notes || ''}
                status={status}
                topicSlug={effectiveTopicSlug}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
});

interface NotesEditorProps {
  questionId: number;
  initialNotes: string;
  status: ProgressStatus;
  topicSlug?: string;
}

function NotesEditor({ questionId, initialNotes, status, topicSlug }: NotesEditorProps) {
  const { lang } = useLang();
  const t = useT(lang);
  const update = useUpdateProgress();
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(Boolean(initialNotes));
  const lastSaved = useRef(initialNotes);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save: 800ms after last keystroke
  useEffect(() => {
    if (notes === lastSaved.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await update.mutateAsync({ questionId, status, notes, topicSlug });
        lastSaved.current = notes;
        setSaved(true);
      } catch {
        toast.error(t.failedSaveNotes);
      }
    }, 800);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  return (
    <section className="border-t border-rule/12 px-4 py-4 sm:px-5">
      <header className="mb-2 flex items-center justify-between gap-2">
        <span className="eyebrow">{t.myNotes}</span>
        <span className="inline-flex items-center gap-1 text-[12px] text-muted-2">
          {update.isPending ? (
            t.saving
          ) : saved ? (
            <>
              <Check className="h-3 w-3" aria-hidden />
              {lang === 'ru' ? 'Сохранено' : 'Saved'}
            </>
          ) : null}
        </span>
      </header>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onFocus={(e) => {
          // Mobile keyboard pop can hide the field — re-center it.
          const el = e.target;
          setTimeout(() => {
            try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
            catch { /* older Safari */ }
          }, 250);
        }}
        placeholder={t.addNotes}
        rows={3}
        maxLength={1000}
        aria-label={t.personalNotes}
        autoCorrect="off"
        spellCheck={false}
        autoCapitalize="off"
        className="w-full resize-none rounded border border-rule/12 bg-paper px-3 py-2 text-sm text-ink-2 outline-none transition-colors placeholder:text-muted-2 focus:border-rule/25"
      />
      <div className="mt-1 text-right text-[11px] tabular-nums text-muted-2">
        {notes.length}/1000
      </div>
    </section>
  );
}

export default QuestionCard;
