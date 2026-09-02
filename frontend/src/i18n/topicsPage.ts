import type { Lang } from './LangContext';

// Copy for /topics. Lives beside the page (not in ui.ts) so the strings ship
// with the page chunk rather than the entry.
const en = {
  eyebrow: 'Catalogue',
  title: 'Topics',
  subtitle: (topics: number, questions: number) => `${topics} topics · ${questions} questions`,
  filterPlaceholder: 'Filter topics',
  levelAll: 'All levels',
  showEveryStack: 'Show every stack',
  scopedHint: (stack: string) => `Showing ${stack}. The stack switch is in the header.`,
  emptyTitle: 'No topics match',
  emptyBody: 'Loosen the filter, or show every stack.',
  sources: 'Sources',
  due: (n: number) => `${n} due`,
  completedOf: 'completed',
};

const ru: typeof en = {
  eyebrow: 'Каталог',
  title: 'Темы',
  subtitle: (topics, questions) => `${topics} тем · ${questions} вопросов`,
  filterPlaceholder: 'Найти тему',
  levelAll: 'Все уровни',
  showEveryStack: 'Показать все стеки',
  scopedHint: (stack) => `Показан стек ${stack}. Переключатель стека — в шапке.`,
  emptyTitle: 'Ничего не подошло',
  emptyBody: 'Ослабь фильтр или покажи все стеки.',
  sources: 'Источники',
  due: (n) => `${n} на повторение`,
  completedOf: 'пройдено',
};

export type TopicsCopy = typeof en;

export const useTopicsCopy = (lang: Lang): TopicsCopy => (lang === 'ru' ? ru : en);
