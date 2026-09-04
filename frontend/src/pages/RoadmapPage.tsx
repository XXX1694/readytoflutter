import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ArrowUpRight, Brain, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useQuestions, useRoadmap, useTopics } from '../lib/queries';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { useContent, type ContentHelpers } from '../i18n/content';
import {
  Button, Chip, ChipGroup, Eyebrow, PageHeader, PageShell, ProgressBar, Section, Skeleton, TopicGlyph,
} from '../ui/index';
import RoadmapStrip from '../components/RoadmapStrip';
import InlineMarkdown from '../components/InlineMarkdown';
import { cn } from '../lib/cn';
import { PLATFORMS } from '../lib/platform';
import { StackIcon } from '../lib/stackIcons';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { track as trackEvent } from '../lib/analytics';
import {
  ROADMAP_BANDS,
  ROADMAP_TRACKS,
  computeStanding,
  pickTrack,
  resolveTrack,
  rungLabel,
  tierLabel,
  type ResolvedNode,
  type ResolvedRung,
} from '../lib/roadmap';

import type { QuestionSummary as Question } from '../types/domain';

// Stable empty defaults so the resolved ladder keeps its identity between
// renders while the queries are still settling.
const NO_QUESTIONS: Question[] = [];

const studyUrl = (questions: Question[], label: string): string =>
  `/study?ids=${questions.map((q) => q.id).join(',')}&label=${encodeURIComponent(label)}`;

/** A level deep-linked as `/roadmap#mid-3`. */
const hashRung = (hash: string): string | null => {
  const id = hash.replace(/^#/, '');
  return id ? id : null;
};

export default function RoadmapPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLang();
  const t = useT(lang);
  const content = useContent(lang);

  const platform = usePrefs((s) => s.platform);
  const roadmapTrack = usePrefs((s) => s.roadmapTrack);
  const setRoadmapTrack = usePrefs((s) => s.setRoadmapTrack);
  // The chips below make the choice visible, so a default is honest here.
  const trackKey = pickTrack(roadmapTrack, platform) ?? 'flutter';
  const trackMeta = PLATFORMS.find((p) => p.key === trackKey);
  const trackLabel = trackMeta ? t[trackMeta.labelKey] : trackKey;

  const roadmapQ = useRoadmap();
  const topicsQ = useTopics();
  const questionsQ = useQuestions();

  useDocumentMeta({
    title: lang === 'ru'
      ? `Маршрут ${trackLabel} — Onsite`
      : `${trackLabel} roadmap — Onsite`,
    description: t.roadmap.metaDesc,
    canonical: '/roadmap',
  });

  useEffect(() => {
    trackEvent('roadmap_opened', { track: trackKey });
  }, [trackKey]);

  const rungs = useMemo(
    () => (roadmapQ.data && topicsQ.data
      ? resolveTrack(roadmapQ.data, trackKey, topicsQ.data, questionsQ.data ?? NO_QUESTIONS, lang)
      : []),
    [roadmapQ.data, topicsQ.data, questionsQ.data, trackKey, lang],
  );
  const standing = useMemo(() => computeStanding(rungs), [rungs]);

  const jumpTo = (id: string) => {
    document.getElementById(`rung-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  if (roadmapQ.isLoading || topicsQ.isLoading || questionsQ.isLoading) return <RoadmapSkeleton />;
  if (roadmapQ.error || topicsQ.error || !rungs.length) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <p className="font-display text-2xl font-semibold text-ink">{t.failedLoadTopics}</p>
          <Button variant="brand" onClick={() => { roadmapQ.refetch(); topicsQ.refetch(); }}>{t.tryAgain}</Button>
        </div>
      </div>
    );
  }

  const bandNames = t.roadmap.band;
  const next = standing.next;
  const pct = standing.total > 0 ? Math.round((standing.completed / standing.total) * 100) : 0;

  return (
    <PageShell width="app">
      <PageHeader
        eyebrow={`${t.roadmap.title} · ${trackLabel}`}
        title={t.roadmap.subtitle}
        subtitle={t.roadmap.intro}
      >
        {/* Track switcher — the roadmap's own scope, separate from the header's
            stack control, so it says what it filters. */}
        <ChipGroup ariaLabel={t.roadmap.track} label={t.roadmap.track}>
          {ROADMAP_TRACKS.map((key) => {
            const meta = PLATFORMS.find((p) => p.key === key);
            return (
              <Chip key={key} active={key === trackKey} onClick={() => setRoadmapTrack(key)} icon={<StackIcon stack={key} />}>
                {meta ? t[meta.labelKey] : key}
              </Chip>
            );
          })}
        </ChipGroup>
      </PageHeader>

      {/* STANDING — the one card on the page: where you are and what is next. */}
      <section className="mb-10 sm:mb-14">
        <div className="codex-card p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
            <div className="min-w-0 flex-1">
              <Eyebrow>{t.roadmap.yourLevel}</Eyebrow>
              <h2 className="mt-2 font-display text-[26px] font-semibold leading-tight text-ink sm:text-[28px]">
                {standing.level ? rungLabel(standing.level, bandNames) : t.roadmap.notStarted}
              </h2>
              <p className="mt-2.5 text-[15px] leading-relaxed text-ink-2">
                {next ? (
                  <>
                    {t.roadmap.nextUp}: <span className="font-medium text-ink">{rungLabel(next, bandNames)}</span>
                    {' — '}{next.title}
                    <span className="num text-muted"> · {next.completed} / {next.total}</span>
                  </>
                ) : t.roadmap.allPassed}
              </p>
              {next && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="brand"
                    size="md"
                    onClick={() => navigate(studyUrl(next.questions, `${rungLabel(next, bandNames)} · ${next.title}`))}
                  >
                    <Brain className="h-4 w-4" aria-hidden />
                    {t.roadmap.drillNext}
                  </Button>
                  <Button variant="outline" size="md" onClick={() => jumpTo(next.id)}>
                    {rungLabel(next, bandNames)}
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              )}
            </div>
            <div className="shrink-0 lg:w-[380px]">
              <RoadmapStrip rungs={rungs} nextId={next?.id ?? null} bandNames={bandNames} onSelect={jumpTo} />
              <p className="mt-3 text-[13px] text-muted">
                <span className="num text-ink">{standing.completed}</span>
                <span className="num"> / {standing.total}</span>{' '}
                {t.roadmap.inTrack} · <span className="num">{pct}%</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* LADDER — keyed by track so open/closed state resets on a switch. */}
      <Ladder
        key={trackKey}
        rungs={rungs}
        nextId={next?.id ?? null}
        defaultOpenId={hashRung(location.hash) ?? next?.id ?? null}
        t={t}
        content={content}
      />
    </PageShell>
  );
}

// ── Ladder ───────────────────────────────────────────────────────────────────

interface LadderProps {
  rungs: ResolvedRung[];
  nextId: string | null;
  defaultOpenId: string | null;
  t: UICopy;
  content: ContentHelpers;
}

function Ladder({ rungs, nextId, defaultOpenId, t, content }: LadderProps) {
  // Only explicit toggles are stored; everything else falls back to "the
  // default level is open", so the ladder needs no effect to initialise.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (id: string): boolean => toggled[id] ?? id === defaultOpenId;
  const toggle = (id: string) => setToggled((prev) => ({ ...prev, [id]: !isOpen(id) }));

  // A deep link (`#mid-3`) lands on its level once the ladder has painted.
  useEffect(() => {
    if (!defaultOpenId || !window.location.hash) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`rung-${defaultOpenId}`)?.scrollIntoView({ block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [defaultOpenId]);

  return (
    <div>
      {ROADMAP_BANDS.map((band) => {
        const items = rungs.filter((r) => r.band === band);
        if (!items.length) return null;
        const total = items.reduce((s, r) => s + r.total, 0);
        const completed = items.reduce((s, r) => s + r.completed, 0);
        return (
          <Section
            key={band}
            title={t.roadmap.band[band] ?? band}
            subtitle={`${t.roadmap.bandDesc[band]} · ${t.roadmap.rungs(items.length)}`}
            actions={
              <span className="num text-[15px]">
                <span className="text-ink">{completed}</span> / {total}
              </span>
            }
          >
            <ol className="divide-y divide-rule/10">
              {items.map((rung, i) => (
                <RungItem
                  key={rung.id}
                  rung={rung}
                  isCurrent={rung.id === nextId}
                  isFirst={i === 0}
                  isLast={i === items.length - 1}
                  open={isOpen(rung.id)}
                  onToggle={() => toggle(rung.id)}
                  t={t}
                  content={content}
                />
              ))}
            </ol>
          </Section>
        );
      })}
    </div>
  );
}

// ── One level ────────────────────────────────────────────────────────────────

interface RungItemProps {
  rung: ResolvedRung;
  isCurrent: boolean;
  isFirst: boolean;
  isLast: boolean;
  open: boolean;
  onToggle: () => void;
  t: UICopy;
  content: ContentHelpers;
}

function RungItem({ rung, isCurrent, isFirst, isLast, open, onToggle, t, content }: RungItemProps) {
  const navigate = useNavigate();
  const label = rungLabel(rung, t.roadmap.band);
  const topicLine = rung.nodes.map((n) => content.topicTitle(n.topic)).join(' · ');

  return (
    <li id={`rung-${rung.id}`} className="relative scroll-mt-20 pl-9 sm:pl-11 lg:scroll-mt-6">
      {/* Spine: a hairline through the markers, inked once the level is passed. */}
      <span
        aria-hidden
        className={cn(
          'absolute left-[11px] w-px',
          isFirst ? 'top-6' : 'top-0',
          isLast ? 'h-6' : 'bottom-0',
          rung.passed ? 'bg-ink/50' : 'bg-rule/15',
        )}
      />
      {/* Marker: filled once passed, the pen's blue for the level to work on. */}
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-3 flex h-6 w-6 items-center justify-center rounded-full border',
          rung.passed
            ? 'border-ink bg-ink text-paper'
            : isCurrent
              ? 'border-brand bg-paper'
              : 'border-rule/30 bg-paper',
        )}
      >
        {rung.passed ? (
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        ) : isCurrent ? (
          <span className="h-2 w-2 rounded-full bg-brand" />
        ) : null}
      </span>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 py-3 text-left sm:items-center"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
            <span className={cn('font-medium', isCurrent ? 'text-brand' : 'text-ink-2')}>{label}</span>
            {rung.passed && <span className="text-mint">· {t.roadmap.passed}</span>}
            {isCurrent && <span className="text-brand">· {t.roadmap.current}</span>}
          </div>
          <h3 className="mt-0.5 font-display text-[17px] font-semibold leading-tight text-ink">
            {rung.title}
          </h3>
          <p className="mt-1 text-[13px] text-muted line-clamp-1">{topicLine}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="num text-[15px]">
            <span className={rung.passed ? 'text-mint' : 'text-ink'}>{rung.completed}</span>
            <span className="text-muted"> / {rung.total}</span>
          </span>
          <ChevronDown
            className={cn('h-4 w-4 text-muted transition-transform duration-200', open && 'rotate-180')}
            aria-hidden
          />
        </div>
      </button>

      {/* The shell no longer loads framer, so the OS reduced-motion setting is
          honoured here rather than in Layout. */}
      <MotionConfig reducedMotion="user">
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-5">
              <div className="flex items-center gap-3">
                <ProgressBar
                  label={`${rung.completed}/${rung.total}`}
                  value={rung.completed}
                  max={rung.total}
                  size="xs"
                  tone={rung.passed ? 'mint' : 'brand'}
                  className="max-w-xs"
                />
                <span className="num text-[12px] text-muted">{rung.pct}%</span>
              </div>

              <ul className="mt-3 divide-y divide-rule/10 border-t border-rule/10">
                {rung.nodes.map((node) => (
                  <NodeRow key={node.key} node={node} t={t} content={content} />
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="brand"
                  size="sm"
                  onClick={() => navigate(studyUrl(rung.questions, `${label} · ${rung.title}`))}
                >
                  <Brain className="h-3.5 w-3.5" aria-hidden />
                  {t.roadmap.drillRung}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </MotionConfig>
    </li>
  );
}

// ── One node: a topic at a tier, with its questions ─────────────────────────

interface NodeRowProps {
  node: ResolvedNode;
  t: UICopy;
  content: ContentHelpers;
}

function NodeRow({ node, t, content }: NodeRowProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const title = content.topicTitle(node.topic);
  const tier = tierLabel(node.difficulty, t.roadmap.tier);
  const done = node.total > 0 && node.completed === node.total;
  const difficultyLabel: Record<Question['difficulty'], string> = { easy: t.easy, medium: t.medium, hard: t.hard };

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-2.5 text-left"
      >
        <TopicGlyph topic={node.topic} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-ink">{title}</span>
          <span className="block text-[12px] text-muted">{tier}</span>
        </span>
        <span className="num shrink-0 text-[13px]">
          <span className={done ? 'text-mint' : 'text-ink'}>{node.completed}</span>
          <span className="text-muted"> / {node.total}</span>
        </span>
        <ChevronRight
          className={cn('h-4 w-4 shrink-0 text-muted transition-transform duration-200', open && 'rotate-90')}
          aria-hidden
        />
      </button>

      {open && (
        <div className="pb-3 sm:pl-10">
          <ol className="space-y-0.5">
            {node.questions.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/topic/${node.topic.slug}?q=${q.id}`)}
                  className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-rule/6"
                >
                  <StatusMark status={q.status} />
                  <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink-2 line-clamp-2">
                    <InlineMarkdown text={content.questionText(q)} />
                  </span>
                  {/* Difficulty is a word, not a coloured chip: three tinted
                      pills per row spent the palette on a fact you read once. */}
                  <span className="hidden shrink-0 text-[12px] text-muted sm:inline">
                    {difficultyLabel[q.difficulty]}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-2 flex flex-wrap gap-1.5 px-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => navigate(studyUrl(node.questions, `${title} · ${tier}`))}
            >
              <Brain className="h-3 w-3" aria-hidden />
              {t.roadmap.drillNode}
            </Button>
            <Button variant="ghost" size="xs" onClick={() => navigate(`/topic/${node.topic.slug}`)}>
              {t.roadmap.openTopic}
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Completed is a mint check, in progress an amber dot, untouched a hollow ring. */
function StatusMark({ status }: { status: Question['status'] }) {
  if (status === 'completed') {
    return (
      <span aria-hidden className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-mint text-paper">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span aria-hidden className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--amber))]">
        <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--amber))]" />
      </span>
    );
  }
  return <span aria-hidden className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-rule/30" />;
}

// ── Loading ──────────────────────────────────────────────────────────────────

function RoadmapSkeleton() {
  return (
    <PageShell width="app">
      <div className="mb-6 border-b border-rule/12 pb-5 sm:mb-8 sm:pb-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-2 h-7 w-64 max-w-full" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
        <Skeleton className="mt-2 h-4 w-3/4 max-w-xl" />
        <div className="mt-5 flex gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-24 rounded-full" />)}
        </div>
      </div>
      <div className="codex-card p-5 sm:p-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-40" />
        <Skeleton className="mt-3 h-4 w-2/3 max-w-md" />
      </div>
      {[1, 2].map((band) => (
        <div key={band} className="mt-10 sm:mt-14">
          <div className="mb-4 border-b border-rule/12 pb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-3 w-64 max-w-full" />
          </div>
          <div className="space-y-4 pl-9">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-5 w-1/2" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </PageShell>
  );
}
