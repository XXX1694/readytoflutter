/**
 * Knowledge-base data layer.
 *
 * Resources live in `public/seed/resources.json` and are fetched once, cached
 * via TanStack Query elsewhere. Per-user state (saved + visited) lives in
 * localStorage — there is no backend for the knowledge base today.
 */

const SAVED_KEY = 'rtf:kb:saved:v1';
const VISITED_KEY = 'rtf:kb:visited:v1';

let cachePromise = null;

export async function loadResources() {
  if (cachePromise) return cachePromise;
  const url = `${import.meta.env.BASE_URL || '/'}seed/resources.json`;
  cachePromise = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .catch((err) => {
      cachePromise = null;
      throw err;
    });
  return cachePromise;
}

function readSet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSet(key, set) {
  try { localStorage.setItem(key, JSON.stringify([...set])); }
  catch { /* quota etc. */ }
}

export function getSavedIds() { return readSet(SAVED_KEY); }
export function getVisitedIds() { return readSet(VISITED_KEY); }

export function toggleSaved(id) {
  const s = readSet(SAVED_KEY);
  if (s.has(id)) s.delete(id); else s.add(id);
  writeSet(SAVED_KEY, s);
  return s.has(id);
}

export function markVisited(id) {
  const s = readSet(VISITED_KEY);
  if (s.has(id)) return;
  s.add(id);
  writeSet(VISITED_KEY, s);
}

/**
 * Apply the current filter state to a list of resources.
 * Empty/`'all'` filters are no-ops.
 */
export function filterResources(resources, { category, level, lang, free, query }) {
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

export function countByCategory(resources) {
  const map = {};
  for (const r of resources) {
    map[r.category] = (map[r.category] || 0) + 1;
  }
  return map;
}
