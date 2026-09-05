import type { Lang } from './LangContext';
import { ruPlural } from './plural';

// Copy for /search.
const en = {
  facetsLabel: 'Filter results',
  clearFilters: 'Clear filters',
  clearQuery: 'Clear',
  indexed: (n: number) => `${n} questions indexed for the stack you picked.`,
  indexedAll: (n: number) => `${n} questions indexed across every stack.`,
  quoted: (q: string) => `“${q}”`,
  showMore: (n: number) => `Show ${n} more`,
  shownOf: (shown: number, total: number) => `${shown} of ${total}`,
  // The stack scope lives in the sidebar, not on this page — these say so
  // where the user hits it, and offer the way out.
  limitToStack: (stack: string) => `Limit results to ${stack}`,
  allStacksToggle: 'Search every stack',
  allStacksAction: (n: number) => `Search every stack (${n})`,
  nothingInStack: (stack: string) => `Nothing in ${stack}`,
  scopedToStack: (stack: string) => `Search is limited to the ${stack} stack — the chip above turns that off.`,
  tryOtherWords: 'Try different words.',
};

const ru: typeof en = {
  facetsLabel: 'Фильтр результатов',
  clearFilters: 'Сбросить фильтры',
  clearQuery: 'Очистить',
  indexed: (n) => `В индексе ${n} ${ruPlural(n, 'вопрос', 'вопроса', 'вопросов')} по выбранному стеку.`,
  indexedAll: (n) => `В индексе ${n} ${ruPlural(n, 'вопрос', 'вопроса', 'вопросов')} по всем стекам.`,
  quoted: (q) => `«${q}»`,
  showMore: (n) => `Показать ещё ${n}`,
  shownOf: (shown, total) => `${shown} из ${total}`,
  limitToStack: (stack) => `Ограничить стеком «${stack}»`,
  allStacksToggle: 'Искать по всем стекам',
  allStacksAction: (n) => `Искать по всем стекам (${n})`,
  nothingInStack: (stack) => `Ничего в стеке «${stack}»`,
  scopedToStack: (stack) => `Поиск ограничен стеком «${stack}» — чип выше это снимает.`,
  tryOtherWords: 'Попробуй другие слова.',
};

export type SearchCopy = typeof en;

export const useSearchCopy = (lang: Lang): SearchCopy => (lang === 'ru' ? ru : en);
