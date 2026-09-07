import { useEffect, useRef } from 'react';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { StackTile } from '../lib/stackIcons';
import { useChooseStack, useStackOptions } from '../lib/useStack';
import { cn } from '../lib/cn';

export interface StackRibbonProps {
  className?: string;
}

/**
 * The stack switch on the page that sells, for screens without the rail: six
 * marks, each on its own colour, with its name — the phone header's pill
 * unrolled — and the one in effect tinted the way the rail tints its row.
 * It scrolls sideways; on mount the active stack is brought into view
 * without moving the page. Six toggles in a group, `aria-pressed` like the
 * Chips it replaced (DESIGN.md rule 14). Lives in the home chunk on purpose:
 * StackSwitcher.tsx is in the entry graph and this never needs to be.
 */
export default function StackRibbon({ className }: StackRibbonProps) {
  const { lang } = useLang();
  const t = useT(lang);
  const platform = usePrefs((s) => s.platform);
  const options = useStackOptions();
  const choose = useChooseStack('home');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = ref.current;
    const active = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    // Mount only, and only when the active tile does not already fit: park
    // it a tile-edge in, so the stacks before it stay visible as the cue that
    // the row scrolls. A later choice is made with the item already in view.
    if (row && active && active.offsetLeft + active.offsetWidth > row.clientWidth) {
      row.scrollLeft = Math.max(0, active.offsetLeft - 44);
    }
  }, []);

  return (
    <div
      ref={ref}
      role="group"
      aria-label={t.nav.stack}
      // The scroller clips vertically too, so it carries the 6px the focus
      // ring needs: `-mb-1.5` takes the bottom 6px back, and the caller's top
      // margin is 6px short (`mt-[14px]`) to keep its rhythm.
      className={cn('-mx-4 -mb-1.5 flex gap-1.5 overflow-x-auto px-4 py-1.5 no-scrollbar', className)}
    >
      {options.map((o) => {
        const active = o.key === platform;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => choose(o.key)}
            className={cn(
              'pressable inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full pl-1 pr-3.5 text-[13.5px]',
              active ? 'bg-brand/10 font-semibold text-brand' : 'font-medium text-ink-2 hover:bg-rule/6 hover:text-ink',
            )}
          >
            <StackTile stack={o.key} size="md" className="rounded-full" />
            <span className="whitespace-nowrap">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
