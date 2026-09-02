import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface SectionProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** A count, a link, a small control — never a second primary button. */
  actions?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A titled block inside a page: 20px heading, muted one-liner, hairline.
 * Sections are the page's rhythm — 40px apart on phones, 56px on desktop —
 * and never nest a card inside a card.
 */
export function Section({ title, subtitle, actions, id, className, children }: SectionProps) {
  return (
    <section id={id} className={cn('mb-10 sm:mb-14', className)}>
      {(title || actions) && (
        <header className="mb-4 flex items-end justify-between gap-4 border-b border-rule/12 pb-3">
          <div className="min-w-0">
            {title && <h2 className="font-display text-[20px] font-semibold leading-tight text-ink">{title}</h2>}
            {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2 text-[13px] text-muted">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
