import { cn } from '../lib/cn.js';

const TONES = {
  brand: 'bg-brand',
  mint: 'bg-mint',
  amber: 'bg-[rgb(var(--amber))]',
  ink: 'bg-ink',
  gradient: 'bg-codex-gradient',
};

const SIZES = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-2.5',
};

export function ProgressBar({
  value = 0,
  max = 100,
  tone = 'gradient',
  size = 'sm',
  showLabel = false,
  className,
  trackClassName,
  label,
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div className={cn('w-full', className)}>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn(
          'w-full overflow-hidden rounded-full bg-rule/60',
          SIZES[size],
          trackClassName,
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700 ease-out',
            TONES[tone],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 font-mono text-[11px] text-muted">{pct}%</div>
      )}
    </div>
  );
}
