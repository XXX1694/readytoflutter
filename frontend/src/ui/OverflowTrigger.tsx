import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../lib/cn';

export interface OverflowTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name, e.g. "More actions". */
  label: string;
}

/**
 * The "⋯" button on its own, with no Radix behind it. OverflowMenu uses it
 * as its real trigger; a page that wants the menu's chunk loaded lazily
 * renders it as a stand-in until the first hover or tap.
 */
export const OverflowTrigger = forwardRef<HTMLButtonElement, OverflowTriggerProps>(function OverflowTrigger(
  { label, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rule/12 bg-paper-2 text-ink-2 transition-colors hover:border-rule/25 hover:text-ink',
        className,
      )}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" aria-hidden />
    </button>
  );
});
