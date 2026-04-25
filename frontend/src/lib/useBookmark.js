import { useEffect, useState } from 'react';
import { isBookmarked, toggleBookmark, subscribeBookmarks, getBookmarkIds } from './bookmarks.js';

export function useBookmark(id) {
  const [marked, setMarked] = useState(() => isBookmarked(id));
  useEffect(() => {
    const unsub = subscribeBookmarks(() => setMarked(isBookmarked(id)));
    return unsub;
  }, [id]);
  return [marked, () => toggleBookmark(id)];
}

export function useBookmarkIds() {
  const [ids, setIds] = useState(() => getBookmarkIds());
  useEffect(() => {
    const unsub = subscribeBookmarks(() => setIds(getBookmarkIds()));
    return unsub;
  }, []);
  return ids;
}
