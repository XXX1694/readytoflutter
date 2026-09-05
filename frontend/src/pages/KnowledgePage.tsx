import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Bookmark, BookmarkCheck, ExternalLink, Play, PlayCircle,
  SlidersHorizontal, Trash2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useKnowledgeCopy, type KnowledgeCopy } from '../i18n/knowledgePage';
import {
  loadResources, filterResources, countByCategory,
  toggleSaved, markVisited, getSavedIds, getVisitedIds,
} from '../lib/knowledge';
import {
  resolveCoverVideoId, thumbnailUrl,
  getRecentlyWatched, clearRecentlyWatched, pushRecentlyWatched,
} from '../lib/youtube';
import VideoPlayer from '../components/VideoPlayer';
import {
  Button, Chip, ChipGroup, EmptyState, FullPageLoader, List, ListRow,
  PageHeader, PageShell,
} from '../ui/index';
import { cn } from '../lib/cn';
import FilterSheet from '../components/FilterSheet';
import { usePrefs } from '../store/prefs';
import { filterResourcesByPlatform } from '../lib/platform';
import type { Resource } from '../types/domain';
import { useDocumentMeta } from '../lib/useDocumentMeta';

interface ResourceCategory {
  key: string;
  title_en: string;
  title_ru: string;
}

/** One page of rows. The catalogue is 168 entries; nobody scrolls all of it. */
const PAGE_SIZE = 24;

const isPlayable = (r: Resource): boolean =>
  r.media_type === 'video' || r.media_type === 'playlist';

/**
 * Sources: the reading list, one ruled row per entry. The stack scope comes
 * from the header's stack control, the category from a single chip row, and
 * everything else (language, media, price, saved) from one filter sheet — so
 * the page carries one list instead of four stacked filter systems.
 */
export default function KnowledgePage() {
  const { lang } = useLang();
  const t = useT(lang);
  const c = useKnowledgeCopy(lang);
  useDocumentMeta({ title: c.metaTitle, description: c.metaDescription, canonical: '/knowledge/' });
  const isRu = lang === 'ru';
  const [searchParams, setSearchParams] = useSearchParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['knowledge'],
    queryFn: loadResources,
    staleTime: 1000 * 60 * 60,
  });

  const [category, setCategory] = useState(() => searchParams.get('cat') || 'all');
  const [langFilter, setLangFilter] = useState('all');
  const [media, setMedia] = useState('all');
  const [freeOnly, setFreeOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // The resource currently playing (in modal), or null.
  const [playing, setPlaying] = useState<Resource | null>(null);

  // Sync the active category back to the URL so deep-links work
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (category && category !== 'all') next.set('cat', category);
    else next.delete('cat');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Local copies so toggles re-render without round-tripping localStorage
  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const [visitedIds, setVisitedIds] = useState(() => getVisitedIds());
  const [recentIds, setRecentIds] = useState(() => getRecentlyWatched());

  const toggleSave = (id: Resource['id']) => { toggleSaved(id); setSavedIds(getSavedIds()); };

  const handleOpenExternal = (id: Resource['id']) => {
    markVisited(id);
    setVisitedIds(getVisitedIds());
  };

  const handlePlay = (resource: Resource) => {
    pushRecentlyWatched(resource.id);
    markVisited(resource.id);
    setPlaying(resource);
    setVisitedIds(getVisitedIds());
    setRecentIds(getRecentlyWatched());
  };

  const clearRecent = () => {
    clearRecentlyWatched();
    setRecentIds(getRecentlyWatched());
  };

  const platform = usePrefs((s) => s.platform);
  const categories = useMemo(
    () => (data?.categories ?? []) as ResourceCategory[],
    [data],
  );
  // Resources without an explicit `platform` field are treated as Flutter
  // (legacy data — see resourcePlatform in lib/platform). Tag new entries
  // with `"platform": "ios"` etc. to make them appear on the right stack.
  const allResources = useMemo(
    () => filterResourcesByPlatform(data?.resources ?? [], platform),
    [data, platform],
  );
  const counts = useMemo(() => countByCategory(allResources), [allResources]);
  // A category with nothing in the active stack gets no chip: "Courses 0" is
  // a focusable route to an empty list.
  const visibleCategories = useMemo(
    () => categories.filter((cat) => (counts[cat.key] || 0) > 0),
    [categories, counts],
  );
  // Switching stacks can empty the category in hand — its chip disappears, so
  // the selection falls back to All rather than stranding the user on a
  // filter nothing on the page still shows.
  if (categories.length > 0 && category !== 'all' && !counts[category]) {
    setCategory('all');
  }

  // Media options come from the data rather than a hand-kept list, so the
  // sheet never offers a filter that matches nothing.
  const mediaTypes = useMemo(() => {
    const tally = new Map<string, number>();
    for (const r of allResources) {
      if (!r.media_type) continue;
      tally.set(r.media_type, (tally.get(r.media_type) || 0) + 1);
    }
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key);
  }, [allResources]);

  const recent = useMemo(() => {
    const byId = new Map(allResources.map((r) => [r.id, r]));
    return recentIds
      .map((id) => byId.get(id))
      .filter((r): r is Resource => Boolean(r));
  }, [allResources, recentIds]);

  const filtered = useMemo(() => {
    let list = filterResources(allResources, {
      category, lang: langFilter, free: freeOnly, query,
    }) as Resource[];
    if (media !== 'all') list = list.filter((r) => r.media_type === media);
    if (savedOnly) list = list.filter((r) => savedIds.has(r.id));
    return list;
  }, [allResources, category, langFilter, media, freeOnly, query, savedOnly, savedIds]);

  // A new result set starts at the top of the first page again. Adjusting
  // during render keeps the first paint short instead of flashing however
  // many pages the previous list had grown to.
  const listKey = [category, langFilter, media, freeOnly, savedOnly, query.trim(), platform].join('|');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [seenKey, setSeenKey] = useState(listKey);
  if (seenKey !== listKey) {
    setSeenKey(listKey);
    setVisible(PAGE_SIZE);
  }

  if (isLoading) return <FullPageLoader />;

  if (error) {
    return (
      <PageShell width="app">
        <PageHeader eyebrow={c.eyebrow} title={c.errorTitle} subtitle={error.message} />
        <Button variant="codex" onClick={() => window.location.reload()}>{c.errorAction}</Button>
      </PageShell>
    );
  }

  const totalCount = allResources.length;
  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;

  const filterCount = [langFilter !== 'all', media !== 'all', freeOnly, savedOnly].filter(Boolean).length;

  const clearAllFilters = () => {
    setLangFilter('all'); setMedia('all');
    setFreeOnly(false); setSavedOnly(false);
  };

  return (
    <PageShell width="app">
      <PageHeader
        eyebrow={c.eyebrow}
        title={t.nav.sources}
        subtitle={platform === 'all' ? c.subtitleAll(totalCount) : c.subtitle(totalCount)}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ChipGroup ariaLabel={c.categoriesLabel} scroll>
            <Chip active={category === 'all'} onClick={() => setCategory('all')} count={totalCount}>
              {c.categoryAll}
            </Chip>
            {visibleCategories.map((cat) => (
              <Chip
                key={cat.key}
                active={category === cat.key}
                onClick={() => setCategory(cat.key)}
                count={counts[cat.key] || 0}
              >
                {isRu ? cat.title_ru : cat.title_en}
              </Chip>
            ))}
          </ChipGroup>
          <label className="relative block sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoCorrect="off"
              spellCheck={false}
              autoCapitalize="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={c.searchPlaceholder}
              aria-label={c.searchPlaceholder}
              className="h-10 w-full rounded-md border border-rule/12 bg-paper-2 pl-9 pr-3 text-[14px] text-ink outline-none placeholder:text-muted-2 focus:border-rule/30"
            />
          </label>
        </div>
      </PageHeader>

      {recent.length > 0 && (
        <section className="mb-8">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="eyebrow">{c.recent}</h2>
            <button
              type="button"
              onClick={clearRecent}
              className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> {c.clearRecent}
            </button>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
            {recent.map((r) => (
              <RecentChip key={r.id} resource={r} isRu={isRu} onClick={() => handlePlay(r)} />
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <Chip
          active={filterCount > 0}
          count={filterCount || undefined}
          onClick={() => setFilterSheetOpen(true)}
          aria-pressed={undefined}
          aria-haspopup="dialog"
          aria-expanded={filterSheetOpen}
        >
          <span className="inline-flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            {c.filters}
          </span>
        </Chip>
        <span className="text-[13px] text-muted">{t.resultCount(filtered.length)}</span>
      </div>

      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        title={c.filters}
        description={c.filtersHint}
        closeLabel={c.close}
        footer={
          <FilterSheet.Footer
            onApply={() => setFilterSheetOpen(false)}
            onClear={filterCount > 0 ? clearAllFilters : null}
            applyLabel={c.filtersApply(filtered.length)}
            clearLabel={c.filtersClear}
          />
        }
      >
        <div className="space-y-5 pt-1">
          <ChipGroup ariaLabel={c.language} label={c.language}>
            <Chip active={langFilter === 'all'} onClick={() => setLangFilter('all')}>{c.anyLanguage}</Chip>
            <Chip active={langFilter === 'en'} onClick={() => setLangFilter('en')}>EN</Chip>
            <Chip active={langFilter === 'ru'} onClick={() => setLangFilter('ru')}>RU</Chip>
          </ChipGroup>
          <ChipGroup ariaLabel={c.media} label={c.media}>
            <Chip active={media === 'all'} onClick={() => setMedia('all')}>{c.anyMedia}</Chip>
            {mediaTypes.map((key) => (
              <Chip key={key} active={media === key} onClick={() => setMedia(key)}>
                {c.mediaLabels[key] || key}
              </Chip>
            ))}
          </ChipGroup>
          <ChipGroup ariaLabel={c.filters}>
            <Chip active={freeOnly} onClick={() => setFreeOnly((v) => !v)}>{c.freeOnly}</Chip>
            <Chip
              active={savedOnly}
              onClick={() => setSavedOnly((v) => !v)}
              count={savedIds.size || undefined}
            >
              {c.savedOnly}
            </Chip>
          </ChipGroup>
        </div>
      </FilterSheet>

      {filtered.length === 0 ? (
        <EmptyState
          title={c.emptyTitle}
          body={c.emptyBody}
          action={{
            label: c.emptyAction,
            onClick: () => { setCategory('all'); setQuery(''); clearAllFilters(); },
          }}
        />
      ) : (
        <>
          <List>
            {shown.map((r) => (
              <SourceRow
                key={r.id}
                resource={r}
                c={c}
                isRu={isRu}
                saved={savedIds.has(r.id)}
                visited={visitedIds.has(r.id)}
                onToggleSave={() => toggleSave(r.id)}
                onPlay={() => handlePlay(r)}
                onOpenExternal={() => handleOpenExternal(r.id)}
              />
            ))}
          </List>
          {remaining > 0 && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button variant="outline" size="md" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                {c.loadMore}
              </Button>
              <span className="text-[12px] text-muted-2">{c.shownOf(shown.length, filtered.length)}</span>
            </div>
          )}
        </>
      )}

      <VideoPlayer
        resource={playing}
        isRu={isRu}
        onOpenChange={(open: boolean) => { if (!open) setPlaying(null); }}
      />
    </PageShell>
  );
}

interface SourceRowProps {
  resource: Resource;
  c: KnowledgeCopy;
  isRu: boolean;
  saved: boolean;
  visited: boolean;
  onToggleSave: () => void;
  onPlay: () => void;
  onOpenExternal: () => void;
}

const ICON_BUTTON = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors';

/**
 * One source. The title carries the row's action through a stretched
 * pseudo-element, so the whole 56px row is a target without nesting a link
 * inside a button; the two trailing controls sit above it.
 */
function SourceRow({ resource: r, c, isRu, saved, visited, onToggleSave, onPlay, onOpenExternal }: SourceRowProps) {
  const title = isRu ? (r.title_ru || r.title_en) : r.title_en;
  const playable = isPlayable(r);
  const meta = [
    r.source,
    r.media_type && (c.mediaLabels[r.media_type] || r.media_type),
    r.duration && c.duration(r.duration),
    r.free === false && c.paid,
    visited && c.opened,
  ].filter(Boolean).join(' · ');

  const titleClass = 'block text-left after:absolute after:inset-0 hover:text-brand';

  return (
    <ListRow
      className="relative"
      title={playable ? (
        <button type="button" onClick={onPlay} className={titleClass} aria-label={c.play(title)}>
          {title}
        </button>
      ) : (
        <a
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onOpenExternal}
          className={titleClass}
        >
          {title}
        </a>
      )}
      meta={meta}
      trailing={
        <>
          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={saved}
            aria-label={saved ? c.unsave : c.save}
            className={cn('relative', ICON_BUTTON, saved ? 'text-ink' : 'text-muted-2 hover:text-ink')}
          >
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
          {playable ? (
            <button
              type="button"
              onClick={onPlay}
              aria-label={c.play(title)}
              className={cn('relative text-muted-2 hover:text-ink', ICON_BUTTON)}
            >
              <Play className="h-4 w-4" />
            </button>
          ) : (
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onOpenExternal}
              aria-label={c.open(title)}
              className={cn('relative text-muted-2 hover:text-ink', ICON_BUTTON)}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </>
      }
    />
  );
}

interface RecentChipProps {
  resource: Resource;
  isRu: boolean;
  onClick: () => void;
}

function RecentChip({ resource, isRu, onClick }: RecentChipProps) {
  const coverId = resolveCoverVideoId(resource);
  const thumb = coverId ? thumbnailUrl({ videoId: coverId, playlistId: null }, 'mq') : null;
  const title = isRu ? (resource.title_ru || resource.title_en) : resource.title_en;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-44 shrink-0 flex-col overflow-hidden rounded-lg border border-rule/12 bg-paper-2 text-left"
    >
      <div className="relative aspect-video bg-ink">
        {thumb ? (
          <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-paper">
            <PlayCircle className="h-8 w-8" aria-hidden />
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors group-hover:bg-ink/35">
          <Play className="h-7 w-7 text-paper opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        </span>
      </div>
      <div className="px-2.5 py-2">
        <div className="line-clamp-2 text-[13px] font-medium leading-tight text-ink">{title}</div>
        {resource.source && (
          <div className="mt-0.5 truncate text-[12px] text-muted">{resource.source}</div>
        )}
      </div>
    </button>
  );
}
