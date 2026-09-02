import type { Lang } from './LangContext';

// Copy for /knowledge (Sources). Lives beside the page so the strings ship
// with the page chunk rather than the entry.
const en = {
  duration: (d: string) => d,
  eyebrow: 'Library',
  subtitle: (n: number) => `Docs, articles, videos and courses — ${n} in this stack.`,
  subtitleAll: (n: number) => `Docs, articles, videos and courses — ${n} across every stack.`,
  searchPlaceholder: 'Search sources',
  categoryAll: 'All',
  categoriesLabel: 'Category',
  filters: 'Filters',
  filtersHint: 'Narrow the list by language, media and price.',
  filtersApply: (n: number) => `Show ${n}`,
  filtersClear: 'Clear',
  close: 'Close',
  language: 'Language',
  anyLanguage: 'Any',
  media: 'Media',
  anyMedia: 'Any',
  freeOnly: 'Free only',
  savedOnly: 'Saved',
  shownOf: (shown: number, total: number) => `${shown} of ${total}`,
  loadMore: 'Load more',
  recent: 'Recently watched',
  clearRecent: 'Clear',
  play: (title: string) => `Play ${title}`,
  open: (title: string) => `Open ${title}`,
  save: 'Save',
  unsave: 'Remove from saved',
  paid: 'Paid',
  opened: 'Opened',
  emptyTitle: 'Nothing matches',
  emptyBody: 'Loosen the filters or try another word — this stack may not cover it yet.',
  emptyAction: 'Reset filters',
  errorTitle: 'Could not load the sources',
  errorAction: 'Reload',
  // media_type values as they appear in seed/resources.json.
  mediaLabels: {
    docs: 'Docs',
    article: 'Article',
    channel: 'Channel',
    playlist: 'Playlist',
    course: 'Course',
    book: 'Book',
    podcast: 'Podcast',
    community: 'Community',
    tool: 'Tool',
    package: 'Package',
    site: 'Site',
    newsletter: 'Newsletter',
    repo: 'Repo',
  } as Record<string, string>,
};

const ru: typeof en = {
  duration: (d) => {
    const words: Record<string, string> = {
      ongoing: 'постоянно', browse: 'обзор', package: 'пакет', tool: 'инструмент', book: 'книга',
      weekly: 'еженедельно', reference: 'справочник', live: 'в эфире', repo: 'репозиторий',
      guide: 'гайд', yearly: 'ежегодно', any: 'любая', varies: 'по-разному', selective: 'выборочно', course: 'курс',
    };
    if (words[d]) return words[d];
    return d
      .replace(/(\d+)\s*h\b/g, '$1 ч')
      .replace(/(\d+)\s*min\b/g, '$1 мин')
      .replace(/(\d+)\s*months?\b/g, '$1 мес.')
      .replace(/(\d+)\s*lectures\b/g, '$1 лекций');
  },
  eyebrow: 'Библиотека',
  subtitle: (n) => `Доки, статьи, видео и курсы — ${n} в этом стеке.`,
  subtitleAll: (n) => `Доки, статьи, видео и курсы — ${n} по всем стекам.`,
  searchPlaceholder: 'Найти материал',
  categoryAll: 'Всё',
  categoriesLabel: 'Категория',
  filters: 'Фильтры',
  filtersHint: 'Сузь список по языку, формату и цене.',
  filtersApply: (n) => `Показать ${n}`,
  filtersClear: 'Сброс',
  close: 'Закрыть',
  language: 'Язык',
  anyLanguage: 'Любой',
  media: 'Формат',
  anyMedia: 'Любой',
  freeOnly: 'Только бесплатное',
  savedOnly: 'Сохранённое',
  shownOf: (shown, total) => `${shown} из ${total}`,
  loadMore: 'Показать ещё',
  recent: 'Недавно открытые',
  clearRecent: 'Очистить',
  play: (title) => `Смотреть ${title}`,
  open: (title) => `Открыть ${title}`,
  save: 'Сохранить',
  unsave: 'Убрать из сохранённого',
  paid: 'Платно',
  opened: 'Открыто',
  emptyTitle: 'Ничего не найдено',
  emptyBody: 'Сними фильтры или попробуй другое слово — в этом стеке материала может пока не быть.',
  emptyAction: 'Сбросить фильтры',
  errorTitle: 'Не удалось загрузить источники',
  errorAction: 'Перезагрузить',
  mediaLabels: {
    docs: 'Доки',
    article: 'Статья',
    channel: 'Канал',
    playlist: 'Плейлист',
    course: 'Курс',
    book: 'Книга',
    podcast: 'Подкаст',
    community: 'Сообщество',
    tool: 'Инструмент',
    package: 'Пакет',
    site: 'Сайт',
    newsletter: 'Рассылка',
    repo: 'Репозиторий',
  },
};

export type KnowledgeCopy = typeof en;

export const useKnowledgeCopy = (lang: Lang): KnowledgeCopy => (lang === 'ru' ? ru : en);
