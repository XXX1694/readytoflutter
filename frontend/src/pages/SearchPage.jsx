import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MiniSearch from 'minisearch';
import { ArrowLeft, Search as SearchIcon, X } from 'lucide-react';
import { useQuestions } from '../lib/queries.js';
import QuestionCard from '../components/QuestionCard.jsx';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { Button, FullPageLoader } from '../ui/index.js';
import { cn } from '../lib/cn.js';

const FACETS = {
  level: ['junior', 'mid', 'senior'],
  difficulty: ['easy', 'medium', 'hard'],
  status: ['not_started', 'in_progress', 'completed'],
};

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const { questionText, answerText, topicTitle } = useContent(lang);

  const initialQuery = searchParams.get('q') || '';
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [facets, setFacets] = useState({ level: null, difficulty: null, status: null });

  const inputRef = useRef(null);
  const debounceTimer = useRef(null);

  const { data: questions = [], isLoading } = useQuestions();

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
    return () => clearTimeout(debounceTimer.current);
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
        topic: topicTitle({ title: q.topic_title, slug: q.topic_slug }) || q.topic_title || '',
        tags: q.tags || '',
      })),
    );
    return ms;
  }, [questions, questionText, answerText, topicTitle]);

  // Run query and apply facets
  const results = useMemo(() => {
    let pool;
    if (query.trim()) {
      const hits = index.search(query.trim());
      const order = new Map(hits.map((h, i) => [h.id, i]));
      pool = questions.filter((q) => order.has(q.id))
                      .sort((a, b) => order.get(a.id) - order.get(b.id));
    } else {
      pool = questions;
    }
    return pool.filter((q) => {
      if (facets.level && q.level !== facets.level) return false;
      if (facets.difficulty && q.difficulty !== facets.difficulty) return false;
      if (facets.status) {
        const s = q.status || 'not_started';
        if (s !== facets.status) return false;
      }
      return true;
    });
  }, [query, facets, index, questions]);

  const setFacet = (key, value) =>
    setFacets((f) => ({ ...f, [key]: f[key] === value ? null : value }));
  const clearFacets = () => setFacets({ level: null, difficulty: null, status: null });
  const hasFacets = facets.level || facets.difficulty || facets.status;

  // Focus shortcut: '/' focuses search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target.tagName || '').toLowerCase();
        if (['input', 'textarea'].includes(tag) || e.target.isContentEditable) return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const labelFor = useCallback(
    (key, value) => {
      if (key === 'level') return { junior: t.juniorOption, mid: t.midOption, senior: t.seniorOption }[value];
      if (key === 'difficulty') return { easy: t.easy, medium: t.medium, hard: t.hard }[value];
      if (key === 'status') return { not_started: t.filterTodo, in_progress: t.filterInProgress, completed: t.filterDone }[value];
      return value;
    },
    [t],
  );

  const groupHeading = useMemo(() => {
    return {
      level: t.filterByLevel,
      difficulty: t.filterByDifficulty,
      status: t.markAs.replace(':', ''),
    };
  }, [t]);

  if (isLoading) return <FullPageLoader />;

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="-ml-2 mb-5 text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {t.backToDashboard}
        </Button>

        <header className="mb-6 border-b-1.5 border-ink pb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
            00 / {lang === 'ru' ? 'Поиск' : 'Search'}
          </span>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            {t.searchHeading.replace(':', '')}
          </h1>

          {/* Search input */}
          <div className="mt-5 flex items-center gap-2 rounded-md border-1.5 border-ink bg-paper-2 px-3 shadow-codex-sm focus-within:shadow-codex">
            <SearchIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.searchPlaceholderLong}
              className="h-11 flex-1 bg-transparent text-sm text-ink placeholder:text-muted-2 outline-none"
              autoFocus
            />
            {input && (
              <button
                type="button"
                onClick={() => { setInput(''); inputRef.current?.focus(); }}
                aria-label={lang === 'ru' ? 'Очистить' : 'Clear'}
                className="text-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden rounded border border-rule-strong px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted sm:inline-block">
              /
            </kbd>
          </div>
        </header>

        {/* Facets */}
        <div className="mb-6 space-y-3">
          {Object.keys(FACETS).map((key) => (
            <div key={key} className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted w-24">
                {groupHeading[key]}
              </span>
              {FACETS[key].map((value) => {
                const active = facets[key] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFacet(key, value)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex items-center rounded-md border-1.5 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-all',
                      active
                        ? 'border-ink bg-ink text-paper shadow-codex-sm'
                        : 'border-rule-strong bg-paper-2 text-muted hover:border-ink hover:text-ink',
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
              className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-coral hover:underline"
            >
              <X className="h-3 w-3" />
              {lang === 'ru' ? 'Сбросить фильтры' : 'Clear filters'}
            </button>
          )}
        </div>

        {/* Results meta */}
        <div className="mb-4 flex items-center justify-between border-b border-rule pb-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
            {t.resultCount(results.length)}
            {query && (
              <span className="ml-2 text-ink-2">
                · "<span className="text-ink">{query}</span>"
              </span>
            )}
          </span>
        </div>

        {/* Results */}
        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-4xl" aria-hidden>🔍</span>
            <p className="font-display text-xl text-ink">
              {query ? t.noResultsFor(query) : t.enterSearchQuery}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {t.tryDifferentKeywords}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((q, i) => (
              <div key={q.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  <span className="text-brand">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{q.topic_title}</span>
                  <span className="text-muted-2">/</span>
                  <span>{t[q.level]?.short || q.level}</span>
                </div>
                <QuestionCard question={q} index={i} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
