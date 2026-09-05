import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTopics, useStats, useQuestions, useRoadmap } from '../lib/queries';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useHomeCopy } from '../i18n/homePage';
import { usePrefs } from '../store/prefs';
import { useAuth } from '../store/auth';
import { Button, PageShell, PageHeader, Skeleton } from '../ui/index';
import TodayPlan from '../components/TodayPlan';
import StackPicker, { STACK_PICKER_KEY } from '../components/StackPicker';
import { PLATFORMS, filterTopicsByPlatform } from '../lib/platform';
import { stackTileStyle } from '../lib/stackMeta';
import { routeAt } from '../lib/routes';
import { computeStreaks } from '../lib/activity';
import { computeStanding, pickTrack, resolveTrack, rungLabel } from '../lib/roadmap';
import { useDocumentMeta } from '../lib/useDocumentMeta';

import type { QuestionSummary as Question, Topic } from '../types/domain';
import type { LandingConfig } from '../i18n/landings';

const NO_TOPICS: Topic[] = [];
const NO_QUESTIONS: Question[] = [];

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
  // Deliberately NOT the roadmap page's own `roadmapTrack`: one tap there
  // persists a track forever, which then pinned Today's standing to a stack
  // the header no longer points at (and showed a standing for Cross-platform /
  // Mobile, which have no roadmap). The roadmap page keeps its own choice.
  const trackKey = pickTrack(null, platform);
  const trackMeta = PLATFORMS.find((p) => p.key === trackKey);
  const rungs = useMemo(
    () => (roadmapQ.data && trackKey ? resolveTrack(roadmapQ.data, trackKey, topics, questions, lang) : []),
    [roadmapQ.data, trackKey, topics, questions, lang],
  );
  const standing = useMemo(() => computeStanding(rungs), [rungs]);

  // Streaks come from the local progress log plus the SRS review log. For a
  // signed-in user the progress map is cleared at login (it now lives on the
  // server), so the figure reflects study-session activity in this browser
  // rather than the full account history. One localStorage parse per render,
  // and this page renders rarely.
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
    // Where you stand, in one line. What comes next is the card under the plan.
    <Link
      to="/roadmap"
      className="rounded-sm text-[15px] leading-relaxed text-ink-2 transition-colors hover:text-ink"
    >
      <span className="font-semibold text-brand">{c.trackLine(trackMeta ? t[trackMeta.labelKey] : trackKey ?? '')}</span>
      <span aria-hidden className="text-muted-2"> · </span>
      {standing.level ? rungLabel(standing.level, bandNames) : t.roadmap.notStarted}
    </Link>
  );

  const scopedTopics = filterTopicsByPlatform(topics, platform);
  const scopedQuestions = scopedTopics.reduce((s, tp) => s + (tp.question_count || 0), 0);
  const roadmapRoute = routeAt('/roadmap');
  const topicsRoute = routeAt('/topics');

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

      {/* Two quiet cards under the painted one: the next level on the
          roadmap, and the way into the catalogue. Explicit `grid-cols-1`: an
          implicit `auto` column will not shrink below the nowrap title's
          width and pushes the card past 360px. */}
      {!showPicker && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rungs.length > 0 && roadmapRoute && (
            <Link to="/roadmap" className="codex-card group flex min-w-0 items-center gap-3.5 p-4 transition-colors hover:border-brand/40">
              <span className="stack-tile stack-tile--soft h-10 w-10 rounded-[11px]" style={stackTileStyle(platform)}>
                <roadmapRoute.icon className="h-5 w-5" strokeWidth={1.9} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-muted">{next ? t.roadmap.nextUp : t.nav.roadmap}</span>
                <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
                  {next ? `${rungLabel(next, bandNames)} — ${next.title}` : t.roadmap.allPassed}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-2 transition-colors group-hover:text-brand" aria-hidden />
            </Link>
          )}
          {topicsRoute && (
            <Link to="/topics" className="codex-card group flex min-w-0 items-center gap-3.5 p-4 transition-colors hover:border-brand/40">
              <span className="stack-tile stack-tile--soft h-10 w-10 rounded-[11px]" style={stackTileStyle(platform)}>
                <topicsRoute.icon className="h-5 w-5" strokeWidth={1.9} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-muted">{t.nav.browseTopics}</span>
                <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{c.catalogueLine(scopedTopics.length, scopedQuestions)}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-2 transition-colors group-hover:text-brand" aria-hidden />
            </Link>
          )}
        </div>
      )}

      {/* Live coding has no rail or tab-bar slot — DESIGN rule 10 — so Today
          is where it is discovered, as a line rather than a third card. */}
      {!showPicker && (
        <p className="mt-4 text-[13px] text-muted">
          <Link to="/live" className="rounded-sm font-medium text-brand hover:underline">{t.nav.live}</Link>
          {' — '}
          {c.liveHook}
        </p>
      )}

      {streak > 0 && (
        <p className="mt-5 text-[13px] text-muted">{c.streak(streak)}</p>
      )}

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
