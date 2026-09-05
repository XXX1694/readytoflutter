import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import MiniSearch from 'minisearch';
import { Search as SearchIcon, X } from 'lucide-react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useQuestions, useTopics } from '../lib/queries';
import { queryKeys } from '../lib/queryClient';
import { getAnswers } from '../api/api';
import type { PlatformKey, QuestionAnswer, QuestionSummary } from '../types/domain';
import QuestionCard from '../components/QuestionCard';
import { toPlainText } from '../lib/markdown';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { useSearchCopy } from '../i18n/searchPage';
import {
  Button, Chip, ChipGroup, EmptyState, PageHeader, PageShell, Skeleton,
} from '../ui/index';
import { useAdmin, applyDiff } from '../store/admin';
import { usePrefs, type SearchFacets } from '../store/prefs';
import { filterQuestionsByPlatform, PLATFORMS } from '../lib/platform';
import { track } from '../lib/analytics';
import { useDocumentMeta } from '../lib/useDocumentMeta';

type FacetKey = keyof SearchFacets;

// Values mirror the Level / Difficulty / ProgressStatus unions in
// types/domain; held as plain strings so one loop can render all three groups.
const FACETS: Record<FacetKey, string[]> = {
  level: ['junior', 'mid', 'senior'],
  difficulty: ['easy', 'medium', 'hard'],
  status: ['not_started', 'in_progress', 'completed'],
};

const FACET_KEYS = Object.keys(FACETS) as FacetKey[];

const NO_FACETS: SearchFacets = { level: null, difficulty: null, status: null };

/**
 * Results are paged on the client. An empty query lists the whole bank — every
 * card with its own notes editor and expand animation — and mounting all of
 * them at once is a multi-second stall on a phone.
 */
const PAGE_SIZE = 30;

function matchesFacets(q: QuestionSummary, facets: SearchFacets): boolean {
  if (facets.level && q.level !== facets.level) return false;
  if (facets.difficulty && q.difficulty !== facets.difficulty) return false;
  if (facets.status && (q.status || 'not_started') !== facets.status) return false;
  return true;
}

/**
 * Last query we reported. Module scope rather than a ref because StrictMode
 * remounts this route in dev and hands the remount a fresh ref, which would
 * report the same search twice. Holding only the most recent query means a
 * genuine re-search of an earlier term still counts.
 */
let lastSearch: string | null = null;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang } = useLang();
  const t = useT(lang);
  useDocumentMeta({ title: `${t.nav.search} — Onsite` });
  const c = useSearchCopy(lang);
  const { questionText, answerText, topicTitle } = useContent(lang);

  const initialQuery = searchParams.get('q') || '';
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [facets, setFacets] = useState<SearchFacets>(NO_FACETS);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: rawQuestions = [], isLoading } = useQuestions();
  const { data: allTopics = [] } = useTopics();
  const platform = usePrefs((s) => s.platform);

  // The catalogue carries no answer text. This is the one screen that
  // searches answers, so it loads every topic's answers file here and folds
  // them into the index as they land; a query typed before they arrive
  // matches on question text, topic and tags and widens on its own.
  const answersById = useQueries({
    queries: allTopics.map((tp) => ({
      queryKey: queryKeys.answers(tp.slug),
      queryFn: () => getAnswers(tp.slug),
      staleTime: Infinity,
    })),
    combine: useCallback((results: UseQueryResult<Record<number, QuestionAnswer>>[]) => {
      const map = new Map<number, string>();
      for (const r of results) {
        if (!r.data) continue;
        for (const [id, body] of Object.entries(r.data)) map.set(Number(id), body.answer);
      }
      return map;
    }, []),
  });

  // Layer admin edits/adds/deletes onto the server data so newly-authored
  // questions appear in search without requiring a backend round-trip.
  const edits = useAdmin((s) => s.edits);
  const adds = useAdmin((s) => s.adds);
  const deletes = useAdmin((s) => s.deletes);
  const allQuestions = useMemo(
    () => applyDiff(rawQuestions, { edits, adds, deletes }),
    [rawQuestions, edits, adds, deletes],
  );

  // The sidebar's stack scopes this page, and nothing on this page used to say
  // so — a query with hits in another stack read as "nothing found". The stack
  // is a chip in the facet row now; dismissing it searches every stack. Holding
  // the dismissed stack (rather than a boolean) means picking a different stack
  // in the sidebar re-scopes the search on its own.
  const [ignoredStack, setIgnoredStack] = useState<PlatformKey | null>(null);
  const stackScoped = platform !== 'all' && ignoredStack !== platform;
  const scope: PlatformKey = stackScoped ? platform : 'all';
  const stackLabelKey = PLATFORMS.find((p) => p.key === platform)?.labelKey ?? 'platformAll';
  const stackLabel = t[stackLabelKey];

  const questions = useMemo(
    () => filterQuestionsByPlatform(allQuestions, allTopics, scope),
    [allQuestions, allTopics, scope],
  );

  // Sync input → query (debounced) and URL
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setQuery(input);
      const params = new URLSearchParams(searchParams);
      if (input) params.set('q', input);
      else params.delete('q');
      setSearchParams(params, { replace: true });
    }, 200);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  // Build/rebuild MiniSearch index when questions or language change.
  // We index against the localized question/answer/topic text so RU search
  // hits Russian content cleanly.
  //
  // The index covers every stack; the active stack narrows the *results*
  // below, so dismissing it is instant and needs no rebuild.
  //
  // In Russian the English source text goes in as extra fields: the vocabulary
  // of this field is English, and "state management" typed against a purely
  // Russian index found one incidental hit. The reverse (an English reader
  // searching Russian text) is deliberately not done — it would make every
  // English visitor download the 1.5 MB RU corpus just to type in the box.
  const isRu = lang === 'ru';
  const index = useMemo(() => {
    const ms = new MiniSearch({
      fields: ['q', 'a', 'topic', 'tags', 'qEn', 'aEn', 'topicEn'],
      storeFields: ['id'],
      searchOptions: {
        boost: { q: 3, topic: 1.5, a: 1, tags: 1.5, qEn: 3, topicEn: 1.5, aEn: 1 },
        prefix: true,
        fuzzy: 0.15,
        combineWith: 'AND',
      },
    });
    ms.addAll(
      allQuestions.map((q) => {
        const answer = answersById.get(q.id);
        return {
          id: q.id,
          q: toPlainText(questionText(q)),
          a: toPlainText(answerText({ id: q.id, answer })),
          topic: topicTitle({ id: q.topic_id, title: q.topic_title || '' }) || q.topic_title || '',
          tags: q.tags || '',
          // Empty in English, where these would just duplicate the fields above.
          qEn: isRu ? toPlainText(q.question) : '',
          aEn: isRu ? toPlainText(answer) : '',
          topicEn: isRu ? q.topic_title || '' : '',
        };
      }),
    );
    return ms;
  }, [allQuestions, questionText, answerText, topicTitle, answersById, isRu]);

  // Run query and apply facets
  const results = useMemo(() => {
    let pool = questions;
    if (query.trim()) {
      const hits = index.search(query.trim());
      const order = new Map<number, number>(
        hits.map((h, i): [number, number] => [h.id as number, i]),
      );
      pool = questions.filter((q) => order.has(q.id))
                      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
    return pool.filter((q) => matchesFacets(q, facets));
  }, [query, facets, index, questions]);

  // Zero hits inside a stack: what the same search would return across all of
  // them, so the escape hatch can name its own payoff. Only computed on an
  // empty result set, which is the only place it is shown.
  const allStackCount = useMemo(() => {
    if (!stackScoped || results.length > 0) return 0;
    const q = query.trim();
    const hits = q ? new Set(index.search(q).map((h) => h.id as number)) : null;
    return allQuestions.filter((qu) => (!hits || hits.has(qu.id)) && matchesFacets(qu, facets)).length;
  }, [stackScoped, results.length, query, index, allQuestions, facets]);

  // A new result set starts from the top of the first page again. Keyed on
  // the inputs rather than the array's identity — the memo above recomputes
  // whenever the content helpers change identity, and resetting on that would
  // loop. Adjusting during render keeps the first paint of the new list short
  // instead of flashing however many pages the previous one had grown to.
  const resultsKey = [query.trim(), facets.level, facets.difficulty, facets.status, scope, lang].join('|');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [seenKey, setSeenKey] = useState(resultsKey);
  if (seenKey !== resultsKey) {
    setSeenKey(resultsKey);
    setVisible(PAGE_SIZE);
  }
  const shown = results.slice(0, visible);
  const remaining = results.length - shown.length;

  // What people look for, and what came back empty. The zero-result queries
  // are the content backlog — that is the whole reason this event exists.
  // Keyed on the debounced `query` so it is one event per search, not one per
  // keystroke, and not a re-fire every time a facet moves the count.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || lastSearch === q) return;
    lastSearch = q;
    track('search', { query: q.slice(0, 80), results: results.length, platform: scope });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const setFacet = (key: FacetKey, value: string): void =>
    setFacets((f) => ({ ...f, [key]: f[key] === value ? null : value }) as SearchFacets);
  const clearFacets = (): void => setFacets(NO_FACETS);
  const hasFacets = Boolean(facets.level || facets.difficulty || facets.status);

  // The words are fine, they just match in another stack: name the count and
  // hand over the one tap that widens the search.
  const elsewhere = query.trim() !== '' && allStackCount > 0
    ? { label: c.allStacksAction(allStackCount), onClick: () => setIgnoredStack(platform) }
    : undefined;
  const clearFacetsAction = hasFacets ? { label: c.clearFilters, onClick: clearFacets } : undefined;

  // Focus shortcut: '/' focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement | null;
        const tag = (target?.tagName || '').toLowerCase();
        if (['input', 'textarea'].includes(tag) || target?.isContentEditable) return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const labelFor = useCallback(
    (key: FacetKey, value: string): string => {
      if (key === 'level') return { junior: t.juniorOption, mid: t.midOption, senior: t.seniorOption }[value] || value;
      if (key === 'difficulty') return { easy: t.easy, medium: t.medium, hard: t.hard }[value] || value;
      return { not_started: t.filterTodo, in_progress: t.filterInProgress, completed: t.filterDone }[value] || value;
    },
    [t],
  );

  if (isLoading) return <SearchSkeleton />;

  return (
    <PageShell width="reading">
      <PageHeader title={t.nav.search}>
        <div className="flex items-center gap-2 rounded-lg border border-rule/12 bg-paper-2 px-4 transition-colors duration-150 focus-within:border-rule/30">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoCorrect="off"
            spellCheck={false}
            autoCapitalize="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={(e) => {
              const el = e.target;
              setTimeout(() => {
                try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
                catch { /* older Safari */ }
              }, 250);
            }}
            placeholder={t.searchPlaceholderLong}
            aria-label={t.searchPlaceholderLong}
            className="h-12 flex-1 bg-transparent text-[15px] text-ink placeholder:text-muted-2 outline-none"
            autoFocus
          />
          {input && (
            <button
              type="button"
              onClick={() => { setInput(''); inputRef.current?.focus(); }}
              aria-label={c.clearQuery}
              className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
          <kbd className="hidden rounded border border-rule/15 px-1.5 py-0.5 font-mono text-[11px] text-muted-2 sm:inline-block">
            /
          </kbd>
        </div>

        <ChipGroup ariaLabel={c.facetsLabel} scroll className="mt-4">
          {platform !== 'all' && (
            <Chip
              active={stackScoped}
              icon={stackScoped ? <X /> : undefined}
              aria-label={stackScoped ? `${stackLabel} — ${c.allStacksToggle}` : c.limitToStack(stackLabel)}
              onClick={() => setIgnoredStack(stackScoped ? platform : null)}
            >
              {stackLabel}
            </Chip>
          )}
          {FACET_KEYS.flatMap((key) =>
            FACETS[key].map((value) => (
              <Chip
                key={`${key}:${value}`}
                active={facets[key] === value}
                onClick={() => setFacet(key, value)}
              >
                {labelFor(key, value)}
              </Chip>
            )),
          )}
        </ChipGroup>
      </PageHeader>

      <div className="mb-4 flex items-center justify-between gap-3 text-[13px] text-muted">
        <span>
          {t.resultCount(results.length)}
          {query && <span className="ml-2 text-ink-2">{c.quoted(query)}</span>}
        </span>
        {hasFacets && (
          <button
            type="button"
            onClick={clearFacets}
            className="shrink-0 underline-offset-4 hover:text-ink hover:underline"
          >
            {c.clearFilters}
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <EmptyState
          title={query ? (elsewhere ? c.nothingInStack(stackLabel) : t.noResultsFor(query)) : t.enterSearchQuery}
          body={
            query
              ? (elsewhere ? c.scopedToStack(stackLabel) : (hasFacets ? t.tryDifferentKeywords : c.tryOtherWords))
              : (stackScoped ? c.indexed(questions.length) : c.indexedAll(questions.length))
          }
          action={elsewhere ?? clearFacetsAction}
          secondary={elsewhere ? clearFacetsAction : undefined}
        />
      ) : (
        <div className="space-y-3">
          {shown.map((q, i) => (
            <div key={q.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 px-1 text-[13px] text-muted">
                <span>{topicTitle({ id: q.topic_id, title: q.topic_title || '' })}</span>
                <span className="text-muted-2">·</span>
                <span>{(q.level && t[q.level]?.short) || q.level}</span>
              </div>
              <QuestionCard question={q} index={i} />
            </div>
          ))}
          {remaining > 0 && (
            <div className="flex flex-col items-center gap-2 pt-3">
              <Button variant="outline" size="md" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                {c.showMore(Math.min(PAGE_SIZE, remaining))}
              </Button>
              <span className="text-[12px] text-muted-2">{c.shownOf(shown.length, results.length)}</span>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}

function SearchSkeleton() {
  return (
    <PageShell width="reading">
      <Skeleton className="mb-6 h-8 w-40" />
      <Skeleton className="mb-4 h-12 w-full rounded-lg" />
      <div className="mb-8 flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="codex-card p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </PageShell>
  );
}
