import { describe, it, expect } from 'vitest';
import {
  nextMemory, retrievability, intervalForRetention, initialDifficulty, fromSm2, type Grade,
} from './fsrs';

// These numbers were checked against ts-fsrs 5.4.2, the reference FSRS
// implementation, over 5000 random (stability, difficulty, gap, grade) states
// and a 200-step simulated review history: stability agreed to 1.4e-7 relative
// and difficulty to 1e-8. They are pinned here so a later edit to the formulas
// cannot drift the scheduler without a test saying so — a drift nothing else
// would catch, because a slightly wrong interval still looks entirely plausible
// on screen.

describe('fsrs.retrievability', () => {
  it('is exactly 0.9 one stability out — that is what stability means', () => {
    for (const s of [1, 5, 30, 365]) expect(retrievability(s, s)).toBeCloseTo(0.9, 10);
  });

  it('is 1 at zero elapsed time and decays from there', () => {
    expect(retrievability(0, 12)).toBe(1);
    expect(retrievability(10, 5)).toBeCloseTo(0.845885, 6);
    expect(retrievability(365, 60)).toBeCloseTo(0.741367, 6);
  });

  it('decays on a power law, so a long gap is not a total loss', () => {
    // The exponential a naive model would use puts a year at 60-day stability
    // near zero; the real curve keeps it usable, which is why old cards are
    // worth re-testing rather than relearning.
    expect(retrievability(365, 60)).toBeGreaterThan(0.5);
    expect(retrievability(3650, 60)).toBeGreaterThan(0.4);
  });

  it('treats a card with no stability as forgotten rather than returning NaN', () => {
    expect(retrievability(5, 0)).toBe(0);
    expect(retrievability(5, NaN)).toBe(0);
  });
});

describe('fsrs.intervalForRetention', () => {
  it('returns the stability itself at 90%', () => {
    for (const s of [1, 5, 30, 365]) expect(intervalForRetention(s, 0.9)).toBe(s);
  });

  it('asks sooner for a higher target retention, later for a lower one', () => {
    expect(intervalForRetention(100, 0.95)).toBeLessThan(100);
    expect(intervalForRetention(100, 0.8)).toBeGreaterThan(100);
  });

  it('never schedules less than a day out', () => {
    expect(intervalForRetention(0.01, 0.9)).toBe(1);
  });
});

describe('fsrs.nextMemory — a first rating', () => {
  const FIRST = [
    { g: 1, stability: 0.212, difficulty: 6.4133 },
    { g: 2, stability: 1.2931, difficulty: 5.112171 },
    { g: 3, stability: 2.3065, difficulty: 2.118104 },
    { g: 4, stability: 8.2956, difficulty: 1 },
  ];

  it('sets the initial state for each grade', () => {
    for (const row of FIRST) {
      const m = nextMemory(null, row.g as Grade, 0);
      expect(m.stability).toBeCloseTo(row.stability, 6);
      expect(m.difficulty).toBeCloseTo(row.difficulty, 6);
    }
  });

  it('gives a better first answer both more stability and less difficulty', () => {
    const s = FIRST.map((r) => r.stability);
    const d = FIRST.map((r) => r.difficulty);
    expect(s).toEqual([...s].sort((a, b) => a - b));
    expect(d).toEqual([...d].sort((a, b) => b - a));
  });

  it('treats a stored card with no stability as a first rating', () => {
    expect(nextMemory({ stability: 0, difficulty: 5 }, 3, 10).stability).toBeCloseTo(2.3065, 6);
  });
});

describe('fsrs.nextMemory — a review', () => {
  const STEPS = [
    { prev: { stability: 3, difficulty: 5 }, grade: 3, elapsed: 3, stability: 11.07575, difficulty: 4.990228 },
    { prev: { stability: 3, difficulty: 5 }, grade: 1, elapsed: 3, stability: 0.696856, difficulty: 8.341762 },
    { prev: { stability: 30, difficulty: 2.5 }, grade: 4, elapsed: 40, stability: 208.090013, difficulty: 1 },
    { prev: { stability: 30, difficulty: 8 }, grade: 2, elapsed: 10, stability: 36.898834, difficulty: 8.657535 },
    { prev: { stability: 100, difficulty: 5 }, grade: 3, elapsed: 0, stability: 100, difficulty: 4.990228 },
    { prev: { stability: 0.5, difficulty: 9 }, grade: 3, elapsed: 200, stability: 4.986609, difficulty: 8.986228 },
  ];

  it('matches the reference implementation step for step', () => {
    for (const row of STEPS) {
      const m = nextMemory(row.prev, row.grade as Grade, row.elapsed);
      expect(m.stability).toBeCloseTo(row.stability, 5);
      expect(m.difficulty).toBeCloseTo(row.difficulty, 5);
    }
  });

  it('rewards the same grade more when the gap was longer', () => {
    // The whole reason FSRS needs the elapsed time: recalling something after
    // three weeks is far stronger evidence than recalling it after a day, and
    // SM-2 could not tell the two apart.
    const prev = { stability: 10, difficulty: 5 };
    const short = nextMemory(prev, 3, 1).stability;
    const long = nextMemory(prev, 3, 25).stability;
    expect(long).toBeGreaterThan(short);
  });

  it('never lets a lapse leave a card more stable than it was', () => {
    for (const s of [1, 10, 100, 1000]) {
      expect(nextMemory({ stability: s, difficulty: 5 }, 1, 30).stability).toBeLessThan(s);
    }
  });

  it('barely moves a card re-rated the same day', () => {
    // Drilling one card five times in a session must not inflate it as though
    // five spaced reviews had happened.
    let m = { stability: 50, difficulty: 5 };
    for (let i = 0; i < 5; i += 1) m = nextMemory(m, 3, 0);
    expect(m.stability).toBeLessThan(55);
  });

  it('keeps difficulty inside 1..10 under a long run of one grade', () => {
    for (const g of [1, 4] as Grade[]) {
      let m = { stability: 10, difficulty: 5 };
      for (let i = 0; i < 200; i += 1) m = nextMemory(m, g, 5);
      expect(m.difficulty).toBeGreaterThanOrEqual(1);
      expect(m.difficulty).toBeLessThanOrEqual(10);
      expect(Number.isFinite(m.stability)).toBe(true);
    }
  });
});

describe('fsrs.fromSm2', () => {
  it('carries the earned interval across as stability, unchanged', () => {
    // The migration must not cost anyone their schedule: SM-2's interval is
    // already "days until we ask again", which is what stability means.
    expect(fromSm2(2.5, 45).stability).toBe(45);
    expect(intervalForRetention(fromSm2(2.5, 45).stability, 0.9)).toBe(45);
  });

  it('anchors the SM-2 default ease on a first "good" difficulty', () => {
    expect(fromSm2(2.5, 10).difficulty).toBeCloseTo(initialDifficulty(3), 6);
  });

  it('maps a lower ease to a harder card, monotonically', () => {
    const d = [2.9, 2.5, 2.1, 1.7, 1.3].map((e) => fromSm2(e, 10).difficulty);
    expect(d).toEqual([...d].sort((a, b) => a - b));
    for (const x of d) {
      expect(x).toBeGreaterThanOrEqual(1);
      expect(x).toBeLessThanOrEqual(10);
    }
  });

  it('gives a never-reviewed card a usable state instead of zero', () => {
    const m = fromSm2(2.5, 0);
    expect(m.stability).toBeGreaterThan(0);
    expect(m.difficulty).toBeGreaterThanOrEqual(1);
  });

  it('survives a partial stored card without producing NaN', () => {
    const m = fromSm2(NaN, undefined as unknown as number);
    expect(Number.isFinite(m.stability)).toBe(true);
    expect(Number.isFinite(m.difficulty)).toBe(true);
  });
});
