import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Command, Sparkles, Target } from 'lucide-react';
import { useTopics, useStats, useResetProgress } from '../lib/queries.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { usePrefs } from '../store/prefs.js';
import { Button, Eyebrow, FullPageLoader } from '../ui/index.js';
import StatTile from '../components/StatTile.jsx';
import TopicTile from '../components/TopicTile.jsx';
import ActivityHeatmap from '../components/ActivityHeatmap.jsx';
import DueWidget from '../components/DueWidget.jsx';

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl';

const LEVELS = ['junior', 'mid', 'senior'];

export default function HomePage() {
  const { lang } = useLang();
  const t = useT(lang);
  const { topicTitle, topicDesc } = useContent(lang);
  const setCommandOpen = usePrefs((s) => s.setCommandOpen);
  const navigate = useNavigate();

  const topicsQ = useTopics();
  const statsQ = useStats();
  const reset = useResetProgress();

  const handleReset = useCallback(async () => {
    if (!window.confirm(t.resetConfirm)) return;
    try {
      await reset.mutateAsync();
      toast.success(lang === 'ru' ? 'Прогресс сброшен' : 'Progress reset');
    } catch {
      toast.error(t.failedReset);
    }
  }, [reset, t, lang]);

  if (topicsQ.isLoading || statsQ.isLoading) {
    return <FullPageLoader label={t.loadingTopics} />;
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

  const topics = topicsQ.data ?? [];
  const stats = statsQ.data;
  const total = stats?.totalQuestions ?? 0;
  const completed = stats?.completed ?? 0;
  const inProgress = stats?.inProgress ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {/* HERO */}
        <section className="mb-10 sm:mb-14">
          <Eyebrow index={0} accent="brand">
            ReadyToFlutter · Codex
          </Eyebrow>
          <h1 className="mt-4 font-display text-display-sm font-medium leading-[1.02] tracking-tightest text-ink sm:text-display-md lg:text-display-lg">
            {lang === 'ru' ? (
              <>
                Готов к <em className="not-italic text-brand">собеседованию</em>?
                <br />
                <span className="font-display italic text-ink-2">Соберись.</span>
              </>
            ) : (
              <>
                Ready for the <em className="not-italic text-brand">interview</em>?
                <br />
                <span className="font-display italic text-ink-2">Drill it.</span>
              </>
            )}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-2 sm:text-lg">
            {t.heroDesc}
          </p>

          {/* CTA row */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="brand" onClick={() => navigate('/mock')}>
              <Target className="h-4 w-4" />
              {lang === 'ru' ? 'Mock-собеседование' : 'Mock interview'}
              <kbd className="ml-1 rounded border border-white/30 px-1.5 py-0.5 font-mono text-[10px]">{modKey}M</kbd>
            </Button>
            <Button variant="codex" onClick={() => setCommandOpen(true)}>
              <Command className="h-4 w-4" />
              <span>{t.searchOpenHint}</span>
              <kbd className="ml-1 rounded border border-rule-strong px-1.5 py-0.5 font-mono text-[10px]">{modKey}K</kbd>
            </Button>
            <a
              href="#levels"
              className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted hover:text-ink"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {lang === 'ru' ? 'Открыть программу' : 'Browse syllabus'}
            </a>
          </div>
        </section>

        {/* STATS */}
        <section className="mb-10 sm:mb-12">
          <Eyebrow index={1} className="mb-4">
            {lang === 'ru' ? 'Прогресс' : 'Progress'}
          </Eyebrow>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatTile index={1} label={t.totalQuestions} value={total} accent="ink" />
            <StatTile index={2} label={t.completed} value={completed} accent="mint" />
            <StatTile index={3} label={t.inProgress} value={inProgress} accent="amber" />
            <StatTile index={4} label={t.completion} value={pct} suffix="%" accent="brand" />
          </div>
        </section>

        {/* SRS + ACTIVITY */}
        <section className="mb-12 grid grid-cols-1 gap-4 sm:mb-16 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <DueWidget />
          </div>
          <div className="lg:col-span-2">
            <Eyebrow index={2} className="mb-4">
              {lang === 'ru' ? 'Активность · 14 недель' : 'Activity · last 14 weeks'}
            </Eyebrow>
            <div className="h-full rounded-md border-1.5 border-ink bg-paper-2 p-4 shadow-codex-sm sm:p-6">
              <ActivityHeatmap weeks={14} />
            </div>
          </div>
        </section>

        {/* LEVELS */}
        <section id="levels">
          {LEVELS.map((level, idx) => {
            const items = topics.filter((tp) => tp.level === level);
            if (!items.length) return null;
            const levelT = t[level];
            return (
              <div key={level} className="mb-12 sm:mb-16">
                <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-1.5 border-ink pb-3">
                  <div>
                    <Eyebrow index={idx + 1} accent="brand" className="mb-2">
                      {levelT.short}
                    </Eyebrow>
                    <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
                      {levelT.label}
                    </h2>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
                      {levelT.desc} · {t.topicCount(items.length)}
                    </p>
                  </div>
                </header>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((topic) => (
                    <TopicTile
                      key={topic.id}
                      topic={topic}
                      level={level}
                      t={t}
                      topicTitle={topicTitle}
                      topicDesc={topicDesc}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* RESET */}
        {completed > 0 && (
          <div className="mt-8 flex justify-end border-t-1.5 border-rule pt-6">
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
