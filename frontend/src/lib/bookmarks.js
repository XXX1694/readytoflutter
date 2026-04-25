/**
 * Bookmark store. A bookmark = "I want to revisit this question."
 * Stored in localStorage so it survives across sessions and works in
 * the Pages-only static fallback build.
 *
 * Shape: { [questionId]: { addedAt: number } }
 */

const KEY = 'rtf:bookmarks:v1';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota — silent */
  }
  // Notify listeners in this tab (storage events only fire across tabs)
  window.dispatchEvent(new Event('rtf:bookmarks-change'));
}

export function isBookmarked(id) {
  return Boolean(read()[id]);
}

export function getBookmarks() {
  return read();
}

export function getBookmarkIds() {
  return Object.keys(read()).map(Number);
}

export function toggleBookmark(id) {
  const map = read();
  if (map[id]) delete map[id];
  else map[id] = { addedAt: Date.now() };
  write(map);
  return Boolean(map[id]);
}

export function clearAllBookmarks() {
  write({});
}

/**
 * Subscribe to bookmark changes. Returns an unsubscribe fn.
 */
export function subscribeBookmarks(cb) {
  const handler = () => cb();
  window.addEventListener('rtf:bookmarks-change', handler);
  window.addEventListener('storage', (e) => { if (e.key === KEY) cb(); });
  return () => {
    window.removeEventListener('rtf:bookmarks-change', handler);
  };
}
