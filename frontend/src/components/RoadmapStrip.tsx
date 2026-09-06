import { cn } from '../lib/cn';
import { ROADMAP_BANDS, rungLabel, type ResolvedRung } from '../lib/roadmap';

export interface RoadmapStripProps {
  rungs: ResolvedRung[];
  /** The rung to work on next — drawn in the pen's blue. */
  nextId: string | null;
  bandNames: Record<string, string>;
  onSelect?: (rungId: string) => void;
  className?: string;
}

/**
 * The whole ladder in one line: sixteen segments grouped Junior · Middle ·
 * Senior · Staff. A passed rung is solid ink, a rung in progress fills to its
 * share, and the rung to work on next is the one thing in colour. Each
 * segment is a button so the strip doubles as a table of contents.
 */
export default function RoadmapStrip({ rungs, nextId, bandNames, onSelect, className }: RoadmapStripProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      {ROADMAP_BANDS.map((band) => {
        const items = rungs.filter((r) => r.band === band);
        if (!items.length) return null;
        return (
          <div key={band} className="flex min-w-0 flex-col gap-1" style={{ flex: items.length }}>
            <div className="flex gap-1">
              {items.map((r) => {
                const isNext = r.id === nextId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={onSelect ? () => onSelect(r.id) : undefined}
                    tabIndex={onSelect ? 0 : -1}
                    aria-label={`${rungLabel(r, bandNames)} — ${r.completed}/${r.total}`}
                    title={`${rungLabel(r, bandNames)} · ${r.title}`}
                    className={cn(
                      '-my-2 flex h-10 min-w-0 flex-1 items-center',
                      onSelect ? 'pressable pressable-lg cursor-pointer' : 'cursor-default',
                    )}
                  >
                    <span
                      className={cn(
                        'block h-2.5 w-full overflow-hidden rounded-sm',
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
                  </button>
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
