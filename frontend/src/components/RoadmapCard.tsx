import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useQuestions, useRoadmap, useTopics } from '../lib/queries';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { Button, Eyebrow } from '../ui/index';
import RoadmapStrip from './RoadmapStrip';
import { PLATFORMS } from '../lib/platform';
import { computeStanding, pickTrack, resolveTrack, rungLabel } from '../lib/roadmap';

import type { Question } from '../types/domain';

const NO_QUESTIONS: Question[] = [];

const copy = (t: UICopy, key: string): string => {
  const value = t[key as keyof UICopy];
  return typeof value === 'string' ? value : '';
};

/**
 * The dashboard's window onto the roadmap: the rung you stand on, the one to
 * work on next, and the whole ladder as a strip. Everything here is a link
 * into /roadmap — the card explains, the page acts.
 */
export default function RoadmapCard() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const platform = usePrefs((s) => s.platform);
  const roadmapTrack = usePrefs((s) => s.roadmapTrack);
  const trackKey = pickTrack(roadmapTrack, platform);
  const trackMeta = PLATFORMS.find((p) => p.key === trackKey);

  const { data: roadmap } = useRoadmap();
  const { data: topics } = useTopics();
  const { data: questions = NO_QUESTIONS } = useQuestions();

  const rungs = useMemo(
    () => (roadmap && topics ? resolveTrack(roadmap, trackKey, topics, questions, lang) : []),
    [roadmap, topics, questions, trackKey, lang],
  );
  const standing = useMemo(() => computeStanding(rungs), [rungs]);

  if (!rungs.length) return null;

  const bandNames = t.roadmap.band;
  const next = standing.next;

  return (
    <div className="codex-card p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
        <div className="min-w-0 flex-1">
          <Eyebrow>{t.roadmap.title} · {trackMeta ? copy(t, trackMeta.labelKey) : trackKey}</Eyebrow>
          <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            {standing.level ? rungLabel(standing.level, bandNames) : t.roadmap.notStarted}
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
            {next ? (
              <>
                {t.roadmap.nextUp}: <span className="font-medium text-ink">{rungLabel(next, bandNames)}</span>
                {' — '}{next.title}
              </>
            ) : t.roadmap.allPassed}
          </p>
        </div>
        <div className="shrink-0 sm:w-[300px]">
          <RoadmapStrip
            rungs={rungs}
            nextId={next?.id ?? null}
            bandNames={bandNames}
            onSelect={(id) => navigate(`/roadmap#${id}`)}
          />
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate('/roadmap')}>
            {t.roadmap.openRoadmap}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
