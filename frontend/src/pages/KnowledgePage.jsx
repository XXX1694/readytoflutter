import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Search, Library, BookOpen, FileText, PlayCircle, GraduationCap,
  Podcast, Users, Wrench, Bookmark, BookmarkCheck, ExternalLink, BadgeCheck,
  CircleDot, X, Sparkles, Play, History, Trash2, ListVideo, Tv,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLang } from '../i18n/LangContext.jsx';
import {
  loadResources, filterResources, countByCategory,
  toggleSaved, markVisited, getSavedIds, getVisitedIds,
} from '../lib/knowledge.js';
import {
  resolvePlayable, resolveCoverVideoId, thumbnailUrl,
  getRecentlyWatched, clearRecentlyWatched, pushRecentlyWatched,
} from '../lib/youtube.js';
import VideoPlayer from '../components/VideoPlayer.jsx';
import { Button, Pill, FullPageLoader } from '../ui/index.js';
import { cn } from '../lib/cn.js';

const CATEGORY_ICONS = {
  docs: BookOpen,
  articles: FileText,
  videos: PlayCircle,
  courses: GraduationCap,
  books: Library,
  podcasts: Podcast,
  communities: Users,
  tools: Wrench,
};

const LEVEL_TONE = { junior: 'brand', mid: 'plum', senior: 'mint' };
const LANG_TONE = { en: 'ghost', ru: 'amber' };

const LEVELS = [
  { key: 'all', en: 'All levels', ru: 'Любой уровень' },
  { key: 'junior', en: 'Junior', ru: 'Junior' },
  { key: 'mid', en: 'Mid', ru: 'Mid' },
  { key: 'senior', en: 'Senior', ru: 'Senior' },
];

const LANGS = [
  { key: 'all', en: 'Any', ru: 'Любой' },
  { key: 'en', en: 'EN', ru: 'EN' },
  { key: 'ru', en: 'RU', ru: 'RU' },
];

const MEDIA_TYPES = [
  { key: 'all', en: 'Any', ru: 'Любой', icon: Sparkles },
  { key: 'video', en: 'Video', ru: 'Видео', icon: PlayCircle },
  { key: 'playlist', en: 'Playlist', ru: 'Плейлист', icon: ListVideo },
  { key: 'channel', en: 'Channel', ru: 'Канал', icon: Tv },
];

const isPlayable = (r) => r?.media_type === 'video' || r?.media_type === 'playlist';

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

  const initialCategory = searchParams.get('cat') || 'all';
  const [category, setCategory] = useState(initialCategory);
  const [level, setLevel] = useState('all');
  const [langFilter, setLangFilter] = useState('all');
  const [media, setMedia] = useState('all');
  const [freeOnly, setFreeOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [query, setQuery] = useState('');

  // The resource currently playing (in modal), or null.
  const [playing, setPlaying] = useState(null);

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

  const refreshLocal = () => {
    setSavedIds(getSavedIds());
    setVisitedIds(getVisitedIds());
    setRecentIds(getRecentlyWatched());
  };

  const toggleSave = (id) => { toggleSaved(id); setSavedIds(getSavedIds()); };

  const handleOpenExternal = (id) => {
    markVisited(id);
    setVisitedIds(getVisitedIds());
  };

  const handlePlay = (resource) => {
    if (!resource) return;
    pushRecentlyWatched(resource.id);
    markVisited(resource.id);
    setPlaying(resource);
    setVisitedIds(getVisitedIds());
    setRecentIds(getRecentlyWatched());
  };

  const handleClosePlayer = (open) => {
    if (!open) setPlaying(null);
  };

  const categories = data?.categories ?? [];
  const allResources = data?.resources ?? [];
  const counts = useMemo(() => countByCategory(allResources), [allResources]);

  const recent = useMemo(() => {
    const map = new Map(allResources.map((r) => [r.id, r]));
    return recentIds.map((id) => map.get(id)).filter(Boolean);
  }, [allResources, recentIds]);

  const filtered = useMemo(() => {
    let list = filterResources(allResources, {
      category, level, lang: langFilter, free: freeOnly, query,
    });
    if (media !== 'all') list = list.filter((r) => r.media_type === media);
    if (savedOnly) list = list.filter((r) => savedIds.has(r.id));
    return list;
  }, [allResources, category, level, langFilter, media, freeOnly, query, savedOnly, savedIds]);

  const grouped = useMemo(() => {
    if (category !== 'all') return [{ category, items: filtered }];
    const map = new Map();
    for (const r of filtered) {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category).push(r);
    }
    return categories
      .filter((c) => map.has(c.key))
      .map((c) => ({ category: c.key, items: map.get(c.key) }));
  }, [filtered, category, categories]);

  if (isLoading) return <FullPageLoader />;

  if (error) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <h1 className="font-display text-2xl text-ink">
            {isRu ? 'Не получилось загрузить базу знаний' : 'Could not load the knowledge base'}
          </h1>
          <p className="mt-3 text-sm text-muted">{String(error.message || error)}</p>
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

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="-ml-2 mb-5 text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> {isRu ? 'На главную' : 'Back'}
        </Button>

        {/* Header */}
        <header className="mb-8 border-b border-rule/15 pb-6">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
            <Library className="h-3 w-3" /> {isRu ? 'База знаний' : 'Knowledge base'}
          </div>
          <h1 className="mt-2 font-display text-display-sm font-medium leading-tight tracking-tightest text-ink sm:text-display-md">
            {isRu ? 'Учись шире, чем вопросы.' : 'Learn beyond the questions.'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            {isRu
              ? 'Подобранные доки, статьи, видео, плейлисты, курсы и комьюнити. Видео и плейлисты с YouTube открываются прямо здесь — никуда уходить не надо.'
              : 'Curated docs, articles, videos, playlists, courses and communities. YouTube videos and playlists open right inside the app — no leaving for the tab graveyard.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-2">
            <span>{totalCount} {isRu ? 'материалов' : 'resources'}</span>
            <span>·</span>
            <span>{categories.length} {isRu ? 'категорий' : 'categories'}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <PlayCircle className="h-3 w-3 text-brand" />
              {playableCount} {isRu ? 'играют в плеере' : 'play in app'}
            </span>
          </div>
        </header>

        {/* Recently watched */}
        {recent.length > 0 && (
          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                <History className="h-3 w-3" />
                {isRu ? 'Недавно смотрел' : 'Recently watched'}
              </div>
              <button
                type="button"
                onClick={() => { clearRecentlyWatched(); refreshLocal(); }}
                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink"
              >
                <Trash2 className="h-3 w-3" /> {isRu ? 'Очистить' : 'Clear'}
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recent.map((r) => (
                <RecentChip key={r.id} resource={r} isRu={isRu} onClick={() => handlePlay(r)} />
              ))}
            </div>
          </section>
        )}

        {/* Search */}
        <div className="mb-5 flex items-center gap-2 rounded-md border border-rule/15 bg-paper-2 px-3 py-2 shadow-codex-sm focus-within:shadow-codex">
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
            onFocus={(e) => {
              setTimeout(() => {
                try { e.target?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
                catch { /* older Safari */ }
              }, 250);
            }}
            placeholder={isRu
              ? 'Найти материал — riverpod, тестирование, arch…'
              : 'Search — riverpod, testing, arch…'}
            className="w-full bg-transparent font-sans text-base text-ink placeholder:text-muted-2 outline-none sm:text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={isRu ? 'Очистить' : 'Clear'}
              className="text-muted hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category strip */}
        <div className="mb-4 flex flex-wrap gap-2">
          <CategoryChip
            active={category === 'all'}
            onClick={() => setCategory('all')}
            label={isRu ? 'Всё' : 'All'}
            count={totalCount}
            Icon={Sparkles}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.key}
              active={category === c.key}
              onClick={() => setCategory(c.key)}
              label={isRu ? c.title_ru : c.title_en}
              count={counts[c.key] || 0}
              Icon={CATEGORY_ICONS[c.key] || FileText}
            />
          ))}
        </div>

        {/* Filter row */}
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-rule py-3 font-mono text-[10px] uppercase tracking-wider text-muted">
          <FilterGroup label={isRu ? 'Уровень' : 'Level'}>
            {LEVELS.map((l) => (
              <ToggleChip key={l.key} active={level === l.key} onClick={() => setLevel(l.key)}>
                {isRu ? l.ru : l.en}
              </ToggleChip>
            ))}
          </FilterGroup>
          <FilterGroup label={isRu ? 'Язык' : 'Lang'}>
            {LANGS.map((l) => (
              <ToggleChip key={l.key} active={langFilter === l.key} onClick={() => setLangFilter(l.key)}>
                {isRu ? l.ru : l.en}
              </ToggleChip>
            ))}
          </FilterGroup>
          <FilterGroup label={isRu ? 'Тип' : 'Type'}>
            {MEDIA_TYPES.map((m) => {
              const Icon = m.icon;
              return (
                <ToggleChip key={m.key} active={media === m.key} onClick={() => setMedia(m.key)}>
                  <Icon className="h-3 w-3" />
                  {isRu ? m.ru : m.en}
                </ToggleChip>
              );
            })}
          </FilterGroup>
          <FilterGroup>
            <ToggleChip active={freeOnly} onClick={() => setFreeOnly((v) => !v)}>
              {isRu ? 'Бесплатно' : 'Free only'}
            </ToggleChip>
            <ToggleChip active={savedOnly} onClick={() => setSavedOnly((v) => !v)}>
              <Bookmark className="h-3 w-3" />
              {isRu ? 'Сохранённое' : 'Saved'}
              {savedIds.size > 0 && (
                <span className="ml-1 rounded bg-paper px-1 font-mono text-[9px] tabular-nums text-muted">
                  {savedIds.size}
                </span>
              )}
            </ToggleChip>
          </FilterGroup>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-2">
            {filteredCount} / {totalCount}
          </span>
        </div>

        {/* Results */}
        {filteredCount === 0 ? (
          <EmptyState isRu={isRu} onReset={() => {
            setCategory('all'); setLevel('all'); setLangFilter('all');
            setMedia('all'); setFreeOnly(false); setSavedOnly(false); setQuery('');
          }} />
        ) : (
          <div className="space-y-10">
            {grouped.map(({ category: catKey, items }) => {
              const meta = categories.find((c) => c.key === catKey);
              const Icon = CATEGORY_ICONS[catKey] || FileText;
              return (
                <section key={catKey}>
                  <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-rule pb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-brand" aria-hidden />
                      <h2 className="font-display text-lg font-medium text-ink">
                        {isRu ? meta?.title_ru : meta?.title_en}
                      </h2>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-2">
                        {items.length}
                      </span>
                    </div>
                    {meta?.subtitle_en && (
                      <span className="hidden truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted sm:inline">
                        {isRu ? meta.subtitle_ru : meta.subtitle_en}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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

      <VideoPlayer resource={playing} isRu={isRu} onOpenChange={handleClosePlayer} />
    </div>
  );
}

function CategoryChip({ active, onClick, label, count, Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all duration-200',
        active
          ? 'border-ink bg-ink text-paper shadow-[0_2px_4px_-1px_rgb(var(--shadow)/0.18)]'
          : 'border-rule/12 bg-paper-2/60 text-muted hover:border-rule/25 hover:text-ink hover:bg-rule/5',
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span>{label}</span>
      <span className={cn(
        'ml-1 rounded-full px-1.5 font-mono text-[9px] tabular-nums',
        active ? 'bg-paper/20 text-paper' : 'bg-rule/8 text-muted-2',
      )}>{count}</span>
    </button>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {label && <span className="text-muted-2">{label}</span>}
      {children}
    </div>
  );
}

function ToggleChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-[34px] items-center gap-1 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all duration-200',
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-rule/12 bg-paper-2/60 text-muted hover:border-rule/25 hover:text-ink hover:bg-rule/5',
      )}
    >
      {children}
    </button>
  );
}

function RecentChip({ resource, isRu, onClick }) {
  const coverId = resolveCoverVideoId(resource);
  const thumb = coverId ? thumbnailUrl({ videoId: coverId }, 'mq') : null;
  const title = isRu ? (resource.title_ru || resource.title_en) : resource.title_en;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-48 shrink-0 flex-col overflow-hidden rounded-md border border-rule/15 bg-paper-2 text-left shadow-codex-sm transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-codex"
    >
      <div className="relative aspect-video bg-ink">
        {thumb ? (
          <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100" />
        ) : (
          <div className="flex h-full items-center justify-center text-paper">
            <PlayCircle className="h-8 w-8" />
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-ink/30 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-7 w-7 text-paper" />
        </span>
      </div>
      <div className="px-2.5 py-2">
        <div className="line-clamp-2 font-display text-[12px] font-medium leading-tight text-ink">
          {title}
        </div>
        {resource.source && (
          <div className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-wider text-muted-2">
            {resource.source}
          </div>
        )}
      </div>
    </button>
  );
}

function ResourceCard({ resource: r, isRu, saved, visited, onToggleSave, onPlay, onOpenExternal }) {
  const title = isRu ? (r.title_ru || r.title_en) : r.title_en;
  const description = isRu ? (r.description_ru || r.description_en) : r.description_en;
  const levelTone = LEVEL_TONE[r.level] || 'neutral';
  const langTone = LANG_TONE[r.lang] || 'ghost';
  const playable = isPlayable(r) ? resolvePlayable(r) : null;
  const coverId = playable ? resolveCoverVideoId(r) : null;
  const thumb = coverId ? thumbnailUrl({ videoId: coverId }, 'hq') : null;

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-md border border-rule/15 bg-paper-2 shadow-codex-sm transition-all',
        'hover:-translate-x-px hover:-translate-y-px hover:shadow-codex',
        'overflow-hidden',
      )}
    >
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
              className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-[1.02]"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-paper">
              {r.media_type === 'playlist' ? <ListVideo className="h-12 w-12" /> : <PlayCircle className="h-12 w-12" />}
            </div>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors group-hover/thumb:bg-ink/40">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-paper bg-ink/70 text-paper opacity-90 transition-all group-hover/thumb:scale-110">
              <Play className="h-5 w-5 translate-x-px" />
            </span>
          </span>
          {r.media_type === 'playlist' && (
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded border border-paper/40 bg-ink/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-paper">
              <ListVideo className="h-2.5 w-2.5" /> {isRu ? 'Плейлист' : 'Playlist'}
            </span>
          )}
        </button>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {r.official && (
            <Pill tone="brand" size="xs">
              <BadgeCheck className="h-2.5 w-2.5" /> {isRu ? 'Официально' : 'Official'}
            </Pill>
          )}
          <Pill tone={levelTone} size="xs">{r.level}</Pill>
          <Pill tone={langTone} size="xs">{r.lang.toUpperCase()}</Pill>
          {r.media_type === 'channel' && (
            <Pill tone="ghost" size="xs">
              <Tv className="h-2.5 w-2.5" /> {isRu ? 'Канал' : 'Channel'}
            </Pill>
          )}
          {r.duration && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-2">
              · {r.duration}
            </span>
          )}
          {!r.free && (
            <Pill tone="amber" size="xs">$</Pill>
          )}
          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={saved}
            aria-label={saved ? (isRu ? 'Убрать из сохранённого' : 'Unsave') : (isRu ? 'Сохранить' : 'Save')}
            className={cn(
              'ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors',
              saved
                ? 'border-ink bg-ink text-paper'
                : 'border-rule/15 bg-paper-2 text-muted hover:border-rule/15 hover:text-ink',
            )}
          >
            {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          </button>
        </div>

        {playable ? (
          <button
            type="button"
            onClick={onPlay}
            className="group/title flex items-start gap-1.5 text-left"
          >
            <h3 className="flex-1 font-display text-base font-medium leading-snug text-ink group-hover/title:text-brand">
              {title}
            </h3>
            <Play className="mt-1 h-3.5 w-3.5 text-muted transition-colors group-hover/title:text-brand" aria-hidden />
          </button>
        ) : (
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpenExternal}
            className="group/link flex items-start gap-1.5"
          >
            <h3 className="flex-1 font-display text-base font-medium leading-snug text-ink group-hover/link:text-brand">
              {title}
            </h3>
            <ExternalLink className="mt-1 h-3.5 w-3.5 text-muted transition-colors group-hover/link:text-brand" aria-hidden />
          </a>
        )}

        {r.source && (
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-2">
            {r.source}
          </div>
        )}
        {description && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
            {description}
          </p>
        )}
        {r.topics?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {r.topics.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded border border-rule px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-2"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
        {visited && (
          <div className="mt-3 inline-flex items-center gap-1 self-start font-mono text-[9px] uppercase tracking-wider text-mint">
            <CircleDot className="h-2.5 w-2.5" /> {isRu ? 'открыто' : 'visited'}
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyState({ isRu, onReset }) {
  return (
    <div className="rounded-md border border-dashed border-rule/15 bg-paper-2 p-10 text-center">
      <p className="font-display text-xl font-medium text-ink">
        {isRu ? 'Ничего не найдено' : 'No matches'}
      </p>
      <p className="mt-2 text-sm text-muted">
        {isRu
          ? 'Сбрось фильтры или попробуй другой запрос — может, материала по этому скоупу пока нет.'
          : 'Reset filters or try a different query — might not be anything in this scope yet.'}
      </p>
      <Button variant="codex" size="sm" className="mt-5" onClick={onReset}>
        {isRu ? 'Сбросить фильтры' : 'Reset filters'}
      </Button>
    </div>
  );
}
