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

/** "воскресенье" → "Воскресенье": a subtitle starts with a capital. */
const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const en = {
  // Head meta for the bare `/`. The four platform landings bring their own
  // (i18n/landings.ts); without these the dashboard inherited index.html's
  // generic copy and had no canonical at all, so `/`, `/?stack=ios` and every
  // other query variant read as separate URLs to a crawler.
  docTitle: 'Onsite — Mobile Interview Prep',
  metaDesc: 'Prepare for a mobile developer interview — Flutter, iOS, Android and KMP. A curated question bank on a spaced-repetition schedule, timed mock interviews and per-topic cheatsheets, in English and Russian.',

  /** The orientation line names the roadmap track explicitly — it can differ from the header's stack. */
  trackLine: (track: string) => `${track} roadmap`,
  // First run — the inline stack picker that replaced the modal.
  pickStack: 'Choose a stack',
  browseEverything: 'Browse everything',
  /** Today's subtitle: "Sunday 6 September" — the page appends the streak. */
  dateline: (at: number): string =>
    new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(at),

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

  // The line after the card, appended to the dateline in the header.
  streak: (n: number) => `${n}-day streak`,
  localOnly: 'Progress is saved in this browser only',
  localOnlySignIn: 'sign in to keep it',
  liveHook: 'One task, one clock',

  // ── The pitch. `/` has two readers: someone who has never answered a
  // question here, who needs to be told what this is, and someone mid-way
  // through, who needs today's cards. The plan card is the same for both;
  // everything below only shows while there is no progress to speak of.
  heroTitle: 'Walk in already knowing the answers',
  heroDesc: 'Interview questions for Flutter, iOS, Android and KMP, on a spaced-repetition schedule.',
  proofQuestions: (n: number) => `${n} questions`,
  proofTopics: (n: number) => `${n} topics`,
  proofLangs: 'English and Russian',
  proofFree: 'Free, no account needed',


  // The index of everything the site does, in three groups, so nothing is
  // discovered by luck. One short line per row: what it is, not why.
  everythingTitle: 'Everything in one place',
  groupLearn: 'Learn',
  groupPractice: 'Practice',
  groupYours: 'Yours',
  destRoadmap: 'Sixteen rungs, Junior to Staff',
  destSession: 'Today\'s cards',
  destTimed: 'A clock and a set of questions',
  destTopics: (topics: number, questions: number) => `${topics} topics · ${questions} questions`,
  destSources: 'Docs, talks and articles',
  destSaved: 'The questions you kept',
  destProgress: 'Closed questions, day by day',



};

const ru: typeof en = {
  docTitle: 'Onsite — подготовка к мобильному собесу',
  metaDesc: 'Подготовка к собеседованию мобильного разработчика — Flutter, iOS, Android и KMP. Отобранные вопросы с интервальным повторением, mock-интервью на время и шпаргалки по темам, на русском и английском.',

  trackLine: (track) => `Маршрут ${track}`,
  pickStack: 'Выбери стек',
  browseEverything: 'Смотреть всё',
  dateline: (at) =>
    capitalise(new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(at)),

  cardsWord: (cards) => plural(cards, ['карточка', 'карточки', 'карточек']),
  approxMinutes: (minutes) => `~${minutes} мин`,
  planEmpty: 'Начни с первого прогона',
  planCaughtUp: 'Всё закрыто — дальше закрепление',
  weak: (n) => `${n} из самой слабой темы`,
  weakNew: (n) => `${n} из ещё не начатой темы`,
  fresh: (n) => `${n} ${plural(n, ['новая', 'новые', 'новых'])}`,
  weakest: (topic, pct) => `Слабее всего: ${topic} · ${pct}%`,
  untouched: (topic) => `Ещё не начато: ${topic}`,

  streak: (n) => `Серия: ${n} ${plural(n, ['день', 'дня', 'дней'])}`,
  localOnly: 'Прогресс хранится только в этом браузере',
  localOnlySignIn: 'войди, чтобы не потерять',
  liveHook: 'Одна задача, один таймер',

  heroTitle: 'Прийти на собес, уже зная ответы',
  heroDesc: 'Вопросы с собесов по Flutter, iOS, Android и KMP — с интервальным повторением.',
  proofQuestions: (n) => `${n} ${plural(n, ['вопрос', 'вопроса', 'вопросов'])}`,
  proofTopics: (n) => `${n} ${plural(n, ['тема', 'темы', 'тем'])}`,
  proofLangs: 'На русском и английском',
  proofFree: 'Бесплатно, без регистрации',


  everythingTitle: 'Всё в одном месте',
  groupLearn: 'Теория',
  groupPractice: 'Практика',
  groupYours: 'Моё',
  destRoadmap: 'Шестнадцать ступеней, от Junior до Staff',
  destSession: 'Карточки на сегодня',
  destTimed: 'Таймер и набор вопросов',
  destTopics: (topics, questions) => `${topics} ${plural(topics, ['тема', 'темы', 'тем'])} · ${questions} ${plural(questions, ['вопрос', 'вопроса', 'вопросов'])}`,
  destSources: 'Доки, доклады и статьи',
  destSaved: 'Вопросы, которые ты отложил',
  destProgress: 'Что закрыто, по дням',



};

export type HomeCopy = typeof en;

export const useHomeCopy = (lang: Lang): HomeCopy => (lang === 'ru' ? ru : en);
