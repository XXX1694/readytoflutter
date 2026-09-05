/**
 * Cross-device sync for the SM-2 schedule.
 *
 * `lib/srs.ts` keeps the working copy in localStorage and every reader there is
 * synchronous — the plan, the stats page, the tab badge and the push snapshot
 * all call into it during render. That does not change: the server copy is a
 * merge point between one account's browsers, not a source of truth. Without
 * it, signing in on a phone inherits the account's progress but none of its
 * schedule, and every card the user has spent months spacing out comes back on
 * day one.
 *
 * Both directions merge on `lastAt`, the moment a card was rated, so the two
 * copies converge whichever side syncs first and neither can revert the other.
 *
 * Every function here self-guards on signed-out and swallows a transport
 * failure: a stale account copy is caught by the next boot or `online` event,
 * and none of this is worth a toast in front of someone who is studying.
 */
import { bulkSyncSrsCards, getSrsCards } from '../api/api';
import { cardsRatedSince, getSyncedAt, mergeCards, setSyncedAt } from './srs';
import { useAuth } from '../store/auth';

import type { SrsCard } from '../types/domain';

/** Send `cards` and move the high-water mark to the newest rating in them. */
async function push(cards: SrsCard[]): Promise<void> {
  if (cards.length === 0) return;
  await bulkSyncSrsCards(cards);
  // The mark is the newest `lastAt` actually sent, not `Date.now()`: a card
  // rated while the request was in flight has to stay in the next delta.
  setSyncedAt(cards.reduce((max, c) => (c.lastAt > max ? c.lastAt : max), 0));
}

/**
 * Two-way: pull the account's schedule, fold it in, then push what this
 * browser holds. Returns how many local cards the pull changed — the caller
 * uses it to decide whether anything on screen needs recomputing. Runs on
 * boot, on `online`, and right after a sign-in.
 */
export async function syncSrs(): Promise<number> {
  if (!useAuth.getState().token) return 0;
  try {
    const merged = mergeCards(await getSrsCards());
    // After the merge the local map is the union of both copies, so pushing it
    // whole is what makes the account complete. The server skips every row it
    // already holds a newer rating for.
    await push(cardsRatedSince(0));
    return merged;
  } catch {
    return 0;
  }
}

/**
 * One-way delta: the cards rated since the last successful push. Called when a
 * session ends, which is when the schedule has just moved and when the user is
 * most likely to close the tab and pick up another device.
 */
export async function pushSrs(): Promise<void> {
  if (!useAuth.getState().token) return;
  try {
    await push(cardsRatedSince(getSyncedAt()));
  } catch {
    /* the next session or boot carries the same cards — the mark did not move */
  }
}
