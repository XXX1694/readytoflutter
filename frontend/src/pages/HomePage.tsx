import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useTopics, useStats, useQuestions, useRoadmap } from '../lib/queries';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { useHomeCopy, type HomeCopy } from '../i18n/homePage';
import { usePrefs } from '../store/prefs';
import { useAuth } from '../store/auth';
import { Button, Chip, ChipGroup, List, ListRow, PageShell, PageHeader, Section, Skeleton } from '../ui/index';
import TodayPlan from '../components/TodayPlan';
import StackPicker, { STACK_PICKER_KEY } from '../components/StackPicker';
import { PLATFORMS, filterTopicsByPlatform } from '../lib/platform';
import { stackTileStyle } from '../lib/stackMeta';
import { StackIcon } from '../lib/stackIcons';
import { useChooseStack, useStackOptions } from '../lib/useStack';
import { prefetch } from '../lib/prefetch';
import { routeAt, routeLabel } from '../lib/routes';
import { computeStreaks } from '../lib/activity';
import { computeStanding, pickTrack, resolveTrack, rungLabel } from '../lib/roadmap';
import { forecast, targetMoment } from '../lib/readiness';
import { useReadinessCopy, shortDate } from '../i18n/readiness';
import { useDocumentMeta } from '../lib/useDocumentMeta';

import type { PlatformKey, QuestionSummary as Question, Topic } from '../types/domain';
import type { LandingConfig } from '../i18n/landings';

/** Every destination the site has, in the order a reader needs them. */
const DESTINATIONS = ['/roadmap', '/study', '/mock', '/live', '/topics', '/knowledge', '/bookmarks', '/stats', '/search'];

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
 * The front page, read by two people.
 *
 * Someone with progress opens it as **Today**: a title, where they stand in
 * one line, the plan card, and the way on. That is the whole screen for them
 * — the pitch is over, and repeating it would be noise.
 *
 * Someone with none opens it as the **pitch**: what this is, what it costs
 * (nothing), which stack they are here for, and the same plan card as the one
 * button that matters. Under it, the site's own index — every destination
 * with a line saying what it does — then how the habit works and what is in
 * the box. Nothing here is a second primary action: the painted card keeps
 * that job (DESIGN.md rules 8 and 11).
 *
 * The four SEO landings (/flutter, /ios, /android, /kmp) are this page with
 * their own hero and their stack pre-applied; they always pitch.
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
  // The bare `/` is reachable as `/`, `/?stack=flutter`, `/?stack=ios`… — all
  // one page to us and four URLs to a crawler — so it needs a canonical of its
  // own, not just the landings'. Trailing slash on purpose: that is the form
  // GitHub Pages answers 200 (and the sitemap's), the slashless one 301s.
  useDocumentMeta({
    title: landingCopy?.docTitle ?? c.docTitle,
    description: landingCopy?.metaDesc ?? c.metaDesc,
    canonical: landing?.canonical ?? '/',
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

  // One reading of the clock, so the forecast cannot shift between renders.
  const [now] = useState(() => Date.now());
  // The interview date turns the orientation line into a forecast. Null when
  // no date is set, which is the common case — the line stays as it was.
  const targetDate = usePrefs((s) => s.targetDate);
  const readinessCopy = useReadinessCopy(lang);
  const readyLine = useMemo(() => {
    const targetAt = targetDate ? targetMoment(targetDate) : null;
    if (!targetAt || !rungs.length) return null;
    const pct = Math.round(forecast(rungs, standing, targetAt, now).recall * 100);
    return readinessCopy.readyBy(pct, shortDate(targetAt, lang));
  }, [targetDate, rungs, standing, now, lang, readinessCopy]);

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
    // `py-1` lifts the hit box clear of the WCAG 2.2 AA 24px minimum — an
    // inline <a> is only as tall as its glyphs — and `-my-1` gives the padding
    // back to the layout, so nothing moves.
    <Link
      to="/roadmap"
      className="-my-1 inline-block rounded-sm py-1 text-[15px] leading-relaxed text-ink-2 transition-colors hover:text-ink"
    >
      <span className="font-semibold text-brand">{c.trackLine(trackMeta ? t[trackMeta.labelKey] : trackKey ?? '')}</span>
      <span aria-hidden className="text-muted-2"> · </span>
      {standing.level ? rungLabel(standing.level, bandNames) : t.roadmap.notStarted}
      {readyLine && (
        <>
          <span aria-hidden className="text-muted-2"> · </span>
          <span className="num">{readyLine}</span>
        </>
      )}
    </Link>
  );

  const scopedTopics = filterTopicsByPlatform(topics, platform);
  const scopedQuestions = scopedTopics.reduce((s, tp) => s + (tp.question_count || 0), 0);
  const roadmapRoute = routeAt('/roadmap');
  const topicsRoute = routeAt('/topics');

  // Pitch mode: a landing always sells, and so does `/` until there is
  // progress to report. The moment the reader has answered something, the
  // page is Today and the pitch drops away for good.
  const pitching = Boolean(landing) || !touched;
  // The whole catalogue, not the active stack's slice — the proof line is
  // about what the site holds, not about what is filtered on screen.
  const allQuestions = topics.reduce((s, tp) => s + (tp.question_count || 0), 0);

  return (
    <PageShell width="app">
      <PageHeader
        eyebrow={landingCopy?.eyebrow}
        title={landingCopy ? `${landingCopy.title[0]} ${landingCopy.title[1]}` : pitching ? c.heroTitle : t.nav.today}
        subtitle={landingCopy?.desc ?? (pitching ? c.heroDesc : undefined)}
      >
        {pitching ? (
          // The figures, said once, in the header rather than as a rack of
          // stat tiles: what is here, and that it costs nothing.
          <p className="text-[14px] leading-relaxed text-muted">
            {[c.proofQuestions(allQuestions), c.proofTopics(topics.length), c.proofStacks(PLATFORMS.length - 1), c.proofFree].join(' · ')}
          </p>
        ) : (orientation || undefined)}
      </PageHeader>

      {showPicker && <StackPicker onPicked={() => setPicked(true)} />}

      {/* The stack, chosen on the page that sells. Everywhere else the rail
          and the phone header carry this control (DESIGN.md rule 16) — here
          it is half the pitch, so it is said out loud once. */}
      {pitching && !showPicker && <StackStrip c={c} />}

      <TodayPlan eyebrow={landingCopy ? t.nav.today : undefined} />

      {/* Two quiet cards under the painted one: the next level on the
          roadmap, and the way into the catalogue. Explicit `grid-cols-1`: an
          implicit `auto` column will not shrink below the nowrap title's
          width and pushes the card past 360px. */}
      {!showPicker && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rungs.length > 0 && roadmapRoute && (
            <Link to="/roadmap" className="codex-card pressable pressable-lg group flex min-w-0 items-center gap-3.5 p-4 hover:border-brand/40">
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
            <Link to="/topics" className="codex-card pressable pressable-lg group flex min-w-0 items-center gap-3.5 p-4 hover:border-brand/40">
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

      {streak > 0 && (
        <p className="mt-5 text-[13px] text-muted">{c.streak(streak)}</p>
      )}

      {!pitching && backendAvailable === true && !token && (
        <p className="mt-3 text-[13px] leading-relaxed text-muted-2">
          {c.localOnly} — <Link to="/login" className="rounded-sm text-brand hover:underline">{c.localOnlySignIn}</Link>.
        </p>
      )}

      {/* The site's own index. Live coding, the timed session and search have
          no rail or tab-bar slot (DESIGN.md rule 10), so this list is where
          they are found — and for a first-time reader it is the answer to
          "what do I actually get". */}
      <Destinations c={c} t={t} platform={platform} topics={scopedTopics.length} questions={scopedQuestions} />

      {pitching && (
        <>
          <HowItWorks c={c} />
          <WhatYouGet c={c} />
          <Closing c={c} t={t} account={backendAvailable === true && !token} />
        </>
      )}
    </PageShell>
  );
}

/** The stack switch as the pitch: six chips, the active one filled. */
function StackStrip({ c }: { c: HomeCopy }) {
  const platform = usePrefs((s) => s.platform);
  const options = useStackOptions();
  const choose = useChooseStack('home');
  return (
    <Section title={c.stackTitle} subtitle={c.stackDesc} className="mb-6 sm:mb-8">
      <ChipGroup ariaLabel={c.stackTitle} scroll>
        {options.map((o) => (
          <Chip
            key={o.key}
            active={o.key === platform}
            icon={<StackIcon stack={o.key} />}
            count={o.count}
            onClick={() => choose(o.key)}
          >
            {o.label}
          </Chip>
        ))}
      </ChipGroup>
    </Section>
  );
}

export interface DestinationsProps {
  c: HomeCopy;
  t: UICopy;
  platform: PlatformKey;
  topics: number;
  questions: number;
}

/** Every place the app can take you, one row each, named from lib/routes. */
function Destinations({ c, t, platform, topics, questions }: DestinationsProps) {
  const meta: Record<string, string> = {
    '/roadmap': c.destRoadmap,
    '/study': c.destSession,
    '/mock': c.destTimed,
    '/live': c.liveHook,
    '/topics': c.destTopics(topics, questions),
    '/knowledge': c.destSources,
    '/bookmarks': c.destSaved,
    '/stats': c.destProgress,
    '/search': c.destSearch,
  };
  return (
    <Section title={c.everythingTitle} subtitle={c.everythingDesc(questions)} className="mt-10 sm:mt-14">
      <List>
        {DESTINATIONS.map((path) => {
          const route = routeAt(path);
          if (!route) return null;
          return (
            <ListRow
              key={path}
              to={path}
              onPointerDown={() => prefetch(path)}
              leading={
                <span className="stack-tile stack-tile--soft h-9 w-9 rounded-[10px]" style={stackTileStyle(platform)}>
                  <route.icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
                </span>
              }
              title={routeLabel(t, route)}
              meta={meta[path]}
            />
          );
        })}
      </List>
    </Section>
  );
}

/** Three steps, because what is being sold is a habit, not a feature list. */
function HowItWorks({ c }: { c: HomeCopy }) {
  const steps: Array<[string, string]> = [
    [c.step1, c.step1Body],
    [c.step2, c.step2Body],
    [c.step3, c.step3Body],
  ];
  return (
    <Section title={c.howTitle}>
      <ol className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
        {steps.map(([title, body], i) => (
          <li key={title} className="border-t border-rule/12 pt-3">
            <span className="num block text-[13px] text-brand">{i + 1}</span>
            <h3 className="mt-1.5 font-display text-[16px] font-semibold leading-snug text-ink">{title}</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** What is in the box, in six lines that are all true without a backend. */
function WhatYouGet({ c }: { c: HomeCopy }) {
  const lines = [c.why1, c.why2, c.why3, c.why4, c.why5, c.why6];
  return (
    <Section title={c.whyTitle}>
      <ul className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
        {lines.map((line) => (
          <li key={line} className="flex gap-2.5 text-[14.5px] leading-relaxed text-ink-2">
            <Check className="mt-[3px] h-4 w-4 shrink-0 text-brand" strokeWidth={2.25} aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * The last thing a long page says. With a backend behind it, that is the one
 * sign-up ask on the screen; without one — the Pages build — there is nothing
 * to sign up for, so it points back at the cards. Outline, not filled: the
 * painted card above keeps the one primary action (DESIGN.md rule 8).
 */
function Closing({ c, t, account }: { c: HomeCopy; t: UICopy; account: boolean }) {
  return (
    <div className="codex-card mb-10 flex flex-col gap-4 p-5 sm:mb-14 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="min-w-0">
        <h2 className="font-display text-[17px] font-semibold leading-tight text-ink">
          {account ? c.accountTitle : c.closingTitle}
        </h2>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">{account ? c.accountBody : c.closingBody}</p>
      </div>
      <Button asChild variant="outline" className="shrink-0">
        <Link to={account ? '/signup' : '/study'}>{account ? c.accountCta : t.nav.startSession}</Link>
      </Button>
    </div>
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
