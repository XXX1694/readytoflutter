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
  liveHook: 'One task, one clock, one honest review',

  // ── The pitch. `/` has two readers: someone who has never answered a
  // question here, who needs to be told what this is, and someone mid-way
  // through, who needs today's cards. The plan card is the same for both;
  // everything below only shows while there is no progress to speak of.
  heroTitle: 'Walk in already knowing the answers',
  heroDesc: 'A curated bank of mobile interview questions — Flutter, iOS, Android, Kotlin Multiplatform — on a spaced-repetition schedule. Fifteen minutes a day, and a roadmap that tells you when you are ready.',
  proofQuestions: (n: number) => `${n} questions`,
  proofTopics: (n: number) => `${n} topics`,
  proofLangs: 'English and Russian',
  proofFree: 'Free, no account needed',

  // The stack question, asked on the page that sells — the one line under
  // the first-run picker's heading. (The ribbon is labelled from `ui.ts`.)
  stackDesc: 'The questions, the roadmap and the colour of the app all follow this.',

  // The index of everything the site does, in three groups, so nothing is
  // discovered by luck.
  everythingTitle: 'Everything in one place',
  everythingDesc: (questions: number) => `Every way into the same ${questions} questions.`,
  groupLearn: 'Learn',
  groupPractice: 'Practice',
  groupYours: 'Yours',
  destRoadmap: 'Sixteen rungs, Junior to Staff — and where you stand on them',
  destSession: 'Today\'s cards, each one back before you forget it',
  destTimed: 'A clock, a set of questions, no answers until the end',
  destTopics: (topics: number, questions: number) => `${topics} topics, ${questions} questions, by what you have closed`,
  destSources: 'The docs, talks and articles behind the answers',
  destSaved: 'The questions you kept',
  destProgress: 'What you have closed, day by day',

  // Three steps, because the product is a habit and not a feature.
  howTitle: 'How it works',
  step1: 'Pick your stack',
  step1Body: 'Flutter, iOS, Android, KMP — or everything. The catalogue, the roadmap and today\'s cards all narrow to it.',
  step2: 'Fifteen minutes a day',
  step2Body: 'Answer from memory, then grade yourself. The schedule decides what comes back, and when.',
  step3: 'Watch the roadmap fill',
  step3Body: 'Sixteen rungs from Junior to Staff. When the rung above your level is passed, the screen holds no surprises.',

  whyTitle: 'What you get',
  why1: 'Questions written for real screens — not trivia, not puzzles nobody asks.',
  why2: 'Spaced repetition: a card you struggled with returns tomorrow, one you know returns in a month.',
  why3: 'A cheatsheet and a printable revision sheet for every topic.',
  why4: 'Works offline and installs as an app — the whole catalogue lives on your phone.',
  why5: 'Every question and every answer in both English and Russian.',
  why6: 'Free. Nothing is behind a sign-up; an account only carries your progress between devices.',

  accountBody: 'Progress lives in this browser. An account carries it to your phone, and back.',
  accountCta: 'Create an account',
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
  liveHook: 'Одна задача, один таймер, один честный разбор',

  heroTitle: 'Прийти на собес, уже зная ответы',
  heroDesc: 'Отобранные вопросы с мобильных собесов — Flutter, iOS, Android, Kotlin Multiplatform — с интервальным повторением. Пятнадцать минут в день и маршрут, который скажет, когда ты готов.',
  proofQuestions: (n) => `${n} ${plural(n, ['вопрос', 'вопроса', 'вопросов'])}`,
  proofTopics: (n) => `${n} ${plural(n, ['тема', 'темы', 'тем'])}`,
  proofLangs: 'На русском и английском',
  proofFree: 'Бесплатно, без регистрации',

  stackDesc: 'От него зависят вопросы, маршрут и цвет приложения.',

  everythingTitle: 'Всё в одном месте',
  everythingDesc: (questions) => `Разные входы в одни и те же ${questions} ${plural(questions, ['вопрос', 'вопроса', 'вопросов'])}.`,
  groupLearn: 'Теория',
  groupPractice: 'Практика',
  groupYours: 'Моё',
  destRoadmap: 'Шестнадцать ступеней от Junior до Staff — и твоё место на них',
  destSession: 'Карточки на сегодня — каждая возвращается до того, как забудешь',
  destTimed: 'Таймер, набор вопросов и никаких ответов до конца',
  destTopics: (topics, questions) => `${topics} ${plural(topics, ['тема', 'темы', 'тем'])}, ${questions} ${plural(questions, ['вопрос', 'вопроса', 'вопросов'])} — с фильтром по закрытому`,
  destSources: 'Доки, доклады и статьи, на которых стоят ответы',
  destSaved: 'Вопросы, которые ты отложил',
  destProgress: 'Что закрыто и в какие дни',

  howTitle: 'Как это работает',
  step1: 'Выбери стек',
  step1Body: 'Flutter, iOS, Android, KMP — или всё сразу. Каталог, маршрут и карточки на сегодня сузятся до него.',
  step2: 'Пятнадцать минут в день',
  step2Body: 'Отвечай по памяти и честно ставь себе оценку. Расписание само решит, что и когда вернуть.',
  step3: 'Смотри, как заполняется маршрут',
  step3Body: 'Шестнадцать ступеней от Junior до Staff. Когда ступень выше твоего уровня пройдена — на собесе не будет сюрпризов.',

  whyTitle: 'Что внутри',
  why1: 'Вопросы с реальных собесов — не викторина и не задачки, которых никто не спрашивает.',
  why2: 'Интервальное повторение: то, что далось тяжело, вернётся завтра, а то, что знаешь, — через месяц.',
  why3: 'Шпаргалка и версия для печати по каждой теме.',
  why4: 'Работает офлайн и ставится как приложение — весь каталог лежит в телефоне.',
  why5: 'Каждый вопрос и каждый ответ на русском и английском.',
  why6: 'Бесплатно. Ничего не спрятано за регистрацией — аккаунт нужен только чтобы перенести прогресс между устройствами.',

  accountBody: 'Сейчас он хранится в этом браузере. Аккаунт перенесёт его на телефон и обратно.',
  accountCta: 'Создать аккаунт',
};

export type HomeCopy = typeof en;

export const useHomeCopy = (lang: Lang): HomeCopy => (lang === 'ru' ? ru : en);
