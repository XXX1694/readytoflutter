import type { Lang } from './LangContext';

// Copy for /search.
const en = {
  facetsLabel: 'Filter results',
  clearFilters: 'Clear filters',
  clearQuery: 'Clear',
  indexed: (n: number) => `${n} questions indexed for the stack you picked.`,
  showMore: (n: number) => `Show ${n} more`,
  shownOf: (shown: number, total: number) => `${shown} of ${total}`,
};

const ru: typeof en = {
  facetsLabel: 'Фильтр результатов',
  clearFilters: 'Сбросить фильтры',
  clearQuery: 'Очистить',
  indexed: (n) => `В индексе ${n} вопросов по выбранному стеку.`,
  showMore: (n) => `Показать ещё ${n}`,
  shownOf: (shown, total) => `${shown} из ${total}`,
};

export type SearchCopy = typeof en;

export const useSearchCopy = (lang: Lang): SearchCopy => (lang === 'ru' ? ru : en);
