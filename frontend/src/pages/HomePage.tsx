import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTopics, useStats, useQuestions, useRoadmap } from '../lib/queries';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { useHomeCopy } from '../i18n/homePage';
import { usePrefs } from '../store/prefs';
import { useAuth } from '../store/auth';
import { Button, PageShell, PageHeader, Skeleton } from '../ui/index';
import TodayPlan from '../components/TodayPlan';
import StackPicker, { STACK_PICKER_KEY } from '../components/StackPicker';
import { PLATFORMS } from '../lib/platform';
import { computeStreaks } from '../lib/activity';
import { computeStanding, pickTrack, resolveTrack, rungLabel } from '../lib/roadmap';
import { useDocumentMeta } from '../lib/useDocumentMeta';

import type { Question, Topic } from '../types/domain';
import type { LandingConfig } from '../i18n/landings';

const NO_TOPICS: Topic[] = [];
const NO_QUESTIONS: Question[] = [];

const copy = (t: UICopy, key: string): string => {
  const value = t[key as keyof UICopy];
  return typeof value === 'string' ? value : '';
};

/** Has the user already answered the stack question? */
function stackPicked(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STACK_PICKER_KEY) !== null;
  } catch {
    return true; // storage blocked — never nag
  }
}

export interface HomePageProps {
  /**
   * Set on the per-platform SEO routes (/flutter, /ios, /android, /kmp),
   * which render this same page under a landing hero and its own meta.
   */
  landing?: LandingConfig | null;
}

/**
 * Today. One job: get you into today's session in two taps, and say where you
 * stand in one line. The catalogue moved to /topics, the figures and the
 * heatmap to /stats, the ladder to /roadmap, and resetting progress to Me —
 * so what is left is a title, an orientation line, one card and one link.
 */
export default function HomePage({ landing = null }: HomePageProps) {
  const { lang } = useLang();
  const t = useT(lang);
  const c = useHomeCopy(lang);
  const platform = usePrefs((s) => s.platform);
  const setPlatform = usePrefs((s) => s.setPlatform);
  const roadmapTrack = usePrefs((s) => s.roadmapTrack);
  const token = useAuth((s) => s.token);
  const backendAvailable = useAuth((s) => s.backendAvailable);

  // Landing-page mode: when this page is rendered as /flutter, /ios, etc. we
  // (a) snap the persisted stack filter to match the landing on first visit,
  // and (b) override the hero copy + document head. The mount-only guard is
  // intentional so a user who picks a different stack after landing can keep
  // exploring without us snapping it back.
  const landingCopy = landing ? landing[lang === 'ru' ? 'ru' : 'en'] : null;
  useEffect(() => {
    if (landing?.platform) setPlatform(landing.platform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landing?.platform]);
  useDocumentMeta({
    title: landingCopy?.docTitle,
    description: landingCopy?.metaDesc,
    canonical: landing?.canonical,
    ogImage: landing?.ogImage,
  });

  const topicsQ = useTopics();
  const statsQ = useStats();
  const questionsQ = useQuestions();
  const roadmapQ = useRoadmap();

  const topics = topicsQ.data ?? NO_TOPICS;
  const questions = questionsQ.data ?? NO_QUESTIONS;

  // Where you stand: the rung you last passed and the one to work on next, on
  // the track the header's stack control points at. No track (Cross-platform,
  // Mobile, everything) means no orientation line rather than Flutter's.
  const trackKey = pickTrack(roadmapTrack, platform);
  const trackMeta = PLATFORMS.find((p) => p.key === trackKey);
  const rungs = useMemo(
    () => (roadmapQ.data && trackKey ? resolveTrack(roadmapQ.data, trackKey, topics, questions, lang) : []),
    [roadmapQ.data, trackKey, topics, questions, lang],
  );
  const standing = useMemo(() => computeStanding(rungs), [rungs]);

  // Streaks come from the local progress log, so the figure is the same for a
  // signed-in and an anonymous user. One localStorage parse per render, and
  // this page renders rarely — a memo here would only need invalidating.
  const streak = computeStreaks().current;

  // First run: the stack question, asked in place. `picked` is state rather
  // than a bare storage read so choosing drops the picker without a reload.
  const [picked, setPicked] = useState(stackPicked);
  const touched = (statsQ.data?.completed ?? 0) + (statsQ.data?.inProgress ?? 0) > 0;
  // A landing already answers the question it would ask.
  const showPicker = !landing && !picked && !touched;

  if (topicsQ.isLoading || statsQ.isLoading) {
    return <TodaySkeleton />;
  }
  if (topicsQ.error) {
    return (
      <PageShell width="app">
        <div className="flex flex-col items-start gap-4 py-16 sm:items-center sm:text-center">
          <h1 className="font-display text-[26px] font-semibold text-ink sm:text-[28px]">
            {t.failedLoadTopics}
          </h1>
          <Button variant="brand" onClick={() => topicsQ.refetch()}>{t.tryAgain}</Button>
        </div>
      </PageShell>
    );
  }

  const bandNames = t.roadmap.band;
  const next = standing.next;
  // Suppressed on first run — "Not started" under a stack you haven't chosen
  // yet is noise, and the picker is the only thing that should be read there.
  const orientation = !showPicker && rungs.length > 0 && (
    // Plain inline text rather than a flex row: the tail is the only part long
    // enough to wrap, and inline wrapping breaks it at a word instead of
    // orphaning a separator at the end of the first line.
    <Link
      to="/roadmap"
      className="rounded-sm text-[15px] leading-relaxed text-ink-2 transition-colors hover:text-ink"
    >
      <span className="font-medium text-ink">{c.trackLine(trackMeta ? copy(t, trackMeta.labelKey) : trackKey ?? '')}</span>
      <span aria-hidden className="text-muted-2"> · </span>
      {standing.level ? rungLabel(standing.level, bandNames) : t.roadmap.notStarted}
      <span aria-hidden className="text-muted-2"> · </span>
      <span className="text-muted">
        {next ? `${t.roadmap.nextUp}: ${rungLabel(next, bandNames)} — ${next.title}` : t.roadmap.allPassed}
      </span>
    </Link>
  );

  return (
    <PageShell width="app">
      <PageHeader
        eyebrow={landingCopy?.eyebrow}
        title={landingCopy ? `${landingCopy.title[0]} ${landingCopy.title[1]}` : t.nav.today}
        subtitle={landingCopy?.desc}
      >
        {orientation || undefined}
      </PageHeader>

      {showPicker && <StackPicker onPicked={() => setPicked(true)} />}

      <TodayPlan eyebrow={landingCopy ? t.nav.today : undefined} />

      {/* One line of continuity under the card: how long you've kept it up,
          and the way into the catalogue. */}
      <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted">
        {streak > 0 && <span>{c.streak(streak)}</span>}
        <Link to="/topics" className="rounded-sm text-brand hover:underline">{t.nav.browseTopics}</Link>
      </p>

      {backendAvailable === true && !token && (
        <p className="mt-3 text-[13px] leading-relaxed text-muted-2">
          {c.localOnly} — <Link to="/login" className="rounded-sm text-brand hover:underline">{c.localOnlySignIn}</Link>.
        </p>
      )}
    </PageShell>
  );
}

function TodaySkeleton() {
  return (
    <PageShell width="app">
      <div className="mb-6 border-b border-rule/12 pb-5 sm:mb-8 sm:pb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-4 h-4 w-72 max-w-full" />
      </div>
      <div className="codex-card p-5 sm:p-7">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full" />
        <Skeleton className="mt-2 h-3.5 w-48" />
        <Skeleton className="mt-6 h-10 w-40 rounded-lg" />
      </div>
      <Skeleton className="mt-5 h-3.5 w-44" />
    </PageShell>
  );
}
