import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Target, Printer, FileText, MessagesSquare } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTopic } from '../lib/queries';
import { usePrefs } from '../store/prefs';
import QuestionCard from '../components/QuestionCard';
import TopicSources from '../components/TopicSources';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { useTopicCopy } from '../i18n/topicPage';
import { categoryLabel } from '../i18n/categories';
import {
  PageShell, PageHeader, Button, Chip, ChipGroup, Meter, EmptyState, Skeleton,
} from '../ui/index';
import { OverflowMenu } from '../ui/OverflowMenu';
import { PLATFORMS, topicPlatform } from '../lib/platform';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { track } from '../lib/analytics';
import type { Question } from '../types/domain';

/**
 * The three columns a question can be in. "In progress" is not one of them:
 * a question you started but did not finish is still a question to do, and a
 * third bucket only made the user decide which one they were looking at.
 */
type Column = 'all' | 'not_started' | 'completed';

/**
 * Last `topic_opened` we sent, as history-entry + slug. Module scope on
 * purpose: a per-mount ref cannot dedupe this, because a lazy route mounts
 * twice under StrictMode and gets a fresh ref each time. Keyed on
 * `location.key` so coming back to the same topic later is a new entry and
 * counts as a new open, which is what it is.
 */
let lastOpened: string | null = null;

export default function TopicPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // `?q=<id>` — the roadmap links straight to one question.
  const focusParam = searchParams.get('q');
  const { lang } = useLang();
  const t = useT(lang);
  const c = useTopicCopy(lang);
  const { topicTitle, topicDesc } = useContent(lang);

  // The stored preference still speaks the old four-value vocabulary — it is
  // shared with other surfaces and persisted for real users — so 'in_progress'
  // is read as "to do" rather than migrated away.
  const storedFilter = usePrefs((s) => s.topicFilter);
  const setStoredFilter = usePrefs((s) => s.setTopicFilter);
  const filter: Column = storedFilter === 'in_progress' ? 'not_started' : storedFilter;

  const { data: topic, isLoading, error } = useTopic(slug);

  // Per-topic head meta — title becomes "<Topic> Interview Questions —
  // Onsite" so SERPs show topic-specific results instead of the same
  // home title 53 times. Description quotes the topic's own one-liner.
  const metaTitleEn = topic ? `${topic.title} Interview Questions — Onsite` : null;
  const metaTitleRu = topic ? `${topicTitle(topic)}: вопросы для собеса — Onsite` : null;
  const metaDescEn = topic
    ? `${topic.description || `Practice ${topic.title} interview questions`}. ${topic.question_count || ''} questions, SRS scheduling, AI-graded answers.`
    : null;
  const metaDescRu = topic
    ? `${topicDesc(topic) || `Вопросы по теме ${topicTitle(topic)}`}. ${topic.question_count || ''} вопросов, SRS, AI-проверка.`
    : null;
  useDocumentMeta({
    title: lang === 'ru' ? metaTitleRu : metaTitleEn,
    description: lang === 'ru' ? metaDescRu : metaDescEn,
    canonical: topic ? `/topic/${topic.slug}` : null,
  });

  // Keyboard navigation: which question is "focused" + open
  const [cursor, setCursor] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  const refs = useRef(new Map<number, HTMLElement>());

  // Opening a topic is the step between "landed on the dashboard" and "started
  // a session" — without it the funnel has nothing to explain a drop-off with.
  useEffect(() => {
    if (!topic) return;
    const openKey = `${location.key}:${topic.slug}`;
    if (lastOpened === openKey) return;
    lastOpened = openKey;
    track('topic_opened', {
      slug: topic.slug,
      level: topic.level,
      platform: topicPlatform(topic),
      questions: topic.questions?.length ?? 0,
      completed: topic.questions?.filter((q) => q.status === 'completed').length ?? 0,
    });
  }, [topic, location.key]);

  // Redirect home if topic missing
  useEffect(() => {
    if (error) {
      const id = setTimeout(() => navigate('/'), 1800);
      return () => clearTimeout(id);
    }
  }, [error, navigate]);

  const questions = useMemo<Question[]>(() => topic?.questions || [], [topic]);
  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (filter === 'all') return true;
      if (filter === 'completed') return q.status === 'completed';
      return q.status !== 'completed';
    });
  }, [questions, filter]);

  const counts = useMemo<Record<Column, number>>(() => {
    const completed = questions.filter((q) => q.status === 'completed').length;
    return { all: questions.length, not_started: questions.length - completed, completed };
  }, [questions]);

  // Changing the filter can shrink the list out from under the cursor. Clamping
  // during render keeps it valid without a second commit.
  const activeCursor = cursor >= filtered.length ? 0 : cursor;

  const scrollIntoView = (id: number) => {
    const el = refs.current.get(id);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  // Land on the deep-linked question: open it and put the cursor on it in
  // the render that first sees the topic (adjusting state during render is
  // React's own answer to "derive state from a prop"), then scroll once the
  // cards have mounted their refs.
  const focusKey = topic && focusParam ? `${topic.id}:${focusParam}` : null;
  const [handledFocus, setHandledFocus] = useState<string | null>(null);
  if (focusKey && handledFocus !== focusKey) {
    setHandledFocus(focusKey);
    const id = Number(focusParam);
    const i = filtered.findIndex((q) => q.id === id);
    if (i >= 0) {
      setCursor(i);
      setOpenId(id);
    } else {
      // The question exists but the persisted To do / Done filter hides it.
      // A deep link outranks a filter: show every question and land on it.
      const all = questions.findIndex((q) => q.id === id);
      if (all >= 0) {
        setStoredFilter('all');
        setCursor(all);
        setOpenId(id);
      }
    }
  }
  useEffect(() => {
    if (!focusKey) return;
    const id = Number(focusParam);
    const timer = window.setTimeout(() => {
      refs.current.get(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusKey, focusParam]);

  useHotkeys('j, ArrowDown', (e) => {
    e.preventDefault();
    if (!filtered.length) return;
    const next = Math.min(activeCursor + 1, filtered.length - 1);
    setCursor(next);
    scrollIntoView(filtered[next].id);
  }, { preventDefault: true });

  useHotkeys('k, ArrowUp', (e) => {
    e.preventDefault();
    if (!filtered.length) return;
    const next = Math.max(activeCursor - 1, 0);
    setCursor(next);
    scrollIntoView(filtered[next].id);
  }, { preventDefault: true });

  useHotkeys('space', (e) => {
    // A focused button, link or menu trigger keeps its own Space behaviour;
    // the toggle is for the reading cursor on the page body.
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, [role="button"], [role="menuitem"], summary')) return;
    if (!filtered.length) return;
    e.preventDefault();
    const q = filtered[activeCursor];
    setOpenId((prev) => (prev === q.id ? null : q.id));
  });

  if (isLoading) return <TopicSkeleton />;
  if (error || !topic) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <span className="eyebrow text-coral">404</span>
          <p className="font-display text-2xl text-ink">{t.topicNotFound}</p>
          <p className="text-[13px] text-muted">{t.redirectingHome}</p>
        </div>
      </div>
    );
  }

  const completedCount = counts.completed;
  const pct = questions.length > 0 ? Math.round((completedCount / questions.length) * 100) : 0;
  // Breadcrumb above the title: stack, category, level — "Flutter · Dart · Junior".
  const platformMeta = PLATFORMS.find((p) => p.key === topicPlatform(topic));
  // Several categories are named after their own stack ("Android" inside
  // Android), and "Android · Android · Mid-Level" says one thing twice.
  const crumbs = [
    platformMeta ? (t[platformMeta.labelKey as keyof UICopy] as string) : null,
    categoryLabel(lang, topic.category),
    t[topic.level].short,
  ].filter((crumb, i, all): crumb is string =>
    Boolean(crumb) && all.findIndex((other) => other?.toLowerCase() === crumb?.toLowerCase()) === i);

  const startSession = () =>
    navigate(`/study?topic=${topic.slug}&label=${encodeURIComponent(topicTitle(topic))}`);
  const openStandalone = (suffix: string) =>
    window.open(`${import.meta.env.BASE_URL}topic/${topic.slug}/${suffix}`, '_blank', 'noopener');

  return (
    <PageShell width="reading" padBottom>
      <PageHeader
        eyebrow={crumbs.join(' · ')}
        title={topicTitle(topic)}
        subtitle={topicDesc(topic)}
        back={{ to: '/topics', label: c.backToTopics }}
        actions={
          <>
            {/* Below sm the same action is the sticky shelf at the bottom of
                the screen; showing both would put one primary twice on one
                phone screen. */}
            <Button variant="codex" size="md" onClick={startSession} className="hidden sm:inline-flex">
              {t.nav.startSession}
            </Button>
            <OverflowMenu
              label={c.moreActions}
              // Alone on its row below sm (the primary is the sticky shelf),
              // so it sits at the right edge instead of floating mid-header.
              className="ml-auto"
              items={[
                { label: t.nav.timed, icon: Target, onSelect: () => navigate(`/mock?topic=${topic.slug}`) },
                { label: t.nav.followups, icon: MessagesSquare, onSelect: () => navigate(`/round/${topic.slug}`) },
                { label: c.cheatsheet, icon: FileText, onSelect: () => openStandalone('cheatsheet') },
                { label: c.print, icon: Printer, onSelect: () => openStandalone('print') },
              ]}
            />
          </>
        }
      >
        <div className="flex items-center gap-3">
          <Meter
            value={completedCount}
            max={questions.length}
            label={c.progressLabel(topicTitle(topic))}
            barClassName="w-40"
          />
          <span className="text-[13px] text-muted">{c.percent(pct)}</span>
        </div>
      </PageHeader>

      <ChipGroup ariaLabel={c.statusFilters} scroll className="mb-6">
        <Chip active={filter === 'all'} count={counts.all} onClick={() => setStoredFilter('all')}>
          {t.filterAll}
        </Chip>
        <Chip active={filter === 'not_started'} count={counts.not_started} onClick={() => setStoredFilter('not_started')}>
          {t.filterTodo}
        </Chip>
        <Chip active={filter === 'completed'} count={counts.completed} onClick={() => setStoredFilter('completed')}>
          {t.filterDone}
        </Chip>
      </ChipGroup>

      {filtered.length === 0 ? (
        <EmptyState
          title={c.emptyTitle}
          body={c.emptyBody}
          action={filter !== 'all' ? { label: c.showAll, onClick: () => setStoredFilter('all') } : undefined}
        />
      ) : (
        // The rows carry their own bottom hairline; this closes the list at
        // the top so it reads as one ruled block.
        <div className="border-t border-rule/12">
          {filtered.map((q, i) => (
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
              focused={activeCursor === i}
              topicSlug={slug}
            />
          ))}
        </div>
      )}

      <div className="mt-12">
        <TopicSources topic={topic} />
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
          {/* A 16px scrim so the last row dissolves into the shelf instead of
              being sliced by its hairline. */}
          <div
            aria-hidden
            className="h-4"
            style={{ background: 'linear-gradient(to top, rgb(var(--paper)), rgb(var(--paper) / 0))' }}
          />
          <div className="border-t border-rule/12 bg-paper-2 px-4 pb-2 pt-3">
            <Button variant="codex" size="lg" className="w-full" onClick={startSession}>
              {t.nav.startSession}
            </Button>
          </div>
        </div>,
        document.body,
      )}
    </PageShell>
  );
}

function TopicSkeleton() {
  return (
    <PageShell width="reading" padBottom>
      <div className="mb-6 border-b border-rule/12 pb-5 sm:mb-8 sm:pb-6">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-3 h-8 w-3/5" />
        <Skeleton className="mt-3 h-4 w-4/5" />
        <Skeleton className="mt-5 h-3 w-56" />
      </div>
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full" />
        ))}
      </div>
      <div className="border-t border-rule/12">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-rule/10 px-1 py-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
        ))}
      </div>
    </PageShell>
  );
}
