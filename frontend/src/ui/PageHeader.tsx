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
  /**
   * `display` is the pitch on `/`: the title at 40/48px over a 17px subtitle
   * — 46px beside the aside at `xl`, where the copy has ~470px, and 52px
   * from 1376px, where the 1120px shell caps and the copy column settles at
   * 568px. Every other page is `page` (DESIGN.md rule 13).
   */
  size?: 'page' | 'display';
  /**
   * One object beside the text block from `xl` up and under it below — on
   * `/` the painted card, or the stack picker on first run. The hairline
   * runs under both.
   */
  aside?: ReactNode;
  className?: string;
}

/**
 * Every page's first block. One recipe for the title (28px grotesk), the
 * subtitle (15px, ink-2) and the hairline under it, so fourteen hand-rolled
 * `h1` class strings become one. `size="display"` is the same recipe at the
 * scale a front page needs; `aside` seats the one object the page acts on
 * beside the copy where there is room for it.
 */
export function PageHeader({ eyebrow, title, subtitle, back, actions, children, size = 'page', aside, className }: PageHeaderProps) {
  const display = size === 'display';
  return (
    <header className={cn('mb-6 border-b border-rule/12 sm:mb-8', display ? 'pb-8 sm:pb-10' : 'pb-5 sm:pb-6', className)}>
      {back && (
        <Link
          to={back.to}
          className="-ml-1 mb-4 hidden items-center gap-1.5 rounded-md px-1 py-1 text-[13px] text-muted transition-colors hover:text-ink lg:inline-flex"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {back.label}
        </Link>
      )}
      {/* The aside gets its own column from `xl`: beside the rail the page
          has 704px at 1024–1279, not enough for a headline and a card side
          by side; at 1280 it has 960. Below `xl` the aside follows the copy. */}
      <div className={cn(aside && 'xl:grid xl:grid-cols-[minmax(0,1fr)_440px] xl:items-center xl:gap-12')}>
        <div className="min-w-0">
          {/* Actions sit beside the title on every width — on a phone they align
              with the title's top line rather than dropping onto a row of their
              own under the subtitle, where a lone overflow button looked lost. */}
          <div className="flex items-start justify-between gap-3 sm:items-end sm:gap-4">
            <div className="min-w-0 flex-1">
              {eyebrow && <div className="eyebrow font-semibold text-brand">{eyebrow}</div>}
              <h1
                className={cn(
                  'font-display font-bold text-ink',
                  display
                    ? 'text-[40px] leading-[1.02] tracking-[-0.03em] sm:text-[48px] xl:text-[46px] min-[1376px]:text-[52px]'
                    : 'text-[28px] leading-[1.1] tracking-[-0.022em] sm:text-[32px]',
                  eyebrow && 'mt-1.5',
                )}
              >
                {title}
              </h1>
              {subtitle && (
                <p className={display ? 'mt-5 max-w-[60ch] text-[17px] leading-[1.55] text-ink-2' : 'mt-2.5 max-w-2xl text-[15px] leading-relaxed text-ink-2'}>
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className={cn('flex shrink-0 flex-wrap items-center justify-end gap-2', eyebrow && 'mt-5 sm:mt-0')}>{actions}</div>}
          </div>
          {children && <div className="mt-4">{children}</div>}
        </div>
        {aside && <div className="mt-6 min-w-0 xl:mt-0">{aside}</div>}
      </div>
    </header>
  );
}
