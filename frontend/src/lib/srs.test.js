import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCardState,
  rateCard,
  resetCard,
  resetAll,
  pickDueQueue,
  getSrsSummary,
  getDueSnapshot,
  previewInterval,
  getReviewTimes,
  readAll,
  mergeCards,
  cardsRatedSince,
  getSyncedAt,
  setSyncedAt,
} from './srs';

describe('srs.getCardState', () => {
  it('returns a fresh card state when nothing is stored', () => {
    const s = getCardState(1);
    expect(s).toEqual({ stability: 0, difficulty: 0, interval: 0, reps: 0, dueAt: 0, lastAt: 0 });
  });
});

describe('srs.rateCard — FSRS progression', () => {
  const DAY = 24 * 60 * 60 * 1000;

  it('first "good" review schedules two days out', () => {
    const now = Date.UTC(2026, 0, 1);
    const s = rateCard(42, 'good', now);
    expect(s.reps).toBe(1);
    expect(s.interval).toBe(2);
    expect(s.dueAt).toBe(now + 2 * DAY);
    // The interval is the stability, rounded — that is what stability means.
    expect(s.stability).toBeCloseTo(2.3065, 4);
  });

  it('first "easy" review jumps much further out than "good"', () => {
    const now = Date.UTC(2026, 0, 1);
    const s = rateCard(42, 'easy', now);
    expect(s.reps).toBe(1);
    expect(s.interval).toBe(8);
  });

  it('"again" resets the streak and collapses the interval', () => {
    const now = Date.UTC(2026, 0, 1);
    rateCard(42, 'good', now);
    const grown = rateCard(42, 'good', now + 3 * DAY);
    const after = rateCard(42, 'again', now + 10 * DAY);
    expect(after.reps).toBe(0);
    // A lapse costs stability but does not always reset to a single day —
    // a card that had been remembered for a fortnight is not back to zero.
    expect(after.interval).toBeLessThan(grown.interval);
    expect(after.stability).toBeLessThan(grown.stability);
    expect(after.difficulty).toBeGreaterThan(grown.difficulty);
    expect(after.difficulty).toBeLessThanOrEqual(10);
  });

  it('difficulty stays inside 1..10 after many "again"s', () => {
    const id = 7;
    for (let i = 0; i < 20; i += 1) rateCard(id, 'again');
    const s = getCardState(id);
    expect(s.difficulty).toBeGreaterThanOrEqual(1);
    expect(s.difficulty).toBeLessThanOrEqual(10);
    expect(Number.isFinite(s.stability)).toBe(true);
  });

  it('pays a longer gap with a longer next interval for the same grade', () => {
    // What SM-2 could not do: the same "good" is worth more after three weeks
    // than after a day, because recalling it then is stronger evidence.
    const now = Date.UTC(2026, 0, 1);
    rateCard(10, 'good', now);
    rateCard(11, 'good', now);
    const soon = rateCard(10, 'good', now + 1 * DAY).interval;
    const late = rateCard(11, 'good', now + 21 * DAY).interval;
    expect(late).toBeGreaterThan(soon);
  });

  it('returns prior state on unknown rating without persisting', () => {
    const before = getCardState(99);
    const after = rateCard(99, 'sideways');
    expect(after).toEqual(before);
  });
});

describe('srs.pickDueQueue', () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ id: i + 1 }));

  it('caps the queue at `limit`', () => {
    const q = pickDueQueue(items, { limit: 10 });
    expect(q.length).toBe(10);
  });

  it('caps fresh cards at `freshCap`', () => {
    const q = pickDueQueue(items, { limit: 30, freshCap: 5 });
    expect(q.length).toBe(5);
  });

  it('puts overdue cards before fresh cards', () => {
    const now = Date.UTC(2026, 1, 1);
    // Make item 1 overdue by 5 days.
    rateCard(1, 'good', now - 5 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
    const q = pickDueQueue(items, { limit: 5, freshCap: 5, now });
    expect(q[0].id).toBe(1);
  });
});

describe('srs.getSrsSummary', () => {
  it('counts fresh items when nothing is rated', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const s = getSrsSummary(items);
    expect(s).toMatchObject({ fresh: 3, learned: 0, due: 0, overdue: 0, total: 3 });
  });

  it('counts learned + due correctly', () => {
    const now = Date.UTC(2026, 1, 1);
    rateCard(1, 'good', now - 25 * 60 * 60 * 1000); // due roughly today
    const s = getSrsSummary([{ id: 1 }, { id: 2 }], now);
    expect(s.learned).toBe(1);
    expect(s.fresh).toBe(1);
  });
});

describe('srs.reset helpers', () => {
  it('resetCard wipes a single card', () => {
    rateCard(5, 'good');
    resetCard(5);
    expect(getCardState(5).reps).toBe(0);
  });

  it('resetAll wipes everything', () => {
    rateCard(1, 'good');
    rateCard(2, 'good');
    resetAll();
    expect(getCardState(1).reps).toBe(0);
    expect(getCardState(2).reps).toBe(0);
  });
});

describe('srs.getDueSnapshot', () => {
  // The block above ends on resetAll(), but these assert exact counts over the
  // WHOLE stored map rather than a pool, so leftovers from a reordered run
  // would be invisible. Wipe explicitly.
  beforeEach(() => resetAll());

  it('reports nothing when no card has ever been rated', () => {
    expect(getDueSnapshot()).toEqual({ dueCount: 0, nextDueAt: null });
  });

  it('counts every card whose dueAt has passed', () => {
    const now = Date.UTC(2026, 2, 10);
    const day = 24 * 60 * 60 * 1000;
    rateCard(1, 'good', now - 5 * day); // due 3 days ago
    rateCard(2, 'good', now - 3 * day); // due a day ago
    rateCard(3, 'good', now);           // due in two days
    expect(getDueSnapshot(now).dueCount).toBe(2);
  });

  it('nextDueAt is the earliest card still in the future', () => {
    const now = Date.UTC(2026, 2, 10);
    const day = 24 * 60 * 60 * 1000;
    rateCard(1, 'easy', now); // +8 days
    rateCard(2, 'good', now); // +2 days  ← the earliest
    const snap = getDueSnapshot(now);
    expect(snap.dueCount).toBe(0);
    expect(snap.nextDueAt).toBe(now + 2 * day);
  });

  it('nextDueAt is null when everything is already due', () => {
    const now = Date.UTC(2026, 2, 10);
    rateCard(1, 'good', now - 8 * 24 * 60 * 60 * 1000);
    expect(getDueSnapshot(now)).toEqual({ dueCount: 1, nextDueAt: null });
  });

  it('ignores the never-scheduled sentinel rather than treating it as due', () => {
    // dueAt 0 is what freshCard() returns; a stored 0 means "no schedule",
    // not "came due in 1970".
    localStorage.setItem(
      'rtf:srs:v1',
      JSON.stringify({ 9: { ease: 2.5, interval: 0, reps: 0, dueAt: 0, lastAt: 0 } }),
    );
    expect(getDueSnapshot()).toEqual({ dueCount: 0, nextDueAt: null });
  });

  it('survives a corrupt entry without throwing', () => {
    const now = Date.UTC(2026, 2, 10);
    localStorage.setItem(
      'rtf:srs:v1',
      JSON.stringify({ 1: null, 2: { dueAt: 'soon' }, 3: { dueAt: now - 1 } }),
    );
    expect(getDueSnapshot(now)).toEqual({ dueCount: 1, nextDueAt: null });
  });
});


// ── Wave 2/3 additions: interval preview, the review log, the shared map read,
//    the dueAt<=0 guard, and partial-card hardening. Each locks in a fix whose
//    only prior coverage was a throwaway reviewer script. ──

describe('srs.previewInterval', () => {
  beforeEach(() => resetAll());

  it("matches what rateCard schedules for a fresh card, and doesn't persist", () => {
    // The grade buttons show this; it must equal the real next interval so the
    // promise on the button is the one the scheduler keeps.
    const now = Date.UTC(2026, 0, 1);
    for (const rating of ['again', 'hard', 'good', 'easy']) {
      expect(previewInterval(7, rating, now)).toBe(rateCard(7, rating, now).interval);
      resetCard(7);
    }
    // Reading a preview must not create or mutate a stored card.
    previewInterval(7, 'good', now);
    expect(readAll()).toEqual({});
  });

  it('grows with the card, and orders the four grades sensibly', () => {
    const now = Date.UTC(2026, 0, 1);
    const day = 24 * 60 * 60 * 1000;
    const fresh = previewInterval(7, 'good', now);
    rateCard(7, 'good', now);
    const matured = previewInterval(7, 'good', now + 2 * day);
    expect(matured).toBeGreaterThan(fresh);
    expect(previewInterval(7, 'again', now + 2 * day)).toBeLessThan(matured);
    expect(previewInterval(7, 'easy', now + 2 * day)).toBeGreaterThan(matured);
  });
});

describe('srs.getReviewTimes', () => {
  beforeEach(() => resetAll());

  it('returns a lastAt stamp for every rated card and nothing for never-rated', () => {
    const now = Date.UTC(2026, 0, 1);
    rateCard(1, 'good', now);
    rateCard(2, 'again', now + 1000);
    getCardState(3); // read only — never rated, must not appear
    const times = getReviewTimes().sort((a, b) => a - b);
    expect(times).toEqual([now, now + 1000]);
  });

  it('excludes a stored card whose lastAt is 0', () => {
    localStorage.setItem('rtf:srs:v1', JSON.stringify({
      9: { ease: 2.5, interval: 1, reps: 1, dueAt: Date.now() + 1000, lastAt: 0 },
    }));
    expect(getReviewTimes()).toEqual([]);
  });
});

describe('srs — a stored card with dueAt <= 0 is never treated as due', () => {
  beforeEach(() => resetAll());

  // freshCard() is dueAt:0; a rated card always gets dueAt = now + interval*day > 0,
  // so a stored 0 can only arrive from corruption. It must not pin to the queue head.
  const seedZeroDue = () => localStorage.setItem('rtf:srs:v1', JSON.stringify({
    5: { ease: 2.5, interval: 0, reps: 1, dueAt: 0, lastAt: 123 },
  }));

  it('pickDueQueue drops it (neither fresh nor due)', () => {
    seedZeroDue();
    // id 5 has a stored state so it is not "fresh"; dueAt 0 must not count as due.
    expect(pickDueQueue([{ id: 5 }, { id: 6 }])).toEqual([{ id: 6 }]);
  });

  it('getSrsSummary counts it as learned but not due/overdue', () => {
    seedZeroDue();
    const sum = getSrsSummary([{ id: 5 }]);
    expect(sum).toEqual({ due: 0, overdue: 0, learned: 1, fresh: 0, total: 1 });
  });

  it('agrees with getDueSnapshot, which already skipped it', () => {
    seedZeroDue();
    expect(getDueSnapshot()).toEqual({ dueCount: 0, nextDueAt: null });
  });
});

describe('srs.rateCard — partial stored card', () => {
  beforeEach(() => resetAll());

  it('fills fresh defaults so no field turns into NaN/null', () => {
    // A card object missing its memory fields used to run undefined through the
    // arithmetic → NaN, which JSON.stringify writes back as null.
    localStorage.setItem('rtf:srs:v1', JSON.stringify({ 5: {} }));
    const now = Date.UTC(2026, 0, 1);
    const next = rateCard(5, 'good', now);
    expect(Number.isFinite(next.stability)).toBe(true);
    expect(Number.isFinite(next.difficulty)).toBe(true);
    // An entry with no history at all is a fresh card, not one already rated:
    // it gets the same first-review interval a brand new card would.
    expect(next.interval).toBe(2);
    expect(next.reps).toBe(1);
    expect(next.dueAt).toBe(now + 2 * 24 * 60 * 60 * 1000);
    const stored = JSON.parse(localStorage.getItem('rtf:srs:v1'))['5'];
    for (const v of Object.values(stored)) expect(v).not.toBeNull();
  });

  it('migrates an SM-2 card without moving the review it had earned', () => {
    // The switch of scheduler must be invisible to someone mid-schedule: the
    // interval they worked up to is exactly what FSRS calls stability.
    const due = Date.UTC(2026, 3, 1);
    localStorage.setItem('rtf:srs:v1', JSON.stringify({
      5: { ease: 2.36, interval: 45, reps: 6, dueAt: due, lastAt: Date.UTC(2026, 1, 15) },
    }));
    const card = getCardState(5);
    expect(card.dueAt).toBe(due);
    expect(card.interval).toBe(45);
    expect(card.reps).toBe(6);
    expect(card.stability).toBe(45);
    expect(card.difficulty).toBeGreaterThan(1);
    expect(card.difficulty).toBeLessThanOrEqual(10);
    expect('ease' in card).toBe(false);
  });
});

// ── Cross-device sync ───────────────────────────────────────────────────────
// The merge decides whose schedule survives when two browsers hold a different
// copy of the same card. Get it backwards and a phone that has been closed for
// a month silently resets intervals the user spent that month earning.

const OLD = Date.UTC(2026, 0, 1);
const NEW = Date.UTC(2026, 11, 1);
const card = (questionId, lastAt, extra = {}) => ({
  questionId, stability: 6, difficulty: 5, interval: 6, reps: 3,
  dueAt: lastAt + 6 * 86400000, lastAt, ...extra,
});

describe('srs.mergeCards', () => {
  beforeEach(() => { resetAll(); setSyncedAt(0); });

  it('takes a server card this browser has never seen', () => {
    expect(mergeCards([card(7, NEW, { interval: 30 })])).toBe(1);
    expect(getCardState(7).interval).toBe(30);
    expect(getCardState(7).lastAt).toBe(NEW);
  });

  it('keeps the local card when it was rated later', () => {
    rateCard(7, 'easy', NEW);
    const mine = getCardState(7);

    expect(mergeCards([card(7, OLD, { interval: 1 })])).toBe(0);
    expect(getCardState(7)).toEqual(mine);
  });

  it('takes the server card when it was rated later', () => {
    rateCard(7, 'again', OLD);

    expect(mergeCards([card(7, NEW, { stability: 21, difficulty: 3.2, interval: 21, reps: 4 })])).toBe(1);
    expect(getCardState(7)).toEqual({
      stability: 21, difficulty: 3.2, interval: 21, reps: 4, dueAt: NEW + 6 * 86400000, lastAt: NEW,
    });
  });

  it('keeps the local card on an exact tie, rather than churning it', () => {
    rateCard(7, 'good', NEW);
    expect(mergeCards([card(7, NEW, { interval: 99 })])).toBe(0);
    expect(getCardState(7).interval).toBe(2);
  });

  it('never lets a card with no rating overwrite a real one', () => {
    // What makes pushing a fresh browser's map safe in the other direction.
    rateCard(7, 'easy', NEW);
    expect(mergeCards([card(7, 0, { stability: 0, difficulty: 0, interval: 0, reps: 0 })])).toBe(0);
    expect(getCardState(7).reps).toBe(1);
  });

  it('skips malformed rows instead of writing a broken card', () => {
    expect(mergeCards([
      { questionId: 0, lastAt: NEW },
      { questionId: 8, lastAt: 'yesterday' },
      card(9, NEW),
    ])).toBe(1);
    expect(getCardState(9).lastAt).toBe(NEW);
    expect(getCardState(8).reps).toBe(0);
  });

  it('writes nothing when every row loses', () => {
    rateCard(7, 'easy', NEW);
    const before = localStorage.getItem('rtf:srs:v1');
    expect(mergeCards([card(7, OLD)])).toBe(0);
    expect(localStorage.getItem('rtf:srs:v1')).toBe(before);
  });

  it('treats an empty list as a no-op', () => {
    expect(mergeCards([])).toBe(0);
  });
});

describe('srs.cardsRatedSince', () => {
  beforeEach(() => { resetAll(); setSyncedAt(0); });

  it('returns every rated card when nothing has been synced yet', () => {
    rateCard(1, 'good', OLD);
    rateCard(2, 'good', NEW);
    expect(cardsRatedSince(0).map((c) => c.questionId).sort()).toEqual([1, 2]);
  });

  it('carries the card state alongside the id', () => {
    rateCard(1, 'easy', NEW);
    const [only] = cardsRatedSince(0);
    expect(only.questionId).toBe(1);
    expect(only.interval).toBe(8);
    expect(only.reps).toBe(1);
    expect(only.lastAt).toBe(NEW);
    expect(only.dueAt).toBe(NEW + 8 * 86400000);
    expect(only.stability).toBeCloseTo(8.2956, 4);
    expect(only.difficulty).toBeCloseTo(1, 4);
  });

  it('excludes cards rated at or before the high-water mark', () => {
    // The delta a finished session pushes: re-sending the whole map every time
    // would be the difference between a handful of rows and every card ever.
    rateCard(1, 'good', OLD);
    rateCard(2, 'good', NEW);
    expect(cardsRatedSince(OLD).map((c) => c.questionId)).toEqual([2]);
    expect(cardsRatedSince(NEW)).toEqual([]);
  });
});

describe('srs.getSyncedAt / setSyncedAt', () => {
  beforeEach(() => { resetAll(); localStorage.removeItem('rtf:srs:synced:v1'); });

  it('reads 0 for a browser that has never synced', () => {
    expect(getSyncedAt()).toBe(0);
  });

  it('round-trips a mark', () => {
    setSyncedAt(NEW);
    expect(getSyncedAt()).toBe(NEW);
  });

  it('reads 0 rather than NaN when the stored value is junk', () => {
    localStorage.setItem('rtf:srs:synced:v1', 'soon');
    expect(getSyncedAt()).toBe(0);
  });

  it('is not cleared by resetAll — the card map and the mark are separate keys', () => {
    setSyncedAt(NEW);
    resetAll();
    expect(getSyncedAt()).toBe(NEW);
  });
});
