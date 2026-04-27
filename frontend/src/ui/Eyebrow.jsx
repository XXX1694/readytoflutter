import { cn } from '../lib/cn.js';

/**
 * Atlas eyebrow — small uppercase mono label with an optional dot accent.
 * Drops the numeric "01/" prefix; replaces it with a colored dot for a
 * cleaner modern feel. (Index prop kept for backwards compat — ignored.)
 */
export function Eyebrow({ index, children, className, accent = 'brand', dot = true }) {
  const DOT = {
    brand: 'bg-brand',
    mint:  'bg-mint',
    amber: 'bg-[rgb(var(--amber))]',
    ink:   'bg-ink',
    muted: 'bg-muted',
  };
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOT[accent])} aria-hidden />}
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        {children}
      </span>
    </div>
  );
}
