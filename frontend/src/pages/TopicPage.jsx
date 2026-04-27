import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Target, Printer, FileText, MessagesSquare } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTopic } from '../lib/queries.js';
import { usePrefs } from '../store/prefs.js';
import QuestionCard from '../components/QuestionCard.jsx';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { Button, Pill, ProgressBar, Skeleton, Eyebrow, TopicGlyph, levelTone } from '../ui/index.js';
import { cn } from '../lib/cn.js';

const FILTERS = ['all', 'not_started', 'in_progress', 'completed'];

export default function TopicPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const { topicTitle, topicDesc } = useContent(lang);

  const filter = usePrefs((s) => s.topicFilter);
  const setFilter = usePrefs((s) => s.setTopicFilter);

  const { data: topic, isLoading, error } = useTopic(slug);

  // Keyboard navigation: which question is "focused" + open
  const [cursor, setCursor] = useState(0);
  const [openId, setOpenId] = useState(null);
  const refs = useRef(new Map());

  // Redirect home if topic missing
  useEffect(() => {
    if (error) {
      const id = setTimeout(() => navigate('/'), 1800);
      return () => clearTimeout(id);
    }
  }, [error, navigate]);

  const questions = topic?.questions || [];
  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (filter === 'all') return true;
      if (filter === 'not_started') return !q.status || q.status === 'not_started';
      return q.status === filter;
    });
  }, [questions, filter]);

  const counts = useMemo(() => ({
    all: questions.length,
    not_started: questions.filter((q) => !q.status || q.status === 'not_started').length,
    in_progress: questions.filter((q) => q.status === 'in_progress').length,
    completed: questions.filter((q) => q.status === 'completed').length,
  }), [questions]);

  // Reset cursor if filter list shrinks below it
  useEffect(() => {
    if (cursor >= filtered.length) setCursor(0);
  }, [filtered.length, cursor]);

  const scrollIntoView = (id) => {
    const el = refs.current.get(id);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  useHotkeys('j, ArrowDown', (e) => {
    e.preventDefault();
    if (!filtered.length) return;
    const next = Math.min(cursor + 1, filtered.length - 1);
    setCursor(next);
    scrollIntoView(filtered[next].id);
  }, { preventDefault: true });

  useHotkeys('k, ArrowUp', (e) => {
    e.preventDefault();
    if (!filtered.length) return;
    const next = Math.max(cursor - 1, 0);
    setCursor(next);
    scrollIntoView(filtered[next].id);
  }, { preventDefault: true });

  useHotkeys('space', (e) => {
    if (!filtered.length) return;
    e.preventDefault();
    const q = filtered[cursor];
    setOpenId((prev) => (prev === q.id ? null : q.id));
  }, { preventDefault: true });

  if (isLoading) return <TopicSkeleton />;
  if (error || !topic) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-coral">404</span>
          <p className="font-display text-2xl text-ink">{t.topicNotFound}</p>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
            {t.redirectingHome}
          </p>
        </div>
      </div>
    );
  }

  const completedCount = questions.filter((q) => q.status === 'completed').length;
  const pct = questions.length > 0 ? Math.round((completedCount / questions.length) * 100) : 0;
  const levelT = t[topic.level];

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Breadcrumb */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="mb-5 -ml-2 text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {t.backToDashboard}
        </Button>

        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 border-b border-rule/15 pb-6">
          <div className="flex items-start gap-4">
            <TopicGlyph topic={topic} size="lg" />
            <div className="min-w-0 flex-1">
              <Eyebrow accent="brand">{levelT.short}</Eyebrow>
              <h1 className="mt-2 font-display text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl lg:text-display-xs">
                {topicTitle(topic)}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2 sm:text-base">
                {topicDesc(topic)}
              </p>
            </div>
            <Pill tone={levelTone[topic.level]} size="md" className="shrink-0">
              {levelT.short}
            </Pill>
          </div>

          {/* Progress */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <ProgressBar
              value={completedCount}
              max={questions.length}
              size="sm"
              tone={pct === 100 ? 'mint' : 'gradient'}
              className="max-w-md"
            />
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {completedCount}/{questions.length} · {pct}%
            </span>
          </div>

          {/* Drill this topic */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="brand"
              size="sm"
              onClick={() => navigate(`/study?topic=${topic.slug}&label=${encodeURIComponent(topicTitle(topic))}`)}
            >
              <Brain className="h-3.5 w-3.5" />
              {lang === 'ru' ? 'Повторение' : 'Drill'}
            </Button>
            <Button
              variant="codex"
              size="sm"
              onClick={() => navigate(`/round/${topic.slug}`)}
            >
              <MessagesSquare className="h-3.5 w-3.5" />
              {lang === 'ru' ? 'Раунд' : 'Round'}
            </Button>
            <Button
              variant="codex"
              size="sm"
              onClick={() => navigate(`/mock?topic=${topic.slug}`)}
            >
              <Target className="h-3.5 w-3.5" />
              {lang === 'ru' ? 'Mock-собес' : 'Mock interview'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`${import.meta.env.BASE_URL}topic/${topic.slug}/cheatsheet`, '_blank', 'noopener')}
              className="text-muted hover:text-ink"
            >
              <FileText className="h-3.5 w-3.5" />
              {lang === 'ru' ? 'Шпаргалка' : 'Cheatsheet'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`${import.meta.env.BASE_URL}topic/${topic.slug}/print`, '_blank', 'noopener')}
              className="text-muted hover:text-ink"
            >
              <Printer className="h-3.5 w-3.5" />
              {lang === 'ru' ? 'Печать / PDF' : 'Print / PDF'}
            </Button>
          </div>
        </header>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const label = {
              all: t.filterAll,
              not_started: t.filterTodo,
              in_progress: t.filterInProgress,
              completed: t.filterDone,
            }[f];
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-all duration-200',
                  active
                    ? 'border-ink bg-ink text-paper shadow-[0_2px_4px_-1px_rgb(var(--shadow)/0.20)]'
                    : 'border-rule/12 bg-paper-2 text-muted hover:border-rule/25 hover:text-ink hover:bg-rule/5',
                )}
              >
                <span>{label}</span>
                <span className={cn('tabular-nums', active ? 'text-paper/70' : 'text-muted-2')}>
                  {counts[f]}
                </span>
              </button>
            );
          })}
          <span className="ml-auto hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-2 sm:inline-flex">
            <kbd className="rounded border border-rule/15 px-1 py-0.5">J</kbd>
            <kbd className="rounded border border-rule/15 px-1 py-0.5">K</kbd>
            <span>· nav</span>
            <kbd className="rounded border border-rule/15 px-1 py-0.5">Space</kbd>
            <span>· open</span>
          </span>
        </div>

        {/* Questions list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="text-4xl" aria-hidden>🎉</span>
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                {t.noQuestionsInCategory}
              </p>
            </div>
          ) : (
            filtered.map((q, i) => (
              <QuestionCard
                key={q.id}
                ref={(el) => {
                  if (el) refs.current.set(q.id, el);
                  else refs.current.delete(q.id);
                }}
                question={q}
                index={questions.indexOf(q)}
                expanded={openId === q.id}
                onToggleExpand={() => setOpenId((prev) => (prev === q.id ? null : q.id))}
                focused={cursor === i}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TopicSkeleton() {
  return (
    <div className="bg-page">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Skeleton className="mb-5 h-4 w-32" />
        <header className="mb-8 border-b border-rule/15 pb-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Skeleton className="h-2 w-1/2 max-w-md" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </header>
        <div className="mb-6 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-md" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-md border border-rule/15 bg-paper-2/80 p-4 shadow-codex-sm">
              <div className="flex items-start gap-3">
                <Skeleton className="h-7 w-7 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
