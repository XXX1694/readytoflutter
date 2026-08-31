import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Brain } from 'lucide-react';
import { useTopics, useStats, useResetProgress, useQuestions } from '../lib/queries';
import { getCardState } from '../lib/srs';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { usePrefs } from '../store/prefs';
import { Button, Eyebrow, Skeleton } from '../ui/index';
import StatTile from '../components/StatTile';
import TopicTile from '../components/TopicTile';
import ActivityHeatmap from '../components/ActivityHeatmap';
import TodayPlan from '../components/TodayPlan';
import PlatformFilter from '../components/PlatformFilter';
import { filterTopicsByPlatform } from '../lib/platform';
import { useDocumentMeta } from '../lib/useDocumentMeta';

import type { Level, Topic, Question } from '../types/domain';
import type { LandingConfig } from '../i18n/landings';

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl';

const LEVELS: Level[] = ['junior', 'mid', 'senior'];

/**
 * Cards this topic has waiting in the SRS queue. Lives at module scope so the
 * clock read stays out of the render body.
 */
function countDueByTopic(questions: Question[], now: number = Date.now()): Map<number, number> {
  const map = new Map<number, number>();
  for (const q of questions) {
    const s = getCardState(q.id);
    if (s.reps > 0 && s.dueAt <= now) {
      map.set(q.topic_id, (map.get(q.topic_id) || 0) + 1);
    }
  }
  return map;
}

export interface HomePageProps {
  /**
   * Set on the per-platform SEO routes (/flutter, /ios, /android, /kmp),
   * which render this same dashboard under different hero copy and meta.
   */
  landing?: LandingConfig | null;
}

export default function HomePage({ landing = null }: HomePageProps) {
  const { lang } = useLang();
  const t = useT(lang);
  const { topicTitle, topicDesc } = useContent(lang);
  const setCommandOpen = usePrefs((s) => s.setCommandOpen);
  const platform = usePrefs((s) => s.platform);
  const setPlatform = usePrefs((s) => s.setPlatform);
  const navigate = useNavigate();

  // Landing-page mode: when this HomePage is rendered as /flutter, /ios, etc.
  // we (a) snap the persisted platform filter to match the landing on first
  // visit, and (b) override the hero copy + document head. The mount-only
  // guard is intentional so a user who manually picks a different platform
  // after landing can keep exploring without us snapping it back.
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
  const reset = useResetProgress();

  // Per-topic SRS due counts — computed once and passed into each TopicTile so
  // the dashboard can surface "you have N cards waiting in this topic" without
  // each tile re-walking the SRS map.
  const dueByTopic = useMemo(
    () => countDueByTopic(questionsQ.data ?? []),
    [questionsQ.data],
  );

  // Apply the persisted platform filter; computed before early returns so
  // hooks order stays stable across render branches.
  const topics = useMemo(
    () => filterTopicsByPlatform(topicsQ.data ?? [], platform),
    [topicsQ.data, platform],
  );

  const handleReset = useCallback(async () => {
    if (!window.confirm(t.resetConfirm)) return;
    try {
      await reset.mutateAsync();
      toast.success(t.progressReset);
    } catch {
      toast.error(t.failedReset);
    }
  }, [reset, t]);

  if (topicsQ.isLoading || statsQ.isLoading) {
    return <DashboardSkeleton />;
  }
  if (topicsQ.error) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <p className="font-display text-2xl font-semibold text-ink">{t.failedLoadTopics}</p>
          <Button variant="brand" onClick={() => topicsQ.refetch()}>{t.tryAgain}</Button>
        </div>
      </div>
    );
  }

  const stats = statsQ.data;
  const total = stats?.totalQuestions ?? 0;
  const completed = stats?.completed ?? 0;
  const inProgress = stats?.inProgress ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const totalTopics = topicsQ.data?.length ?? 0;

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {/* HERO — the two lines of the headline are separated by ink weight,
            not by a gradient fill; the type does the work. */}
        <section className="mb-7 sm:mb-14">
          <Eyebrow>
            {landingCopy?.eyebrow ?? (lang === 'ru' ? 'Подготовка к мобильному собесу' : 'Mobile interview prep')}
          </Eyebrow>
          <h1 className="mt-3 font-display text-display-xs font-semibold leading-[1.04] tracking-tightest sm:text-display-md sm:leading-[1.02] lg:text-display-lg">
            {landingCopy ? (
              <>
                <span className="text-muted">{landingCopy.title[0]}</span>
                <br />
                <span className="text-ink">{landingCopy.title[1]}</span>
              </>
            ) : lang === 'ru' ? (
              <>
                <span className="text-muted">Готов к</span>
                <br />
                <span className="text-ink">собеседованию.</span>
              </>
            ) : (
              <>
                <span className="text-muted">Ready for the</span>
                <br />
                <span className="text-ink">interview.</span>
              </>
            )}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2 sm:mt-6 sm:text-[17px]">
            {landingCopy?.desc ?? t.heroDesc}
          </p>

          {/* Scope of the catalogue — concrete content facts, read from the
              live data so they never drift from the seed. */}
          <dl className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-[14px] text-muted sm:mt-7">
            <div>
              <dt className="sr-only">{lang === 'ru' ? 'Темы' : 'Topics'}</dt>
              <dd className="flex items-baseline gap-1.5">
                <span className="num text-[17px] text-ink">{totalTopics || 53}</span>
                <span>{lang === 'ru' ? 'тем' : 'topics'}</span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">{lang === 'ru' ? 'Вопросы' : 'Questions'}</dt>
              <dd className="flex items-baseline gap-1.5">
                <span className="num text-[17px] text-ink">{total || 392}</span>
                <span>{lang === 'ru' ? 'вопросов' : 'questions'}</span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">{lang === 'ru' ? 'Стеки' : 'Stacks'}</dt>
              <dd className="flex items-baseline gap-1.5">
                <span className="num text-[17px] text-ink">4</span>
                <span>{lang === 'ru' ? 'стека · Flutter · iOS · Android · KMP' : 'stacks · Flutter · iOS · Android · KMP'}</span>
              </dd>
            </div>
          </dl>

          {/* Single primary CTA — Mock and Knowledge live in the sidebar /
              bottom-nav, so the hero stays focused on the one action that
              actually moves SRS forward. */}
          <div className="mt-5 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Button
              variant="brand"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => navigate('/study')}
            >
              <Brain className="h-4 w-4" aria-hidden />
              {lang === 'ru' ? 'Начать сессию' : 'Start a session'}
              <kbd className="ml-1 hidden rounded border border-paper/40 px-1.5 py-0.5 font-mono text-[11px] sm:inline">{modKey}S</kbd>
            </Button>
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="hidden items-center gap-2 text-[13px] text-muted hover:text-ink sm:inline-flex"
            >
              <span>{t.searchOpenHint}</span>
              <kbd className="rounded border border-rule/15 px-1.5 py-0.5 font-mono text-[11px]">{modKey}K</kbd>
            </button>
          </div>
        </section>

        {/* TODAY'S PLAN — hoisted above the tally so the very next thing users
            see after the hero is "what should I do right now?". */}
        <section className="mb-6 sm:mb-10">
          <TodayPlan />
        </section>

        {/* PROGRESS — a ruled band of figures, not a rack of KPI cards. The
            completed count carries its denominator so it reads as the tally
            it is; nothing here is coloured, because none of it is an action. */}
        <section className="mb-7 sm:mb-12">
          <Eyebrow className="mb-3">{lang === 'ru' ? 'Прогресс' : 'Progress'}</Eyebrow>
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-rule/12 py-5 sm:grid-cols-3 sm:gap-x-8 sm:py-6">
            <StatTile label={t.completed} value={completed} of={total} />
            <StatTile label={t.inProgress} value={inProgress} />
            <StatTile label={t.completion} value={pct} suffix="%" />
          </div>
        </section>

        {/* ACTIVITY */}
        <section className="mb-8 sm:mb-16">
          <Eyebrow className="mb-3">
            {lang === 'ru' ? 'Активность · 14 недель' : 'Activity · last 14 weeks'}
          </Eyebrow>
          <div className="codex-card p-4 sm:p-6">
            <ActivityHeatmap weeks={14} />
          </div>
        </section>

        {/* PLATFORM FILTER — splits the catalog by stack so Flutter / iOS /
            Android don't compete for the same scroll. Selection persists. */}
        <section className="mb-5 sm:mb-8">
          <PlatformFilter />
        </section>

        {/* LEVELS */}
        <section id="levels">
          {topics.length === 0 && (
            <div className="codex-card flex flex-col items-start gap-3 p-6 sm:items-center sm:text-center">
              <p className="text-[15px] text-ink-2">{t.platformEmpty}</p>
              <Button variant="outline" size="sm" onClick={() => setPlatform('all')}>
                {lang === 'ru' ? 'Показать все стеки' : 'Show every stack'}
              </Button>
            </div>
          )}
          {LEVELS.map((level) => {
            const items = topics.filter((tp: Topic) => tp.level === level);
            if (!items.length) return null;
            const levelT = t[level];
            return (
              <div key={level} className="mb-9 sm:mb-16">
                <header className="mb-4 border-b border-rule/12 pb-3 sm:mb-5">
                  <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                    {levelT.label}
                  </h2>
                  <p className="mt-1 text-[14px] text-muted">
                    {levelT.desc} · {t.topicCount(items.length)}
                  </p>
                </header>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((topic: Topic) => (
                    <TopicTile
                      key={topic.id}
                      topic={topic}
                      t={t}
                      topicTitle={topicTitle}
                      topicDesc={topicDesc}
                      dueCount={dueByTopic.get(topic.id) || 0}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* RESET */}
        {completed > 0 && (
          <div className="mt-8 flex justify-end border-t border-rule/12 pt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted hover:text-coral"
            >
              {t.resetAllProgress}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="bg-page">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {/* Hero */}
        <section className="mb-10 sm:mb-14">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-4 h-12 w-3/4 sm:h-16" />
          <Skeleton className="mt-3 h-12 w-2/3 sm:h-16" />
          <Skeleton className="mt-5 h-5 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-5 w-1/2 max-w-xl" />
          <div className="mt-6 flex flex-wrap gap-3">
            <Skeleton className="h-12 w-44 rounded-lg" />
          </div>
        </section>

        {/* TodayPlan */}
        <section className="mb-8">
          <div className="codex-card p-6">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-8 w-2/3 max-w-md" />
            <Skeleton className="mt-3 h-4 w-1/2 max-w-sm" />
            <Skeleton className="mt-5 h-10 w-48 rounded-lg" />
          </div>
        </section>

        {/* Progress band */}
        <section className="mb-12 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-rule/12 py-6 sm:grid-cols-3 sm:gap-x-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-9 w-16" />
              <Skeleton className="mt-2.5 h-3 w-20" />
            </div>
          ))}
        </section>

        {/* Activity */}
        <section className="mb-12">
          <Skeleton className="mb-4 h-3 w-44" />
          <div className="codex-card p-5">
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 14 * 7 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-3 rounded-sm" />
              ))}
            </div>
          </div>
        </section>

        {/* Topic grid */}
        {[1, 2, 3].map((row) => (
          <section key={row} className="mb-12">
            <Skeleton className="mb-2 h-8 w-56" />
            <Skeleton className="mb-5 h-3 w-40" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="codex-card p-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="mt-3 h-5 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                  <Skeleton className="mt-3 h-4 w-16" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
