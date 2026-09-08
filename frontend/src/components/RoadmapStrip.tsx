import { cn } from '../lib/cn';
import { ROADMAP_BANDS, rungLabel, type ResolvedRung } from '../lib/roadmap';

export interface RoadmapStripProps {
  rungs: ResolvedRung[];
  /** The rung to work on next — drawn in the pen's blue. */
  nextId: string | null;
  /** `t.roadmap.level` — the rung titles the segment tooltips carry. */
  levelNames: Record<string, string>;
  /** `t.roadmap.band` — the caption under each group of segments. */
  bandNames: Record<string, string>;
  onSelect?: (rungId: string) => void;
  className?: string;
}

/**
 * The whole ladder in one line: sixteen segments grouped Junior · Middle ·
 * Senior · Staff. A passed rung is solid ink, a rung in progress fills to its
 * share, and the rung to work on next is the one thing in colour. With
 * `onSelect` each segment is a button and the strip doubles as a table of
 * contents; without it the segments are plain spans and the whole strip is
 * hidden from assistive tech — beside Today's standing row, which names the
 * level and the next rung, a ladder nobody can operate is decorative.
 */
export default function RoadmapStrip({ rungs, nextId, levelNames, bandNames, onSelect, className }: RoadmapStripProps) {
  return (
    <div className={cn('flex gap-3', className)} aria-hidden={onSelect ? undefined : true}>
      {ROADMAP_BANDS.map((band) => {
        const items = rungs.filter((r) => r.band === band);
        if (!items.length) return null;
        return (
          <div key={band} className="flex min-w-0 flex-col gap-1" style={{ flex: items.length }}>
            <div className="flex gap-1">
              {items.map((r) => {
                const isNext = r.id === nextId;
                const label = rungLabel(r, levelNames);
                const bar = (
                  <span
                    className={cn(
                      'block h-2.5 w-full overflow-hidden rounded-[3px]',
                      r.passed ? 'bg-ink' : 'bg-rule/12',
                      isNext && 'ring-1 ring-brand',
                    )}
                  >
                    {!r.passed && r.pct > 0 && (
                      <span
                        className={cn('block h-full', isNext ? 'bg-brand' : 'bg-ink/40')}
                        style={{ width: `${r.pct}%` }}
                      />
                    )}
                  </span>
                );
                return onSelect ? (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelect(r.id)}
                    aria-label={`${label} — ${r.completed}/${r.total}`}
                    title={`${label} · ${r.title}`}
                    className="pressable pressable-lg -my-2 flex h-10 min-w-0 flex-1 cursor-pointer items-center"
                  >
                    {bar}
                  </button>
                ) : (
                  <span
                    key={r.id}
                    title={`${label} · ${r.title}`}
                    className="-my-2 flex h-10 min-w-0 flex-1 items-center"
                  >
                    {bar}
                  </span>
                );
              })}
            </div>
            {/* Not truncated: the one-rung Staff group is narrower than its
                own name, and "St…" is worse than a label that spills a few
                pixels past the last segment. */}
            <span className="whitespace-nowrap text-[11px] leading-none text-muted">{bandNames[band] ?? band}</span>
          </div>
        );
      })}
    </div>
  );
}
