import { useEffect, useRef, useState, useCallback, useMemo, forwardRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown, Code2, Circle, CircleDot, CheckCircle2, NotebookPen,
  Bookmark, Volume2, Square, Lightbulb, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import CodeBlock from './CodeBlock.jsx';
import AnswerText from './AnswerText.jsx';
import { useUpdateProgress } from '../lib/queries.js';
import { usePrefs } from '../store/prefs.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { Pill, difficultyTone } from '../ui/index.js';
import { cn } from '../lib/cn.js';
import { useBookmark } from '../lib/useBookmark.js';
import { speak, stop, subscribe as subscribeTts, isSpeaking, isTtsSupported } from '../lib/tts.js';
import { extractHint } from '../lib/hint.js';

const STATUS_META = {
  not_started: { icon: Circle,        tone: 'ghost', accent: 'text-muted' },
  in_progress: { icon: CircleDot,     tone: 'amber', accent: 'text-[rgb(var(--amber))]' },
  completed:   { icon: CheckCircle2,  tone: 'mint',  accent: 'text-mint' },
};
const STATUS_KEYS = ['not_started', 'in_progress', 'completed'];

const QuestionCard = forwardRef(function QuestionCard(
  { question, index, expanded: controlledExpanded, onToggleExpand, focused },
  ref,
) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledExpanded ?? internalOpen;
  const toggleOpen = onToggleExpand || (() => setInternalOpen((v) => !v));

  const [status, setStatus] = useState(question.status || 'not_started');
  const [showCode, setShowCode] = useState(false);

  const { lang } = useLang();
  const t = useT(lang);
  const { questionText, answerText } = useContent(lang);
  const update = useUpdateProgress();
  const [bookmarked, toggleBookmarked] = useBookmark(question.id);
  const recallMode = usePrefs((s) => s.recallMode);

  // Hint-ladder reveal (only when recallMode is on):
  //   'hidden' → 'hint' → 'full'
  // Resets each time the card is collapsed.
  const [reveal, setReveal] = useState(recallMode ? 'hidden' : 'full');
  useEffect(() => {
    // When the card opens or recallMode toggles, reset to the appropriate stage.
    if (!open) return;
    setReveal(recallMode ? 'hidden' : 'full');
    setShowCode(false);
  }, [open, recallMode, question.id]);

  const fullAnswer = answerText(question);
  const hintText = useMemo(() => extractHint(fullAnswer), [fullAnswer]);
  const sameAsFull = hintText && hintText.length >= fullAnswer.trim().length - 4;

  // Subscribe once to the TTS singleton so we can light up the button when
  // *this* card is the one currently being read.
  const [thisSpeakingToken, setThisSpeakingToken] = useState(null);
  useEffect(() => {
    const unsub = subscribeTts(() => {
      if (!isSpeaking()) setThisSpeakingToken(null);
    });
    return unsub;
  }, []);

  // Sync status when the parent re-fetches (after mutation)
  useEffect(() => {
    setStatus(question.status || 'not_started');
  }, [question.status]);

  const STATUS_LABELS = useMemo(
    () => ({
      not_started: t.notStarted,
      in_progress: t.inProgressStatus,
      completed: t.completedStatus,
    }),
    [t],
  );

  const handleStatus = useCallback(
    async (next) => {
      if (status === next) return;
      const prev = status;
      setStatus(next);
      try {
        await update.mutateAsync({
          questionId: question.id,
          status: next,
          notes: question.notes || null,
        });
      } catch {
        setStatus(prev);
        toast.error(t.failedUpdateStatus);
      }
    },
    [status, update, question.id, question.notes, t],
  );

  const difficultyLabel =
    { easy: t.easy, medium: t.medium, hard: t.hard }[question.difficulty] || question.difficulty;
  const StatusIcon = STATUS_META[status].icon;

  return (
    <article
      ref={ref}
      data-question-id={question.id}
      className={cn(
        'overflow-hidden rounded-2xl border bg-paper-2 transition-all duration-300 ease-out',
        open
          ? 'border-rule/15 shadow-[0_2px_4px_0_rgb(var(--shadow)/0.06),0_16px_40px_-8px_rgb(var(--shadow)/0.10)]'
          : 'border-rule/8 shadow-[0_1px_2px_0_rgb(var(--shadow)/0.04),0_4px_16px_-4px_rgb(var(--shadow)/0.06)] hover:-translate-y-0.5 hover:border-rule/15',
        focused && !open && 'ring-2 ring-brand/60 ring-offset-2 ring-offset-paper',
      )}
    >
      {/* Header — clickable to toggle */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left sm:gap-4 sm:p-5"
      >
        <span
          className={cn(
            'shrink-0 mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md border border-rule/15 bg-paper font-mono text-[11px] tabular-nums text-ink',
            status === 'completed' && 'border-mint bg-mint/15 text-mint',
            status === 'in_progress' && 'border-[rgb(var(--amber))] bg-amber/15 text-[rgb(var(--amber))]',
          )}
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
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer',
              bookmarked
                ? 'text-[rgb(var(--amber))]'
                : 'text-muted hover:text-ink',
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
            <div className="border-t border-rule/15">
              {/* Status segmented control */}
              <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-paper px-4 py-3 sm:px-5">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  {t.markAs}
                </span>
                <div className="inline-flex items-center gap-px rounded-md border border-rule/15 bg-paper-2 p-0.5 shadow-codex-sm">
                  {STATUS_KEYS.map((key) => {
                    const Icon = STATUS_META[key].icon;
                    const active = status === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleStatus(key)}
                        disabled={update.isPending}
                        aria-pressed={active}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-[11px] uppercase transition-colors',
                          active
                            ? key === 'completed'
                              ? 'bg-mint text-paper'
                              : key === 'in_progress'
                                ? 'bg-[rgb(var(--amber))] text-paper'
                                : 'bg-ink text-paper'
                            : 'text-muted hover:text-ink',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                        {STATUS_LABELS[key]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Answer */}
              <section className="px-4 py-5 sm:px-5">
                <header className="mb-3 flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
                    {t.answer}
                  </span>
                  {recallMode && reveal !== 'full' && (
                    <Pill tone="ink" size="xs">
                      <Lightbulb className="h-2.5 w-2.5" aria-hidden /> Recall
                    </Pill>
                  )}
                  <span className="h-px flex-1 bg-rule" aria-hidden />
                  {recallMode && reveal === 'full' && (
                    <button
                      type="button"
                      onClick={() => setReveal('hidden')}
                      aria-label={lang === 'ru' ? 'Скрыть ответ снова' : 'Hide again'}
                      className="inline-flex items-center gap-1 rounded-md border border-rule/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-rule/15 hover:text-ink"
                    >
                      <Eye className="h-3 w-3" />
                      {lang === 'ru' ? 'Скрыть' : 'Hide'}
                    </button>
                  )}
                  {reveal !== 'hidden' && isTtsSupported() && (
                    <button
                      type="button"
                      onClick={() => {
                        if (thisSpeakingToken !== null) {
                          stop();
                          setThisSpeakingToken(null);
                        } else {
                          const body = reveal === 'full' ? answerText(question) : hintText;
                          const text = `${questionText(question)}. ${body}`;
                          const tok = speak(text, {
                            lang,
                            onEnd: () => setThisSpeakingToken(null),
                          });
                          setThisSpeakingToken(tok);
                        }
                      }}
                      aria-label={thisSpeakingToken !== null
                        ? (lang === 'ru' ? 'Остановить' : 'Stop')
                        : (lang === 'ru' ? 'Озвучить' : 'Listen')}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md border border-rule/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors',
                        thisSpeakingToken !== null
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'text-muted hover:border-rule/15 hover:text-ink',
                      )}
                    >
                      {thisSpeakingToken !== null ? (
                        <>
                          <Square className="h-3 w-3" />
                          {lang === 'ru' ? 'Стоп' : 'Stop'}
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3 w-3" />
                          {lang === 'ru' ? 'Слушать' : 'Listen'}
                        </>
                      )}
                    </button>
                  )}
                </header>

                {recallMode && reveal === 'hidden' ? (
                  <div className="recall-veil relative overflow-hidden rounded-md border border-dashed border-rule/15">
                    {/* Blurred peek of the actual answer — strong blur so it
                        teases shape and length without leaking content. */}
                    <div
                      aria-hidden
                      className="answer-text pointer-events-none select-none px-4 py-5 text-[14.5px] leading-relaxed text-ink-2 opacity-50 blur-[8px] sm:text-[15px]"
                      style={{ filter: 'blur(8px)' }}
                    >
                      {fullAnswer.slice(0, 360)}
                    </div>
                    {/* Overlay: prompt + reveal buttons, centered over the peek. */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-paper/55 px-4 py-5 text-center backdrop-blur-[2px] dark:bg-paper/70">
                      <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                        <Lightbulb className="h-3 w-3" aria-hidden />
                        {lang === 'ru'
                          ? 'Сначала проговори ответ про себя'
                          : 'Recall the answer in your head first'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {hintText && !sameAsFull && (
                          <button
                            type="button"
                            onClick={() => setReveal('hint')}
                            className="inline-flex items-center gap-1.5 rounded-md border border-rule/15 bg-paper-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-2 shadow-codex-sm transition-all hover:-translate-x-px hover:-translate-y-px hover:border-rule/15 hover:text-ink hover:shadow-codex"
                          >
                            <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                            {lang === 'ru' ? 'Подсказка' : 'Hint'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setReveal('full')}
                          className="inline-flex items-center gap-1.5 rounded-md border border-ink bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-paper shadow-codex-sm transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-codex"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          {lang === 'ru' ? 'Показать ответ' : 'Reveal answer'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : recallMode && reveal === 'hint' ? (
                  <div className="space-y-3">
                    <div className="rounded-md border border-amber/40 bg-amber/10 px-4 py-3">
                      <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--amber))]">
                        <Lightbulb className="h-3 w-3" aria-hidden />
                        {lang === 'ru' ? 'Подсказка' : 'Hint'}
                      </div>
                      <p className="text-[14.5px] leading-relaxed text-ink-2 sm:text-[15px]">
                        {hintText}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReveal('full')}
                      className="inline-flex items-center gap-1.5 rounded-md border border-ink bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-paper shadow-codex-sm transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-codex"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                      {lang === 'ru' ? 'Полный ответ' : 'Full answer'}
                    </button>
                  </div>
                ) : (
                  <AnswerText
                    text={answerText(question)}
                    className="answer-text text-[14.5px] leading-relaxed text-ink-2 sm:text-[15px]"
                  />
                )}
              </section>

              {/* Code — only after full reveal */}
              {question.code_example && reveal === 'full' && (
                <section className="px-4 pb-4 sm:px-5">
                  <button
                    type="button"
                    onClick={() => setShowCode((v) => !v)}
                    aria-expanded={showCode}
                    className="mb-2 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-brand transition-colors hover:text-brand-ink"
                  >
                    <Code2 className="h-3.5 w-3.5" aria-hidden />
                    {showCode ? t.hideCodeExample : t.showCodeExample}
                    <ChevronDown
                      className={cn('h-3 w-3 transition-transform', showCode && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                  {showCode && (
                    <CodeBlock
                      code={question.code_example}
                      language={question.code_language || 'dart'}
                    />
                  )}
                </section>
              )}

              {/* Notes */}
              <NotesEditor
                key={question.id}
                questionId={question.id}
                initialNotes={question.notes || ''}
                status={status}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
});

function NotesEditor({ questionId, initialNotes, status }) {
  const { lang } = useLang();
  const t = useT(lang);
  const update = useUpdateProgress();
  const [notes, setNotes] = useState(initialNotes);
  const [savedAt, setSavedAt] = useState(initialNotes ? Date.now() : null);
  const lastSaved = useRef(initialNotes);
  const timer = useRef(null);

  // Debounced auto-save: 800ms after last keystroke
  useEffect(() => {
    if (notes === lastSaved.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await update.mutateAsync({ questionId, status, notes });
        lastSaved.current = notes;
        setSavedAt(Date.now());
      } catch {
        toast.error(t.failedSaveNotes);
      }
    }, 800);
    return () => timer.current && clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  const savedHint =
    savedAt &&
    new Intl.RelativeTimeFormat(lang === 'ru' ? 'ru' : 'en', { numeric: 'auto' }).format(
      Math.round((savedAt - Date.now()) / 1000),
      'second',
    );

  return (
    <section className="border-t border-rule px-4 py-4 sm:px-5">
      <header className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          <NotebookPen className="h-3 w-3" aria-hidden />
          {t.myNotes}
        </span>
        <span className="font-mono text-[10px] text-muted-2">
          {update.isPending ? t.saving : savedAt ? `✓ ${lang === 'ru' ? 'сохранено' : 'saved'}` : ''}
        </span>
      </header>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t.addNotes}
        rows={3}
        maxLength={1000}
        aria-label={t.personalNotes}
        className="w-full resize-none rounded-md border border-rule/15 bg-paper px-3 py-2 text-sm text-ink-2 placeholder:text-muted-2 outline-none transition-colors focus:border-rule/15 focus:ring-1 focus:ring-brand/30"
      />
      <div className="mt-1 text-right font-mono text-[10px] text-muted-2">
        {notes.length}/1000
      </div>
    </section>
  );
}

export default QuestionCard;
