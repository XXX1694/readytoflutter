import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCardState,
  rateCard,
  resetCard,
  resetAll,
  pickDueQueue,
  getSrsSummary,
  getDueSnapshot,
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
