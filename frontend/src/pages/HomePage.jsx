import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Command, Target, Brain, Library } from 'lucide-react';
import { useTopics, useStats, useResetProgress, useQuestions } from '../lib/queries.js';
import { getCardState } from '../lib/srs.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { usePrefs } from '../store/prefs.js';
import { Button, Eyebrow, Skeleton } from '../ui/index.js';
import StatTile from '../components/StatTile.jsx';
import TopicTile from '../components/TopicTile.jsx';
import ActivityHeatmap from '../components/ActivityHeatmap.jsx';
import TodayPlan from '../components/TodayPlan.jsx';
import PlatformFilter from '../components/PlatformFilter.jsx';
import { filterTopicsByPlatform } from '../lib/platform.js';

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl';

const LEVELS = ['junior', 'mid', 'senior'];

export default function HomePage() {
  const { lang } = useLang();
  const t = useT(lang);
  const { topicTitle, topicDesc } = useContent(lang);
  const setCommandOpen = usePrefs((s) => s.setCommandOpen);
  const platform = usePrefs((s) => s.platform);
  const navigate = useNavigate();

  const topicsQ = useTopics();
  const statsQ = useStats();
  const questionsQ = useQuestions();
  const reset = useResetProgress();

  // Per-topic SRS due counts — computed once and passed into each TopicTile so
  // the dashboard can surface "you have N cards waiting in this topic" without
  // each tile re-walking the SRS map.
  const dueByTopic = useMemo(() => {
    const map = new Map();
    const now = Date.now();
    const questions = questionsQ.data ?? [];
    for (const q of questions) {
      const s = getCardState(q.id);
      if (s.reps > 0 && s.dueAt <= now) {
        map.set(q.topic_id, (map.get(q.topic_id) || 0) + 1);
      }
    }
    return map;
  }, [questionsQ.data]);

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
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-coral">Error</span>
          <p className="font-display text-2xl text-ink">{t.failedLoadTopics}</p>
          <Button variant="codex" onClick={() => topicsQ.refetch()}>{t.tryAgain}</Button>
        </div>
      </div>
    );
  }

  const stats = statsQ.data;
  const total = stats?.totalQuestions ?? 0;
  const completed = stats?.completed ?? 0;
  const inProgress = stats?.inProgress ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {/* HERO — oversized gradient title, single brand-glow CTA. On
            mobile the type ramps down a step (display-xs) so a 320px
            iPhone SE viewport doesn't overflow, and vertical rhythm is
            tightened to give the dashboard a "above the fold" feel. */}
        <section className="mb-7 sm:mb-14">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rule/12 bg-paper-2/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted backdrop-blur sm:mb-5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-mint aurora-pulse" />
            {lang === 'ru' ? 'Подготовка · Mobile' : 'Interview prep · Mobile'}
          </div>
          <h1 className="font-display text-display-xs font-semibold leading-[1.04] tracking-tightest sm:text-display-md sm:leading-[1.02] lg:text-display-lg xl:text-display-xl">
            {lang === 'ru' ? (
              <>
                <span className="text-ink">Готов к</span>
                <br />
                <span className="text-gradient-brand">собеседованию.</span>
              </>
            ) : (
              <>
                <span className="text-ink">Ready for the</span>
                <br />
                <span className="text-gradient-brand">interview.</span>
              </>
            )}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2 sm:mt-6 sm:text-lg">
            {t.heroDesc}
          </p>

          {/* CTA row — primary is the session you'll actually run today.
              On mobile the primary CTA dominates with full-width 48px touch
              target; secondaries split 50/50 underneath so both stay reachable
              with the thumb. */}
          <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <Button
              variant="brand"
              size="lg"
              className="w-full sm:w-auto sm:size-md"
              onClick={() => navigate('/study')}
            >
              <Brain className="h-4 w-4" />
              {lang === 'ru' ? 'Начать сессию' : 'Start a session'}
              <kbd className="ml-1 hidden rounded border border-white/30 px-1.5 py-0.5 font-mono text-[10px] sm:inline">{modKey}S</kbd>
            </Button>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <Button variant="codex" className="w-full sm:w-auto" onClick={() => navigate('/mock')}>
                <Target className="h-4 w-4" />
                {lang === 'ru' ? 'Mock' : 'Mock'}
                <kbd className="ml-1 hidden rounded border border-rule/15 px-1.5 py-0.5 font-mono text-[10px] sm:inline">{modKey}M</kbd>
              </Button>
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => navigate('/knowledge')}>
                <Library className="h-4 w-4" />
                {lang === 'ru' ? 'База' : 'Knowledge'}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="ml-auto hidden items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-ink sm:inline-flex"
            >
              <Command className="h-3.5 w-3.5" aria-hidden />
              <span>{t.searchOpenHint}</span>
              <kbd className="rounded border border-rule/15 px-1.5 py-0.5 font-mono text-[10px]">{modKey}K</kbd>
            </button>
          </div>
        </section>

        {/* TODAY'S PLAN — hoisted above stats so the very next thing users
            see after the hero is "what should I do right now?". */}
        <section className="mb-6 sm:mb-10">
          <TodayPlan />
        </section>

        {/* STATS */}
        <section className="mb-7 sm:mb-12">
          <Eyebrow className="mb-3 sm:mb-4">
            {lang === 'ru' ? 'Прогресс' : 'Progress'}
          </Eyebrow>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
            <StatTile label={t.totalQuestions} value={total} accent="ink" />
            <StatTile label={t.completed} value={completed} accent="mint" />
            <StatTile label={t.inProgress} value={inProgress} accent="amber" />
            <StatTile label={t.completion} value={pct} suffix="%" accent="brand" />
          </div>
        </section>

        {/* ACTIVITY */}
        <section className="mb-8 sm:mb-16">
          <Eyebrow className="mb-3 sm:mb-4">
            {lang === 'ru' ? 'Активность · 14 недель' : 'Activity · last 14 weeks'}
          </Eyebrow>
          <div className="rounded-md border border-rule/15 bg-paper-2 p-3 shadow-codex-sm sm:p-6">
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
            <div className="rounded-md border border-dashed border-rule/30 bg-paper-2/50 p-8 text-center">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                {t.platformEmpty}
              </p>
            </div>
          )}
          {LEVELS.map((level, idx) => {
            const items = topics.filter((tp) => tp.level === level);
            if (!items.length) return null;
            const levelT = t[level];
            return (
              <div key={level} className="mb-9 sm:mb-16">
                <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-rule/15 pb-3 sm:mb-5">
                  <div>
                    <Eyebrow accent="brand" className="mb-2">
                      {levelT.short}
                    </Eyebrow>
                    <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-4xl">
                      {levelT.label}
                    </h2>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
                      {levelT.desc} · {t.topicCount(items.length)}
                    </p>
                  </div>
                </header>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((topic) => (
                    <TopicTile
                      key={topic.id}
                      topic={topic}
                      level={level}
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
          <div className="mt-8 flex justify-end border-t border-rule pt-6">
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
            <Skeleton className="h-10 w-44 rounded-md" />
            <Skeleton className="h-10 w-52 rounded-md" />
          </div>
        </section>

        {/* Stat tiles */}
        <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-md border border-rule/15 bg-paper-2/80 p-5 shadow-codex-sm">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-8 w-12" />
            </div>
          ))}
        </section>

        {/* TodayPlan */}
        <section className="mb-8">
          <div className="rounded-md border border-rule/15 bg-paper-2/80 p-6 shadow-codex">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-8 w-2/3 max-w-md" />
            <div className="mt-4 flex flex-wrap gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-5 h-10 w-48 rounded-md" />
          </div>
        </section>

        {/* Activity */}
        <section className="mb-12">
          <Skeleton className="mb-4 h-3 w-44" />
          <div className="rounded-md border border-rule/15 bg-paper-2/80 p-5 shadow-codex-sm">
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 14 * 7 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-3 rounded-[3px]" />
              ))}
            </div>
          </div>
        </section>

        {/* Topic grid */}
        {[1, 2, 3].map((row) => (
          <section key={row} className="mb-12">
            <Skeleton className="mb-3 h-3 w-24" />
            <Skeleton className="mb-2 h-8 w-56" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-md border border-rule/15 bg-paper-2/80 p-4 shadow-codex-sm">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <Skeleton className="mt-3 h-5 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                  <Skeleton className="mt-3 h-2 w-full" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
