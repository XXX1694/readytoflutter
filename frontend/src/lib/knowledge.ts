/**
 * Knowledge-base data layer.
 *
 * Resources live in `public/seed/resources.json` and are fetched once, cached
 * via TanStack Query elsewhere. Per-user state (saved + visited) lives in
 * localStorage — there is no backend for the knowledge base today.
 */

import type { Resource, Level, Topic } from '../types/domain';
import { topicPlatform } from './platform';

const SAVED_KEY = 'rtf:kb:saved:v1';
const VISITED_KEY = 'rtf:kb:visited:v1';

export interface ResourceCatalog {
  // Categories carry localized title/label/subtitle pairs that the
  // KnowledgePage renders directly from JSON; widening to `any` keeps the
  // door open for future fields without rewriting every site that reads
  // a category.
  categories: Array<Record<string, any>>;
  resources: Resource[];
}

let cachePromise: Promise<ResourceCatalog> | null = null;

export async function loadResources(): Promise<ResourceCatalog> {
  if (cachePromise) return cachePromise;
  const url = `${import.meta.env.BASE_URL || '/'}seed/resources.json`;
  cachePromise = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<ResourceCatalog>;
    })
    .catch((err) => {
      cachePromise = null;
      throw err;
    });
  return cachePromise;
}

function readSet(key: string): Set<number | string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<number | string>): void {
  try { localStorage.setItem(key, JSON.stringify([...set])); }
  catch { /* quota etc. */ }
}

export function getSavedIds(): Set<number | string> { return readSet(SAVED_KEY); }
export function getVisitedIds(): Set<number | string> { return readSet(VISITED_KEY); }

export function toggleSaved(id: number | string): boolean {
  const s = readSet(SAVED_KEY);
  if (s.has(id)) s.delete(id); else s.add(id);
  writeSet(SAVED_KEY, s);
  return s.has(id);
}

export function markVisited(id: number | string): void {
  const s = readSet(VISITED_KEY);
  if (s.has(id)) return;
  s.add(id);
  writeSet(VISITED_KEY, s);
}

export interface ResourceFilters {
  category?: string | null;
  level?: Level | 'all' | null;
  lang?: string | null;
  free?: boolean;
  query?: string;
}

/**
 * Apply the current filter state to a list of resources.
 * Empty/`'all'` filters are no-ops.
 */
export function filterResources(resources: Resource[], { category, level, lang, free, query }: ResourceFilters): Resource[] {
  const q = (query || '').trim().toLowerCase();
  return resources.filter((r) => {
    if (category && category !== 'all' && r.category !== category) return false;
    if (level && level !== 'all' && r.level !== level) return false;
    if (lang && lang !== 'all' && r.lang !== lang) return false;
    if (free === true && r.free === false) return false;
    if (q) {
      const hay = [
        r.title_en, r.title_ru, r.description_en, r.description_ru,
        r.source, r.category, ...(r.topics || []),
      ].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/* ── Per-topic reading list ─────────────────────────────────────────────── */

// Words that carry no topic meaning; without them "State Management" and
// "Testing and Quality" would both match every resource tagged "and".
const STOPWORDS = new Set(['and', 'the', 'for', 'with', 'in', 'of', 'to', 'a', 'an']);

const TAG_MATCH = 3;
/** One word of a multi-word tag lines up — "networking" inside "networking-json". */
const TAG_PARTIAL = 1;
/** Same stack. Weighted above a single tag so a Flutter topic prefers Flutter reading. */
const PLATFORM_MATCH = 4;
/** 'mobile' and 'cross' resources are about every stack, so they count for all of them. */
const PLATFORM_WIDE = 1;
const OFFICIAL = 1;

/** `word` plus its other grammatical number, so "widget" finds the "widgets" tag. */
function numberVariants(word: string): string[] {
  if (word.endsWith('ies') && word.length > 4) return [word, `${word.slice(0, -3)}y`];
  if (word.endsWith('s') && word.length > 3) return [word, word.slice(0, -1)];
  return [word, `${word}s`];
}

function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/** Everything a topic's slug, title and category say about what it is about. */
function topicTokens(topic: Pick<Topic, 'slug' | 'title' | 'category'>): Set<string> {
  const out = new Set<string>();
  for (const word of words(`${topic.slug} ${topic.title} ${topic.category}`)) {
    for (const v of numberVariants(word)) out.add(v);
  }
  return out;
}

/** How strongly one free-form resource tag speaks to a topic's vocabulary. */
function tagScore(tag: string, tokens: Set<string>): number {
  const parts = words(tag);
  if (!parts.length) return 0;
  // A single-word tag, or a hyphenated one whose every word lands
  // ("state-management" against the state-management topic), is a full hit.
  const hits = parts.filter((p) => numberVariants(p).some((v) => tokens.has(v))).length;
  if (hits === parts.length) return TAG_MATCH;
  return hits > 0 ? TAG_PARTIAL : 0;
}

/**
 * The two or three things worth reading next about one topic, picked out of
 * the knowledge base by tag overlap, stack and whether the vendor wrote it.
 *
 * A shared tag is what makes a resource *about* a topic, so a resource with
 * none is never returned — a topic nothing was written for shows no Sources
 * block at all rather than three arbitrary links.
 */
export function resourcesForTopic(resources: Resource[], topic: Topic, limit = 3): Resource[] {
  if (limit <= 0) return [];
  const tokens = topicTokens(topic);
  const platform = topicPlatform(topic);

  const scored = resources
    .map((resource, index) => {
      let score = 0;
      for (const tag of resource.topics || []) score += tagScore(tag, tokens);
      if (score === 0) return null;
      if (resource.platform && resource.platform === platform) score += PLATFORM_MATCH;
      else if (resource.platform === 'mobile' || resource.platform === 'cross') score += PLATFORM_WIDE;
      if (resource.official) score += OFFICIAL;
      return { resource, score, index };
    })
    .filter((s): s is { resource: Resource; score: number; index: number } => s !== null);

  scored.sort((a, b) =>
    b.score - a.score
    || Number(Boolean(b.resource.official)) - Number(Boolean(a.resource.official))
    || a.index - b.index);

  return scored.slice(0, limit).map((s) => s.resource);
}

export function countByCategory(resources: Resource[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of resources) {
    if (!r.category) continue;
    map[r.category] = (map[r.category] || 0) + 1;
  }
  return map;
}
