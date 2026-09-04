import { useEffect, useRef, useState, useCallback, useMemo, forwardRef } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  Bookmark, Check, CheckCircle2, ChevronDown, Circle, CircleDot, EyeOff, Square, Volume2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import CodeBlock from './CodeBlock';
import AnswerText from './AnswerText';
import { useAnswer, useUpdateProgress } from '../lib/queries';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { useTopicCopy } from '../i18n/topicPage';
import { Button, Skeleton } from '../ui/index';
import { cn } from '../lib/cn';
import { useBookmark } from '../lib/useBookmark';
import { speak, stop, subscribe as subscribeTts, isSpeaking, isTtsSupported } from '../lib/tts';
import { extractHint } from '../lib/hint';
import { toPlainText } from '../lib/markdown';
import InlineMarkdown from './InlineMarkdown';
import { track } from '../lib/analytics';
import type { ProgressStatus, Question, QuestionSummary } from '../types/domain';

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
  /** With its answer (a topic page) or without (search, saved) — the card fetches what it lacks. */
  question: Question | QuestionSummary;
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
  const c = useTopicCopy(lang);
  const { questionText, answerText } = useContent(lang);
  const update = useUpdateProgress();
  const [bookmarked, toggleBookmark] = useBookmark(question.id);
  const recallMode = usePrefs((s) => s.recallMode);

  // Hint ladder, only walked when recallMode is on: 'hidden' → 'hint' → 'full'.
  const [reveal, setReveal] = useState<Reveal>(recallMode ? 'hidden' : 'full');

  // The ladder starts over whenever the card is opened, the question changes or
  // recall mode is toggled. Adjusting during render rather than in an effect
  // means the first paint after opening is already in the right stage.
  const revealSignature = `${open}:${recallMode}:${question.id}`;
  const [lastRevealSignature, setLastRevealSignature] = useState(revealSignature);
  if (revealSignature !== lastRevealSignature) {
    setLastRevealSignature(revealSignature);
    if (open) {
      setReveal(recallMode ? 'hidden' : 'full');
      setShowCode(false);
    }
  }

  // The answer body: on the object when the card came from a topic page,
  // fetched from the topic's answers file when it came out of the catalogue
  // (search, saved) — and only once the card is open.
  const body = useAnswer(question, open);
  const fullAnswer = answerText({ id: question.id, answer: body.answer });
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

  const showAnswer = useCallback(() => {
    trackReveal(reveal === 'hint', true);
    setReveal('full');
  }, [reveal, trackReveal]);

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
        'scroll-mt-20 lg:scroll-mt-6 overflow-hidden transition-colors duration-200',
        // One border level per row: closed rows are separated by a hairline,
        // and only the question you are actually reading becomes a card.
        open ? 'codex-card' : 'border-b border-rule/10',
        focused && !open && 'rounded-sm shadow-focus',
      )}
    >
      {/* Header — the whole row is the one control that opens it. Number,
          question, difficulty as plain meta, chevron. The bookmark and the
          status live in the body, where there is room to label them. */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className={cn(
          'flex min-h-[56px] w-full items-start gap-3 text-left sm:gap-4',
          open ? 'px-4 py-4 sm:px-5' : 'px-1 py-3.5 sm:py-4',
        )}
      >
        <span className="num mt-px w-6 shrink-0 text-[13px] text-muted-2" aria-hidden>
          {index + 1}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug text-ink"><InlineMarkdown text={questionText(question)} /></span>
          <span className="mt-1 block text-[12px] leading-snug text-muted">{difficultyLabel}</span>
        </span>

        <ChevronDown
          className={cn('mt-0.5 h-4 w-4 shrink-0 text-muted-2 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {/* `reducedMotion="user"` here rather than in Layout: the shell no
          longer loads framer, so each animating component honours the OS
          setting itself. */}
      <MotionConfig reducedMotion="user">
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
              {/* Status segmented control, with the status icon that used to
                  sit in the row header and the bookmark beside it — both only
                  mean anything next to the words that name them. */}
              <div className="flex flex-wrap items-center gap-2 border-b border-rule/12 bg-paper px-4 py-3 sm:px-5">
                <StatusIcon className={cn('h-4 w-4 shrink-0', STATUS_META[status].accent)} aria-hidden />
                <span className="eyebrow" id="mark-as-label">{t.markAs}</span>
                <div role="group" aria-labelledby="mark-as-label" className="inline-flex items-center gap-px rounded border border-rule/12 bg-paper-2 p-0.5">
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
                          'min-h-[36px] rounded-sm px-2.5 py-1 text-[12px] font-medium transition-colors sm:min-h-0',
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
                <button
                  type="button"
                  onClick={toggleBookmarked}
                  aria-label={bookmarked ? c.unbookmark : c.bookmark}
                  aria-pressed={bookmarked}
                  // Visible 28×28; -m-2 + p-2 grows the hit area to 44px on
                  // touch without nudging the row's layout.
                  className={cn(
                    'box-content -m-2 ml-auto inline-flex h-7 w-7 items-center justify-center rounded p-2 transition-colors',
                    bookmarked ? 'text-[rgb(var(--amber))]' : 'text-muted hover:text-ink',
                  )}
                >
                  <Bookmark className="h-4 w-4" fill={bookmarked ? 'currentColor' : 'none'} aria-hidden />
                </button>
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
                            const body = toPlainText(reveal === 'full' ? fullAnswer : hintText, { keepCode: false });
                            const text = `${toPlainText(questionText(question))}. ${body}`;
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
                        onClick={() => setReveal('hidden')}
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
                        {lang === 'ru' ? 'Сначала ответь по памяти.' : 'Answer it from memory first.'}
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
                      {/* A pen rule in the margin. */}
                      <div className="border-l-2 border-brand/40 pl-4">
                        <p className="eyebrow mb-1">{lang === 'ru' ? 'Подсказка' : 'Hint'}</p>
                        <AnswerText text={hintText} />
                      </div>
                      <Button size="sm" onClick={showAnswer}>
                        {lang === 'ru' ? 'Показать ответ' : 'Show answer'}
                      </Button>
                    </div>
                  ) : body.isLoading && !fullAnswer ? (
                    <div className="space-y-2.5 py-1" aria-busy="true">
                      <Skeleton className="h-4 w-11/12" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : (
                    <AnswerText text={fullAnswer} />
                  )}

                  {/* Code — only after full reveal */}
                  {body.code_example && reveal === 'full' && (
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
                          code={body.code_example}
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
      </MotionConfig>
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
        <span role="status" aria-live="polite" className="inline-flex items-center gap-1 text-[12px] text-muted-2">
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
