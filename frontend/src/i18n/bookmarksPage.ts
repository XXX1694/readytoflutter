import type { Lang } from './LangContext';

// Copy for /bookmarks (Saved).
const en = {
  subtitle: (n: number) => `${n} saved`,
  emptyTitle: 'Nothing saved yet',
  emptyBody: 'Open a topic and save the questions you want another pass at. They collect here.',
};

const ru: typeof en = {
  subtitle: (n) => `${n} сохранено`,
  emptyTitle: 'Пока ничего не сохранено',
  emptyBody: 'Открой тему и сохрани вопросы, к которым хочешь вернуться. Они соберутся здесь.',
};

export type BookmarksCopy = typeof en;

export const useBookmarksCopy = (lang: Lang): BookmarksCopy => (lang === 'ru' ? ru : en);
