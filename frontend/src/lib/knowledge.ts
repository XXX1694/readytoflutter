/**
 * Knowledge-base data layer.
 *
 * Resources live in `public/seed/resources.json` and are fetched once, cached
 * via TanStack Query elsewhere. Per-user state (saved + visited) lives in
 * localStorage — there is no backend for the knowledge base today.
 */

import type { Resource, Level } from '../types/domain';

const SAVED_KEY = 'rtf:kb:saved:v1';
const VISITED_KEY = 'rtf:kb:visited:v1';

let cachePromise: Promise<Resource[]> | null = null;

export async function loadResources(): Promise<Resource[]> {
  if (cachePromise) return cachePromise;
  const url = `${import.meta.env.BASE_URL || '/'}seed/resources.json`;
  cachePromise = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<Resource[]>;
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

export function countByCategory(resources: Resource[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of resources) {
    if (!r.category) continue;
    map[r.category] = (map[r.category] || 0) + 1;
  }
  return map;
}
