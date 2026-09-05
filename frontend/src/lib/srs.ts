/**
 * Spaced repetition, scheduled by FSRS-6 (`lib/fsrs.ts` holds the model).
 *
 * Per-question state is stored in localStorage under `rtf:srs:v1` as:
 *   { [questionId]: { stability, difficulty, interval, reps, dueAt, lastAt } }
 *
 * Cards written by the previous SM-2 scheduler carry `ease` instead of the two
 * memory fields and are migrated on read — see `migrate` below. The key keeps
 * its name: it holds real users' schedules.
 *
 * Public API:
 *   getCardState(id)      — reads (or returns a fresh card state)
 *   rateCard(id, rating)  — applies FSRS with rating in {again,hard,good,easy}
 *                           and returns the new state
 *   previewInterval(id, rating) — the interval rateCard would schedule, in days
 *   getReviewTimes()      — every card's last-rated timestamp, for the activity log
 *   resetCard(id)         — wipes one card
 *   resetAll()            — wipes all SRS state
 *   pickDueQueue(items)   — given an array of questions returns a study queue:
 *                           overdue first, then fresh cards (never seen)
 *   getDueSnapshot()      — { dueCount, nextDueAt } over the whole stored map,
 *                           for the push-reminder state report
 *   mergeCards(rows)      — folds a server copy of the schedule into this map
 *   cardsRatedSince(t)    — the rows a delta push has to carry
 *   getSyncedAt/setSyncedAt — the high-water mark that delta is measured from
 */

import { fromSm2, intervalForRetention, nextMemory, retrievability, type Grade } from './fsrs';

import type { CardState, Rating, Question, SrsCard } from '../types/domain.ts';

const KEY = 'rtf:srs:v1';
/**
 * The `lastAt` of the newest card this browser has pushed to the server.
 * A separate key, deliberately: `rtf:srs:v1` holds real user data and must
 * keep its shape, and a browser that has never synced simply reads 0 here and
 * pushes everything.
 */
const SYNCED_KEY = 'rtf:srs:synced:v1';
const DAY = 24 * 60 * 60 * 1000;

/**
 * The recall probability a scheduled review aims for. 0.9 is the FSRS default
 * and the one its parameters were fitted at: at this target a card is asked
 * again exactly one stability after it was last seen.
 */
export const TARGET_RETENTION = 0.9;

/** The app's four words as FSRS grades. */
const GRADE: Record<Rating, Grade> = { again: 1, hard: 2, good: 3, easy: 4 };

type CardMap = Record<string, CardState>;

/** A card stored by the SM-2 scheduler this replaced. */
interface LegacyCard extends Partial<CardState> {
  ease?: number;
}

/**
 * Bring a stored card up to the FSRS shape. SM-2 cards carry `ease` and no
 * memory state; `fromSm2` maps them across without moving anyone's next review
 * date, so the switch is invisible to a user mid-schedule.
 *
 * Idempotent, and returns null when there was nothing to do — `read` uses that
 * to write the migrated map back exactly once instead of on every parse.
 */
function migrate(map: CardMap): CardMap | null {
  let touched = false;
  const out: CardMap = {};
  for (const [id, raw] of Object.entries(map)) {
    const card = (raw || {}) as LegacyCard;
    if (typeof card.stability === 'number' && typeof card.difficulty === 'number') {
      out[id] = card as CardState;
      continue;
    }
    // Nothing was ever rated here — a blank or corrupt entry. Giving it a
    // stability would tell FSRS the card had been answered once, so it stays a
    // fresh card instead.
    const rated = Boolean(card.lastAt) || Boolean(card.reps) || Boolean(card.interval);
    const memory = rated ? fromSm2(card.ease ?? 2.5, card.interval ?? 0) : { stability: 0, difficulty: 0 };
    out[id] = {
      ...memory,
      interval: card.interval ?? 0,
      reps: card.reps ?? 0,
      dueAt: card.dueAt ?? 0,
      lastAt: card.lastAt ?? 0,
    };
    touched = true;
  }
  return touched ? out : null;
}

function read(): CardMap {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CardMap) : {};
    const migrated = migrate(parsed);
    if (migrated) {
      write(migrated);
      return migrated;
    }
    return parsed;
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

/** Never rated: zero stability is the sentinel `nextMemory` reads as "first". */
function freshCard(): CardState {
  return { stability: 0, difficulty: 0, interval: 0, reps: 0, dueAt: 0, lastAt: 0 };
}

/** The whole stored card map, for callers that read many cards at once. */
export function readAll(): CardMap {
  return read();
}

export function getCardState(id: number | string, map: CardMap = read()): CardState {
  return map[String(id)] || freshCard();
}

/**
 * One FSRS step: where a rating moves `prev`, before anything is stored.
 *
 * The elapsed time since the last review is an input, not a detail — the same
 * "good" is worth far more stability after three weeks than after a day, and
 * that difference is the whole reason for the switch away from SM-2.
 */
function step(
  prev: CardState,
  rating: Rating,
  now: number,
): Pick<CardState, 'stability' | 'difficulty' | 'interval' | 'reps'> {
  const elapsedDays = prev.lastAt > 0 ? Math.max(0, (now - prev.lastAt) / DAY) : 0;
  const had = prev.stability > 0 ? { stability: prev.stability, difficulty: prev.difficulty } : null;
  const memory = nextMemory(had, GRADE[rating], elapsedDays);
  return {
    ...memory,
    interval: intervalForRetention(memory.stability, TARGET_RETENTION),
    // A lapse sends the card back to the start of its run, exactly as it reads
    // on the stats page: "reps" is the streak, not a lifetime count.
    reps: rating === 'again' ? 0 : prev.reps + 1,
  };
}

export function rateCard(
  id: number | string,
  rating: Rating,
  now: number = Date.now(),
): CardState {
  const map = read();
  // Spread over a fresh card so a partial stored object (a missing stability,
  // say) can't turn into NaN → null through the arithmetic and JSON.stringify.
  const prev = { ...freshCard(), ...(map[String(id)] || {}) };
  if (!GRADE[rating]) return prev;

  const scheduled = step(prev, rating, now);
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
export function previewInterval(
  id: number | string,
  rating: Rating,
  now: number = Date.now(),
): number {
  return step(getCardState(id), rating, now).interval;
}

/**
 * The odds of recalling this card at `at`, 0..1 — FSRS's forgetting curve run
 * forward. A card that has never been rated reads 0: not "unknown", but "will
 * not be recalled", which is the honest input to a readiness forecast.
 */
export function recallAt(card: CardState, at: number): number {
  if (!(card.stability > 0) || !(card.lastAt > 0)) return 0;
  return retrievability((at - card.lastAt) / DAY, card.stability);
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
/* ── Cross-device sync ──────────────────────────────────────────────────────
   localStorage stays the working copy — every read above is synchronous and an
   anonymous visitor has nowhere else to store a schedule. The server holds a
   per-account copy that these three functions reconcile against, so signing in
   on a second browser inherits the schedule instead of starting at day one. */

/**
 * Fold the server's cards into this browser's map. Per question the later
 * rating wins, which is the same rule the server applies in the other
 * direction — so the two copies converge no matter which side syncs first.
 * A card this browser has never rated has `lastAt` 0 and loses to anything.
 *
 * Returns how many cards actually changed; nothing is written when that is 0.
 */
export function mergeCards(rows: readonly SrsCard[]): number {
  if (!rows.length) return 0;
  const map = read();
  let changed = 0;
  for (const row of rows) {
    const id = Number(row?.questionId);
    const lastAt = Number(row?.lastAt);
    if (!id || !Number.isFinite(lastAt)) continue;
    const mine = map[String(id)];
    if (mine && mine.lastAt >= lastAt) continue;
    map[String(id)] = {
      stability: Number(row.stability),
      difficulty: Number(row.difficulty),
      interval: Number(row.interval),
      reps: Number(row.reps),
      dueAt: Number(row.dueAt),
      lastAt,
    };
    changed += 1;
  }
  if (changed > 0) write(map);
  return changed;
}

/** Every card rated after `since` — what a push has to carry, and no more. */
export function cardsRatedSince(since: number): SrsCard[] {
  const out: SrsCard[] = [];
  for (const [id, state] of Object.entries(read())) {
    const questionId = Number(id);
    if (!questionId || !state) continue;
    if (!(state.lastAt > since)) continue;
    out.push({ questionId, ...state });
  }
  return out;
}

export function getSyncedAt(): number {
  try {
    const raw = Number(localStorage.getItem(SYNCED_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  } catch {
    return 0;
  }
}

export function setSyncedAt(at: number): void {
  try { localStorage.setItem(SYNCED_KEY, String(at)); } catch { /* quota — silent */ }
}

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
