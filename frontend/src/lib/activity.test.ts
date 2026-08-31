import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildDayMap, computeStreaks, intensity } from './activity';
import type { ProgressMap } from './activity';

// Day keys are produced from *local* dates. Anything that reads them back with
// `new Date('YYYY-MM-DD')` gets UTC midnight instead, which is the previous day
// for every negative UTC offset — so these run under a US timezone, where the
// bug this file guards against actually reproduces.
const TZ = 'America/New_York';
let originalTz: string | undefined;

beforeAll(() => {
  originalTz = process.env.TZ;
  process.env.TZ = TZ;
});
afterAll(() => {
  process.env.TZ = originalTz;
});

/** Local-midnight ISO string for `daysAgo` days before today. */
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0); // midday, so a DST shift can't tip it into another day
  return d.toISOString();
};

const progressOn = (offsets: number[]): ProgressMap =>
  Object.fromEntries(
    offsets.map((n, i) => [String(i + 1), { status: 'completed', updated_at: daysAgo(n) }]),
  ) as ProgressMap;

describe('computeStreaks', () => {
  it('reports the longest run of consecutive days', () => {
    const streaks = computeStreaks(buildDayMap(progressOn([10, 9, 8, 6])));
    expect(streaks.longest).toBe(3);
  });

  it('counts a single isolated study day as a streak of one', () => {
    // Regression, and the reason `fromYmd` exists. Day keys are built from
    // local dates; `new Date('YYYY-MM-DD')` reads them back as UTC midnight,
    // which is the day before for every negative UTC offset. The shift hit
    // head-detection and the forward walk by different amounts, so a run of
    // exactly one day was never counted and a user who had only ever studied
    // on non-consecutive days saw "Best: 0 days".
    const streaks = computeStreaks(buildDayMap(progressOn([12, 9, 5])));
    expect(streaks.longest).toBe(1);
  });

  it('counts today and the days before it as the current streak', () => {
    const streaks = computeStreaks(buildDayMap(progressOn([0, 1, 2])));
    expect(streaks.current).toBe(3);
  });

  it('keeps the streak alive on a day the user has not studied yet', () => {
    // Studied yesterday, has not opened the app today: the streak is still on.
    const streaks = computeStreaks(buildDayMap(progressOn([1, 2])));
    expect(streaks.current).toBe(2);
  });

  it('breaks the current streak once a whole day is missed', () => {
    const streaks = computeStreaks(buildDayMap(progressOn([2, 3, 4])));
    expect(streaks.current).toBe(0);
    expect(streaks.longest).toBe(3);
  });

  it('counts distinct study days, not events', () => {
    const map = buildDayMap(progressOn([0, 0, 0, 5]));
    expect(computeStreaks(map).totalDays).toBe(2);
  });

  it('returns zeroes for a user with no history', () => {
    expect(computeStreaks(buildDayMap({}))).toEqual({ current: 0, longest: 0, totalDays: 0 });
  });
});

describe('buildDayMap', () => {
  it('ignores entries with a missing or unparseable timestamp', () => {
    const map = buildDayMap({
      '1': { status: 'completed', updated_at: daysAgo(0) },
      '2': { status: 'completed', updated_at: 'not a date' },
      '3': { status: 'completed' },
    } as unknown as ProgressMap);
    expect(map.size).toBe(1);
  });
});

describe('intensity', () => {
  it('buckets a day count into the five heatmap levels', () => {
    expect([0, 1, 2, 5, 6, 9, 10, 40].map(intensity)).toEqual([0, 1, 1, 2, 3, 3, 4, 4]);
  });

  it('treats no data and zero the same', () => {
    expect(intensity(null)).toBe(0);
    expect(intensity(undefined)).toBe(0);
  });
});
