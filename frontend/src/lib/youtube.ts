/**
 * Tiny YouTube helpers — URL parsing, embed building, thumbnail building,
 * "recently watched" persistence. Pure browser-side; no API key, no network.
 */

import type { Resource } from '../types/domain';

export interface ParsedYoutubeUrl {
  videoId: string | null;
  playlistId: string | null;
}

const VIDEO_PATTERNS: RegExp[] = [
  // youtu.be/<id>
  /youtu\.be\/([\w-]{6,})/,
  // youtube.com/watch?v=<id>
  /[?&]v=([\w-]{6,})/,
  // youtube.com/embed/<id>
  /youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/,
  // youtube.com/shorts/<id>
  /youtube\.com\/shorts\/([\w-]{6,})/,
];

const PLAYLIST_PATTERNS: RegExp[] = [
  /[?&]list=([\w-]{10,})/,
  /playlist\?list=([\w-]{10,})/,
];

export function parseYoutubeUrl(input: string | null | undefined): ParsedYoutubeUrl | null {
  if (!input || typeof input !== 'string') return null;
  const url = input.trim();

  let videoId: string | null = null;
  let playlistId: string | null = null;

  for (const re of VIDEO_PATTERNS) {
    const m = url.match(re);
    if (m) { videoId = m[1]; break; }
  }
  for (const re of PLAYLIST_PATTERNS) {
    const m = url.match(re);
    if (m) { playlistId = m[1]; break; }
  }

  if (!videoId && !playlistId) return null;
  return { videoId, playlistId };
}

/**
 * Resolve the canonical playable identifier for a resource. Caller wins —
 * explicit `video_id` / `playlist_id` on the resource override any URL parse.
 */
export function resolvePlayable(resource: Resource | null | undefined): ParsedYoutubeUrl | null {
  if (!resource) return null;
  if (resource.video_id) return { videoId: resource.video_id, playlistId: resource.playlist_id || null };
  if (resource.playlist_id) return { videoId: null, playlistId: resource.playlist_id };
  return parseYoutubeUrl(resource.url);
}

/**
 * What to point the thumbnail at. YouTube has no public thumbnail for a
 * playlist itself — so playlist resources must carry a `cover_video_id` from
 * the data file (typically the first video in the list).
 */
export function resolveCoverVideoId(resource: Resource | null | undefined): string | null {
  if (!resource) return null;
  if (resource.cover_video_id) return resource.cover_video_id;
  if (resource.video_id) return resource.video_id;
  const parsed = parseYoutubeUrl(resource.url);
  return parsed?.videoId || null;
}

/**
 * Build a privacy-enhanced embed URL. autoplay defaults true since the user
 * just clicked Play.
 */
export function buildEmbedUrl(
  { videoId, playlistId }: ParsedYoutubeUrl,
  { autoplay = true }: { autoplay?: boolean } = {},
): string | null {
  const params = new URLSearchParams();
  if (autoplay) params.set('autoplay', '1');
  params.set('rel', '0');
  params.set('modestbranding', '1');
  params.set('playsinline', '1');

  if (videoId && playlistId) {
    params.set('list', playlistId);
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
  }
  if (videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
  }
  if (playlistId) {
    params.set('listType', 'playlist');
    params.set('list', playlistId);
    return `https://www.youtube-nocookie.com/embed/videoseries?${params}`;
  }
  return null;
}

export type ThumbnailQuality = 'max' | 'sd' | 'hq' | 'mq';

/**
 * Best public thumbnail URL. `maxres` is highest-quality but missing for older
 * uploads — `hqdefault` is the safest fallback.
 */
export function thumbnailUrl(
  { videoId }: ParsedYoutubeUrl,
  quality: ThumbnailQuality = 'hq',
): string | null {
  const id = videoId || null; // playlists have no thumbnail without API
  if (!id) return null;
  const map: Record<ThumbnailQuality, string> = {
    max: 'maxresdefault',
    sd:  'sddefault',
    hq:  'hqdefault',
    mq:  'mqdefault',
  };
  return `https://i.ytimg.com/vi/${id}/${map[quality] || 'hqdefault'}.jpg`;
}

/* ---------------- recently watched ---------------- */

const RECENT_KEY = 'rtf:kb:recent:v1';
const RECENT_LIMIT = 10;

export function getRecentlyWatched(): Array<number | string> {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function pushRecentlyWatched(resourceId: number | string | null | undefined): void {
  if (resourceId == null) return;
  try {
    const cur = getRecentlyWatched().filter((id) => id !== resourceId);
    cur.unshift(resourceId);
    const trimmed = cur.slice(0, RECENT_LIMIT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota etc. */
  }
}

export function clearRecentlyWatched(): void {
  try { localStorage.removeItem(RECENT_KEY); }
  catch { /* noop */ }
}
