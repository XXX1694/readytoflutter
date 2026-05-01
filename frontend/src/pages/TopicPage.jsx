import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { PLATFORMS, topicPlatform } from '../lib/platform.js';

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
  // Resolve platform metadata (label + dot) so the breadcrumb above the title
  // tells the user "iOS · Swift · Swift Basics" without making them guess.
  const platformKey = topicPlatform(topic);
  const platformMeta = PLATFORMS.find((p) => p.key === platformKey);

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-[1400px] px-4 py-4 pb-36 sm:px-6 sm:py-10 sm:pb-10 lg:px-8 lg:pb-12">
        {/* Breadcrumb — desktop only. On mobile the back arrow lives in the
            header chrome so this row would just waste vertical space. */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="mb-5 -ml-2 hidden text-muted hover:text-ink lg:inline-flex"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {t.backToDashboard}
        </Button>

        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 border-b border-rule/15 pb-5 sm:mb-8 sm:pb-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <TopicGlyph topic={topic} size="lg" />
            <div className="min-w-0 flex-1">
              {/* Platform breadcrumb — clickable, jumps to dashboard scoped
                  to the topic's stack. Always shows the category as a soft
                  hint between platform and title. */}
              <div className="mb-2 flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                {platformMeta && (
                  <button
                    type="button"
                    onClick={() => navigate(`/?stack=${platformMeta.key}`)}
                    className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink"
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', platformMeta.dot)} aria-hidden />
                    {t[platformMeta.labelKey]}
                  </button>
                )}
                {topic.category && (
                  <>
                    <span aria-hidden className="text-muted-2">·</span>
                    <span className="text-muted-2">{topic.category}</span>
                  </>
                )}
                <span aria-hidden className="text-muted-2">·</span>
                <span className="text-brand">{levelT.short}</span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:mt-2 sm:text-4xl lg:text-display-xs">
                {topicTitle(topic)}
              </h1>
              <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-2 sm:mt-2 sm:text-base">
                {topicDesc(topic)}
              </p>
            </div>
            <Pill tone={levelTone[topic.level]} size="md" className="hidden shrink-0 sm:inline-flex">
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

          {/* Drill this topic — desktop+tablet show all CTAs inline. On mobile
              the primary "Drill" lives as a sticky bottom CTA further down,
              and only the secondaries (Round/Mock + tools) appear here as a
              tight chip row. */}
          <div className="hidden flex-col gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              variant="brand"
              size="md"
              className="w-full sm:w-auto"
              onClick={() => navigate(`/study?topic=${topic.slug}&label=${encodeURIComponent(topicTitle(topic))}`)}
            >
              <Brain className="h-4 w-4" />
              {lang === 'ru' ? 'Повторение' : 'Drill'}
            </Button>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
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
                {lang === 'ru' ? 'Mock-собес' : 'Mock'}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 sm:ml-auto">
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
                {lang === 'ru' ? 'PDF' : 'Print'}
              </Button>
            </div>
          </div>

          {/* Mobile-only secondary chips — primary Drill is sticky-bottom. */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:hidden">
            <Button variant="codex" size="sm" className="shrink-0" onClick={() => navigate(`/round/${topic.slug}`)}>
              <MessagesSquare className="h-3.5 w-3.5" />
              {lang === 'ru' ? 'Раунд' : 'Round'}
            </Button>
            <Button variant="codex" size="sm" className="shrink-0" onClick={() => navigate(`/mock?topic=${topic.slug}`)}>
              <Target className="h-3.5 w-3.5" />
              {lang === 'ru' ? 'Mock' : 'Mock'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => window.open(`${import.meta.env.BASE_URL}topic/${topic.slug}/cheatsheet`, '_blank', 'noopener')}
            >
              <FileText className="h-3.5 w-3.5" />
              {lang === 'ru' ? 'Шпаргалка' : 'Cheatsheet'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => window.open(`${import.meta.env.BASE_URL}topic/${topic.slug}/print`, '_blank', 'noopener')}
            >
              <Printer className="h-3.5 w-3.5" />
              {lang === 'ru' ? 'PDF' : 'Print'}
            </Button>
          </div>
        </header>

        {/* Filters — wraps on desktop, horizontal-scrolls on mobile so the
            chips never overflow into a second row. The strip is bled to the
            full viewport width on small screens via -mx-4 + px-4 padding. */}
        <div className="-mx-4 mb-5 flex items-center gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:mb-6 sm:flex-wrap sm:overflow-visible sm:px-0">
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
                  'inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all duration-200',
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
                topicSlug={slug}
              />
            ))
          )}
        </div>
      </div>

      {/* Sticky mobile CTA — rendered through a portal into <body> so the
          `transform` framer-motion sets on the route-transition wrapper
          doesn't trap the fixed element inside its containing block.
          Without the portal, `position: fixed` here would be measured
          against the moving slide layer, leaving the panel ~64px above
          where it should sit. Hidden at sm+. */}
      {typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-x-0 z-30 sm:hidden"
          style={{ bottom: 'var(--bottom-nav-h, 56px)' }}
        >
          {/* Top fade — pulls content into the shelf without a hard line. */}
          <div
            className="pointer-events-none absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-paper to-transparent"
            aria-hidden
          />
          {/* Solid shelf — opaque paper + faint upward shadow so it reads as
              a physical panel layered above the scroll content. */}
          <div
            className="bg-paper px-4 pb-2 pt-3"
            style={{ boxShadow: '0 -1px 0 0 rgb(var(--rule) / 0.10), 0 -8px 16px -8px rgb(var(--shadow) / 0.10)' }}
          >
            <Button
              variant="brand"
              size="lg"
              className="w-full shadow-[0_8px_24px_-6px_rgb(var(--brand)/0.45)]"
              onClick={() => navigate(`/study?topic=${topic.slug}&label=${encodeURIComponent(topicTitle(topic))}`)}
            >
              <Brain className="h-4 w-4" />
              {lang === 'ru' ? 'Начать сессию' : 'Start a session'}
            </Button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function TopicSkeleton() {
  return (
    <div className="bg-page">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
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
