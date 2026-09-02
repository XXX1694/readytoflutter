import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface EyebrowProps {
  children: ReactNode;
  className?: string;
}

/**
 * Section label. Sentence case, 12px grotesk, muted — see DESIGN.md rule 2 for
 * why this is not uppercase mono at 10px. Styling lives in the `.eyebrow`
 * component class in index.css so page-level `@apply` sites match it exactly.
 */
export function Eyebrow({ children, className }: EyebrowProps) {
  return <div className={cn('eyebrow', className)}>{children}</div>;
}
