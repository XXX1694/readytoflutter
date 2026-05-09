/**
 * Bookmark store. A bookmark = "I want to revisit this question."
 * Stored in localStorage so it survives across sessions and works in
 * the Pages-only static fallback build.
 *
 * Shape: { [questionId]: { addedAt: number } }
 */

interface BookmarkEntry {
  addedAt: number;
}

type BookmarkMap = Record<string, BookmarkEntry>;

const KEY = 'rtf:bookmarks:v1';

function read(): BookmarkMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BookmarkMap) : {};
  } catch {
    return {};
  }
}

function write(map: BookmarkMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota — silent */
  }
  // Notify listeners in this tab (storage events only fire across tabs)
  window.dispatchEvent(new Event('rtf:bookmarks-change'));
}

export function isBookmarked(id: number | string): boolean {
  return Boolean(read()[String(id)]);
}

export function getBookmarks(): BookmarkMap {
  return read();
}

export function getBookmarkIds(): number[] {
  return Object.keys(read()).map(Number);
}

export function toggleBookmark(id: number | string): boolean {
  const key = String(id);
  const map = read();
  if (map[key]) delete map[key];
  else map[key] = { addedAt: Date.now() };
  write(map);
  return Boolean(map[key]);
}

export function clearAllBookmarks(): void {
  write({});
}

/**
 * Subscribe to bookmark changes. Returns an unsubscribe fn.
 */
export function subscribeBookmarks(cb: () => void): () => void {
  const handler = () => cb();
  const storageHandler = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener('rtf:bookmarks-change', handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener('rtf:bookmarks-change', handler);
    window.removeEventListener('storage', storageHandler);
  };
}
