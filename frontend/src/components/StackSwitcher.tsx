import { Check, ChevronDown } from 'lucide-react';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { StackTile } from '../lib/stackIcons';
import { useChooseStack, useCurrentStack, useStackOptions } from '../lib/useStack';
import { cn } from '../lib/cn';

export interface StackRowsProps {
  /** `rail` is the compact list in the desktop sidebar; `sheet` has room for a description. */
  variant?: 'rail' | 'sheet';
  onChosen?: () => void;
  source: string;
  className?: string;
}

/**
 * Every stack as a row: its tile in its own colour, its name, and a check on
 * the one in effect. The active row is tinted in the stack colour — the same
 * signal the nav gives for the page you are on. Switching recolours the
 * whole app, so the list is its own preview.
 */
export function StackRows({ variant = 'rail', onChosen, source, className }: StackRowsProps) {
  const platform = usePrefs((s) => s.platform);
  const { lang } = useLang();
  const t = useT(lang);
  const options = useStackOptions();
  const choose = useChooseStack(source);
  const compact = variant === 'rail';

  return (
    <ul className={cn('flex flex-col', compact ? 'gap-0.5' : 'gap-1', className)} role="radiogroup" aria-label={t.nav.stack}>
      {options.map((o) => {
        const active = o.key === platform;
        return (
          <li key={o.key}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => { choose(o.key); onChosen?.(); }}
              className={cn(
                'flex w-full items-center gap-3 text-left transition-colors',
                compact ? 'rounded-[10px] px-2 py-1.5' : 'min-h-[60px] rounded-xl px-3 py-2.5',
                active
                  ? 'bg-brand/10 text-brand'
                  : 'text-ink-2 hover:bg-rule/6 hover:text-ink',
              )}
            >
              <StackTile stack={o.key} size={compact ? 'sm' : 'md'} tone={active ? 'solid' : 'soft'} />
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate leading-snug', compact ? 'text-[13.5px]' : 'text-[15px]', active ? 'font-semibold' : 'font-medium')}>
                  {o.label}
                </span>
                {!compact && (
                  <span className={cn('mt-0.5 block text-[12.5px] leading-snug', active ? 'text-brand/80' : 'text-muted')}>
                    {o.desc}
                  </span>
                )}
              </span>
              {active ? (
                <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
              ) : (
                o.count > 0 && (
                  <span className="num shrink-0 text-[11.5px] font-normal text-muted-2">{o.count}</span>
                )
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export interface StackPillProps {
  onClick: () => void;
  className?: string;
}

/** The compact trigger for phones: the tile, the name, a chevron. */
export function StackPill({ onClick, className }: StackPillProps) {
  const { lang } = useLang();
  const t = useT(lang);
  const current = useCurrentStack();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={`${t.nav.stack}: ${current.label}`}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border border-brand/25 bg-brand/[0.08] pl-1 pr-2.5 text-[13px] font-semibold text-brand transition-colors active:bg-brand/15',
        className,
      )}
    >
      <StackTile stack={current.key} size="sm" className="rounded-full" />
      <span className="max-w-[9rem] truncate">{current.label}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
    </button>
  );
}
