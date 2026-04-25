import { useMemo } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { buildHeatmap, computeStreaks, buildDayMap, intensity } from '../lib/activity.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { cn } from '../lib/cn.js';

const INTENSITY_CLASS = [
  // Empty cell needs to stay visible in both themes — dark mode lifts to
  // rule-strong so the grid reads against the deep paper background.
  'bg-rule-strong/25 dark:bg-rule-strong/40',
  'bg-brand/30 dark:bg-brand/35',
  'bg-brand/55 dark:bg-brand/55',
  'bg-brand/80 dark:bg-brand/80',
  'bg-brand',
];

export default function ActivityHeatmap({ weeks = 14 }) {
  const { lang } = useLang();
  const t = useT(lang);

  // The heatmap reads localStorage, which only changes via user actions during
  // the session. Computing once per render is fine, but memoize for smoothness.
  const { cols, streaks } = useMemo(() => {
    const map = buildDayMap();
    return { cols: buildHeatmap(weeks, map), streaks: computeStreaks(map) };
  }, [weeks]);

  const fmt = (date) =>
    new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);

  return (
    <Tooltip.Provider delayDuration={150}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between">
        {/* Streak stats */}
        <div className="flex shrink-0 items-stretch gap-4 sm:gap-6">
          <StreakStat label={lang === 'ru' ? 'Серия' : 'Streak'} value={streaks.current} unit={lang === 'ru' ? 'дн.' : 'days'} accent="brand" />
          <div className="w-px self-stretch bg-rule" aria-hidden />
          <StreakStat label={lang === 'ru' ? 'Рекорд' : 'Best'} value={streaks.longest} unit={lang === 'ru' ? 'дн.' : 'days'} accent="mint" />
          <div className="hidden w-px self-stretch bg-rule sm:block" aria-hidden />
          <StreakStat
            label={lang === 'ru' ? 'Активных' : 'Active'}
            value={streaks.totalDays}
            unit={lang === 'ru' ? 'дн.' : 'days'}
            accent="ink"
            className="hidden sm:flex"
          />
        </div>

        {/* Heatmap grid */}
        <div className="flex flex-1 flex-col items-end gap-2 overflow-x-auto">
          <div className="flex gap-[3px]">
            {cols.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {col.map((cell, ri) =>
                  cell ? (
                    <Tooltip.Root key={cell.key}>
                      <Tooltip.Trigger asChild>
                        <span
                          className={cn(
                            'h-3 w-3 rounded-[3px] ring-1 ring-rule/40 transition-transform hover:scale-110 dark:ring-rule-strong/50 sm:h-3.5 sm:w-3.5',
                            INTENSITY_CLASS[intensity(cell.count)],
                          )}
                          aria-label={`${fmt(cell.date)} — ${cell.count}`}
                        />
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          side="top"
                          sideOffset={6}
                          className="z-50 rounded-md border-1.5 border-ink bg-paper-2 px-2 py-1 font-mono text-[11px] text-ink shadow-codex-sm"
                        >
                          <span className="text-muted">{fmt(cell.date)}</span>
                          <span className="ml-2">{cell.count}</span>
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
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
            <span>{lang === 'ru' ? 'Меньше' : 'Less'}</span>
            {INTENSITY_CLASS.map((c, i) => (
              <span
                key={i}
                className={cn('h-2.5 w-2.5 rounded-[2px] ring-1 ring-rule/40 dark:ring-rule-strong/50', c)}
                aria-hidden
              />
            ))}
            <span>{lang === 'ru' ? 'Больше' : 'More'}</span>
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}

function StreakStat({ label, value, unit, accent = 'ink', className }) {
  const ACCENTS = {
    brand: 'text-brand',
    mint: 'text-mint',
    ink: 'text-ink',
  };
  return (
    <div className={cn('flex flex-col justify-between', className)}>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</span>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={cn('num text-3xl sm:text-4xl', ACCENTS[accent])}>{value}</span>
        <span className="font-mono text-[10px] uppercase text-muted">{unit}</span>
      </div>
    </div>
  );
}
