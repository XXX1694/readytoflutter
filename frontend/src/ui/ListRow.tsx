import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/cn';

export interface ListProps {
  className?: string;
  children: ReactNode;
}

/** A ruled list: hairlines above, below and between rows. Wrap ListRows in it. */
export function List({ className, children }: ListProps) {
  return <ul className={cn('divide-y divide-rule/10 border-y border-rule/12', className)}>{children}</ul>;
}

export interface ListRowProps {
  /** A glyph or icon, 28–40px. */
  leading?: ReactNode;
  title: ReactNode;
  /** One muted line under the title. */
  meta?: ReactNode;
  /** A figure, a meter, a count — right-aligned. */
  trailing?: ReactNode;
  to?: string;
  onClick?: () => void;
  /** Draw the chevron; on by default when the row navigates. */
  chevron?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * The default way to show a thing in a list: 56px, leading glyph, title with
 * one line of meta, a right-aligned figure and a chevron when it goes
 * somewhere. Fifty of these read as a table of contents; fifty cards read as
 * a monitoring console.
 */
export function ListRow({ leading, title, meta, trailing, to, onClick, chevron, className, ...aria }: ListRowProps) {
  const interactive = Boolean(to || onClick);
  const showChevron = chevron ?? interactive;
  const inner = (
    <>
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium leading-snug text-ink">{title}</span>
        {meta && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{meta}</span>}
      </span>
      {trailing && <span className="flex shrink-0 items-center gap-3 text-[13px] text-muted">{trailing}</span>}
      {showChevron && <ChevronRight className="h-4 w-4 shrink-0 text-muted-2" aria-hidden />}
    </>
  );
  const rowClass = cn(
    'flex min-h-[56px] w-full items-center gap-3 px-1 py-2.5 text-left',
    interactive && 'transition-colors hover:bg-rule/4',
    className,
  );

  return (
    <li>
      {to ? (
        <Link to={to} className={rowClass} onClick={onClick} {...aria}>{inner}</Link>
      ) : onClick ? (
        <button type="button" className={rowClass} onClick={onClick} {...aria}>{inner}</button>
      ) : (
        <div className={rowClass}>{inner}</div>
      )}
    </li>
  );
}
