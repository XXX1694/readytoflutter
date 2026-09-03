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
 *   previewInterval(id, rating) — the interval rateCard would schedule, in days
 *   getReviewTimes()      — every card's last-rated timestamp, for the activity log
 *   resetCard(id)         — wipes one card
 *   resetAll()            — wipes all SRS state
 *   pickDueQueue(items)   — given an array of questions returns a study queue:
 *                           overdue first, then fresh cards (never seen)
 *   getDueSnapshot()      — { dueCount, nextDueAt } over the whole stored map,
 *                           for the push-reminder state report
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

/** The whole stored card map, for callers that read many cards at once. */
export function readAll(): CardMap {
  return read();
}

export function getCardState(id: number | string, map: CardMap = read()): CardState {
  return map[String(id)] || freshCard();
}

/** One SM-2 step: where a rating moves `prev`, before anything is stored. */
function step(prev: CardState, rating: Rating): Pick<CardState, 'ease' | 'interval' | 'reps'> {
  const r = RATINGS[rating];
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
  return { ease, interval, reps };
}

export function rateCard(
  id: number | string,
  rating: Rating,
  now: number = Date.now(),
): CardState {
  const map = read();
  // Spread over a fresh card so a partial stored object (a missing ease, say)
  // can't turn into NaN → null through the SM-2 arithmetic and JSON.stringify.
  const prev = { ...freshCard(), ...(map[String(id)] || {}) };
  if (!RATINGS[rating]) return prev;

  const scheduled = step(prev, rating);
  const next: CardState = {
    ...scheduled,
    dueAt: now + scheduled.interval * DAY,
    lastAt: now,
  };

  map[String(id)] = next;
  write(map);
  return next;
}

/**
 * The interval, in days, that `rateCard(id, rating)` would schedule right now.
 * The grade buttons show it, so the promise on the button is the one the
 * scheduler keeps: a fresh card's "Good" is tomorrow, not in six days.
 */
export function previewInterval(id: number | string, rating: Rating): number {
  return step(getCardState(id), rating).interval;
}

/** When each card was last rated (epoch ms), never-rated cards excluded. */
export function getReviewTimes(): number[] {
  return Object.values(read())
    .map((s) => s?.lastAt)
    .filter((t): t is number => typeof t === 'number' && t > 0);
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
    if (s.dueAt > 0 && s.dueAt <= now) {
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
    if (s.dueAt > 0 && s.dueAt <= now) {
      if (now - s.dueAt > DAY) overdue += 1;
      else due += 1;
    }
  }
  return { due, overdue, learned, fresh, total: items.length };
}

export interface DueSnapshot {
  /** Cards whose `dueAt` has passed — `due + overdue` in getSrsSummary's terms. */
  dueCount: number;
  /** Earliest `dueAt` still in the future, epoch ms. `null` when nothing is scheduled. */
  nextDueAt: number | null;
}

/**
 * What this browser owes, over the WHOLE stored card map rather than a pool of
 * questions. Push reminders are the caller: `getSrsSummary` needs the question
 * list, which is fetched asynchronously, and a snapshot taken before that
 * resolves would report an empty queue — and the server treats a report as a
 * full snapshot, so that would clear a perfectly good one. Reading localStorage
 * directly can't produce a false empty.
 *
 * The tradeoff is the mirror image: a card left over from a question that has
 * since left the catalogue still counts here, so the count can run slightly
 * ahead of what the study queue can actually show.
 *
 * `dueAt <= 0` is the never-scheduled sentinel from `freshCard()`, not a card
 * that came due in 1970 — it is skipped on both counts.
 */
export function getDueSnapshot(now: number = Date.now()): DueSnapshot {
  const map = read();
  let dueCount = 0;
  let nextDueAt: number | null = null;
  for (const s of Object.values(map)) {
    const dueAt = s?.dueAt;
    if (typeof dueAt !== 'number' || !Number.isFinite(dueAt) || dueAt <= 0) continue;
    if (dueAt <= now) dueCount += 1;
    else if (nextDueAt === null || dueAt < nextDueAt) nextDueAt = dueAt;
  }
  return { dueCount, nextDueAt };
}
