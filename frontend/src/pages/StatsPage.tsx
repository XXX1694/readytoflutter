import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useTopics, useQuestions } from '../lib/queries';
import { getCardState, readAll } from '../lib/srs';
import { computeStreaks } from '../lib/activity';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent, type ContentHelpers } from '../i18n/content';
import { useStatsCopy, type StatsCopy } from '../i18n/statsPage';
import { PageShell, PageHeader, Section, List, ListRow, Meter, Skeleton, TopicGlyph } from '../ui/index';
import StatTile from '../components/StatTile';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { usePrefs } from '../store/prefs';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import {
  filterTopicsByPlatform,
  filterQuestionsByPlatform,
  topicPlatform,
  PLATFORMS,
  PLATFORM_GROUPS,
  type Platform,
} from '../lib/platform';

import type { Level, Topic, QuestionSummary as Question } from '../types/domain';
import { categoryLabel } from '../i18n/categories';

const LEVELS: Level[] = ['junior', 'mid', 'senior'];
const NO_TOPICS: Topic[] = [];
const NO_QUESTIONS: Question[] = [];
const HEATMAP_WEEKS = 14;
/** Both short lists are a glance, not a backlog. */
const LIST_MAX = 5;
/** Under this share completed, a started topic is still worth a review. */
const REVIEW_THRESHOLD = 0.8;

interface TopicRow {
  topic: Topic;
  total: number;
  completed: number;
  /** Cards with at least one review whose `dueAt` has passed. */
  due: number;
  /** Cards reviewed at least once — "you have touched this topic". */
  seen: number;
  /** 0–1. The one progress fraction; nothing here blends in SM-2 ease. */
  ratio: number;
}

interface LevelCell {
  total: number;
  completed: number;
}

interface StackRow {
  group: Platform;
  byLevel: Record<Level, LevelCell>;
  total: number;
  completed: number;
}

/** Roll every topic up against its questions and their SRS card state. */
function buildRows(topics: Topic[], questions: Question[], now: number = Date.now()): TopicRow[] {
  // One localStorage read + parse for every card, not one per question.
  const cards = readAll();
  const byTopic = new Map<number, Question[]>();
  for (const q of questions) {
    const list = byTopic.get(q.topic_id);
    if (list) list.push(q);
    else byTopic.set(q.topic_id, [q]);
  }
  return topics.map((topic) => {
    const items = byTopic.get(topic.id) ?? [];
    let completed = 0;
    let due = 0;
    let seen = 0;
    for (const q of items) {
      if (q.status === 'completed') completed += 1;
      const s = getCardState(q.id, cards);
      if (s.reps > 0) {
        seen += 1;
        if (s.dueAt <= now) due += 1;
      }
    }
    return {
      topic,
      total: items.length,
      completed,
      due,
      seen,
      ratio: items.length > 0 ? completed / items.length : 0,
    };
  });
}

/**
 * Progress: one figure, said once — completed questions over the total in the
 * active stack — then the days you worked, the topics to go back to, and the
 * catalogue by level.
 *
 * The page it replaces called a blend of completion and SM-2 ease "mastery",
 * printed it four ways, labelled untouched topics "weakest", and ran a blue
 * wash behind fifty-three topic names. The meter now sits in its own column
 * beside the name, and the stack comes from the header control rather than a
 * second chip row.
 */
export default function StatsPage() {
  const { lang } = useLang();
  const t = useT(lang);
  const c = useStatsCopy(lang);
  const { topicTitle } = useContent(lang);
  const platform = usePrefs((s) => s.platform);

  const topicsQ = useTopics();
  const questionsQ = useQuestions();

  useDocumentMeta({
    title: `${t.nav.progress} — Onsite`,
    canonical: '/stats',
  });

  const allTopics = topicsQ.data ?? NO_TOPICS;
  const allQuestions = questionsQ.data ?? NO_QUESTIONS;

  // Every figure below is scoped to the active stack: "47 / 392 across every
  // platform" says nothing about how ready you are for an iOS interview.
  const rows = useMemo(() => {
    const topics = filterTopicsByPlatform(allTopics, platform);
    const questions = filterQuestionsByPlatform(allQuestions, allTopics, platform);
    return buildRows(topics, questions);
  }, [allTopics, allQuestions, platform]);

  const streaks = useMemo(() => computeStreaks(), []);

  const stackBreakdown = useMemo(
    () => (platform === 'all' ? buildStackBreakdown(allTopics, allQuestions) : []),
    [allTopics, allQuestions, platform],
  );

  const totals = rows.reduce(
    (acc, r) => ({ completed: acc.completed + r.completed, total: acc.total + r.total, due: acc.due + r.due }),
    { completed: 0, total: 0, due: 0 },
  );

  // Started, and either owed a review or still short of the pass mark. Never
  // an untouched topic — those get their own list and their own honest name.
  const needsReview = rows
    .filter((r) => r.total > 0 && (r.completed > 0 || r.seen > 0) && (r.due > 0 || r.ratio < REVIEW_THRESHOLD))
    .sort((a, b) => a.ratio - b.ratio || b.due - a.due)
    .slice(0, LIST_MAX);

  const notStarted = rows.filter((r) => r.total > 0 && r.completed === 0 && r.seen === 0).slice(0, LIST_MAX);

  const stackMeta = PLATFORMS.find((p) => p.key === platform);
  const stackLabel = stackMeta ? t[stackMeta.labelKey] : platform;

  if (topicsQ.isLoading || questionsQ.isLoading) return <StatsSkeleton />;

  return (
    <PageShell width="app">
      <PageHeader
        eyebrow={`${t.nav.stack} · ${stackLabel}`}
        title={t.nav.progress}
        subtitle={
          platform === 'all'
            ? c.subtitleAll(totals.completed, totals.total)
            : c.subtitle(totals.completed, totals.total, stackLabel)
        }
        actions={
          <Link to="/roadmap" className="inline-flex items-center gap-1 text-[13px] text-brand hover:underline">
            {t.nav.roadmap}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        }
      />

      {/* The figures, as one ruled band — the pen's blue lands on the only
          one that is a progress figure. */}
      <section className="mb-10 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-rule/12 py-5 sm:mb-14 sm:grid-cols-4 sm:gap-x-8 sm:py-6">
        <StatTile label={c.completed} value={totals.completed} of={totals.total} marked />
        <StatTile label={c.dueToday} value={totals.due} />
        <StatTile label={c.streak} value={streaks.current} unit={c.days} />
        <StatTile label={c.activeDays} value={streaks.totalDays} />
      </section>

      <Section title={c.activity(HEATMAP_WEEKS)} subtitle={c.activityHint}>
        <ActivityHeatmap weeks={HEATMAP_WEEKS} />
      </Section>

      {needsReview.length > 0 && (
        <Section title={c.needsReview} subtitle={c.needsReviewHint}>
          <TopicList rows={needsReview} c={c} topicTitle={topicTitle} />
        </Section>
      )}

      {notStarted.length > 0 && (
        <Section title={c.notStarted} subtitle={c.notStartedHint}>
          <TopicList rows={notStarted} c={c} topicTitle={topicTitle} />
        </Section>
      )}

      {stackBreakdown.length > 0 && (
        <Section title={c.byStack} subtitle={c.byStackHint}>
          <div className="overflow-x-auto" tabIndex={0} role="group" aria-label={c.byStack}>
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="border-b border-rule/12 text-[13px] text-muted">
                  <th className="py-2 pr-4 font-normal"><span className="sr-only">{c.colTrack}</span></th>
                  {LEVELS.map((lv) => (
                    <th key={lv} className="px-3 py-2 font-normal">{t[lv].short}</th>
                  ))}
                  <th className="py-2 pl-3 text-right font-normal">{c.colTotal}</th>
                </tr>
              </thead>
              <tbody>
                {stackBreakdown.map((row) => (
                  <tr key={row.group.key} className="border-b border-rule/8 last:border-b-0">
                    <td className="py-2.5 pr-4 font-display text-[15px] font-medium text-ink">
                      {t[row.group.labelKey]}
                    </td>
                    {LEVELS.map((lv) => {
                      const cell = row.byLevel[lv];
                      return (
                        <td key={lv} className="px-3 py-2.5">
                          {cell.total > 0 ? (
                            <span className="num text-[14px] text-ink-2">{cell.completed} / {cell.total}</span>
                          ) : (
                            <span className="text-[14px] text-muted-2">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2.5 pl-3 text-right">
                      <span className="num text-[14px] text-ink">{row.completed}</span>
                      <span className="num text-[14px] text-muted"> / {row.total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {LEVELS.map((level) => {
        const items = rows.filter((r) => r.topic.level === level);
        if (!items.length) return null;
        const done = items.reduce((s, r) => s + r.completed, 0);
        const all = items.reduce((s, r) => s + r.total, 0);
        return (
          <Section
            key={level}
            title={t[level].label}
            subtitle={t.topicCount(items.length)}
            actions={
              <span className="num">
                <span className="text-ink">{done}</span> / {all}
              </span>
            }
          >
            <TopicList rows={items} c={c} topicTitle={topicTitle} />
          </Section>
        );
      })}
    </PageShell>
  );
}

// ── A list of topics ─────────────────────────────────────────────────────────

interface TopicListProps {
  rows: TopicRow[];
  c: StatsCopy;
  topicTitle: ContentHelpers['topicTitle'];
}

/**
 * The meter sits in its own column to the right of the name. The page this
 * replaces painted it *behind* the name — the exact wash DESIGN.md forbids.
 */
function TopicList({ rows, c, topicTitle }: TopicListProps) {
  const { lang } = useLang();
  return (
    <List>
      {rows.map((row) => (
        <ListRow
          key={row.topic.id}
          to={`/topic/${row.topic.slug}`}
          leading={<TopicGlyph topic={row.topic} size="sm" />}
          title={topicTitle(row.topic)}
          meta={
            row.due > 0 ? (
              <>
                {categoryLabel(lang, row.topic.category)} · <span className="text-brand">{c.due(row.due)}</span>
              </>
            ) : categoryLabel(lang, row.topic.category)
          }
          trailing={
            <Meter
              value={row.completed}
              max={row.total}
              label={`${topicTitle(row.topic)} — ${c.completedOf}`}
              barClassName="w-10 sm:w-16"
            />
          }
        />
      ))}
    </List>
  );
}

// ── Stack × level matrix ─────────────────────────────────────────────────────

/**
 * Only built when the stack filter is "All": scoped to one platform the table
 * would be a single row, which the figures band already says better.
 */
function buildStackBreakdown(topics: Topic[], questions: Question[]): StackRow[] {
  return PLATFORM_GROUPS.reduce<StackRow[]>((acc, group) => {
    const ids = new Set(topics.filter((tp) => topicPlatform(tp) === group.key).map((tp) => tp.id));
    const items = questions.filter((q) => ids.has(q.topic_id));
    if (!items.length) return acc;
    const byLevel = LEVELS.reduce((byLv, lv) => {
      const levelQs = items.filter((q) => q.level === lv);
      byLv[lv] = { total: levelQs.length, completed: levelQs.filter((q) => q.status === 'completed').length };
      return byLv;
    }, {} as Record<Level, LevelCell>);
    acc.push({
      group,
      byLevel,
      total: items.length,
      completed: items.filter((q) => q.status === 'completed').length,
    });
    return acc;
  }, []);
}

// ── Loading ──────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <PageShell width="app">
      <div className="mb-6 border-b border-rule/12 pb-5 sm:mb-8 sm:pb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-7 w-40" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      </div>
      <div className="mb-10 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-rule/12 py-5 sm:mb-14 sm:grid-cols-4 sm:gap-x-8 sm:py-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-9 w-16" />
            <Skeleton className="mt-2.5 h-3 w-20" />
          </div>
        ))}
      </div>
      {[1, 2].map((block) => (
        <div key={block} className="mb-10 sm:mb-14">
          <div className="mb-4 border-b border-rule/12 pb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-3 w-56 max-w-full" />
          </div>
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-none" />
            ))}
          </div>
        </div>
      ))}
    </PageShell>
  );
}
