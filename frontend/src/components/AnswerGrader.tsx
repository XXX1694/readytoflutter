import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button, Pill, type PillTone } from '../ui/index';
import { aiHealth, aiGradeAnswer, type AiHealthResponse } from '../api/api';
import { track } from '../lib/analytics';
import { RATING_ORDER } from '../lib/useQuestionSession';
import { cn } from '../lib/cn';

import type { AiGrade, Rating } from '../types/domain';
import type { Lang } from '../i18n/LangContext';

// Module-level cache for the /ai/health probe. We only need to ask the
// backend once per page load — the result doesn't change without a server
// restart, and we don't want to ping it every time MockPage mounts.
let healthCache: AiHealthResponse | null = null;
let healthPromise: Promise<AiHealthResponse> | null = null;

function probeHealth(): Promise<AiHealthResponse> {
  if (healthCache) return Promise.resolve(healthCache);
  if (!healthPromise) {
    healthPromise = aiHealth().then((data) => {
      healthCache = data || { enabled: false };
      return healthCache;
    });
  }
  return healthPromise;
}

// AdminPage reads the same probe to show whether AI grading is configured, so
// this module exports a hook alongside its components. Moving it out would only
// shift the fast-refresh boundary, not remove it.
// eslint-disable-next-line react-refresh/only-export-components
export function useAiHealth(): AiHealthResponse {
  const [state, setState] = useState<AiHealthResponse | null>(healthCache);
  useEffect(() => {
    if (healthCache) return;
    let alive = true;
    probeHealth().then((data) => { if (alive) setState(data); });
    return () => { alive = false; };
  }, []);
  return state || { enabled: false };
}

/* ── Self-grade ─────────────────────────────────────────────────────────────
   The four-point grade the user gives themselves after reading the reference
   answer. It is a margin annotation, not a status readout: paper buttons, the
   semantic tokens carried by the word alone, and a tint that only appears
   under the pointer. Wrong / partial / right map to coral / amber / mint —
   "good" and "easy" are both right, so they share the mint rather than
   inventing a fourth hue for the difference. */

const GRADE_SURFACE: Record<Rating, string> = {
  again: 'hover:border-coral/30 hover:bg-coral/8',
  hard:  'hover:border-amber/35 hover:bg-amber/10',
  good:  'hover:border-mint/30 hover:bg-mint/8',
  easy:  'hover:border-mint/40 hover:bg-mint/12',
};

const GRADE_INK: Record<Rating, string> = {
  again: 'text-coral',
  hard:  'text-[rgb(var(--amber))]',
  good:  'text-mint',
  easy:  'text-mint',
};

export interface SelfGradeOption {
  rating: Rating;
  label: string;
  /** Second line — study uses it for the interval each grade schedules. */
  hint?: string;
}

export interface SelfGradeProps {
  options: readonly SelfGradeOption[];
  onGrade: (rating: Rating) => void;
  className?: string;
}

export function SelfGrade({ options, onGrade, className }: SelfGradeProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}>
      {options.map((option) => (
        <button
          key={option.rating}
          type="button"
          onClick={() => onGrade(option.rating)}
          className={cn(
            'touch-target flex flex-col items-center justify-center gap-0.5 rounded-lg',
            'border border-rule/12 bg-paper-2 px-3 py-2.5 transition-colors duration-150',
            GRADE_SURFACE[option.rating],
          )}
        >
          <span className="flex items-baseline gap-1.5">
            <span className="num hidden text-[11px] text-muted-2 sm:inline">
              {RATING_ORDER.indexOf(option.rating) + 1}
            </span>
            <span className={cn('text-[15px] font-medium', GRADE_INK[option.rating])}>
              {option.label}
            </span>
          </span>
          {option.hint && <span className="num text-[11px] text-muted-2">{option.hint}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── AI grade ───────────────────────────────────────────────────────────── */

const VERDICT_TONE: Record<AiGrade['verdict'], PillTone> = {
  great: 'mint',
  good:  'brand',
  rough: 'amber',
  off:   'coral',
};

const VERDICT_LABEL: Record<AiGrade['verdict'], Record<Lang, string>> = {
  great: { ru: 'Отлично', en: 'Great' },
  good:  { ru: 'Уверенно', en: 'Solid' },
  rough: { ru: 'С трудом', en: 'Rough' },
  off:   { ru: 'Мимо', en: 'Off' },
};

const MIN_LEN = 15;

/** Server body for a rejected /ai/grade call. */
interface GradeErrorBody {
  code?: string;
  reason?: string;
  used?: number;
  cap?: number;
  tier?: string;
}

interface PaywallInfo {
  reason?: string;
  used?: number;
  cap?: number;
  tier?: string;
}

type GraderState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'paywall'; info: PaywallInfo }
  | { status: 'graded'; grade: AiGrade };

/** Pulls the HTTP status + JSON body off an axios rejection without widening. */
function readFailure(err: unknown): { status?: number; body: GradeErrorBody } {
  const response = (err as { response?: { status?: number; data?: GradeErrorBody } })?.response;
  return { status: response?.status, body: response?.data || {} };
}

function errorMessage(code: string | undefined, lang: Lang): string {
  const ru = lang === 'ru';
  switch (code) {
    case 'rate_limited':
      return ru ? 'Лимит проверок исчерпан — попробуй позже.' : 'Rate limit reached — try later.';
    case 'too_short':
      return ru ? 'Ответ слишком короткий для проверки.' : 'Answer too short to grade.';
    case 'ai_disabled':
      return ru ? 'AI-проверка не настроена на сервере.' : 'AI grading is not configured.';
    case 'not_found':
      return ru ? 'Вопрос не найден в базе.' : 'Question not found.';
    default:
      return ru ? 'Не удалось проверить ответ. Попробуй ещё раз.' : 'Could not grade the answer. Try again.';
  }
}

export interface AnswerGraderProps {
  questionId: number;
  userAnswer: string;
  lang: Lang;
}

/**
 * Sends the user's written attempt to the backend grader and renders what
 * comes back. The parent gives this a `key={questionId}` so a new question
 * remounts it — that resets the panel without a setState-in-effect.
 */
export default function AnswerGrader({ questionId, userAnswer, lang }: AnswerGraderProps) {
  const { enabled } = useAiHealth();
  const [state, setState] = useState<GraderState>({ status: 'idle' });
  const reqIdRef = useRef(0);

  if (!enabled) return null;

  const trimmed = (userAnswer || '').trim();
  const tooShort = trimmed.length < MIN_LEN;

  // Cost-saving guard: empty / nearly-empty answers never reach the API. The
  // button is hidden in that case, so this is mostly defensive.
  const run = async () => {
    if (tooShort || state.status === 'loading') return;
    const reqId = ++reqIdRef.current;
    setState({ status: 'loading' });
    track('ai_grade_used', { questionId, length: trimmed.length, lang });
    try {
      const data = await aiGradeAnswer({ questionId, userAnswer: trimmed, lang });
      if (reqId !== reqIdRef.current) return; // user moved on
      setState(data?.grade ? { status: 'graded', grade: data.grade } : { status: 'idle' });
    } catch (err: unknown) {
      if (reqId !== reqIdRef.current) return;
      const { status, body } = readFailure(err);
      if (status === 402 && body.code === 'paywall_required') {
        // Daily quota is up. Keep the details so the panel can offer the right
        // upgrade path instead of a generic error.
        track('paywall_hit', { reason: body.reason, tier: body.tier });
        setState({ status: 'paywall', info: body });
        return;
      }
      setState({ status: 'error', message: errorMessage(body.code, lang) });
    }
  };

  if (state.status === 'graded') {
    return <GradePanel grade={state.grade} lang={lang} onRetry={run} />;
  }
  if (state.status === 'paywall') {
    return <PaywallPanel info={state.info} lang={lang} />;
  }

  const ru = lang === 'ru';
  const loading = state.status === 'loading';
  const failed = state.status === 'error';

  const title = loading
    ? (ru ? 'Claude читает твой ответ' : 'Claude is reading your answer')
    : failed
    ? (ru ? 'Не получилось проверить' : 'Could not grade that')
    : tooShort
    ? (ru ? 'Проверка ждёт твой ответ' : 'The check is waiting for your answer')
    : (ru ? 'Сверить ответ с эталоном' : 'Check your answer against the reference');

  const body = failed
    ? state.message
    : tooShort
    ? (ru
        ? 'Напиши хотя бы пару предложений выше — кнопка появится сама.'
        : 'Write a sentence or two above and the button appears.')
    : loading
    ? (ru ? 'Ищем сильные стороны и пробелы.' : 'Looking for what landed and what is missing.')
    : (ru
        ? 'Получишь оценку, сильные стороны, пробелы и следующий шаг.'
        : 'You get a verdict, what landed, what is missing, and a next step.');

  return (
    <section className="mb-5 rounded-lg border border-rule/12 bg-paper-2 p-4 shadow-codex-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="font-display text-[15px] font-medium text-ink">{title}</p>
          <p className={cn('mt-1 text-[13px] leading-relaxed', failed ? 'text-coral' : 'text-muted')}>
            {body}
          </p>
        </div>
        {/* A disabled grey button reads as "broken" rather than "not yet", so
            there is simply no button until there is something to grade. */}
        {!tooShort && (
          <Button variant="brand" size="sm" disabled={loading} onClick={run} className="shrink-0">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {loading
              ? (ru ? 'Читаю' : 'Reading')
              : failed
              ? (ru ? 'Ещё раз' : 'Try again')
              : (ru ? 'Проверить' : 'Check it')}
          </Button>
        )}
      </div>
    </section>
  );
}

/**
 * Shown when /api/ai/grade returns 402. Anonymous visitors are asked to sign
 * up; signed-in free users are pointed at Pro.
 */
function PaywallPanel({ info, lang }: { info: PaywallInfo; lang: Lang }) {
  const ru = lang === 'ru';
  const isAnon = info.tier === 'anon' || info.reason === 'anon_quota_exceeded';
  const title = isAnon
    ? (ru ? 'Лимит для гостей исчерпан' : 'Guest limit reached for today')
    : (ru ? 'Дневной лимит Free исчерпан' : 'Free plan limit reached for today');
  const body = isAnon
    ? (ru
        ? 'Зарегистрируйся — проверок в день станет больше. Pro снимает лимит совсем.'
        : 'Sign up for a bigger daily allowance, or go Pro and the limit goes away.')
    : (ru
        ? `Использовано ${info.used} из ${info.cap}. Pro — без лимита и с follow-up вопросами.`
        : `${info.used} of ${info.cap} used. Pro is unlimited, with follow-up questions.`);

  return (
    <section className="mb-5 rounded-lg border border-amber/25 bg-amber/6 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="font-display text-[15px] font-medium text-ink">{title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{body}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isAnon && (
            <Link to="/signup">
              <Button variant="outline" size="sm">{ru ? 'Зарегистрироваться' : 'Sign up'}</Button>
            </Link>
          )}
          <Link to="/pricing">
            <Button variant="brand" size="sm">{ru ? 'Открыть Pro' : 'See Pro'}</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/** One annotated list — a ruled margin, a label, and the points themselves. */
function GradeNotes({ label, rule, items }: { label: string; rule: string; items: string[] }) {
  return (
    <div className={cn('border-l-2 pl-3', rule)}>
      <div className="eyebrow mb-1.5">{label}</div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-[13px] leading-relaxed text-ink-2">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function GradePanel({ grade, lang, onRetry }: { grade: AiGrade; lang: Lang; onRetry: () => void }) {
  const ru = lang === 'ru';
  const strengths = Array.isArray(grade.strengths) ? grade.strengths : [];
  const gaps = Array.isArray(grade.gaps) ? grade.gaps : [];

  return (
    <section className="mb-5 rounded-lg border border-rule/12 bg-paper-2 p-4 shadow-codex-sm sm:p-5">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Pill tone={VERDICT_TONE[grade.verdict] || 'neutral'} size="sm">
            {VERDICT_LABEL[grade.verdict]?.[lang] || grade.verdict}
          </Pill>
          <span className="num text-[15px] text-ink">
            {grade.score}<span className="text-muted-2">/100</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          {ru ? 'Проверить заново' : 'Check again'}
        </button>
      </header>

      {grade.summary && (
        <p className="mb-4 max-w-[68ch] text-sm leading-relaxed text-ink-2">{grade.summary}</p>
      )}

      {(strengths.length > 0 || gaps.length > 0) && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {strengths.length > 0 && (
            <GradeNotes
              label={ru ? 'Что зашло' : 'What landed'}
              rule="border-mint/40"
              items={strengths}
            />
          )}
          {gaps.length > 0 && (
            <GradeNotes
              label={ru ? 'Чего не хватило' : 'What was missing'}
              rule="border-amber/40"
              items={gaps}
            />
          )}
        </div>
      )}

      {grade.suggestion && (
        <p className="max-w-[68ch] border-t border-rule/12 pt-3 text-[13px] leading-relaxed text-ink-2">
          {grade.suggestion}
        </p>
      )}

      {grade.followUp && (
        <div className="mt-3 border-t border-rule/12 pt-3">
          <div className="eyebrow mb-1.5">
            {ru ? 'Интервьюер спросил бы дальше' : 'An interviewer would ask next'}
          </div>
          <p className="max-w-[68ch] text-sm leading-relaxed text-ink">{grade.followUp}</p>
        </div>
      )}
    </section>
  );
}
