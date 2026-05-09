import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type EyebrowAccent = 'brand' | 'mint' | 'amber' | 'ink' | 'muted';

export interface EyebrowProps {
  index?: number | string; // legacy prop, kept for backwards compat — ignored
  children: ReactNode;
  className?: string;
  accent?: EyebrowAccent;
  dot?: boolean;
}

/**
 * Atlas eyebrow — small uppercase mono label with an optional dot accent.
 */
export function Eyebrow({ children, className, accent = 'brand', dot = true }: EyebrowProps) {
  const DOT: Record<EyebrowAccent, string> = {
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
