import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useQuestions, useTopics } from '../lib/queries';
import { getCardState, readAll } from '../lib/srs';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { useTopicsCopy } from '../i18n/topicsPage';
import { categoryLabel } from '../i18n/categories';
import {
  PageShell, PageHeader, Section, Chip, ChipGroup, List, ListRow, Meter, EmptyState, Skeleton, TopicGlyph,
} from '../ui/index';
import { filterTopicsByPlatform, PLATFORMS } from '../lib/platform';
import { StackTile } from '../lib/stackIcons';
import { useDocumentMeta } from '../lib/useDocumentMeta';

import type { Level, QuestionSummary as Question, Topic } from '../types/domain';

const LEVELS: Level[] = ['junior', 'mid', 'senior'];
const NO_QUESTIONS: Question[] = [];

// A finger on a row starts the topic page's chunk downloading ~100 ms before
// the click lands. Vite dedupes repeated imports, so this is free to spam.
const warmTopicPage = (): void => { void import('./TopicPage'); };

/** Cards waiting in the SRS queue, per topic. Module scope keeps the clock read out of render. */
function countDueByTopic(questions: ReadonlyArray<Pick<Question, 'id' | 'topic_id'>>, now: number = Date.now()): Map<number, number> {
  const map = new Map<number, number>();
  // One localStorage read + parse for the whole catalogue, not one per question.
  const cards = readAll();
  for (const q of questions) {
    const s = getCardState(q.id, cards);
    if (s.reps > 0 && s.dueAt <= now) map.set(q.topic_id, (map.get(q.topic_id) || 0) + 1);
  }
  return map;
}

/**
 * The catalogue: every topic of the active stack as a ruled list, grouped by
 * level. This is where the 53 tiles that used to fill the dashboard live now,
 * one row each — glyph, name, meter, due count — so the whole stack fits on
 * two screens and reads like a table of contents.
 */
export default function TopicsPage() {
  const { lang } = useLang();
  const t = useT(lang);
  const c = useTopicsCopy(lang);
  const { topicTitle } = useContent(lang);
  const platform = usePrefs((s) => s.platform);
  const setPlatform = usePrefs((s) => s.setPlatform);

  const topicsQ = useTopics();
  const questionsQ = useQuestions();
  const [level, setLevel] = useState<Level | 'all'>('all');
  const [query, setQuery] = useState('');

  useDocumentMeta({
    title: lang === 'ru' ? 'Темы — Onsite' : 'Topics — Onsite',
    canonical: '/topics/',
  });

  const dueByTopic = useMemo(() => countDueByTopic(questionsQ.data ?? NO_QUESTIONS), [questionsQ.data]);
  const scoped = useMemo(() => filterTopicsByPlatform(topicsQ.data ?? [], platform), [topicsQ.data, platform]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((tp) => {
      if (level !== 'all' && tp.level !== level) return false;
      if (!q) return true;
      return topicTitle(tp).toLowerCase().includes(q) || tp.title.toLowerCase().includes(q) || tp.category.toLowerCase().includes(q);
    });
  }, [scoped, level, query, topicTitle]);

  const totalQuestions = scoped.reduce((s, tp) => s + (tp.question_count || 0), 0);
  const stackMeta = PLATFORMS.find((p) => p.key === platform);

  if (topicsQ.isLoading) {
    return (
      <PageShell width="catalog">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-40" />
        <Skeleton className="mt-3 h-4 w-56" />
        <div className="mt-8 space-y-px">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-none" />)}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="catalog">
      <PageHeader
        eyebrow={c.eyebrow}
        title={c.title}
        subtitle={c.subtitle(scoped.length, totalQuestions)}
        actions={
          <Link to="/knowledge" className="inline-flex items-center gap-1 text-[13px] text-brand hover:underline">
            {c.sources}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ChipGroup ariaLabel={c.levelAll} scroll>
            <Chip active={level === 'all'} onClick={() => setLevel('all')}>{c.levelAll}</Chip>
            {LEVELS.map((lv) => (
              <Chip key={lv} active={level === lv} onClick={() => setLevel(lv)}>{t[lv].short}</Chip>
            ))}
          </ChipGroup>
          <label className="relative block sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={c.filterPlaceholder}
              aria-label={c.filterPlaceholder}
              className="h-10 w-full rounded-md border border-rule/12 bg-paper-2 pl-9 pr-3 text-[14px] text-ink outline-none placeholder:text-muted-2 focus:border-rule/30"
            />
          </label>
        </div>
      </PageHeader>

      {platform !== 'all' && stackMeta && (
        <p className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
          <StackTile stack={platform} size="xs" />
          <span>{c.scopedHint(t[stackMeta.labelKey])}</span>
          <button type="button" onClick={() => setPlatform('all')} className="font-medium text-brand hover:underline">
            {c.showEveryStack}
          </button>
        </p>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title={c.emptyTitle}
          body={c.emptyBody}
          action={{ label: c.showEveryStack, onClick: () => { setPlatform('all'); setLevel('all'); setQuery(''); } }}
        />
      ) : (
        LEVELS.map((lv) => {
          const items = visible.filter((tp: Topic) => tp.level === lv);
          if (!items.length) return null;
          return (
            <Section key={lv} title={t[lv].label} subtitle={`${t[lv].desc} · ${t.topicCount(items.length)}`}>
              <List>
                {items.map((topic) => {
                  const due = dueByTopic.get(topic.id) || 0;
                  return (
                    <ListRow
                      key={topic.id}
                      to={`/topic/${topic.slug}`}
                      onPointerDown={warmTopicPage}
                      leading={<TopicGlyph topic={topic} size="sm" />}
                      title={topicTitle(topic)}
                      meta={
                        due > 0 ? (
                          <>
                            {categoryLabel(lang, topic.category)} · <span className="text-brand">{c.due(due)}</span>
                          </>
                        ) : categoryLabel(lang, topic.category)
                      }
                      trailing={
                        <Meter
                          value={topic.completed_count || 0}
                          max={topic.question_count || 0}
                          label={`${topicTitle(topic)} — ${c.completedOf}`}
                          barClassName="w-10 sm:w-16"
                        />
                      }
                    />
                  );
                })}
              </List>
            </Section>
          );
        })
      )}
    </PageShell>
  );
}
