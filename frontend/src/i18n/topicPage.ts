import type { Lang } from './LangContext';

// Copy for /topic/:slug and the question rows it renders. Lives beside the
// page (not in ui.ts) so the strings ship with the page chunk rather than the
// entry.
const en = {
  backToTopics: 'All topics',
  moreActions: 'More actions',
  cheatsheet: 'Cheatsheet',
  print: 'Print',
  progressLabel: (title: string) => `${title} progress`,
  percent: (n: number) => `${n}% done`,
  statusFilters: 'Question status',
  emptyTitle: 'Nothing under this filter',
  emptyBody: 'Every question in this topic sits in another column.',
  showAll: 'Show all questions',
  allSources: 'All sources',
  bookmark: 'Save for later',
  unbookmark: 'Remove from saved',
};

const ru: typeof en = {
  backToTopics: 'Все темы',
  moreActions: 'Ещё действия',
  cheatsheet: 'Шпаргалка',
  print: 'Печать',
  progressLabel: (title) => `Прогресс по теме «${title}»`,
  percent: (n) => `${n}% пройдено`,
  statusFilters: 'Статус вопроса',
  emptyTitle: 'Под этот фильтр ничего нет',
  emptyBody: 'Все вопросы темы сейчас в другой колонке.',
  showAll: 'Показать все вопросы',
  allSources: 'Все источники',
  bookmark: 'Сохранить',
  unbookmark: 'Убрать из сохранённого',
};

export type TopicCopy = typeof en;

export const useTopicCopy = (lang: Lang): TopicCopy => (lang === 'ru' ? ru : en);
