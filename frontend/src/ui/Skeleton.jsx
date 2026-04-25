import { cn } from '../lib/cn.js';

/**
 * Skeleton primitive — a soft pulsing block. Used to shape-prefill content
 * while data is loading, so the page doesn't pop from blank/spinner to full.
 *
 * Pass any size via className. Defaults to `h-4 w-full` so it slots into
 * inline contexts without props.
 */
export function Skeleton({ className, ...rest }) {
  return (
    <div
      role="presentation"
      aria-hidden
      className={cn(
        'animate-pulse rounded-sm bg-rule-strong/30 dark:bg-rule-strong/45',
        'h-4 w-full',
        className,
      )}
      {...rest}
    />
  );
}

/**
 * Codex-styled skeleton card — same brutalist border + offset shadow as the
 * real cards, so the layout doesn't shift when content loads in.
 */
export function SkeletonCard({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        'rounded-md border-1.5 border-ink/30 bg-paper-2/80 p-4 shadow-codex-sm',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
