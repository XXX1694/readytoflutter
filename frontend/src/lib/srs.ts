/**
 * Lightweight SuperMemo SM-2 spaced repetition.
 *
 * Per-question state is stored in localStorage under `rtf:srs:v1` as:
 *   { [questionId]: { ease, interval, reps, dueAt, lastAt } }
 *
 * Public API:
 *   getCardState(id)      — reads (or returns a fresh card state)
 *   rateCard(id, rating)  — applies SM-2 with rating in {again,hard,good,easy}
 *                           and returns the new state
 *   resetCard(id)         — wipes one card
 *   resetAll()            — wipes all SRS state
 *   pickDueQueue(items)   — given an array of questions returns a study queue:
 *                           overdue first, then fresh cards (never seen)
 */

import type { CardState, Rating, Question } from '../types/domain.ts';

const KEY = 'rtf:srs:v1';
const DAY = 24 * 60 * 60 * 1000;

interface RatingMeta {
  quality: number;
  easeDelta: number;
  forceReset: boolean;
}

const RATINGS: Record<Rating, RatingMeta> = {
  again: { quality: 0, easeDelta: -0.2,  forceReset: true  },
  hard:  { quality: 2, easeDelta: -0.15, forceReset: false },
  good:  { quality: 3, easeDelta:  0,    forceReset: false },
  easy:  { quality: 4, easeDelta:  0.15, forceReset: false },
};

type CardMap = Record<string, CardState>;

function read(): CardMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CardMap) : {};
  } catch {
    return {};
  }
}

function write(map: CardMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota — silent */
  }
}

function freshCard(): CardState {
  return { ease: 2.5, interval: 0, reps: 0, dueAt: 0, lastAt: 0 };
}

export function getCardState(id: number | string): CardState {
  const map = read();
  return map[String(id)] || freshCard();
}

export function rateCard(
  id: number | string,
  rating: Rating,
  now: number = Date.now(),
): CardState {
  const map = read();
  const prev = map[String(id)] || freshCard();
  const r = RATINGS[rating];
  if (!r) return prev;

  let { ease, interval, reps } = prev;

  // SM-2 ease adjustment
  ease = Math.max(1.3, ease + r.easeDelta);

  if (r.forceReset) {
    reps = 0;
    interval = 1;
  } else {
    if (reps === 0) interval = rating === 'easy' ? 3 : 1;
    else if (reps === 1) interval = rating === 'easy' ? 7 : 6;
    else interval = Math.max(1, Math.round(interval * ease));
    reps += 1;
  }

  const next: CardState = {
    ease,
    interval,
    reps,
    dueAt: now + interval * DAY,
    lastAt: now,
  };

  map[String(id)] = next;
  write(map);
  return next;
}

export function resetCard(id: number | string): void {
  const map = read();
  delete map[String(id)];
  write(map);
}

export function resetAll(): void {
  write({});
}

interface PickDueOptions {
  limit?: number;
  freshCap?: number;
  now?: number;
}

/**
 * Build a study queue from a pool of questions. Strategy:
 *  - Overdue cards first, sorted by how overdue they are (most overdue first).
 *  - Then "due today" cards.
 *  - Then fresh cards (never reviewed) up to `freshCap`.
 *
 * Returns at most `limit` cards. The queue is intentionally bounded so a
 * session feels finite — the user finishes it, gets a sense of completion,
 * and comes back tomorrow.
 */
export function pickDueQueue<T extends Pick<Question, 'id'>>(
  items: T[],
  { limit = 20, freshCap = 10, now = Date.now() }: PickDueOptions = {},
): T[] {
  const map = read();
  const overdue: Array<{ q: T; lateness: number }> = [];
  const due: Array<{ q: T; lateness: number }> = [];
  const fresh: T[] = [];

  for (const q of items) {
    const s = map[String(q.id)];
    if (!s) {
      fresh.push(q);
      continue;
    }
    if (s.dueAt <= now) {
      const lateness = now - s.dueAt;
      if (lateness > DAY) overdue.push({ q, lateness });
      else due.push({ q, lateness });
    }
  }

  overdue.sort((a, b) => b.lateness - a.lateness);
  due.sort((a, b) => b.lateness - a.lateness);

  const queue: T[] = [
    ...overdue.map((x) => x.q),
    ...due.map((x) => x.q),
    ...fresh.slice(0, freshCap),
  ];
  return queue.slice(0, limit);
}

export interface SrsSummary {
  due: number;
  overdue: number;
  learned: number;
  fresh: number;
  total: number;
}

/**
 * Summary counts for dashboards.
 */
export function getSrsSummary<T extends Pick<Question, 'id'>>(
  items: T[],
  now: number = Date.now(),
): SrsSummary {
  const map = read();
  let due = 0;
  let overdue = 0;
  let learned = 0;
  let fresh = 0;
  for (const q of items) {
    const s = map[String(q.id)];
    if (!s) { fresh += 1; continue; }
    if (s.reps > 0) learned += 1;
    if (s.dueAt <= now) {
      if (now - s.dueAt > DAY) overdue += 1;
      else due += 1;
    }
  }
  return { due, overdue, learned, fresh, total: items.length };
}
