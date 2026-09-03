import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../lib/cn';

export interface PageHeaderProps {
  /** Sentence-case 12px line above the title. */
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Desktop-only ghost row above the title; on phones the header chrome carries Back. */
  back?: { to: string; label: string };
  /** Right-hand slot: the page's one primary action and, at most, an overflow menu. */
  actions?: ReactNode;
  /** Anything that belongs under the title but above the rule — a meter, a chip row. */
  children?: ReactNode;
  className?: string;
}

/**
 * Every page's first block. One recipe for the title (28px grotesk), the
 * subtitle (15px, ink-2) and the hairline under it, so fourteen hand-rolled
 * `h1` class strings become one.
 */
export function PageHeader({ eyebrow, title, subtitle, back, actions, children, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 border-b border-rule/12 pb-5 sm:mb-8 sm:pb-6', className)}>
      {back && (
        <Link
          to={back.to}
          className="-ml-1 mb-4 hidden items-center gap-1.5 rounded-md px-1 py-1 text-[13px] text-muted transition-colors hover:text-ink lg:inline-flex"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {back.label}
        </Link>
      )}
      {/* Actions sit beside the title on every width — on a phone they align
          with the title's top line rather than dropping onto a row of their
          own under the subtitle, where a lone overflow button looked lost. */}
      <div className="flex items-start justify-between gap-3 sm:items-end sm:gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow && <div className="eyebrow font-semibold text-brand">{eyebrow}</div>}
          <h1 className={cn('font-display text-[28px] font-bold leading-[1.1] tracking-[-0.022em] text-ink sm:text-[32px]', eyebrow && 'mt-1.5')}>
            {title}
          </h1>
          {subtitle && <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">{subtitle}</p>}
        </div>
        {actions && <div className={cn('flex shrink-0 flex-wrap items-center justify-end gap-2', eyebrow && 'mt-5 sm:mt-0')}>{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
