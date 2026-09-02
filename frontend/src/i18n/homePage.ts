import type { Lang } from './LangContext';

// Copy for Today (`/` and the four landing routes). Lives beside the page so
// the strings ship with the page chunk rather than the entry, and so no new
// `lang === 'ru' ? … : …` ternary is written into JSX.

/** Russian plural pick: [one, few, many] for 1 / 2–4 / 5+. */
const plural = (n: number, forms: [string, string, string]): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
};

const en = {
  // First run — the inline stack picker that replaced the modal.
  promise: 'Answer the questions you\'ll actually be asked. Fifteen minutes a day.',
  pickStack: 'Choose a stack',
  browseEverything: 'Browse everything',

  // The one card.
  plan: (cards: number, minutes: number) =>
    `${cards} card${cards === 1 ? '' : 's'} · ~${minutes} min`,
  planEmpty: 'Start with a first pass',
  planCaughtUp: 'Caught up — time to reinforce',
  weak: (n: number) => `${n} from your weakest topic`,
  fresh: (n: number) => `${n} new`,
  weakest: (topic: string, pct: number) => `Weakest: ${topic} · ${pct}%`,
  untouched: (topic: string) => `Not started yet: ${topic}`,

  // The line under the card.
  streak: (n: number) => `${n}-day streak`,
  localOnly: 'Progress is saved in this browser only',
  localOnlySignIn: 'sign in to keep it',
};

const ru: typeof en = {
  promise: 'Отвечай на те вопросы, которые реально спросят. Пятнадцать минут в день.',
  pickStack: 'Выбери стек',
  browseEverything: 'Смотреть всё',

  plan: (cards, minutes) =>
    `${cards} ${plural(cards, ['карточка', 'карточки', 'карточек'])} · ~${minutes} мин`,
  planEmpty: 'Начни с первого прогона',
  planCaughtUp: 'Всё закрыто — дальше закрепление',
  weak: (n) => `${n} из слабой темы`,
  fresh: (n) => `${n} ${plural(n, ['новая', 'новые', 'новых'])}`,
  weakest: (topic, pct) => `Слабее всего: ${topic} · ${pct}%`,
  untouched: (topic) => `Ещё не начато: ${topic}`,

  streak: (n) => `Серия: ${n} ${plural(n, ['день', 'дня', 'дней'])}`,
  localOnly: 'Прогресс хранится только в этом браузере',
  localOnlySignIn: 'войди, чтобы не потерять',
};

export type HomeCopy = typeof en;

export const useHomeCopy = (lang: Lang): HomeCopy => (lang === 'ru' ? ru : en);
