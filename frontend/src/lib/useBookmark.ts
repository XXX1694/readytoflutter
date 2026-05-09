import { useEffect, useState } from 'react';
import { isBookmarked, toggleBookmark, subscribeBookmarks, getBookmarkIds } from './bookmarks';

export function useBookmark(id: number | string): [boolean, () => boolean] {
  const [marked, setMarked] = useState<boolean>(() => isBookmarked(id));
  useEffect(() => {
    const unsub = subscribeBookmarks(() => setMarked(isBookmarked(id)));
    return unsub;
  }, [id]);
  return [marked, () => toggleBookmark(id)];
}

export function useBookmarkIds(): number[] {
  const [ids, setIds] = useState<number[]>(() => getBookmarkIds());
  useEffect(() => {
    const unsub = subscribeBookmarks(() => setIds(getBookmarkIds()));
    return unsub;
  }, []);
  return ids;
}
