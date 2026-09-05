// The error shape both AI panels read. Kept out of the components so the two
// screens agree on what a 402 means and Fast Refresh keeps working.

import type { Lang } from '../i18n/LangContext';

/** Server body for a rejected /api/ai/* call. */
export interface AiErrorBody {
  code?: string;
  reason?: string;
  used?: number;
  cap?: number;
  tier?: string;
}

export interface PaywallInfo {
  reason?: string;
  used?: number;
  cap?: number;
  tier?: string;
}

/** Pulls the HTTP status + JSON body off an axios rejection without widening. */
export function readFailure(err: unknown): { status?: number; body: AiErrorBody } {
  const response = (err as { response?: { status?: number; data?: AiErrorBody } })?.response;
  return { status: response?.status, body: response?.data || {} };
}

/**
 * What went wrong, in the user's language. `notFound` is the caller's own
 * sentence — a missing question and a missing task are different objects and
 * deserve different words.
 */
export function aiErrorMessage(code: string | undefined, lang: Lang, notFound: string): string {
  const ru = lang === 'ru';
  switch (code) {
    case 'rate_limited':
      return ru ? 'Лимит проверок исчерпан — попробуй позже.' : 'Rate limit reached — try later.';
    case 'too_short':
      return ru ? 'Ответ слишком короткий для проверки.' : 'Answer too short to grade.';
    case 'ai_disabled':
      return ru ? 'AI-проверка не настроена на сервере.' : 'AI grading is not configured.';
    case 'not_found':
      return notFound;
    default:
      return ru ? 'Не удалось проверить ответ. Попробуй ещё раз.' : 'Could not grade the answer. Try again.';
  }
}
