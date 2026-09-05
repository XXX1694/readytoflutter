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
  // Head meta for the bare `/`. The four platform landings bring their own
  // (i18n/landings.ts); without these the dashboard inherited index.html's
  // generic copy and had no canonical at all, so `/`, `/?stack=ios` and every
  // other query variant read as separate URLs to a crawler.
  docTitle: 'Onsite — Mobile Interview Prep',
  metaDesc: 'Prepare for a mobile developer interview — Flutter, iOS, Android and KMP. A curated question bank on a spaced-repetition schedule, timed mock interviews and per-topic cheatsheets, in English and Russian.',
  // Read by StackPicker, beside `pickStack`.
  stackDesc: 'The questions, the roadmap and the colour of the app all follow this.',

  /** The orientation line names the roadmap track explicitly — it can differ from the header's stack. */
  trackLine: (track: string) => `${track} roadmap`,
  // First run — the inline stack picker that replaced the modal.
  promise: 'Answer the questions you\'ll actually be asked. Fifteen minutes a day.',
  pickStack: 'Choose a stack',
  browseEverything: 'Browse everything',

  // The one card. The figure is set apart from its noun so it can be the
  // display element.
  cardsWord: (cards: number): string => (cards === 1 ? 'card' : 'cards'),
  approxMinutes: (minutes: number) => `~${minutes} min`,
  planEmpty: 'Start with a first pass',
  planCaughtUp: 'Caught up — time to reinforce',
  weak: (n: number) => `${n} from your weakest topic`,
  weakNew: (n: number) => `${n} to start on`,
  fresh: (n: number) => `${n} new`,
  weakest: (topic: string, pct: number) => `Weakest: ${topic} · ${pct}%`,
  untouched: (topic: string) => `Not started yet: ${topic}`,

  // The two cards under it, and the line after them.
  catalogueLine: (topics: number, questions: number) => `${topics} topics · ${questions} questions`,
  streak: (n: number) => `${n}-day streak`,
  localOnly: 'Progress is saved in this browser only',
  localOnlySignIn: 'sign in to keep it',
  liveHook: 'one task, one clock, one honest review',
};

const ru: typeof en = {
  docTitle: 'Onsite — подготовка к мобильному собесу',
  metaDesc: 'Подготовка к собеседованию мобильного разработчика — Flutter, iOS, Android и KMP. Отобранные вопросы с интервальным повторением, mock-интервью на время и шпаргалки по темам, на русском и английском.',
  stackDesc: 'От него зависят вопросы, маршрут и цвет приложения.',

  trackLine: (track) => `Маршрут ${track}`,
  promise: 'Отвечай на те вопросы, которые реально спросят. Пятнадцать минут в день.',
  pickStack: 'Выбери стек',
  browseEverything: 'Смотреть всё',

  cardsWord: (cards) => plural(cards, ['карточка', 'карточки', 'карточек']),
  approxMinutes: (minutes) => `~${minutes} мин`,
  planEmpty: 'Начни с первого прогона',
  planCaughtUp: 'Всё закрыто — дальше закрепление',
  weak: (n) => `${n} из самой слабой темы`,
  weakNew: (n) => `${n} из ещё не начатой темы`,
  fresh: (n) => `${n} ${plural(n, ['новая', 'новые', 'новых'])}`,
  weakest: (topic, pct) => `Слабее всего: ${topic} · ${pct}%`,
  untouched: (topic) => `Ещё не начато: ${topic}`,

  catalogueLine: (topics, questions) =>
    `${topics} ${plural(topics, ['тема', 'темы', 'тем'])} · ${questions} ${plural(questions, ['вопрос', 'вопроса', 'вопросов'])}`,
  streak: (n) => `Серия: ${n} ${plural(n, ['день', 'дня', 'дней'])}`,
  localOnly: 'Прогресс хранится только в этом браузере',
  localOnlySignIn: 'войди, чтобы не потерять',
  liveHook: 'одна задача, один таймер, один честный разбор',
};

export type HomeCopy = typeof en;

export const useHomeCopy = (lang: Lang): HomeCopy => (lang === 'ru' ? ru : en);
