import { useMemo } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { buildHeatmap, intensity } from '../lib/activity';
import { useLang } from '../i18n/LangContext';
import { cn } from '../lib/cn';

import type { HeatmapCell } from '../lib/activity';

/**
 * One hue, five steps. The grid used to ramp faint-rule → brand → a
 * brand/brand-sky gradient with a glow on the hottest bucket, which is three
 * colours and two materials for a single ordered quantity.
 *
 * The ramp is the pen's blue at rising alphas — one hue for one ordered
 * quantity. It stops short of solid so a full week of study still reads as
 * ink on paper and not as a block of fill.
 */
const INTENSITY_CLASS = [
  'bg-rule/8',
  'bg-brand/22',
  'bg-brand/45',
  'bg-brand/65',
  'bg-brand/90',
];

export interface ActivityHeatmapProps {
  /** Columns of seven days, ending today. */
  weeks?: number;
}

/**
 * The days you worked, and nothing else. The streak figures that used to sit
 * beside the grid now live in the Progress page's figures band, where every
 * other number on that screen is — printed in both places, they were the same
 * fact said twice.
 */
export default function ActivityHeatmap({ weeks = 14 }: ActivityHeatmapProps) {
  const { lang } = useLang();

  // The heatmap reads localStorage, which only changes via user actions during
  // the session. Computing once per render is fine, but memoize for smoothness.
  const cols = useMemo(() => buildHeatmap(weeks), [weeks]);

  const fmt = (date: Date): string =>
    new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);

  return (
    <Tooltip.Provider delayDuration={150}>
      <div
        className="flex flex-col items-start gap-2.5 overflow-x-auto"
        tabIndex={0}
        role="group"
        aria-label={lang === 'ru' ? 'Активность по дням' : 'Activity by day'}
      >
        <div className="flex gap-[3px]">
          {cols.map((col: Array<HeatmapCell | null>, ci: number) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((cell: HeatmapCell | null, ri: number) =>
                cell ? (
                  <Tooltip.Root key={cell.key}>
                    <Tooltip.Trigger asChild>
                      <span
                        role="img"
                        className={cn(
                          'h-3 w-3 rounded-sm sm:h-3.5 sm:w-3.5',
                          INTENSITY_CLASS[intensity(cell.count)],
                        )}
                        aria-label={`${fmt(cell.date)}: ${cell.count}`}
                      />
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        side="top"
                        sideOffset={6}
                        className="z-50 rounded border border-rule/12 bg-paper-2 px-2 py-1 text-[12px] text-ink shadow-codex-sm"
                      >
                        <span className="text-muted">{fmt(cell.date)}</span>
                        <span className="num ml-2">{cell.count}</span>
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                ) : (
                  <span key={`empty-${ci}-${ri}`} className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                ),
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted">
          <span>{lang === 'ru' ? 'Меньше' : 'Less'}</span>
          {INTENSITY_CLASS.map((c: string, i: number) => (
            <span key={i} className={cn('h-2.5 w-2.5 rounded-sm', c)} aria-hidden />
          ))}
          <span>{lang === 'ru' ? 'Больше' : 'More'}</span>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
