import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Search, Library, BookOpen, FileText, PlayCircle, GraduationCap,
  Podcast, Users, Wrench, Bookmark, BookmarkCheck, ExternalLink,
  X, Play, Trash2, ListVideo, type LucideIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLang } from '../i18n/LangContext';
import {
  loadResources, filterResources, countByCategory,
  toggleSaved, markVisited, getSavedIds, getVisitedIds,
} from '../lib/knowledge';
import {
  resolvePlayable, resolveCoverVideoId, thumbnailUrl,
  getRecentlyWatched, clearRecentlyWatched, pushRecentlyWatched,
} from '../lib/youtube';
import VideoPlayer from '../components/VideoPlayer';
import { Button, Pill, Eyebrow, FullPageLoader } from '../ui/index';
import { cn } from '../lib/cn';
import PlatformFilter from '../components/PlatformFilter';
import FilterSheet, { FilterSheetTrigger } from '../components/FilterSheet';
import { usePrefs } from '../store/prefs';
import { filterResourcesByPlatform } from '../lib/platform';
import type { Level, Resource } from '../types/domain';

interface ResourceCategory {
  key: string;
  title_en: string;
  title_ru: string;
  subtitle_en?: string;
  subtitle_ru?: string;
}

interface Option<K extends string> {
  key: K;
  en: string;
  ru: string;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  docs: BookOpen,
  articles: FileText,
  videos: PlayCircle,
  courses: GraduationCap,
  books: Library,
  podcasts: Podcast,
  communities: Users,
  tools: Wrench,
};

// Only the two media types worth naming on a card — the rest are implied by
// the category the card sits under.
const MEDIA_LABEL: Record<string, Option<string>> = {
  playlist: { key: 'playlist', en: 'Playlist', ru: 'Плейлист' },
  channel: { key: 'channel', en: 'Channel', ru: 'Канал' },
};

const LEVELS: Option<Level | 'all'>[] = [
  { key: 'all', en: 'All levels', ru: 'Любой уровень' },
  { key: 'junior', en: 'Junior', ru: 'Junior' },
  // "Middle" is how the rest of the app names the grade in Russian.
  { key: 'mid', en: 'Mid', ru: 'Middle' },
  { key: 'senior', en: 'Senior', ru: 'Senior' },
];

const levelLabel = (level: Level, isRu: boolean): string => {
  const option = LEVELS.find((l) => l.key === level);
  return option ? (isRu ? option.ru : option.en) : level;
};

const LANGS: Option<string>[] = [
  { key: 'all', en: 'Any', ru: 'Любой' },
  { key: 'en', en: 'EN', ru: 'EN' },
  { key: 'ru', en: 'RU', ru: 'RU' },
];

const MEDIA_TYPES: Option<string>[] = [
  { key: 'all', en: 'Any', ru: 'Любой' },
  { key: 'video', en: 'Video', ru: 'Видео' },
  { key: 'playlist', en: 'Playlist', ru: 'Плейлист' },
  { key: 'channel', en: 'Channel', ru: 'Канал' },
];

const isPlayable = (r: Resource): boolean =>
  r.media_type === 'video' || r.media_type === 'playlist';

export default function KnowledgePage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const isRu = lang === 'ru';
  const [searchParams, setSearchParams] = useSearchParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['knowledge'],
    queryFn: loadResources,
    staleTime: 1000 * 60 * 60,
  });

  const [category, setCategory] = useState(() => searchParams.get('cat') || 'all');
  const [level, setLevel] = useState<Level | 'all'>('all');
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

  const recent = useMemo(() => {
    const byId = new Map(allResources.map((r) => [r.id, r]));
    return recentIds
      .map((id) => byId.get(id))
      .filter((r): r is Resource => Boolean(r));
  }, [allResources, recentIds]);

  const filtered = useMemo(() => {
    let list = filterResources(allResources, {
      category, level, lang: langFilter, free: freeOnly, query,
    }) as Resource[];
    if (media !== 'all') list = list.filter((r) => r.media_type === media);
    if (savedOnly) list = list.filter((r) => savedIds.has(r.id));
    return list;
  }, [allResources, category, level, langFilter, media, freeOnly, query, savedOnly, savedIds]);

  const grouped = useMemo(() => {
    if (category !== 'all') return [{ category, items: filtered }];
    const byCategory = new Map<string, Resource[]>();
    for (const r of filtered) {
      const key = r.category || 'other';
      const bucket = byCategory.get(key);
      if (bucket) bucket.push(r);
      else byCategory.set(key, [r]);
    }
    return categories
      .filter((c) => byCategory.has(c.key))
      .map((c) => ({ category: c.key, items: byCategory.get(c.key) as Resource[] }));
  }, [filtered, category, categories]);

  if (isLoading) return <FullPageLoader />;

  if (error) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <h1 className="font-display text-2xl text-ink">
            {isRu ? 'Не получилось загрузить базу знаний' : 'Could not load the knowledge base'}
          </h1>
          <p className="mt-3 text-sm text-muted">{error.message}</p>
          <Button variant="codex" className="mt-6" onClick={() => window.location.reload()}>
            {isRu ? 'Перезагрузить' : 'Reload'}
          </Button>
        </div>
      </div>
    );
  }

  const totalCount = allResources.length;
  const filteredCount = filtered.length;
  const playableCount = allResources.filter(isPlayable).length;

  // Active filter count for the mobile bottom-sheet trigger badge.
  const filterCount = [
    level !== 'all',
    langFilter !== 'all',
    media !== 'all',
    freeOnly,
    savedOnly,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setLevel('all'); setLangFilter('all'); setMedia('all');
    setFreeOnly(false); setSavedOnly(false);
  };

  return (
    <div className="bg-page">
      <div className="w-full px-4 py-4 sm:px-6 sm:py-10 lg:px-8 2xl:px-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="-ml-2 mb-5 hidden text-muted hover:text-ink lg:inline-flex"
        >
          <ArrowLeft className="h-4 w-4" /> {isRu ? 'На главную' : 'Back'}
        </Button>

        {/* Header */}
        <header className="mb-6 border-b border-rule/12 pb-5 sm:mb-8 sm:pb-6">
          <Eyebrow>{isRu ? 'База знаний' : 'Knowledge base'}</Eyebrow>
          <h1 className="mt-2 font-display text-2xl font-medium leading-tight text-ink sm:text-display-sm">
            {isRu ? 'Учись шире, чем вопросы' : 'Learn beyond the questions'}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted sm:mt-3">
            {isRu
              ? 'Подобранные доки, статьи, видео, плейлисты, курсы и комьюнити. Видео и плейлисты с YouTube играют прямо здесь.'
              : 'Curated docs, articles, videos, playlists, courses and communities. YouTube videos and playlists play inside the app.'}
          </p>
          <p className="mt-3 text-[13px] text-muted">
            {isRu
              ? `${totalCount} материалов в ${categories.length} категориях · ${playableCount} играют в плеере`
              : `${totalCount} resources across ${categories.length} categories · ${playableCount} play in app`}
          </p>
        </header>

        {/* Recently watched */}
        {recent.length > 0 && (
          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <Eyebrow>{isRu ? 'Недавно смотрел' : 'Recently watched'}</Eyebrow>
              <button
                type="button"
                onClick={clearRecent}
                className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> {isRu ? 'Очистить' : 'Clear'}
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recent.map((r) => (
                <RecentChip key={r.id} resource={r} isRu={isRu} onClick={() => handlePlay(r)} />
              ))}
            </div>
          </section>
        )}

        {/* Stack scope — resources without an explicit `platform` field are
            treated as Flutter (legacy). Tag new entries to surface here. */}
        <div className="mb-5">
          <PlatformFilter />
        </div>

        {/* Search */}
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-rule/12 bg-paper-2 px-3 py-2">
          <Search className="h-4 w-4 text-muted" aria-hidden />
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoCorrect="off"
            spellCheck={false}
            autoCapitalize="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={isRu ? 'Поиск по базе знаний' : 'Search the knowledge base'}
            placeholder={isRu
              ? 'Найти материал — riverpod, тестирование, arch…'
              : 'Search — riverpod, testing, arch…'}
            className="w-full bg-transparent text-base text-ink placeholder:text-muted-2 outline-none sm:text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={isRu ? 'Очистить' : 'Clear'}
              className="-my-2 -mr-1.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category strip — wraps on desktop, horizontal-scrolls on mobile so
            12+ categories never break onto a third row. */}
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <CategoryChip
            active={category === 'all'}
            onClick={() => setCategory('all')}
            label={isRu ? 'Всё' : 'All'}
            count={totalCount}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.key}
              active={category === c.key}
              onClick={() => setCategory(c.key)}
              label={isRu ? c.title_ru : c.title_en}
              count={counts[c.key] || 0}
            />
          ))}
        </div>

        {/* Mobile filter trigger — opens a bottom-sheet with the full
            level/lang/type/free/saved control set. Keeps the page surface
            clean on small screens. */}
        <div className="mb-5 flex items-center justify-between gap-2 sm:hidden">
          <FilterSheetTrigger
            onClick={() => setFilterSheetOpen(true)}
            count={filterCount}
            label={isRu ? 'Фильтры' : 'Filters'}
          />
          <span className="text-[13px] text-muted">
            {filteredCount} / {totalCount}
          </span>
        </div>

        {/* Filter row — desktop / tablet inline grid */}
        <div className="mb-6 hidden flex-wrap items-center gap-x-5 gap-y-2 border-y border-rule/12 py-3 sm:flex">
          <FilterGroup label={isRu ? 'Уровень' : 'Level'}>
            {LEVELS.map((l) => (
              <ToggleChip key={l.key} active={level === l.key} onClick={() => setLevel(l.key)}>
                {isRu ? l.ru : l.en}
              </ToggleChip>
            ))}
          </FilterGroup>
          <FilterGroup label={isRu ? 'Язык' : 'Language'}>
            {LANGS.map((l) => (
              <ToggleChip key={l.key} active={langFilter === l.key} onClick={() => setLangFilter(l.key)}>
                {isRu ? l.ru : l.en}
              </ToggleChip>
            ))}
          </FilterGroup>
          <FilterGroup label={isRu ? 'Тип' : 'Type'}>
            {MEDIA_TYPES.map((m) => (
              <ToggleChip key={m.key} active={media === m.key} onClick={() => setMedia(m.key)}>
                {isRu ? m.ru : m.en}
              </ToggleChip>
            ))}
          </FilterGroup>
          <FilterGroup>
            <ToggleChip active={freeOnly} onClick={() => setFreeOnly((v) => !v)}>
              {isRu ? 'Только бесплатное' : 'Free only'}
            </ToggleChip>
            <ToggleChip active={savedOnly} onClick={() => setSavedOnly((v) => !v)}>
              {isRu ? 'Сохранённое' : 'Saved'}
              {savedIds.size > 0 && ` (${savedIds.size})`}
            </ToggleChip>
          </FilterGroup>
          <span className="ml-auto text-[13px] text-muted">
            {filteredCount} / {totalCount}
          </span>
        </div>

        {/* Mobile filter bottom-sheet */}
        <FilterSheet
          open={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          title={isRu ? 'Фильтры' : 'Filters'}
          description={isRu
            ? 'Сузь список по уровню, языку и типу материала.'
            : 'Narrow the list by level, language and media type.'}
          closeLabel={isRu ? 'Закрыть' : 'Close'}
          footer={
            <FilterSheet.Footer
              onApply={() => setFilterSheetOpen(false)}
              onClear={filterCount > 0 ? clearAllFilters : null}
              applyLabel={isRu ? `Показать ${filteredCount}` : `Show ${filteredCount}`}
              clearLabel={isRu ? 'Сброс' : 'Clear'}
            />
          }
        >
          <div className="space-y-5 pt-1">
            <SheetGroup label={isRu ? 'Уровень' : 'Level'}>
              {LEVELS.map((l) => (
                <SheetChip key={l.key} active={level === l.key} onClick={() => setLevel(l.key)}>
                  {isRu ? l.ru : l.en}
                </SheetChip>
              ))}
            </SheetGroup>
            <SheetGroup label={isRu ? 'Язык' : 'Language'}>
              {LANGS.map((l) => (
                <SheetChip key={l.key} active={langFilter === l.key} onClick={() => setLangFilter(l.key)}>
                  {isRu ? l.ru : l.en}
                </SheetChip>
              ))}
            </SheetGroup>
            <SheetGroup label={isRu ? 'Тип' : 'Type'}>
              {MEDIA_TYPES.map((m) => (
                <SheetChip key={m.key} active={media === m.key} onClick={() => setMedia(m.key)}>
                  {isRu ? m.ru : m.en}
                </SheetChip>
              ))}
            </SheetGroup>
            <SheetGroup>
              <SheetChip active={freeOnly} onClick={() => setFreeOnly((v) => !v)}>
                {isRu ? 'Только бесплатное' : 'Free only'}
              </SheetChip>
              <SheetChip active={savedOnly} onClick={() => setSavedOnly((v) => !v)}>
                {isRu ? 'Сохранённое' : 'Saved'}
                {savedIds.size > 0 && ` (${savedIds.size})`}
              </SheetChip>
            </SheetGroup>
          </div>
        </FilterSheet>

        {/* Results */}
        {filteredCount === 0 ? (
          <EmptyState isRu={isRu} onReset={() => {
            setCategory('all'); setQuery('');
            clearAllFilters();
          }} />
        ) : (
          <div className="space-y-10">
            {grouped.map(({ category: catKey, items }) => {
              const meta = categories.find((c) => c.key === catKey);
              const Icon = CATEGORY_ICONS[catKey] || FileText;
              return (
                <section key={catKey}>
                  <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-rule/12 pb-2">
                    <h2 className="flex items-center gap-2 font-display text-lg font-medium text-ink">
                      <Icon className="h-4 w-4 text-muted" aria-hidden />
                      {isRu ? meta?.title_ru : meta?.title_en}
                      <span className="text-[13px] font-normal text-muted">{items.length}</span>
                    </h2>
                    {meta?.subtitle_en && (
                      <span className="hidden truncate text-[13px] text-muted sm:inline">
                        {isRu ? meta.subtitle_ru : meta.subtitle_en}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((r) => (
                      <ResourceCard
                        key={r.id}
                        resource={r}
                        isRu={isRu}
                        saved={savedIds.has(r.id)}
                        visited={visitedIds.has(r.id)}
                        onToggleSave={() => toggleSave(r.id)}
                        onPlay={() => handlePlay(r)}
                        onOpenExternal={() => handleOpenExternal(r.id)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <VideoPlayer
        resource={playing}
        isRu={isRu}
        onOpenChange={(open: boolean) => { if (!open) setPlaying(null); }}
      />
    </div>
  );
}

interface CategoryChipProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}

function CategoryChip({ active, onClick, label, count }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-[36px] shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-rule/12 bg-paper-2 text-ink-2 hover:border-rule/25 hover:text-ink',
      )}
    >
      <span>{label}</span>
      <span className={cn('tabular-nums', active ? 'text-paper/70' : 'text-muted-2')}>
        {count}
      </span>
    </button>
  );
}

interface FilterGroupProps {
  label?: string;
  children: ReactNode;
}

function FilterGroup({ label, children }: FilterGroupProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {label && <span className="eyebrow mr-0.5">{label}</span>}
      {children}
    </div>
  );
}

// Bottom-sheet variants — same controls at thumb-sized touch targets.
function SheetGroup({ label, children }: FilterGroupProps) {
  return (
    <div>
      {label && <div className="eyebrow mb-2">{label}</div>}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function SheetChip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition-transform active:scale-95',
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-rule/12 bg-paper-2 text-ink-2',
      )}
    >
      {children}
    </button>
  );
}

function ToggleChip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-[32px] items-center gap-1 rounded-full border px-3 py-1 text-[13px] transition-colors',
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-rule/12 bg-paper-2 text-ink-2 hover:border-rule/25 hover:text-ink',
      )}
    >
      {children}
    </button>
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
      className="codex-card group flex w-48 shrink-0 flex-col overflow-hidden text-left"
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
        <div className="line-clamp-2 text-[13px] font-medium leading-tight text-ink">
          {title}
        </div>
        {resource.source && (
          <div className="mt-0.5 truncate text-[12px] text-muted">{resource.source}</div>
        )}
      </div>
    </button>
  );
}

interface ResourceCardProps {
  resource: Resource;
  isRu: boolean;
  saved: boolean;
  visited: boolean;
  onToggleSave: () => void;
  onPlay: () => void;
  onOpenExternal: () => void;
}

function ResourceCard({
  resource: r, isRu, saved, visited, onToggleSave, onPlay, onOpenExternal,
}: ResourceCardProps) {
  const title = isRu ? (r.title_ru || r.title_en) : r.title_en;
  const description = isRu ? (r.description_ru || r.description_en) : r.description_en;
  const playable = isPlayable(r) ? resolvePlayable(r) : null;
  const coverId = playable ? resolveCoverVideoId(r) : null;
  const thumb = coverId ? thumbnailUrl({ videoId: coverId, playlistId: null }, 'hq') : null;
  const mediaLabel = MEDIA_LABEL[r.media_type || ''];

  // One muted line instead of a row of chips — source, level, language,
  // length and (when it isn't obvious) the media type.
  const meta = [
    r.source,
    r.level && levelLabel(r.level, isRu),
    r.lang?.toUpperCase(),
    r.duration,
    mediaLabel && (isRu ? mediaLabel.ru : mediaLabel.en),
  ].filter(Boolean).join(' · ');

  return (
    <article className="codex-card flex flex-col overflow-hidden">
      {/* Thumbnail (only for playable) */}
      {playable && (
        <button
          type="button"
          onClick={onPlay}
          aria-label={isRu ? `Воспроизвести: ${title}` : `Play: ${title}`}
          className="group/thumb relative block aspect-video w-full overflow-hidden bg-ink"
        >
          {thumb ? (
            <img
              src={thumb}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-paper">
              {r.media_type === 'playlist'
                ? <ListVideo className="h-12 w-12" aria-hidden />
                : <PlayCircle className="h-12 w-12" aria-hidden />}
            </div>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors group-hover/thumb:bg-ink/35">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/70 text-paper">
              <Play className="h-5 w-5 translate-x-px" aria-hidden />
            </span>
          </span>
        </button>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          {playable ? (
            <button
              type="button"
              onClick={onPlay}
              className="group/title flex-1 text-left"
            >
              <h3 className="font-display text-base font-medium leading-snug text-ink group-hover/title:text-brand">
                {title}
              </h3>
            </button>
          ) : (
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onOpenExternal}
              className="group/link flex flex-1 items-start gap-1.5"
            >
              <h3 className="flex-1 font-display text-base font-medium leading-snug text-ink group-hover/link:text-brand">
                {title}
              </h3>
              <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted transition-colors group-hover/link:text-brand" aria-hidden />
            </a>
          )}
          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={saved}
            aria-label={saved
              ? (isRu ? 'Убрать из сохранённого' : 'Remove from saved')
              : (isRu ? 'Сохранить' : 'Save')}
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors',
              saved ? 'bg-ink text-paper' : 'text-muted hover:bg-rule/8 hover:text-ink',
            )}
          >
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
          {r.official && (
            <Pill tone="brand" size="xs">{isRu ? 'Официально' : 'Official'}</Pill>
          )}
          {r.free === false && (
            <Pill tone="amber" size="xs">{isRu ? 'Платно' : 'Paid'}</Pill>
          )}
          {meta && <span>{meta}</span>}
        </div>

        {description && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{description}</p>
        )}

        {(r.topics?.length || visited) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-2">
            {r.topics?.map((t) => <span key={t}>#{t}</span>)}
            {visited && <span className="text-mint">{isRu ? 'открыто' : 'opened'}</span>}
          </div>
        )}
      </div>
    </article>
  );
}

interface EmptyStateProps {
  isRu: boolean;
  onReset: () => void;
}

function EmptyState({ isRu, onReset }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-rule/20 bg-paper-2 p-10 text-center">
      <p className="font-display text-xl font-medium text-ink">
        {isRu ? 'Ничего не найдено' : 'No matches'}
      </p>
      <p className="mt-2 text-sm text-muted">
        {isRu
          ? 'Сбрось фильтры или попробуй другой запрос — по этому скоупу материала пока может не быть.'
          : 'Reset the filters or try another query — there may be nothing in this scope yet.'}
      </p>
      <Button variant="codex" size="sm" className="mt-5" onClick={onReset}>
        {isRu ? 'Сбросить фильтры' : 'Reset filters'}
      </Button>
    </div>
  );
}
