/**
 * Read raw progress from localStorage (where the static-fallback API stores it)
 * and derive activity stats: per-day counts, current streak, longest streak.
 *
 * The shape stored is: { [questionId]: { status, notes, updated_at } }.
 * Only entries with a real `updated_at` count toward activity.
 */

import type { ProgressStatus } from '../types/domain';

interface ProgressRecord {
  status?: ProgressStatus;
  notes?: string | null;
  updated_at?: string;
}

export type ProgressMap = Record<string, ProgressRecord>;

export interface HeatmapCell {
  date: Date;
  key: string;
  count: number;
}

export interface StreakStats {
  current: number;
  longest: number;
  totalDays: number;
}

// Must stay byte-identical to PROGRESS_STORAGE_KEY in api/api.ts — see the
// note there on why the pre-rename name is kept.
const PROGRESS_KEY = 'readytoflutter_progress_v1';

const ymd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * 'YYYY-MM-DD' back to local midnight.
 *
 * `new Date('2026-03-15')` is specified to parse a date-only string as *UTC*
 * midnight, which is the previous day everywhere west of Greenwich. Day keys
 * here are produced from local dates by `ymd()`, so reading them back with the
 * built-in parser shifted every key by a day for those users and made the
 * longest-streak walk match nothing — "Best" rendered as 0 no matter how long
 * the user's real streak was.
 */
const fromYmd = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function readProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

/**
 * Build a map { 'YYYY-MM-DD': count } of progress events. Counts every status
 * change, not just completions, so even partial study sessions show up.
 */
export function buildDayMap(progress: ProgressMap = readProgress()): Map<string, number> {
  const map = new Map<string, number>();
  Object.values(progress).forEach((p) => {
    if (!p?.updated_at) return;
    const d = new Date(p.updated_at);
    if (Number.isNaN(d.getTime())) return;
    const key = ymd(startOfDay(d));
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

/**
 * Returns `weeks` columns × 7 rows of `{ date, key, count }`, ending today.
 *
 * Rows are seven consecutive days, NOT weekdays — the grid is not aligned to
 * week boundaries the way a contribution graph is, so row index carries no
 * meaning and the renderer must not label rows Mon/Tue/…
 */
export function buildHeatmap(
  weeks = 14,
  dayMap: Map<string, number> = buildDayMap(),
): Array<Array<HeatmapCell | null>> {
  const today = startOfDay(new Date());
  const totalDays = weeks * 7;
  // Align so the last column ends on today (Sat in last column? we just end on today)
  const start = new Date(today);
  start.setDate(today.getDate() - (totalDays - 1));

  const cols: Array<Array<HeatmapCell | null>> = [];
  for (let w = 0; w < weeks; w += 1) {
    const col: Array<HeatmapCell | null> = [];
    for (let d = 0; d < 7; d += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      if (date > today) {
        col.push(null);
        continue;
      }
      const key = ymd(date);
      col.push({ date, key, count: dayMap.get(key) || 0 });
    }
    cols.push(col);
  }
  return cols;
}

export function computeStreaks(dayMap: Map<string, number> = buildDayMap()): StreakStats {
  if (dayMap.size === 0) return { current: 0, longest: 0, totalDays: 0 };

  // Convert to sorted set of YMD keys
  const keys = [...dayMap.keys()].sort();
  const set = new Set(keys);

  // Longest streak: walk every key, count consecutive days
  let longest = 0;
  for (const k of keys) {
    // Only start from a "streak head" (no previous day in set) for efficiency
    const prev = fromYmd(k);
    prev.setDate(prev.getDate() - 1);
    if (set.has(ymd(prev))) continue;

    let len = 0;
    const cursor = fromYmd(k);
    while (set.has(ymd(cursor))) {
      len += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    if (len > longest) longest = len;
  }

  // Current streak: walk back from today until a gap
  const today = startOfDay(new Date());
  // Allow yesterday-only too — gives credit for "studied yesterday, will study today"
  const cursor = new Date(today);
  let current = 0;
  if (!set.has(ymd(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(ymd(cursor))) {
      return { current: 0, longest, totalDays: dayMap.size };
    }
  }
  while (set.has(ymd(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, longest, totalDays: dayMap.size };
}

/**
 * Convert a count to a 0..4 intensity bucket for heatmap coloring.
 */
export function intensity(count: number | null | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!count) return 0;
  if (count >= 10) return 4;
  if (count >= 6) return 3;
  if (count >= 3) return 2;
  return 1;
}
