import { cn } from '../lib/cn';

export interface MeterProps {
  value: number;
  max: number;
  /** Accessible name, e.g. "Dart Basics progress". */
  label?: string;
  /** Show `value / max` after the bar. */
  figure?: boolean;
  /** Bar width class; the figure sits to its right. */
  barClassName?: string;
  className?: string;
}

/**
 * A short bar with its tally: `▬▬▬▭ 9 / 12`. The bar sits in its own
 * column and never behind the text it measures; a finished meter turns mint,
 * everything else is ink.
 */
export function Meter({ value, max, label, figure = true, barClassName, className }: MeterProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  const done = max > 0 && value >= max;
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn('block h-1 w-16 overflow-hidden rounded-full bg-rule/12', barClassName)}
      >
        <span className={cn('block h-full rounded-full', done ? 'bg-mint' : 'bg-ink')} style={{ width: `${pct}%` }} />
      </span>
      {figure && (
        <span className="num text-[13px] tabular-nums">
          <span className={done ? 'text-mint' : 'text-ink'}>{value}</span>
          <span className="text-muted"> / {max}</span>
        </span>
      )}
    </span>
  );
}
