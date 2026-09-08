import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import RoadmapStrip from './RoadmapStrip';
import { usePrefs } from '../store/prefs';
import { rungLabel, type ResolvedRung, type Standing as StandingData } from '../lib/roadmap';
import type { UICopy } from '../i18n/ui';
import type { HomeCopy } from '../i18n/homePage';

export interface StandingProps {
  rungs: ResolvedRung[];
  standing: StandingData;
  /** `t.roadmap.level` — the localised rung titles `rungLabel` reads. */
  levelNames: Record<string, string>;
  /** `t.roadmap.band` — the band captions under the ladder. */
  bandNames: Record<string, string>;
  /** The track's name, for the meta line ("Flutter roadmap"). */
  trackLabel: string;
  /** "64% ready by 12 Oct", or null when no interview date is set. */
  readyLine: string | null;
  t: UICopy;
  c: HomeCopy;
}

/**
 * Where you stand, as one ruled row under the plan card: the level you hold,
 * the rung to work on next — the one thing in colour — and the whole ladder
 * beside it. A row, not a card (DESIGN.md rule 11); the completed-over-total
 * figure is not repeated here because the rail already carries it.
 */
export default function Standing({ rungs, standing, levelNames, bandNames, trackLabel, readyLine, t, c }: StandingProps) {
  const { level, next } = standing;
  const meta = [c.trackLine(trackLabel), readyLine].filter(Boolean);
  // This row describes the header stack's track (HomePage passes `null` to
  // `pickTrack` on purpose), while /roadmap prefers a track tapped there once.
  // Rung ids are shared across tracks, so the deep link must drop that
  // override or `#junior-3` opens another ladder's third rung.
  const setRoadmapTrack = usePrefs((s) => s.setRoadmapTrack);
  return (
    <div className="mt-4 border-y border-rule/12 py-4 sm:flex sm:items-center sm:justify-between sm:gap-8">
      <Link
        to={next ? `/roadmap#${next.id}` : '/roadmap'}
        onClick={() => setRoadmapTrack(null)}
        className="pressable pressable-lg group -mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 hover:bg-brand/[0.05] active:bg-brand/[0.08]"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug">
            <span className="font-semibold text-ink">{level ? rungLabel(level, levelNames) : t.roadmap.notStarted}</span>
            <span aria-hidden className="text-muted-2"> · </span>
            {next ? (
              <>
                <span className="text-muted">{t.roadmap.nextUp}: </span>
                <span className="font-semibold text-brand">{rungLabel(next, levelNames)}</span>
                <span className="text-ink-2"> — {next.title}</span>
              </>
            ) : (
              <span className="text-muted">{t.roadmap.allPassed}</span>
            )}
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-muted">
            {meta.map((part, i) => (
              <span key={part}>
                {i > 0 && <span aria-hidden> · </span>}
                <span className={i > 0 ? 'num font-normal' : undefined}>{part}</span>
              </span>
            ))}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-2 transition-colors group-hover:text-brand" aria-hidden />
      </Link>
      <div className="mt-4 sm:mt-0 sm:w-[300px] sm:shrink-0 lg:w-[380px]">
        <RoadmapStrip rungs={rungs} nextId={next?.id ?? null} levelNames={levelNames} bandNames={bandNames} />
      </div>
    </div>
  );
}
