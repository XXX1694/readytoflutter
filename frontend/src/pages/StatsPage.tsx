import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, ChevronRight } from 'lucide-react';
import { useTopics, useQuestions } from '../lib/queries';
import { getCardState, getSrsSummary } from '../lib/srs';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { Button, Eyebrow, Skeleton } from '../ui/index';
import StatTile from '../components/StatTile';
import PlatformFilter from '../components/PlatformFilter';
import { usePrefs } from '../store/prefs';
import {
  filterTopicsByPlatform,
  filterQuestionsByPlatform,
  topicPlatform,
  PLATFORM_GROUPS,
  type Platform,
} from '../lib/platform';

import type { Level, Topic, Question } from '../types/domain';
import type { Lang } from '../i18n/LangContext';
import type { UICopy } from '../i18n/ui';
import type { ContentHelpers } from '../i18n/content';

const LEVELS: Level[] = ['junior', 'mid', 'senior'];

type EaseBucket = 'strong' | 'solid' | 'shaky' | 'weak';

/**
 * SM-2 easiness, said in words. It stays ink like everything else on this
 * page: colour here would be a fifth hue competing with the marker, and the
 * word already carries the whole meaning.
 */
const EASE_LABEL: Record<Lang, Record<EaseBucket, string>> = {
  en: { strong: 'strong', solid: 'solid', shaky: 'shaky', weak: 'weak' },
  ru: { strong: 'уверенно', solid: 'нормально', shaky: 'шатко', weak: 'слабо' },
};

function easeBucket(ease: number): EaseBucket {
  if (ease >= 2.7) return 'strong';
  if (ease >= 2.3) return 'solid';
  if (ease >= 1.8) return 'shaky';
  return 'weak';
}

interface TopicMastery {
  topic: Topic;
  total: number;
  completed: number;
  /** Mean SM-2 easiness over the cards you've actually seen; null if none. */
  avgEase: number | null;
  /** Completion percentage — the completion half of `mastery()`. */
  pct: number;
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
function buildTopicMastery(topics: Topic[], questions: Question[]): TopicMastery[] {
  return topics.map((topic) => {
    const tQuestions = questions.filter((q) => q.topic_id === topic.id);
    let easeSum = 0;
    let easeCount = 0;
    let completed = 0;
    for (const q of tQuestions) {
      if (q.status === 'completed') completed += 1;
      const s = getCardState(q.id);
      if (s.reps > 0) {
        easeSum += s.ease;
        easeCount += 1;
      }
    }
    return {
      topic,
      total: tQuestions.length,
      completed,
      avgEase: easeCount > 0 ? easeSum / easeCount : null,
      pct: tQuestions.length > 0 ? Math.round((completed / tQuestions.length) * 100) : 0,
    };
  });
}

/** Blends completion with SRS ease, so a topic you ticked off but keep
 *  failing doesn't read as mastered. */
function mastery(row: TopicMastery): number {
  if (!row.avgEase) return row.pct;
  // ease 3.0 → 100, 1.3 → 0 — clamped
  const easeScore = Math.max(0, Math.min(100, ((row.avgEase - 1.3) / (3.0 - 1.3)) * 100));
  return Math.round(row.pct * 0.6 + easeScore * 0.4);
}

export default function StatsPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const { topicTitle } = useContent(lang);

  const topicsQ = useTopics();
  const questionsQ = useQuestions();
  const platform = usePrefs((s) => s.platform);

  if (topicsQ.isLoading || questionsQ.isLoading) return <StatsSkeleton />;

  // Mastery numbers feel sharper when scoped to a single stack — staring at
  // "65% across 53 topics" tells you nothing about your iOS readiness.
  const allTopics = topicsQ.data ?? [];
  const allQuestions = questionsQ.data ?? [];
  const topics = filterTopicsByPlatform(allTopics, platform);
  const questions = filterQuestionsByPlatform(allQuestions, allTopics, platform);

  const perTopic = buildTopicMastery(topics, questions);

  // Global SRS
  const srs = getSrsSummary(questions);

  const overallMastery = perTopic.length
    ? Math.round(perTopic.reduce((sum, r) => sum + mastery(r), 0) / perTopic.length)
    : 0;

  // Weakest topics (lowest mastery, ignoring empty topics)
  const weakest = [...perTopic]
    .filter((r) => r.total > 0)
    .sort((a, b) => mastery(a) - mastery(b))
    .slice(0, 3);

  // Stack × grade breakdown — only meaningful when the user is looking at
  // every platform, otherwise the row would always be a single line.
  const stackBreakdown: StackRow[] = platform === 'all'
    ? PLATFORM_GROUPS.reduce<StackRow[]>((rows, group) => {
        const tIds = new Set(
          allTopics.filter((tp) => topicPlatform(tp) === group.key).map((tp) => tp.id),
        );
        const groupQs = allQuestions.filter((q) => tIds.has(q.topic_id));
        if (!groupQs.length) return rows;
        const byLevel = LEVELS.reduce((acc, lv) => {
          const levelQs = groupQs.filter((q) => q.level === lv);
          acc[lv] = {
            total: levelQs.length,
            completed: levelQs.filter((q) => q.status === 'completed').length,
          };
          return acc;
        }, {} as Record<Level, LevelCell>);
        rows.push({
          group,
          byLevel,
          total: groupQs.length,
          completed: groupQs.filter((q) => q.status === 'completed').length,
        });
        return rows;
      }, [])
    : [];

  // The marker lands on the one figure that asks for an action today.
  const markedTile: 'overdue' | 'due' | null =
    srs.overdue > 0 ? 'overdue' : srs.due > 0 ? 'due' : null;

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="-ml-2 mb-5 text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {t.backToDashboard}
        </Button>

        <header className="mb-8 flex flex-col gap-4 border-b border-rule/12 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow>{lang === 'ru' ? 'Прогресс' : 'Stats'}</Eyebrow>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
              {lang === 'ru' ? 'Карта знаний' : 'Mastery map'}
            </h1>
            <p className="mt-2 text-[15px] text-ink-2">
              <span className="num">{overallMastery}%</span>{' '}
              {lang === 'ru'
                ? `в среднем по ${perTopic.length} темам`
                : `average recall across ${perTopic.length} topics`}
            </p>
          </div>
          <Button variant="brand" size="md" onClick={() => navigate('/study')}>
            <Brain className="h-4 w-4" aria-hidden />
            {lang === 'ru' ? 'Сессия SRS' : 'Study session'}
          </Button>
        </header>

        {/* Stack scope — every metric below recomputes against the active
            platform, so "iOS mastery" doesn't get diluted by Flutter rows. */}
        <div className="mb-8">
          <PlatformFilter />
        </div>

        {/* The card counts, as a ruled band. */}
        <section className="mb-10 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-rule/12 py-5 sm:grid-cols-4 sm:gap-x-8 sm:py-6">
          <StatTile
            label={lang === 'ru' ? 'Изучено' : 'Learned'}
            value={srs.learned}
            of={srs.total}
          />
          <StatTile
            label={lang === 'ru' ? 'Просрочено' : 'Overdue'}
            value={srs.overdue}
            marked={markedTile === 'overdue'}
          />
          <StatTile
            label={lang === 'ru' ? 'К разбору сегодня' : 'Due today'}
            value={srs.due}
            marked={markedTile === 'due'}
          />
          <StatTile
            label={lang === 'ru' ? 'Не начато' : 'Not started'}
            value={srs.fresh}
          />
        </section>

        {/* Stack × grade matrix — visible only when stack=all, otherwise the
            sidebar's per-platform progress already covers the answer. */}
        {stackBreakdown.length > 0 && (
          <section className="mb-10">
            <Eyebrow className="mb-2">{t.masteryByStack}</Eyebrow>
            <p className="mb-4 max-w-xl text-[14px] text-ink-2">{t.masteryByStackHint}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="border-b border-rule/12 text-[13px] text-muted">
                    <th className="py-2 pr-4 font-normal">&nbsp;</th>
                    <th className="px-3 py-2 font-normal">{t.masteryColJunior}</th>
                    <th className="px-3 py-2 font-normal">{t.masteryColMid}</th>
                    <th className="px-3 py-2 font-normal">{t.masteryColSenior}</th>
                    <th className="py-2 pl-3 text-right font-normal">{t.masteryColTotal}</th>
                  </tr>
                </thead>
                <tbody>
                  {stackBreakdown.map((row) => {
                    const overallPct = row.total > 0
                      ? Math.round((row.completed / row.total) * 100)
                      : 0;
                    return (
                      <tr key={row.group.key} className="border-b border-rule/8 last:border-b-0">
                        <td className="py-2.5 pr-4 font-display text-[15px] font-medium text-ink">
                          {t[row.group.labelKey as keyof UICopy] as string}
                        </td>
                        {LEVELS.map((lv) => {
                          const cell = row.byLevel[lv];
                          if (!cell.total) {
                            return <td key={lv} className="px-3 py-2.5 text-[14px] text-muted-2">—</td>;
                          }
                          return (
                            <td key={lv} className="px-3 py-2.5">
                              <span className="num text-[14px] text-ink-2">
                                {cell.completed} / {cell.total}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-2.5 pl-3 text-right">
                          <span className="num text-[14px] text-ink">
                            {row.completed} / {row.total}
                          </span>
                          <span className="num ml-2 text-[13px] text-muted">{overallPct}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Weakest topics — the same lines as below, just the three with the
            least marker on them. */}
        {weakest.some((r) => mastery(r) < 80) && (
          <section className="mb-10">
            <Eyebrow className="mb-3">
              {lang === 'ru' ? 'Самое слабое' : 'Weakest right now'}
            </Eyebrow>
            <div className="overflow-hidden rounded-lg border border-rule/12 bg-paper-2">
              {weakest.map((row) => (
                <MasteryRow
                  key={row.topic.id}
                  row={row}
                  masteryPct={mastery(row)}
                  lang={lang}
                  topicTitle={topicTitle}
                  onTopic={() => navigate(`/topic/${row.topic.slug}`)}
                  onDrill={() => navigate(`/study?topic=${row.topic.slug}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Per-level breakdown */}
        {LEVELS.map((level) => {
          const rows = perTopic.filter((r) => r.topic.level === level);
          if (!rows.length) return null;
          const levelT = t[level];
          const levelMastery = Math.round(
            rows.reduce((sum, r) => sum + mastery(r), 0) / rows.length,
          );
          return (
            <section key={level} className="mb-10">
              <header className="mb-3 flex items-end justify-between gap-4 border-b border-rule/12 pb-2">
                <h2 className="font-display text-xl font-semibold text-ink">{levelT.label}</h2>
                <p className="shrink-0 text-[14px] text-muted">
                  <span className="num text-[17px] text-ink">{levelMastery}%</span>{' '}
                  {lang === 'ru' ? 'в среднем' : 'average'}
                </p>
              </header>
              <div className="overflow-hidden rounded-lg border border-rule/12 bg-paper-2">
                {rows.map((row) => (
                  <MasteryRow
                    key={row.topic.id}
                    row={row}
                    masteryPct={mastery(row)}
                    lang={lang}
                    topicTitle={topicTitle}
                    onTopic={() => navigate(`/topic/${row.topic.slug}`)}
                    onDrill={() => navigate(`/study?topic=${row.topic.slug}`)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface MasteryRowProps {
  row: TopicMastery;
  masteryPct: number;
  lang: Lang;
  topicTitle: ContentHelpers['topicTitle'];
  onTopic: () => void;
  onDrill: () => void;
}

/**
 * A topic as a line of type with a highlighter run across it as far as you
 * have actually recalled it.
 *
 * This is the whole page in one element. A progress bar per row would be a
 * chart of an abstract quantity sitting next to the name; the wash *is* the
 * name — fifty of them stacked read as a page you have marked up, and the
 * unmarked lines are the ones to open next. Every row is the same width, so
 * the lengths compare honestly.
 */
function MasteryRow({ row, masteryPct, lang, topicTitle, onTopic, onDrill }: MasteryRowProps) {
  const ease = row.avgEase != null ? EASE_LABEL[lang][easeBucket(row.avgEase)] : null;

  return (
    <div className="relative flex items-center gap-3 border-b border-rule/8 px-3 last:border-b-0">
      <span
        aria-hidden
        className="absolute inset-y-2 left-0 bg-[rgb(var(--marker)/0.38)] dark:bg-[rgb(var(--marker)/0.20)]"
        style={{ width: `${Math.max(0, Math.min(100, masteryPct))}%` }}
      />
      <button
        type="button"
        onClick={onTopic}
        className="relative min-w-0 flex-1 truncate py-2.5 text-left text-[15px] text-ink underline-offset-4 hover:underline"
      >
        {topicTitle(row.topic)}
      </button>

      {/* Fixed widths so the figures line up down the page like a ledger,
          and so a topic with no ease reading doesn't shift its neighbours. */}
      <span className="num relative hidden w-[4.5rem] shrink-0 text-right text-[13px] text-ink-2 sm:inline">
        {row.completed} / {row.total}
      </span>
      <span className="relative hidden w-[5.5rem] shrink-0 text-right text-[13px] text-ink-2 sm:inline">
        {ease}
      </span>
      <span className="num relative w-[3.25rem] shrink-0 text-right text-[15px] text-ink">
        {masteryPct}%
      </span>

      <button
        type="button"
        onClick={onDrill}
        aria-label={lang === 'ru' ? `Разобрать: ${topicTitle(row.topic)}` : `Drill ${topicTitle(row.topic)}`}
        className="relative -mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded text-muted hover:bg-rule/8 hover:text-ink"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="bg-page">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Skeleton className="mb-5 h-4 w-32" />
        <header className="mb-8 border-b border-rule/12 pb-6">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-9 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </header>
        <div className="mb-10 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-rule/12 py-6 sm:grid-cols-4 sm:gap-x-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-9 w-16" />
              <Skeleton className="mt-2.5 h-3 w-20" />
            </div>
          ))}
        </div>
        {[1, 2, 3].map((row) => (
          <section key={row} className="mb-10">
            <div className="mb-3 border-b border-rule/12 pb-2">
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="divide-y divide-rule/8 rounded-lg border border-rule/12 bg-paper-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-3">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
