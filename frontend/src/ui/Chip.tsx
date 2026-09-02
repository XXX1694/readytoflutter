import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  active?: boolean;
  /** A tally after the label, muted unless the chip is active. */
  count?: number;
  size?: 'sm' | 'md';
  children: ReactNode;
}

/**
 * The one filter toggle. Six versions of this existed with four heights and
 * three radii; this is the pill from the topic page, 40px tall so it is a
 * thumb target, announcing itself as a pressed button.
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { active = false, count, size = 'md', className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium transition-colors duration-150',
        size === 'md' ? 'min-h-[40px] px-3.5 text-[13px]' : 'min-h-[32px] px-3 text-[12px]',
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-rule/12 bg-paper-2 text-ink-2 hover:border-rule/25 hover:text-ink',
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {count != null && (
        <span className={cn('num font-normal', active ? 'text-paper/65' : 'text-muted-2')}>{count}</span>
      )}
    </button>
  );
});

export interface ChipGroupProps {
  /** Required: what these chips filter, for assistive tech. */
  ariaLabel: string;
  /** Optional visible label, set as an eyebrow above the row. */
  label?: ReactNode;
  /** Scroll sideways on phones instead of wrapping; wraps from `sm` up. */
  scroll?: boolean;
  className?: string;
  children: ReactNode;
}

export function ChipGroup({ ariaLabel, label, scroll = false, className, children }: ChipGroupProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && <div className="eyebrow">{label}</div>}
      <div
        role="group"
        aria-label={ariaLabel}
        className={cn(
          'flex gap-2',
          scroll
            ? '-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0'
            : 'flex-wrap',
        )}
      >
        {children}
      </div>
    </div>
  );
}
