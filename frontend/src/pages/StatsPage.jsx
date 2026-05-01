import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Brain, Target } from 'lucide-react';
import { useTopics, useQuestions, useStats } from '../lib/queries.js';
import { getCardState, getSrsSummary } from '../lib/srs.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { Button, Eyebrow, ProgressBar, Pill, Skeleton, TopicGlyph, levelTone } from '../ui/index.js';
import { cn } from '../lib/cn.js';
import PlatformFilter from '../components/PlatformFilter.jsx';
import { usePrefs } from '../store/prefs.js';
import { filterTopicsByPlatform, filterQuestionsByPlatform, topicPlatform, PLATFORM_GROUPS } from '../lib/platform.js';

const LEVELS = ['junior', 'mid', 'senior'];

const easeBucket = (ease) => {
  if (ease >= 2.7) return { label: 'strong', tone: 'mint' };
  if (ease >= 2.3) return { label: 'solid',  tone: 'brand' };
  if (ease >= 1.8) return { label: 'shaky',  tone: 'amber' };
  return { label: 'weak', tone: 'coral' };
};

export default function StatsPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const { topicTitle } = useContent(lang);

  const topicsQ = useTopics();
  const questionsQ = useQuestions();
  const statsQ = useStats();
  const platform = usePrefs((s) => s.platform);

  if (topicsQ.isLoading || questionsQ.isLoading) return <StatsSkeleton />;

  // Mastery numbers feel sharper when scoped to a single stack — staring at
  // "65% across 53 topics" tells you nothing about your iOS readiness.
  const allTopics = topicsQ.data ?? [];
  const allQuestions = questionsQ.data ?? [];
  const topics = filterTopicsByPlatform(allTopics, platform);
  const questions = filterQuestionsByPlatform(allQuestions, allTopics, platform);
  const stats = statsQ.data;

  // Build per-topic breakdown
  const perTopic = topics.map((topic) => {
    const tQuestions = questions.filter((q) => q.topic_id === topic.id);
    const completed = tQuestions.filter((q) => q.status === 'completed').length;
    const inProgress = tQuestions.filter((q) => q.status === 'in_progress').length;

    let easeSum = 0;
    let easeCount = 0;
    let learned = 0;
    let dueNow = 0;
    const now = Date.now();
    for (const q of tQuestions) {
      const s = getCardState(q.id);
      if (s.reps > 0) {
        learned += 1;
        easeSum += s.ease;
        easeCount += 1;
      }
      if (s.dueAt && s.dueAt <= now) dueNow += 1;
    }
    const avgEase = easeCount > 0 ? easeSum / easeCount : null;
    return {
      topic,
      total: tQuestions.length,
      completed,
      inProgress,
      learned,
      dueNow,
      avgEase,
      pct: tQuestions.length > 0 ? Math.round((completed / tQuestions.length) * 100) : 0,
    };
  });

  // Global SRS
  const srs = getSrsSummary(questions);

  // Mastery score: blends completion % and SRS ease
  const mastery = (row) => {
    const compScore = row.pct;
    if (!row.avgEase) return compScore;
    // ease 2.5 → 100, 1.3 → 0 — clamped
    const easeScore = Math.max(0, Math.min(100, ((row.avgEase - 1.3) / (3.0 - 1.3)) * 100));
    return Math.round(compScore * 0.6 + easeScore * 0.4);
  };

  const overallMastery = perTopic.length
    ? Math.round(perTopic.reduce((s, r) => s + mastery(r), 0) / perTopic.length)
    : 0;

  // Weakest topics (lowest mastery, ignoring 0%)
  const weakest = [...perTopic]
    .filter((r) => r.total > 0)
    .sort((a, b) => mastery(a) - mastery(b))
    .slice(0, 3);

  // Stack × grade breakdown — only meaningful when the user is looking at
  // every platform, otherwise the row would always be a single line.
  const stackBreakdown = platform === 'all'
    ? PLATFORM_GROUPS.map((group) => {
        const tIds = new Set(
          allTopics.filter((tp) => topicPlatform(tp) === group.key).map((tp) => tp.id),
        );
        const groupQs = allQuestions.filter((q) => tIds.has(q.topic_id));
        if (!groupQs.length) return null;
        const byLevel = ['junior', 'mid', 'senior'].reduce((acc, lv) => {
          const levelQs = groupQs.filter((q) => q.level === lv);
          acc[lv] = {
            total: levelQs.length,
            completed: levelQs.filter((q) => q.status === 'completed').length,
          };
          return acc;
        }, {});
        const total = groupQs.length;
        const completed = groupQs.filter((q) => q.status === 'completed').length;
        return { group, byLevel, total, completed };
      }).filter(Boolean)
    : [];

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="-ml-2 mb-5 text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.backToDashboard}
        </Button>

        {/* Header */}
        <header className="mb-8 flex flex-col gap-3 border-b border-rule/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow accent="brand">
              <TrendingUp className="mr-1 inline h-3 w-3" />
              {lang === 'ru' ? 'Прогресс' : 'Stats'}
            </Eyebrow>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
              {lang === 'ru' ? 'Карта знаний' : 'Mastery map'}
            </h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
              {lang === 'ru'
                ? `${overallMastery}% средний уровень · ${srs.learned}/${srs.total} изучено · ${srs.due + srs.overdue} к разбору`
                : `${overallMastery}% overall mastery · ${srs.learned}/${srs.total} learned · ${srs.due + srs.overdue} due`}
            </p>
          </div>
          <Button variant="brand" size="md" onClick={() => navigate('/study')}>
            <Brain className="h-4 w-4" />
            {lang === 'ru' ? 'Сессия SRS' : 'Study session'}
          </Button>
        </header>

        {/* Stack scope — every metric below recomputes against the active
            platform, so "iOS mastery" doesn't get diluted by Flutter rows. */}
        <div className="mb-8">
          <PlatformFilter />
        </div>

        {/* Big number tiles */}
        <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BigTile
            label={lang === 'ru' ? 'Изучено' : 'Learned'}
            value={srs.learned}
            suffix={`/ ${srs.total}`}
            tone="mint"
          />
          <BigTile
            label={lang === 'ru' ? 'Просрочено' : 'Overdue'}
            value={srs.overdue}
            tone="coral"
          />
          <BigTile
            label={lang === 'ru' ? 'Сегодня' : 'Due today'}
            value={srs.due}
            tone="amber"
          />
          <BigTile
            label={lang === 'ru' ? 'Новых' : 'Fresh'}
            value={srs.fresh}
            tone="brand"
          />
        </section>

        {/* Stack × grade matrix — visible only when stack=all, otherwise the
            sidebar's per-platform progress already covers the answer. */}
        {stackBreakdown.length > 0 && (
          <section className="mb-10">
            <Eyebrow className="mb-3">{t.masteryByStack}</Eyebrow>
            <p className="mb-4 max-w-xl text-[13px] text-ink-2">{t.masteryByStackHint}</p>
            <div className="overflow-hidden rounded-2xl border border-rule/12 bg-paper-2">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-rule/12 bg-paper-2/60 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    <th className="px-4 py-3">&nbsp;</th>
                    <th className="px-3 py-3">{t.masteryColJunior}</th>
                    <th className="px-3 py-3">{t.masteryColMid}</th>
                    <th className="px-3 py-3">{t.masteryColSenior}</th>
                    <th className="px-4 py-3 text-right">{t.masteryColTotal}</th>
                  </tr>
                </thead>
                <tbody>
                  {stackBreakdown.map((row) => {
                    const overallPct = row.total > 0
                      ? Math.round((row.completed / row.total) * 100)
                      : 0;
                    return (
                      <tr key={row.group.key} className="border-t border-rule/8">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className={cn('h-1.5 w-1.5 rounded-full', row.group.dot)} aria-hidden />
                            <span className="font-display text-base font-medium text-ink">
                              {t[row.group.labelKey]}
                            </span>
                          </span>
                        </td>
                        {['junior', 'mid', 'senior'].map((lv) => {
                          const cell = row.byLevel[lv];
                          if (!cell.total) {
                            return (
                              <td key={lv} className="px-3 py-3 font-mono text-[11px] text-muted-2">—</td>
                            );
                          }
                          const pct = Math.round((cell.completed / cell.total) * 100);
                          return (
                            <td key={lv} className="px-3 py-3">
                              <span className="font-mono text-[12px] tabular-nums text-ink">
                                {cell.completed}/{cell.total}
                              </span>
                              <span className="ml-1.5 font-mono text-[10px] tabular-nums text-muted-2">
                                · {pct}%
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-[13px] tabular-nums text-ink">
                            {row.completed}/{row.total}
                          </span>
                          <span className="ml-1.5 font-mono text-[11px] tabular-nums text-muted-2">
                            · {overallPct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Weakest topics */}
        {weakest.some((r) => mastery(r) < 80) && (
          <section className="mb-10">
            <Eyebrow accent="amber" className="mb-3">
              {lang === 'ru' ? 'Слабые места' : 'Weakest topics'}
            </Eyebrow>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {weakest.map((row) => (
                <button
                  key={row.topic.id}
                  type="button"
                  onClick={() => navigate(`/topic/${row.topic.slug}`)}
                  className="flex flex-col gap-2 rounded-2xl border border-coral/30 bg-coral/5 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-coral/50 hover:shadow-[0_2px_4px_0_rgb(var(--shadow)/0.06),0_12px_24px_-6px_rgb(var(--shadow)/0.10)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base font-medium text-ink line-clamp-1">
                      {topicTitle(row.topic)}
                    </span>
                    <span className="font-mono text-sm tabular-nums text-coral">
                      {mastery(row)}%
                    </span>
                  </div>
                  <ProgressBar value={mastery(row)} max={100} size="xs" tone="amber" />
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    {row.completed}/{row.total} done
                    {row.avgEase != null && ` · ease ${row.avgEase.toFixed(2)}`}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Per-level breakdown */}
        {LEVELS.map((level, idx) => {
          const rows = perTopic.filter((r) => r.topic.level === level);
          if (!rows.length) return null;
          const levelT = t[level];
          const levelMastery = Math.round(rows.reduce((s, r) => s + mastery(r), 0) / rows.length);
          return (
            <section key={level} className="mb-10">
              <header className="mb-4 flex items-end justify-between border-b border-rule/15 pb-2">
                <div>
                  <Eyebrow accent="brand" className="mb-1">
                    {levelT.short}
                  </Eyebrow>
                  <h2 className="font-display text-xl font-medium tracking-tight text-ink">
                    {levelT.label}
                  </h2>
                </div>
                <div className="text-right">
                  <div className="num text-3xl text-ink">{levelMastery}%</div>
                  <div className="font-mono text-[10px] uppercase text-muted">
                    {lang === 'ru' ? 'Средний' : 'Average'}
                  </div>
                </div>
              </header>
              <div className="space-y-2">
                {rows.map((row) => (
                  <TopicRow
                    key={row.topic.id}
                    row={row}
                    masteryPct={mastery(row)}
                    onTopic={() => navigate(`/topic/${row.topic.slug}`)}
                    onDrill={() => navigate(`/study?topic=${row.topic.slug}`)}
                    lang={lang}
                    t={t}
                    topicTitle={topicTitle}
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

function BigTile({ label, value, suffix, tone = 'ink' }) {
  const ACCENTS = {
    mint:  'text-mint',
    amber: 'text-[rgb(var(--amber))]',
    coral: 'text-coral',
    brand: 'text-brand',
    ink:   'text-ink',
  };
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-rule/8 bg-paper-2 p-5 shadow-[0_1px_2px_0_rgb(var(--shadow)/0.04),0_4px_16px_-4px_rgb(var(--shadow)/0.06)] sm:p-6">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={cn('num text-display-xs sm:text-display-sm', ACCENTS[tone])}>{value}</span>
        {suffix && <span className="font-mono text-xs uppercase text-muted">{suffix}</span>}
      </div>
    </div>
  );
}

function TopicRow({ row, masteryPct, onTopic, onDrill, lang, t, topicTitle }) {
  const easeInfo = row.avgEase ? easeBucket(row.avgEase) : null;
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-rule/8 bg-paper-2 px-4 py-3 transition-all duration-200 hover:border-rule/15 hover:bg-rule/5">
      <TopicGlyph topic={row.topic} size="sm" />
      <button
        type="button"
        onClick={onTopic}
        className="min-w-0 flex-1 text-left"
      >
        <div className="text-sm text-ink truncate">{topicTitle(row.topic)}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <ProgressBar
            value={masteryPct}
            max={100}
            size="xs"
            tone={masteryPct >= 80 ? 'mint' : masteryPct >= 50 ? 'brand' : 'amber'}
            className="max-w-[300px]"
          />
          <span className="font-mono text-[10px] tabular-nums text-muted shrink-0">
            {masteryPct}%
          </span>
        </div>
      </button>
      <div className="hidden flex-col items-end gap-1 sm:flex">
        <span className="font-mono text-[10px] tabular-nums text-muted">
          {row.completed}/{row.total}
        </span>
        {easeInfo && (
          <Pill tone={easeInfo.tone} size="xs">
            {easeInfo.label}
          </Pill>
        )}
      </div>
      <button
        type="button"
        onClick={onDrill}
        aria-label="Drill"
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rule/12 text-muted opacity-0 transition-all duration-200 hover:border-brand/40 hover:bg-brand/5 hover:text-brand group-hover:opacity-100"
      >
        <Brain className="h-4 w-4" />
      </button>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="bg-page">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Skeleton className="mb-5 h-4 w-32" />
        <header className="mb-8 border-b border-rule/15 pb-6">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-9 w-2/3" />
          <Skeleton className="mt-1 h-3 w-1/2" />
        </header>
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-md border border-rule/15 bg-paper-2/80 p-5 shadow-codex-sm">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-3 h-9 w-12" />
            </div>
          ))}
        </div>
        {[1, 2, 3].map((row) => (
          <section key={row} className="mb-10">
            <div className="mb-4 border-b border-rule/15 pb-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-6 w-40" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border border-rule bg-paper-2/80 px-4 py-3">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-2 w-1/2" />
                  </div>
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
