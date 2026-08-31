import { useMemo } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { buildHeatmap, computeStreaks, buildDayMap, intensity } from '../lib/activity';
import { useLang } from '../i18n/LangContext';
import { cn } from '../lib/cn';

import type { HeatmapCell } from '../lib/activity';

/**
 * One hue, five steps. The grid used to ramp faint-rule → brand → a
 * brand/brand-sky gradient with a glow on the hottest bucket, which is three
 * colours and two materials for a single ordered quantity.
 *
 * The ramp is the marker, because that is what these cells are: the days you
 * marked up. Alphas stop short of the neat citron so a full week of study
 * still reads as a highlighter pass over paper and not as a block of fill.
 */
const INTENSITY_CLASS = [
  'bg-rule/8',
  'bg-[rgb(var(--marker)/0.22)] dark:bg-[rgb(var(--marker)/0.14)]',
  'bg-[rgb(var(--marker)/0.42)] dark:bg-[rgb(var(--marker)/0.28)]',
  'bg-[rgb(var(--marker)/0.62)] dark:bg-[rgb(var(--marker)/0.44)]',
  'bg-[rgb(var(--marker)/0.85)] dark:bg-[rgb(var(--marker)/0.62)]',
];

export interface ActivityHeatmapProps {
  /** Columns of seven days, ending today. */
  weeks?: number;
}

export default function ActivityHeatmap({ weeks = 14 }: ActivityHeatmapProps) {
  const { lang } = useLang();

  // The heatmap reads localStorage, which only changes via user actions during
  // the session. Computing once per render is fine, but memoize for smoothness.
  const { cols, streaks } = useMemo(() => {
    const map = buildDayMap();
    return { cols: buildHeatmap(weeks, map), streaks: computeStreaks(map) };
  }, [weeks]);

  const fmt = (date: Date): string =>
    new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);

  const days = lang === 'ru' ? 'дн.' : 'days';

  return (
    <Tooltip.Provider delayDuration={150}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        {/* Streak figures — ink, like every other figure in the system. The
            three accent colours they used to carry implied three categories
            where there is one: days. */}
        <div className="flex shrink-0 gap-6 sm:gap-8">
          <StreakStat label={lang === 'ru' ? 'Серия' : 'Streak'} value={streaks.current} unit={days} />
          <StreakStat label={lang === 'ru' ? 'Рекорд' : 'Best'} value={streaks.longest} unit={days} />
          <StreakStat
            label={lang === 'ru' ? 'Всего активных' : 'Days active'}
            value={streaks.totalDays}
            unit={days}
            className="hidden sm:flex"
          />
        </div>

        <div className="flex flex-1 flex-col items-start gap-2.5 overflow-x-auto sm:items-end">
          <div className="flex gap-[3px]">
            {cols.map((col: Array<HeatmapCell | null>, ci: number) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {col.map((cell: HeatmapCell | null, ri: number) =>
                  cell ? (
                    <Tooltip.Root key={cell.key}>
                      <Tooltip.Trigger asChild>
                        <span
                          className={cn(
                            'h-3 w-3 rounded-sm sm:h-3.5 sm:w-3.5',
                            INTENSITY_CLASS[intensity(cell.count)],
                          )}
                          aria-label={`${fmt(cell.date)} — ${cell.count}`}
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
      </div>
    </Tooltip.Provider>
  );
}

interface StreakStatProps {
  label: string;
  value: number;
  unit: string;
  className?: string;
}

function StreakStat({ label, value, unit, className }: StreakStatProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline gap-1.5">
        <span className="num text-[32px] leading-none text-ink sm:text-[36px]">{value}</span>
        <span className="text-[13px] text-muted">{unit}</span>
      </div>
      <span className="text-[13px] leading-snug text-muted">{label}</span>
    </div>
  );
}
