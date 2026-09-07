import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTopics, useStats, useQuestions, useRoadmap } from '../lib/queries';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { useHomeCopy, type HomeCopy } from '../i18n/homePage';
import { usePrefs } from '../store/prefs';
import { useAuth } from '../store/auth';
import { Button, List, ListRow, PageShell, PageHeader, Section, Skeleton } from '../ui/index';
import TodayPlan from '../components/TodayPlan';
import StackPicker, { STACK_PICKER_KEY } from '../components/StackPicker';
import StackRibbon from '../components/StackRibbon';
import Standing from '../components/Standing';
import { PLATFORMS, filterTopicsByPlatform } from '../lib/platform';
import { prefetch } from '../lib/prefetch';
import { routeAt, routeLabel } from '../lib/routes';
import { computeStreaks } from '../lib/activity';
import { computeStanding, pickTrack, resolveTrack } from '../lib/roadmap';
import { forecast, targetMoment } from '../lib/readiness';
import { useReadinessCopy, shortDate } from '../i18n/readiness';
import { useDocumentMeta } from '../lib/useDocumentMeta';

import type { QuestionSummary as Question, Topic } from '../types/domain';
import type { LandingConfig } from '../i18n/landings';

/**
 * Every destination the site has, in three groups: what you study from, how
 * you practise, and what is yours. Search is not listed — the header carries
 * it on every width.
 */
type GroupKey = 'learn' | 'practice' | 'yours';
const GROUPS: Array<{ key: GroupKey; paths: string[] }> = [
  { key: 'learn', paths: ['/roadmap', '/topics', '/knowledge'] },
  { key: 'practice', paths: ['/study', '/mock', '/live'] },
  { key: 'yours', paths: ['/bookmarks', '/stats'] },
];

const NO_TOPICS: Topic[] = [];
const NO_QUESTIONS: Question[] = [];
const NO_HIDDEN = new Set<string>();

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
 * Someone with progress opens it as **Today**: the date and the streak under
 * the title, the plan card as a full-width plate, one ruled row saying where
 * they stand on the ladder, and the index of what is not already on screen.
 * That is the whole screen for them — the pitch is over, and repeating it
 * would be noise.
 *
 * Someone with none opens it as the **pitch**, set like a book's title page:
 * the headline at display size with the same plan card beside it as the
 * plate (under it, on narrower screens), the stack ribbon on phones where
 * there is no rail to carry the choice, then the site's own index in three
 * groups, how the habit works and what is in the box. Nothing below the card
 * is a second primary action (DESIGN.md rules 8, 11 and 18).
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
  // Mobile, everything) means no standing row rather than Flutter's.
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

  // One reading of the clock, so the dateline and the forecast cannot shift
  // between renders.
  const [now] = useState(() => Date.now());
  // The interview date turns the standing's meta line into a forecast. Null
  // when no date is set, which is the common case.
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

  // First run: the stack question, asked in the card's place. `picked` is
  // state rather than a bare storage read so choosing drops the picker without
  // a reload; `justPicked` lets the card that replaces it fade in — a state
  // change, so it may move (DESIGN.md rule 5).
  const [picked, setPicked] = useState(stackPicked);
  const [justPicked, setJustPicked] = useState(false);
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

  const scopedTopics = filterTopicsByPlatform(topics, platform);
  const scopedQuestions = scopedTopics.reduce((s, tp) => s + (tp.question_count || 0), 0);

  // Pitch mode: a landing always sells, and so does `/` until there is
  // progress to report. The moment the reader has answered something, the
  // page is Today and the pitch drops away for good.
  const pitching = Boolean(landing) || !touched;
  // The whole catalogue, not the active stack's slice — the proof line is
  // about what the site holds, not about what is filtered on screen.
  const allQuestions = topics.reduce((s, tp) => s + (tp.question_count || 0), 0);
  const proof = [c.proofQuestions(allQuestions), c.proofTopics(topics.length), c.proofLangs, c.proofFree];
  // Today's subtitle: the date, and the streak when there is one.
  const todayLine = [c.dateline(now), streak > 0 ? c.streak(streak) : null].filter(Boolean).join(' · ');

  const standingShown = !pitching && rungs.length > 0;
  // Today does not list what is already on the screen: the card is the way
  // into a session, and the standing row is the way onto the roadmap.
  const hidden = pitching ? NO_HIDDEN : new Set(standingShown ? ['/study', '/roadmap'] : ['/study']);

  return (
    <PageShell width="app">
      <PageHeader
        size={pitching ? 'display' : 'page'}
        eyebrow={landingCopy?.eyebrow}
        title={landingCopy ? `${landingCopy.title[0]} ${landingCopy.title[1]}` : pitching ? c.heroTitle : t.nav.today}
        subtitle={landingCopy?.desc ?? (pitching ? c.heroDesc : todayLine)}
        aside={
          pitching
            ? showPicker
              ? <StackPicker onPicked={() => { setPicked(true); setJustPicked(true); }} />
              : (
                <TodayPlan
                  layout="column"
                  eyebrow={landingCopy ? t.nav.today : undefined}
                  className={justPicked ? 'animate-fade-in' : undefined}
                />
              )
            : undefined
        }
      >
        {pitching && (
          <>
            {/* The figures, said once, in a line rather than as a rack of
                stat tiles: what is here, in which languages, and that it
                costs nothing. */}
            <p className="text-[13px] leading-relaxed text-muted">
              {/* Each part unbreakable, so a narrow column wraps between
                  the figures and never leaves one word on a line of its own. */}
              {proof.map((part, i) => (
                <span key={part}>
                  {i > 0 && <span aria-hidden> · </span>}
                  <span className="whitespace-nowrap">{part}</span>
                </span>
              ))}
            </p>
            {/* The stack, chosen on the page that sells — on screens without
                the rail, which carries this choice everywhere else (DESIGN.md
                rule 16). On first run the picker in the aside is the control.
                20px under the proof line: the ribbon's own 6px of padding
                (room for the focus ring) plus 14px here. */}
            {!showPicker && <StackRibbon className="mt-[14px] lg:hidden" />}
          </>
        )}
      </PageHeader>

      {!pitching && <TodayPlan layout="plate" />}

      {standingShown && (
        <Standing
          rungs={rungs}
          standing={standing}
          bandNames={t.roadmap.band}
          trackLabel={trackMeta ? t[trackMeta.labelKey] : trackKey ?? ''}
          readyLine={readyLine}
          t={t}
          c={c}
        />
      )}

      {!pitching && backendAvailable === true && !token && (
        <p className="mt-3 text-[13px] leading-relaxed text-muted-2">
          {c.localOnly} — <Link to="/login" className="rounded-sm text-brand hover:underline">{c.localOnlySignIn}</Link>.
        </p>
      )}

      {/* The site's own index. Live coding and the timed session have no rail
          or tab-bar slot (DESIGN.md rule 10), so this list is where they are
          found — and for a first-time reader it is the answer to "what do I
          actually get". */}
      <Destinations
        c={c}
        t={t}
        topics={scopedTopics.length}
        questions={scopedQuestions}
        hidden={hidden}
        subtitle={pitching ? c.everythingDesc(scopedQuestions) : undefined}
      />

      {pitching && (
        <>
          <HowItWorks c={c} />
          <WhatYouGet c={c} account={backendAvailable === true && !token} />
        </>
      )}
    </PageShell>
  );
}

export interface DestinationsProps {
  c: HomeCopy;
  t: UICopy;
  topics: number;
  questions: number;
  /** Destinations already on the screen above, left out of the index. */
  hidden: Set<string>;
  subtitle?: string;
}

/**
 * Every place the app can take you, one ruled row each, named from
 * lib/routes, in three groups with a run-in label. The icon is a glyph in
 * the margin, not a tile: nine tinted squares in a column were nine of the
 * same thing, and the card above already spends the colour.
 */
function Destinations({ c, t, topics, questions, hidden, subtitle }: DestinationsProps) {
  const meta: Record<string, string> = {
    '/roadmap': c.destRoadmap,
    '/study': c.destSession,
    '/mock': c.destTimed,
    '/live': c.liveHook,
    '/topics': c.destTopics(topics, questions),
    '/knowledge': c.destSources,
    '/bookmarks': c.destSaved,
    '/stats': c.destProgress,
  };
  const labels: Record<GroupKey, string> = {
    learn: c.groupLearn,
    practice: c.groupPractice,
    yours: c.groupYours,
  };
  return (
    <Section title={c.everythingTitle} subtitle={subtitle} className="mt-10 sm:mt-14">
      <div className="space-y-8">
        {GROUPS.map((group) => {
          const paths = group.paths.filter((path) => !hidden.has(path));
          if (!paths.length) return null;
          return (
            <div key={group.key} className="lg:grid lg:grid-cols-[160px_minmax(0,1fr)] lg:gap-x-8">
              {/* 13px, not the row's 18px of padding: the 12px label then sits on
                  the first title's baseline instead of 5px under it. */}
              <h3 className="eyebrow mb-2 lg:mb-0 lg:pt-[13px]">{labels[group.key]}</h3>
              <List>
                {paths.map((path) => {
                  const route = routeAt(path);
                  if (!route) return null;
                  return (
                    <ListRow
                      key={path}
                      to={path}
                      onPointerDown={() => prefetch(path)}
                      leading={
                        <span className="flex w-9 justify-center">
                          <route.icon className="h-[18px] w-[18px] text-muted" strokeWidth={1.9} aria-hidden />
                        </span>
                      }
                      title={routeLabel(t, route)}
                      meta={meta[path]}
                    />
                  );
                })}
              </List>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/** Three steps in one column, because what is being sold is a habit, not a feature list. */
function HowItWorks({ c }: { c: HomeCopy }) {
  const steps: Array<[string, string]> = [
    [c.step1, c.step1Body],
    [c.step2, c.step2Body],
    [c.step3, c.step3Body],
  ];
  return (
    <Section title={c.howTitle}>
      <ol className="max-w-[60ch] list-none space-y-6">
        {steps.map(([title, body], i) => (
          <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2">
            <span className="num pt-[3px] text-[15px] leading-[1.35] text-brand" aria-hidden>{i + 1}</span>
            <div>
              <h3 className="font-display text-[17px] font-semibold leading-snug text-ink">{title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/**
 * What is in the box, as two paragraphs that are all true without a backend.
 * With a backend behind it, one quiet line under them is the page's only
 * sign-up ask — there is no closing card: the painted card above keeps the
 * one primary action (DESIGN.md rule 8).
 */
function WhatYouGet({ c, account }: { c: HomeCopy; account: boolean }) {
  return (
    <Section title={c.whyTitle}>
      <div className="max-w-[60ch] space-y-4 text-[15px] leading-relaxed text-ink-2">
        <p>{[c.why1, c.why2, c.why3].join(' ')}</p>
        <p>{[c.why4, c.why5, c.why6].join(' ')}</p>
      </div>
      {account && (
        <p className="mt-6 text-[13px] leading-relaxed text-muted">
          {c.accountBody}{' '}
          <Link to="/signup" className="rounded-sm text-brand hover:underline">{c.accountCta}</Link>
        </p>
      )}
    </Section>
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
