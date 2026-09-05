// The logic behind /live, kept out of the page so it can be tested without a
// renderer: which cards a scope matches, which card gets dealt next, and the
// one draft the browser holds on to.

import { filterTopicsByPlatform } from './platform';

import type { Difficulty, LiveTask, PlatformKey, Topic } from '../types/domain.ts';

export type DifficultyScope = 'all' | Difficulty;

export interface LiveScope {
  platform: PlatformKey;
  difficulty: DifficultyScope;
}

/**
 * The cards a scope matches. A task carries a topic slug rather than a topic
 * id, so the platform taxonomy is reached through the topic list — the same
 * category → platform mapping `filterQuestionsByPlatform` uses for questions.
 */
export function filterTasks(tasks: LiveTask[], topics: Topic[], scope: LiveScope): LiveTask[] {
  let pool = tasks;
  if (scope.platform !== 'all') {
    const allowed = new Set(filterTopicsByPlatform(topics, scope.platform).map((t) => t.slug));
    pool = pool.filter((task) => allowed.has(task.topic_slug));
  }
  if (scope.difficulty !== 'all') {
    pool = pool.filter((task) => task.difficulty === scope.difficulty);
  }
  return pool;
}

/**
 * The next card. Deals at random from what has not been seen this session, and
 * only reshuffles the whole deck once every card in the pool has come up — so
 * a short pool still cycles instead of handing out the same two tasks.
 *
 * `seen` holds task slugs. Returns null for an empty pool.
 */
export function dealTask(pool: LiveTask[], seen: ReadonlySet<string>): LiveTask | null {
  if (pool.length === 0) return null;
  const unseen = pool.filter((task) => !seen.has(task.slug));
  const deck = unseen.length > 0 ? unseen : pool;
  return deck[Math.floor(Math.random() * deck.length)];
}

// ── The in-progress attempt ─────────────────────────────────────────────────
// A live task is twelve minutes of typing with no autosave anywhere else, so a
// reload eight minutes in must not cost the work. This is a NEW key: nothing
// here touches `readytoflutter_progress_v1`, `rtf:srs:v1`, `rtf:bookmarks:v1`
// or `rtf:prefs:v1`.
const DRAFT_KEY = 'rtf:live:v1';

export interface LiveDraft {
  slug: string;
  code: string;
  /** ms epoch — the clock is derived from this, not stored ticking. */
  startedAt: number;
}

export function readDraft(): LiveDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as LiveDraft;
    if (!draft || typeof draft.slug !== 'string' || typeof draft.code !== 'string') return null;
    if (typeof draft.startedAt !== 'number') return null;
    return draft;
  } catch {
    return null;
  }
}

export function writeDraft(draft: LiveDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* quota — the attempt is still on screen */
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to do */
  }
}
