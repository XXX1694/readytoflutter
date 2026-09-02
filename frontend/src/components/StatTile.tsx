import { memo, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * A figure in a ruled band — the study tally, not a KPI card.
 *
 * Four bordered cards, each with a caps label, a coloured dot and a coloured
 * numeral, is the analytics-template answer; it also spends four hues on data
 * that has no four categories. Here every figure is ink, the reading is a
 * fraction wherever the underlying number is one (`47 / 392` says more than
 * `47` and `12%` in two separate boxes), and the only colour available is the
 * pen's blue — which lands on the single figure that asks for an action.
 *
 * The band's rules are drawn by the parent (`border-y border-rule/12`), so a
 * row of these reads as one strip of paper rather than four floating tiles.
 */
export interface StatTileProps {
  /** Sentence case, no trailing colon. */
  label: string;
  value: number | string;
  /** Denominator — renders as `/ 392` so the figure reads as a tally. */
  of?: number;
  /** Glued to the figure, e.g. `%`. */
  suffix?: string;
  /**
   * Sets the figure in the pen's blue. At most one per screen: it means
   * "this is the number to act on", and a second one dilutes the first.
   */
  marked?: boolean;
  className?: string;
}

function StatTile({ label, value, of, suffix, marked = false, className }: StatTileProps) {
  const figure: ReactNode = (
    <>
      {value}
      {suffix}
    </>
  );

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn('num text-[32px] leading-none sm:text-[40px]', marked ? 'text-brand' : 'text-ink')}
        >
          {figure}
        </span>
        {of != null && (
          <span className="num text-[15px] leading-none text-muted">/ {of}</span>
        )}
      </div>
      <span className="text-[13px] leading-snug text-muted">{label}</span>
    </div>
  );
}

export default memo(StatTile);
