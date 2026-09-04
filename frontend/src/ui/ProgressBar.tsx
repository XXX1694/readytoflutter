import { cn } from '../lib/cn';

// Progress is drawn in the stack's colour; mint and amber are for a finished
// or a partial measure.
const TONES = {
  brand: 'bg-brand',
  mint:  'bg-mint',
  amber: 'bg-[rgb(var(--amber))]',
} as const;

const SIZES = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-2.5',
} as const;

export interface ProgressBarProps {
  value?: number;
  max?: number;
  tone?: keyof typeof TONES;
  size?: keyof typeof SIZES;
  showLabel?: boolean;
  className?: string;
  trackClassName?: string;
  label?: string;
}

export function ProgressBar({
  value = 0,
  max = 100,
  tone = 'brand',
  size = 'sm',
  showLabel = false,
  className,
  trackClassName,
  label,
}: ProgressBarProps) {
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
          'w-full overflow-hidden rounded-full bg-rule/10',
          SIZES[size],
          trackClassName,
        )}
      >
        <div
          // The width transition is the one piece of motion here that carries
          // meaning: it shows the value moving. Everything else is static.
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', TONES[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <div className="num mt-1 text-[11px] text-muted">{pct}%</div>}
    </div>
  );
}
