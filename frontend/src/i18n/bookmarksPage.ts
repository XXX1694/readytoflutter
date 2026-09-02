import type { Lang } from './LangContext';
import { ruPlural } from './plural';

// Copy for /bookmarks (Saved).
const en = {
  subtitle: (n: number) => `${n} saved`,
  emptyTitle: 'Nothing saved yet',
  emptyBody: 'Open a topic and save the questions you want another pass at. They collect here.',
  scopedTitle: (n: number) => `${n} saved in other stacks`,
  scopedBody: (stack: string) => `Nothing saved in ${stack}. The stack switch is in the header.`,
};

const ru: typeof en = {
  subtitle: (n) => `${n} сохранено`,
  emptyTitle: 'Пока ничего не сохранено',
  emptyBody: 'Открой тему и сохрани вопросы, к которым хочешь вернуться. Они соберутся здесь.',
  scopedTitle: (n) => `${n} ${ruPlural(n, 'сохранённый вопрос', 'сохранённых вопроса', 'сохранённых вопросов')} в других стеках`,
  scopedBody: (stack) => `В стеке ${stack} ничего не сохранено. Переключатель стека — в шапке.`,
};

export type BookmarksCopy = typeof en;

export const useBookmarksCopy = (lang: Lang): BookmarksCopy => (lang === 'ru' ? ru : en);
