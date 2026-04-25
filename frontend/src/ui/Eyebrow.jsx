import { cn } from '../lib/cn.js';

/**
 * Editorial eyebrow label, e.g. "01 / Junior" — places a numeric prefix in
 * monospace before a small caps tracker.
 */
export function Eyebrow({ index, children, className, accent = 'brand' }) {
  const ACCENT = {
    brand: 'text-brand',
    mint: 'text-mint',
    amber: 'text-[rgb(var(--amber))]',
    ink: 'text-ink',
    muted: 'text-muted',
  };
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {index != null && (
        <span className={cn('font-mono text-[11px] tabular-nums', ACCENT[accent])}>
          {String(index).padStart(2, '0')}
        </span>
      )}
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        {children}
      </span>
    </div>
  );
}
