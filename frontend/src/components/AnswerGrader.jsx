import { useEffect, useRef, useState } from 'react';
import {
  Sparkles, Loader2, AlertCircle, Check, X, ChevronRight,
} from 'lucide-react';
import { Button, Pill } from '../ui/index.js';
import { aiHealth, aiGradeAnswer } from '../api/api.js';

// Module-level cache for the /ai/health probe. We only need to ask the
// backend once per page load — the result doesn't change without a server
// restart, and we don't want to ping it every time MockPage mounts.
let healthCache = null;
let healthPromise = null;

function probeHealth() {
  if (healthCache) return Promise.resolve(healthCache);
  if (!healthPromise) {
    healthPromise = aiHealth().then((data) => {
      healthCache = data || { enabled: false };
      return healthCache;
    });
  }
  return healthPromise;
}

export function useAiHealth() {
  const [state, setState] = useState(healthCache);
  useEffect(() => {
    if (healthCache) return;
    let alive = true;
    probeHealth().then((data) => { if (alive) setState(data); });
    return () => { alive = false; };
  }, []);
  return state || { enabled: false };
}

const VERDICT_TONE = {
  great: 'mint',
  good: 'brand',
  rough: 'amber',
  off: 'coral',
};

const VERDICT_LABEL = {
  great: { ru: 'Отлично', en: 'Great' },
  good:  { ru: 'Уверенно', en: 'Solid' },
  rough: { ru: 'С трудом', en: 'Rough' },
  off:   { ru: 'Мимо', en: 'Off' },
};

const MIN_LEN = 15;

function errorMessage(code, lang) {
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

export default function AnswerGrader({ questionId, userAnswer, lang }) {
  const { enabled } = useAiHealth();
  const [state, setState] = useState({ loading: false, result: null, error: null });
  const reqIdRef = useRef(0);

  // Reset whenever we move to a new question — stale grade for the prior
  // question should not flash when the next one renders.
  useEffect(() => {
    setState({ loading: false, result: null, error: null });
  }, [questionId]);

  // The grader sits at the top of the revealed section, so the result
  // lands right where the user's eye already is — no auto-scroll needed.

  if (!enabled) return null;

  const trimmed = (userAnswer || '').trim();
  const tooShort = trimmed.length < MIN_LEN;

  // Cost-saving guard: empty / nearly-empty answers never reach the API.
  // The button is disabled (so this is mostly defensive), but we also bail
  // out here in case something else trips the click path.
  const run = async () => {
    if (tooShort || state.loading) return;
    const reqId = ++reqIdRef.current;
    setState({ loading: true, result: null, error: null });
    try {
      const data = await aiGradeAnswer({ questionId, userAnswer: trimmed, lang });
      if (reqId !== reqIdRef.current) return; // user moved on
      setState({ loading: false, result: data?.grade || null, error: null });
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      const code = err?.response?.data?.code;
      setState({ loading: false, result: null, error: errorMessage(code, lang) });
    }
  };

  if (state.result) {
    return <ResultPanel result={state.result} lang={lang} onRetry={run} />;
  }

  // Idle / loading / error — one bold brand-tinted CTA. Brand gradient + a
  // soft glow at the corner so the eye catches it. Compact on tooShort
  // (no CTA — there's nothing to grade yet, so a button would just look
  // broken).
  const isError = !!state.error;
  return (
    <section
      className="relative mb-5 overflow-hidden rounded-md border border-brand/30 bg-gradient-to-br from-brand/8 via-paper-2 to-mint/5 p-4 shadow-codex-sm sm:p-5"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand/15 blur-3xl"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-brand/30 bg-paper-2 shadow-codex-sm">
            {state.loading
              ? <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden />
              : isError
              ? <AlertCircle className="h-4 w-4 text-coral" aria-hidden />
              : <Sparkles className="h-4 w-4 text-brand" aria-hidden />}
          </div>
          <div>
            <div className="font-display text-base font-medium leading-tight text-ink sm:text-lg">
              {state.loading
                ? (lang === 'ru' ? 'Claude думает над ответом…' : 'Claude is grading your answer…')
                : isError
                ? (lang === 'ru' ? 'Не получилось проверить' : 'Could not grade')
                : tooShort
                ? (lang === 'ru' ? 'AI-проверка ждёт твой ответ' : 'AI check is waiting for your answer')
                : (lang === 'ru' ? 'Проверить ответ через AI' : 'Grade your answer with AI')}
            </div>
            <div className="mt-1 text-xs leading-relaxed text-ink-2">
              {isError ? (
                <span className="text-coral">{state.error}</span>
              ) : tooShort ? (
                lang === 'ru'
                  ? 'Напиши хотя бы пару предложений в поле выше — кнопка появится автоматически.'
                  : 'Write at least a sentence or two above — the button shows up automatically.'
              ) : state.loading ? (
                lang === 'ru'
                  ? 'Сравниваем с эталоном, ищем сильные стороны и пробелы…'
                  : 'Comparing with the reference, looking for strengths and gaps…'
              ) : (
                lang === 'ru'
                  ? 'Получишь оценку, сильные стороны, пробелы и совет — за пару секунд.'
                  : 'Get a verdict, strengths, gaps and a next step — in a couple of seconds.'
              )}
            </div>
          </div>
        </div>
        {/* Hide the button entirely when there's nothing to grade —
            a disabled grey button reads as "broken" instead of "not yet". */}
        {!tooShort && (
          <Button
            variant="brand"
            size="sm"
            disabled={state.loading}
            onClick={run}
            className="shrink-0"
          >
            {state.loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {lang === 'ru' ? 'Думаю…' : 'Thinking…'}
              </>
            ) : isError ? (
              <>{lang === 'ru' ? 'Повторить' : 'Retry'}</>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                {lang === 'ru' ? 'Проверить' : 'Check with AI'}
              </>
            )}
          </Button>
        )}
      </div>
    </section>
  );
}

function ResultPanel({ result, lang, onRetry }) {
  const tone = VERDICT_TONE[result.verdict] || 'brand';
  const label = VERDICT_LABEL[result.verdict]?.[lang] || result.verdict;
  const strengths = Array.isArray(result.strengths) ? result.strengths : [];
  const gaps = Array.isArray(result.gaps) ? result.gaps : [];

  return (
    <section className="mb-5 rounded-md border border-rule/15 bg-paper-2 p-4 shadow-codex-sm sm:p-5">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          <Sparkles className="h-3 w-3 text-brand" />
          {lang === 'ru' ? 'AI-оценка' : 'AI grade'}
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={tone} size="xs">{label}</Pill>
          <span className="font-mono text-sm tabular-nums text-ink">
            {result.score}
            <span className="text-muted">/100</span>
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink"
          >
            {lang === 'ru' ? 'Заново' : 'Re-check'}
          </button>
        </div>
      </header>

      {result.summary && (
        <p className="mb-3 text-sm leading-relaxed text-ink-2">{result.summary}</p>
      )}

      {(strengths.length > 0 || gaps.length > 0) && (
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {strengths.length > 0 && (
            <div>
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-mint">
                {lang === 'ru' ? 'Сильно' : 'Strengths'}
              </div>
              <ul className="space-y-1.5">
                {strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {gaps.length > 0 && (
            <div>
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-coral">
                {lang === 'ru' ? 'Пробелы' : 'Gaps'}
              </div>
              <ul className="space-y-1.5">
                {gaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink-2">
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {result.suggestion && (
        <p className="flex items-start gap-2 border-t border-rule/15 pt-3 text-xs text-ink-2">
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
          <span>{result.suggestion}</span>
        </p>
      )}
    </section>
  );
}
