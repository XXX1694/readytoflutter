import { useMemo, useState } from 'react';
import { Brain } from 'lucide-react';
import { Button, Eyebrow, ProgressBar } from '../ui/index';
import { useLang } from '../i18n/LangContext';
import { useReadinessCopy } from '../i18n/readiness';
import { atRiskQuestionIds, forecast, targetMoment } from '../lib/readiness';
import { usePrefs } from '../store/prefs';
import { rungLabel, type ResolvedRung, type Standing } from '../lib/roadmap';

/** `YYYY-MM-DD` in local time — what `<input type="date">` speaks. */
const isoDay = (at: number): string => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export interface ReadinessCardProps {
  rungs: ResolvedRung[];
  standing: Standing;
  /** `t.roadmap.band` — the localized band names `rungLabel` reads. */
  bandNames: Record<string, string>;
  /** Fallback heading when the scope resolves to no rung at all. */
  fallbackLabel: string;
  onStudy: (ids: number[], label: string) => void;
}

/**
 * The roadmap says where someone stands and the session says what is due; this
 * says whether they will be ready on a particular morning. It is the one screen
 * that uses FSRS for what it is actually for — running each card's forgetting
 * curve forward to a date rather than only scheduling the next review.
 */
export default function ReadinessCard({
  rungs, standing, bandNames, fallbackLabel, onStudy,
}: ReadinessCardProps) {
  const { lang } = useLang();
  const c = useReadinessCopy(lang);
  const targetDate = usePrefs((s) => s.targetDate);
  const setTargetDate = usePrefs((s) => s.setTargetDate);
  const [editing, setEditing] = useState(false);
  // One reading of the clock for the whole visit: a day count that ticked
  // mid-render would move under the reader, and "14 days left" does not need
  // to be live.
  const [now] = useState(() => Date.now());

  const targetAt = targetDate ? targetMoment(targetDate) : null;
  const readiness = useMemo(
    () => (targetAt && rungs.length ? forecast(rungs, standing, targetAt, now) : null),
    [rungs, standing, targetAt, now],
  );

  const picker = (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        aria-label={c.dateLabel}
        value={targetDate ?? ''}
        min={isoDay(now)}
        onChange={(e) => { setTargetDate(e.target.value || null); setEditing(false); }}
        className="num rounded-lg border border-rule/12 bg-paper-2 px-3 py-2 text-[15px] text-ink outline-none focus-visible:border-brand"
      />
      {targetDate && (
        <Button variant="ghost" size="sm" onClick={() => { setTargetDate(null); setEditing(false); }}>
          {c.clear}
        </Button>
      )}
    </div>
  );

  if (!readiness) {
    return (
      <section className="mb-10 sm:mb-14">
        <div className="codex-card p-5 sm:p-7">
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <h2 className="mt-2 font-display text-[22px] font-semibold leading-tight text-ink sm:text-[24px]">
            {c.inviteTitle}
          </h2>
          <p className="mt-2.5 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">{c.inviteBody}</p>
          <div className="mt-4">{picker}</div>
        </div>
      </section>
    );
  }

  const pct = Math.round(readiness.recall * 100);
  const scopeRung = readiness.perRung.filter((r) => r.inScope).at(-1)?.rung ?? null;
  const label = scopeRung ? rungLabel(scopeRung, bandNames) : fallbackLabel;
  const when = readiness.targetAt < now ? c.datePassed : c.daysLeft(readiness.daysLeft);

  return (
    <section className="mb-10 sm:mb-14">
      <div className="codex-card p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h2 className="num mt-2 font-display text-[26px] font-semibold leading-tight text-ink sm:text-[28px]">
              {c.readyPct(pct)}
            </h2>
            <p className="mt-1.5 text-[15px] text-ink-2">
              {c.forRung(label)}
              <span aria-hidden className="text-muted-2"> · </span>
              <span className="num text-muted">{when}</span>
            </p>
          </div>
          {editing ? picker : (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>{c.change}</Button>
          )}
        </div>

        <ProgressBar value={pct} className="mt-5" />

        {readiness.atRisk === 0 ? (
          <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">{c.allSolid}</p>
        ) : (
          <>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
              <span className="num font-medium text-ink">{c.willFade(readiness.atRisk)}</span>
              {' — '}
              <span className="num">{c.perDay(readiness.perDay)}</span>
            </p>

            {readiness.weakSpots.length > 0 && (
              <div className="mt-4">
                <Eyebrow>{c.weakest}</Eyebrow>
                <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                  {readiness.weakSpots.map((spot) => (
                    <li key={spot.topic.id} className="text-[14px] text-ink-2">
                      {spot.topic.title}
                      <span className="num text-muted"> · {spot.atRisk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              variant="brand"
              size="md"
              className="mt-5"
              onClick={() => onStudy(atRiskQuestionIds(rungs, standing, readiness.targetAt), c.fixFirst)}
            >
              <Brain className="h-4 w-4" aria-hidden />
              {c.fixFirst}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
