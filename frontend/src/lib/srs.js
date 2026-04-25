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

const KEY = 'rtf:srs:v1';
const DAY = 24 * 60 * 60 * 1000;

const RATINGS = {
  again: { quality: 0, easeDelta: -0.2,  forceReset: true  },
  hard:  { quality: 2, easeDelta: -0.15, forceReset: false },
  good:  { quality: 3, easeDelta:  0,    forceReset: false },
  easy:  { quality: 4, easeDelta:  0.15, forceReset: false },
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota — silent */
  }
}

export function getCardState(id) {
  const map = read();
  return map[id] || { ease: 2.5, interval: 0, reps: 0, dueAt: 0, lastAt: 0 };
}

export function rateCard(id, rating, now = Date.now()) {
  const map = read();
  const prev = map[id] || { ease: 2.5, interval: 0, reps: 0, dueAt: 0, lastAt: 0 };
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

  const next = {
    ease,
    interval,
    reps,
    dueAt: now + interval * DAY,
    lastAt: now,
  };

  map[id] = next;
  write(map);
  return next;
}

export function resetCard(id) {
  const map = read();
  delete map[id];
  write(map);
}

export function resetAll() {
  write({});
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
export function pickDueQueue(items, { limit = 20, freshCap = 10, now = Date.now() } = {}) {
  const map = read();
  const overdue = [];
  const due = [];
  const fresh = [];

  for (const q of items) {
    const s = map[q.id];
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

  const queue = [
    ...overdue.map((x) => x.q),
    ...due.map((x) => x.q),
    ...fresh.slice(0, freshCap),
  ];
  return queue.slice(0, limit);
}

/**
 * Summary counts for dashboards.
 */
export function getSrsSummary(items, now = Date.now()) {
  const map = read();
  let due = 0;
  let overdue = 0;
  let learned = 0;
  let fresh = 0;
  for (const q of items) {
    const s = map[q.id];
    if (!s) { fresh += 1; continue; }
    if (s.reps > 0) learned += 1;
    if (s.dueAt <= now) {
      if (now - s.dueAt > DAY) overdue += 1;
      else due += 1;
    }
  }
  return { due, overdue, learned, fresh, total: items.length };
}
