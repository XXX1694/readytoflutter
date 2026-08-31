import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type EyebrowAccent = 'brand' | 'mint' | 'amber' | 'ink' | 'muted';

export interface EyebrowProps {
  children: ReactNode;
  className?: string;
  /**
   * `accent`, `dot` and `index` are inert. They drove the coloured dot and the
   * caps-mono treatment this label used to have; the eyebrow is now a single
   * muted line, so none of them change the output. They stay declared only so
   * the ~25 call sites that still pass them keep compiling — drop the prop
   * when you next touch one of those files.
   */
  accent?: EyebrowAccent;
  dot?: boolean;
  index?: number | string;
}

/**
 * Section label. Sentence case, 12px grotesk, muted — see DESIGN.md rule 2 for
 * why this is not uppercase mono at 10px. Styling lives in the `.eyebrow`
 * component class in index.css so page-level `@apply` sites match it exactly.
 */
export function Eyebrow({ children, className }: EyebrowProps) {
  return <div className={cn('eyebrow', className)}>{children}</div>;
}
