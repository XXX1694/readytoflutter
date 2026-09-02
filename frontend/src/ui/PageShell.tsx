import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * The one page container. Every page used to declare its own padding and
 * width (four recipes, five max-widths); a screen's width is now a choice
 * between four measures, not a class string.
 *
 *  app      1120px — the default; lists, headers, the roadmap.
 *  reading   768px — anything read at length: sessions, a topic, settings.
 *  catalog  1400px — the topics list when the rail is up.
 *  narrow    448px — auth and other single-column forms.
 */
const WIDTHS = {
  app: 'max-w-[1120px]',
  reading: 'max-w-3xl',
  catalog: 'max-w-[1400px]',
  narrow: 'max-w-md',
} as const;

export interface PageShellProps {
  width?: keyof typeof WIDTHS;
  /** Vertically centre short pages (auth, 404) instead of pinning them to the top. */
  centered?: boolean;
  /** Extra bottom room for a sticky mobile CTA. */
  padBottom?: boolean;
  className?: string;
  children: ReactNode;
}

export function PageShell({ width = 'app', centered = false, padBottom = false, className, children }: PageShellProps) {
  return (
    <div className={cn('bg-page', centered && 'flex min-h-full flex-col')}>
      <div
        className={cn(
          'mx-auto w-full px-4 py-5 sm:px-6 sm:py-10 lg:px-8',
          WIDTHS[width],
          centered && 'my-auto',
          padBottom && 'pb-36 sm:pb-10',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
