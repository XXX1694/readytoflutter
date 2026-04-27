import * as Dialog from '@radix-ui/react-dialog';
import { X, ExternalLink } from 'lucide-react';
import { resolvePlayable, buildEmbedUrl } from '../lib/youtube.js';
import { Pill } from '../ui/index.js';
import { cn } from '../lib/cn.js';

/**
 * In-app YouTube player. Opens a modal with a privacy-enhanced iframe so the
 * user doesn't get pulled out of the app to youtube.com.
 *
 * Closing unmounts the iframe — that's how we stop playback. The caller
 * (KnowledgePage) is responsible for marking the resource as recently
 * watched so we don't double-write to localStorage.
 */
export default function VideoPlayer({ resource, isRu, onOpenChange }) {
  const open = Boolean(resource);
  const playable = resource ? resolvePlayable(resource) : null;
  const embed = playable ? buildEmbedUrl(playable, { autoplay: true }) : null;

  if (!resource) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange} />
    );
  }

  const title = isRu ? (resource.title_ru || resource.title_en) : resource.title_en;
  const desc  = isRu ? (resource.description_ru || resource.description_en) : resource.description_en;
  const isPlaylist = !playable?.videoId && playable?.playlistId;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[min(92vw,1100px)] -translate-x-1/2 -translate-y-1/2',
            'rounded-md border border-rule/15 bg-paper-2 shadow-codex-lg',
            'data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0',
          )}
        >
          {/* Header */}
          <div className="flex items-start gap-3 border-b border-rule/15 px-4 py-3">
            <div className="min-w-0 flex-1">
              <Dialog.Title asChild>
                <h2 className="truncate font-display text-base font-medium text-ink sm:text-lg">
                  {title}
                </h2>
              </Dialog.Title>
              <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-2">
                {resource.source && <span className="truncate">{resource.source}</span>}
                {isPlaylist && <Pill tone="brand" size="xs">{isRu ? 'Плейлист' : 'Playlist'}</Pill>}
                {!isPlaylist && playable?.videoId && (
                  <Pill tone="ghost" size="xs">{isRu ? 'Видео' : 'Video'}</Pill>
                )}
                {resource.duration && <span>· {resource.duration}</span>}
              </div>
            </div>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-rule/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:border-rule/15 hover:text-ink"
              aria-label={isRu ? 'Открыть на YouTube' : 'Open on YouTube'}
            >
              <ExternalLink className="h-3 w-3" /> YouTube
            </a>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={isRu ? 'Закрыть' : 'Close'}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-rule/15 text-muted hover:border-rule/15 hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Player */}
          <div className="bg-ink">
            {embed ? (
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  key={embed}
                  src={embed}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-sm text-muted">
                {isRu
                  ? 'Не получилось разобрать ссылку на YouTube — открой во внешней вкладке.'
                  : 'Could not parse the YouTube link — open in a new tab instead.'}
              </div>
            )}
          </div>

          {/* Footer */}
          {desc && (
            <div className="border-t border-rule/15 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
              {desc}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
