import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MiniSearch from 'minisearch';
import { ArrowLeft, Search as SearchIcon, X } from 'lucide-react';
import { useQuestions, useTopics } from '../lib/queries';
import QuestionCard from '../components/QuestionCard';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { Button, Eyebrow, Skeleton } from '../ui/index';
import { cn } from '../lib/cn';
import { useAdmin, applyDiff } from '../store/admin';
import PlatformFilter from '../components/PlatformFilter';
import FilterSheet, { FilterSheetTrigger } from '../components/FilterSheet';
import { usePrefs, type SearchFacets } from '../store/prefs';
import { filterQuestionsByPlatform } from '../lib/platform';
import { track } from '../lib/analytics';

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
 * Results are paged on the client. An empty query lists the whole bank — 392
 * cards, each with its own notes editor and expand animation — and mounting
 * all of them at once is a multi-second stall on a phone.
 */
const PAGE_SIZE = 30;

/**
 * Last query we reported. Module scope rather than a ref because StrictMode
 * remounts this route in dev and hands the remount a fresh ref, which would
 * report the same search twice. Holding only the most recent query means a
 * genuine re-search of an earlier term still counts.
 */
let lastSearch: string | null = null;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const { questionText, answerText, topicTitle } = useContent(lang);

  const initialQuery = searchParams.get('q') || '';
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [facets, setFacets] = useState<SearchFacets>(NO_FACETS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: rawQuestions = [], isLoading } = useQuestions();
  const { data: allTopics = [] } = useTopics();
  const platform = usePrefs((s) => s.platform);

  // Layer admin edits/adds/deletes onto the server data so newly-authored
  // questions appear in search without requiring a backend round-trip.
  const edits = useAdmin((s) => s.edits);
  const adds = useAdmin((s) => s.adds);
  const deletes = useAdmin((s) => s.deletes);
  const questions = useMemo(() => {
    const merged = applyDiff(rawQuestions, { edits, adds, deletes });
    return filterQuestionsByPlatform(merged, allTopics, platform);
  }, [rawQuestions, edits, adds, deletes, allTopics, platform]);

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
  const index = useMemo(() => {
    const ms = new MiniSearch({
      fields: ['q', 'a', 'topic', 'tags'],
      storeFields: ['id'],
      searchOptions: {
        boost: { q: 3, topic: 1.5, a: 1, tags: 1.5 },
        prefix: true,
        fuzzy: 0.15,
        combineWith: 'AND',
      },
    });
    ms.addAll(
      questions.map((q) => ({
        id: q.id,
        q: questionText(q) || '',
        a: answerText(q) || '',
        topic: topicTitle({ id: q.topic_id, title: q.topic_title || '' }) || q.topic_title || '',
        tags: q.tags || '',
      })),
    );
    return ms;
  }, [questions, questionText, answerText, topicTitle]);

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
    return pool.filter((q) => {
      if (facets.level && q.level !== facets.level) return false;
      if (facets.difficulty && q.difficulty !== facets.difficulty) return false;
      if (facets.status && (q.status || 'not_started') !== facets.status) return false;
      return true;
    });
  }, [query, facets, index, questions]);

  // A new result set starts from the top of the first page again. Keyed on
  // the inputs rather than the array's identity — the memo above recomputes
  // whenever the content helpers change identity, and resetting on that would
  // loop. Adjusting during render keeps the first paint of the new list short
  // instead of flashing however many pages the previous one had grown to.
  const resultsKey = [query.trim(), facets.level, facets.difficulty, facets.status, platform, lang].join('|');
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
    track('search', { query: q.slice(0, 80), results: results.length, platform });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const setFacet = (key: FacetKey, value: string): void =>
    setFacets((f) => ({ ...f, [key]: f[key] === value ? null : value }) as SearchFacets);
  const clearFacets = (): void => setFacets(NO_FACETS);
  const hasFacets = Boolean(facets.level || facets.difficulty || facets.status);

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

  // Short labels: the chips beneath already say what they filter, so
  // "Filter by level" would be the same word twice in a row.
  const groupHeading: Record<FacetKey, string> = useMemo(
    () => ({
      level: lang === 'ru' ? 'Уровень' : 'Level',
      difficulty: lang === 'ru' ? 'Сложность' : 'Difficulty',
      status: lang === 'ru' ? 'Статус' : 'Status',
    }),
    [lang],
  );

  if (isLoading) return <SearchSkeleton />;

  // Active facet count drives the badge on the mobile filters trigger.
  const facetCount = FACET_KEYS.filter((k) => facets[k]).length;

  return (
    <div className="bg-page">
      <div className="w-full px-4 py-4 sm:px-6 sm:py-10 lg:px-8 2xl:px-12">
        {/* Back row — desktop only, mobile uses header arrow. */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="-ml-2 mb-5 hidden text-muted hover:text-ink lg:inline-flex"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {t.backToDashboard}
        </Button>

        <header className="mb-6 border-b border-rule/12 pb-5">
          <Eyebrow>{lang === 'ru' ? 'Поиск' : 'Search'}</Eyebrow>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
            {t.searchHeading.replace(':', '')}
          </h1>

          <div className="mt-5 flex items-center gap-2 rounded-lg border border-rule/12 bg-paper-2 px-4 transition-colors duration-150 focus-within:border-rule/30">
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
                aria-label={lang === 'ru' ? 'Очистить' : 'Clear'}
                className="-mr-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
            <kbd className="hidden rounded border border-rule/15 px-1.5 py-0.5 font-mono text-[11px] text-muted-2 sm:inline-block">
              /
            </kbd>
          </div>
        </header>

        {/* Platform scope — narrows the indexed pool to one stack so search
            stays sharp when the catalog spans multiple technologies. */}
        <div className="mb-5">
          <PlatformFilter />
        </div>

        {/* Facets — mobile shows a single Filters trigger that opens a
            bottom-sheet with the same controls. Desktop keeps the inline
            stack so the full surface is visible at once. */}
        <div className="mb-5 flex items-center gap-3 sm:hidden">
          <FilterSheetTrigger
            onClick={() => setFilterSheetOpen(true)}
            count={facetCount}
            label={lang === 'ru' ? 'Фильтры' : 'Filters'}
          />
          {hasFacets && (
            <button
              type="button"
              onClick={clearFacets}
              className="text-[13px] text-muted underline-offset-4 active:underline"
            >
              {lang === 'ru' ? 'Сбросить' : 'Clear filters'}
            </button>
          )}
        </div>

        <div className="mb-6 hidden space-y-2.5 sm:block">
          {FACET_KEYS.map((key) => (
            <div key={key} className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0 text-[13px] text-muted">{groupHeading[key]}</span>
              {FACETS[key].map((value: string) => {
                const active = facets[key] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFacet(key, value)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex min-h-[34px] items-center rounded-md border px-3 text-[13px] font-medium transition-colors duration-150',
                      active
                        ? 'border-ink bg-ink text-paper'
                        : 'border-rule/12 bg-paper-2 text-ink-2 hover:border-rule/25 hover:text-ink',
                    )}
                  >
                    {labelFor(key, value)}
                  </button>
                );
              })}
            </div>
          ))}
          {hasFacets && (
            <button
              type="button"
              onClick={clearFacets}
              className="text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              {lang === 'ru' ? 'Сбросить фильтры' : 'Clear filters'}
            </button>
          )}
        </div>

        {/* Bottom-sheet filters — same control set, larger touch targets,
            stacked vertically. */}
        <FilterSheet
          open={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          title={lang === 'ru' ? 'Фильтры' : 'Filters'}
          closeLabel={lang === 'ru' ? 'Закрыть' : 'Close'}
          footer={
            <FilterSheet.Footer
              onApply={() => setFilterSheetOpen(false)}
              onClear={hasFacets ? clearFacets : null}
              applyLabel={lang === 'ru' ? 'Готово' : 'Done'}
              clearLabel={lang === 'ru' ? 'Сброс' : 'Clear'}
            />
          }
        >
          <div className="space-y-5 pt-1">
            {FACET_KEYS.map((key) => (
              <div key={key}>
                <div className="mb-2 text-[13px] text-muted">{groupHeading[key]}</div>
                <div className="flex flex-wrap gap-2">
                  {FACETS[key].map((value: string) => {
                    const active = facets[key] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFacet(key, value)}
                        aria-pressed={active}
                        className={cn(
                          'inline-flex min-h-[44px] items-center rounded-md border px-4 text-[14px] font-medium transition-colors duration-150',
                          active
                            ? 'border-ink bg-ink text-paper'
                            : 'border-rule/12 bg-paper-2 text-ink-2',
                        )}
                      >
                        {labelFor(key, value)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </FilterSheet>

        {/* Results meta */}
        <div className="mb-4 flex items-center justify-between border-b border-rule/12 pb-3 text-[13px] text-muted">
          <span>
            {t.resultCount(results.length)}
            {query && <span className="ml-2 text-ink-2">“{query}”</span>}
          </span>
        </div>

        {/* Results */}
        {results.length === 0 ? (
          <div className="codex-card mt-6 flex flex-col items-start gap-4 p-6 sm:items-center sm:p-12 sm:text-center">
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                {query ? t.noResultsFor(query) : t.enterSearchQuery}
              </h2>
              <p className="max-w-sm text-[15px] leading-relaxed text-ink-2">
                {query
                  ? t.tryDifferentKeywords
                  : (lang === 'ru'
                      ? `В индексе ${questions.length} вопросов по выбранному стеку.`
                      : `${questions.length} questions indexed for the stack you picked.`)}
              </p>
            </div>
            {hasFacets && (
              <Button variant="outline" size="sm" onClick={clearFacets}>
                {lang === 'ru' ? 'Сбросить фильтры' : 'Clear filters'}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((q, i) => (
              <div key={q.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 px-1 text-[13px] text-muted">
                  <span>{q.topic_title}</span>
                  <span className="text-muted-2">·</span>
                  <span>{(q.level && t[q.level]?.short) || q.level}</span>
                </div>
                <QuestionCard question={q} index={i} />
              </div>
            ))}
            {remaining > 0 && (
              <div className="flex flex-col items-center gap-2 pt-3">
                <Button variant="outline" size="md" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  {lang === 'ru'
                    ? `Показать ещё ${Math.min(PAGE_SIZE, remaining)}`
                    : `Show ${Math.min(PAGE_SIZE, remaining)} more`}
                </Button>
                <span className="text-[12px] text-muted-2">
                  {lang === 'ru'
                    ? `${shown.length} из ${results.length}`
                    : `${shown.length} of ${results.length}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="bg-page">
      <div className="w-full px-4 py-6 sm:px-6 sm:py-10 lg:px-8 2xl:px-12">
        <Skeleton className="mb-5 h-4 w-32" />
        <Skeleton className="mb-2 h-3 w-16" />
        <Skeleton className="mb-6 h-9 w-1/2 max-w-md" />
        <Skeleton className="mb-6 h-12 w-full rounded-lg" />
        <div className="mb-6 flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-md" />
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
      </div>
    </div>
  );
}
