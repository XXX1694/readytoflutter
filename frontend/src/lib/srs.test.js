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
} from './srs';

describe('srs.getCardState', () => {
  it('returns a fresh card state when nothing is stored', () => {
    const s = getCardState(1);
    expect(s).toEqual({ ease: 2.5, interval: 0, reps: 0, dueAt: 0, lastAt: 0 });
  });
});

describe('srs.rateCard — SM-2 progression', () => {
  it('first "good" review schedules ~1 day out', () => {
    const now = Date.UTC(2026, 0, 1);
    const s = rateCard(42, 'good', now);
    expect(s.reps).toBe(1);
    expect(s.interval).toBe(1);
    // 1 day in ms
    expect(s.dueAt).toBe(now + 24 * 60 * 60 * 1000);
  });

  it('first "easy" review jumps to a 3-day interval', () => {
    const now = Date.UTC(2026, 0, 1);
    const s = rateCard(42, 'easy', now);
    expect(s.reps).toBe(1);
    expect(s.interval).toBe(3);
  });

  it('"again" resets reps and shrinks the next interval', () => {
    const now = Date.UTC(2026, 0, 1);
    rateCard(42, 'good', now);
    rateCard(42, 'good', now);
    const after = rateCard(42, 'again', now);
    expect(after.reps).toBe(0);
    expect(after.interval).toBe(1);
    // Ease must never drop below 1.3
    expect(after.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('ease never drops below 1.3 after many "again"s', () => {
    const id = 7;
    for (let i = 0; i < 20; i += 1) rateCard(id, 'again');
    const s = getCardState(id);
    expect(s.ease).toBeGreaterThanOrEqual(1.3);
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
    rateCard(1, 'good', now - 3 * 24 * 60 * 60 * 1000); // due 2 days ago
    rateCard(2, 'good', now - 25 * 60 * 60 * 1000);     // due an hour ago
    rateCard(3, 'good', now);                            // due tomorrow
    expect(getDueSnapshot(now).dueCount).toBe(2);
  });

  it('nextDueAt is the earliest card still in the future', () => {
    const now = Date.UTC(2026, 2, 10);
    const day = 24 * 60 * 60 * 1000;
    rateCard(1, 'easy', now); // +3 days
    rateCard(2, 'good', now); // +1 day  ← the earliest
    const snap = getDueSnapshot(now);
    expect(snap.dueCount).toBe(0);
    expect(snap.nextDueAt).toBe(now + day);
  });

  it('nextDueAt is null when everything is already due', () => {
    const now = Date.UTC(2026, 2, 10);
    rateCard(1, 'good', now - 5 * 24 * 60 * 60 * 1000);
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
    expect(previewInterval(7, 'again')).toBe(1);
    expect(previewInterval(7, 'hard')).toBe(1);
    expect(previewInterval(7, 'good')).toBe(1);
    expect(previewInterval(7, 'easy')).toBe(3);
    // Reading a preview must not create or mutate a stored card.
    expect(readAll()).toEqual({});
  });

  it('reflects a matured card (reps 1 → good is 6 days)', () => {
    const now = Date.UTC(2026, 0, 1);
    rateCard(7, 'good', now);
    expect(previewInterval(7, 'good')).toBe(6);
    expect(previewInterval(7, 'easy')).toBe(7);
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
    // A card object missing `ease` used to compute Math.max(1.3, undefined+delta)
    // → NaN, which JSON.stringify writes back as null.
    localStorage.setItem('rtf:srs:v1', JSON.stringify({ 5: {} }));
    const now = Date.UTC(2026, 0, 1);
    const next = rateCard(5, 'good', now);
    expect(Number.isFinite(next.ease)).toBe(true);
    expect(next.ease).toBe(2.5);
    expect(next.interval).toBe(1);
    expect(next.reps).toBe(1);
    expect(next.dueAt).toBe(now + 24 * 60 * 60 * 1000);
    const stored = JSON.parse(localStorage.getItem('rtf:srs:v1'))['5'];
    for (const v of Object.values(stored)) expect(v).not.toBeNull();
  });
});
