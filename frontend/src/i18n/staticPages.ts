import type { Lang } from './LangContext';

// Copy for the three pages that sit outside the study loop: /pricing,
// /contact and the 404 catch-all. One file so the marketing voice stays in
// one place instead of three page components.

/** Russian numeral agreement — 1 тема, 3 темы, 5 тем. */
const plural = (n: number, one: string, few: string, many: string): string => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = n % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
};

const pricingEn = {
  eyebrow: 'Pricing',
  back: 'Back to home',
  title: 'Pay if it pays you back.',
  subtitle: 'Free covers the bulk of prep. Pro unlocks unlimited AI grading — the part that earns its keep when interview week is three days out.',
  // Shown instead of the above while Pro is withdrawn.
  titleFree: 'All of it, free.',
  subtitleFree: 'There is no paid plan at the moment. Every topic, every question, spaced repetition, timed sessions and the cheatsheets are yours for nothing, with no account required.',
  aiNote: 'AI answer-grading is capped per day. That is a cost limit, not a paywall — the grading runs against a paid model and the cap keeps it affordable to leave switched on for everyone.',
  free: 'Free',
  pro: 'Pro',
  perMonth: 'per month',
  billed: 'Billed monthly. Cancel anytime.',
  currentPlan: 'Your plan',
  // The catalogue figure is read live from the data, so it cannot drift the
  // way the hard-coded "392 questions" did.
  catalogue: (topics: number, questions: number): string =>
    (topics && questions ? `All ${topics} topics, ${questions} questions` : 'Every topic, every question'),
  freeFeatures: [
    'Spaced repetition and write-it-first recall',
    'Timed sessions with self-grading',
    'Cheatsheets, saved questions, English and Russian',
    '10 AI-graded answers per day',
  ],
  proLede: 'Everything in free, plus',
  // Only what actually exists. This list previously advertised deeper stats
  // and early access to question packs; neither was ever built, and StatsPage
  // has no tier check at all. Follow-up questions moved out because the AI
  // grader returns one to everybody.
  proFeatures: [
    'Unlimited AI grading',
    'Priority replies when you email us',
  ],
  ctaFreeAnon: 'Start free',
  ctaProUpgrade: 'Upgrade to Pro',
  ctaProActive: 'Manage subscription',
  ctaProSoon: 'Not available yet',
  ctaProSignup: 'Create an account',
  note: 'Questions, or want a team plan? ',
  noteLink: 'get in touch',
  errCheckoutOff: 'Checkout is not switched on yet. Try again later.',
  errCheckout: 'Could not open checkout. Try again in a moment.',
  errPortal: 'Could not open the billing portal. Try again in a moment.',
};

const pricingRu: typeof pricingEn = {
  eyebrow: 'Цены',
  back: 'На главную',
  title: 'Платишь, если окупается.',
  subtitle: 'Free закрывает основу подготовки. Pro даёт безлимитную AI-проверку — то, что окупается, когда интервью через три дня.',
  titleFree: 'Всё бесплатно.',
  subtitleFree: 'Платного тарифа сейчас нет. Все темы и вопросы, интервальное повторение, сессии на время и шпаргалки доступны бесплатно и без аккаунта.',
  aiNote: 'У AI-проверки ответов есть дневной лимит. Это ограничение по стоимости, а не пейволл: проверка идёт через платную модель, и лимит позволяет держать её включённой для всех.',
  free: 'Бесплатно',
  pro: 'Pro',
  perMonth: 'в месяц',
  billed: 'Списание раз в месяц. Отмена в любой момент.',
  currentPlan: 'Твой план',
  catalogue: (topics, questions) => (topics && questions
    ? `Все ${topics} ${plural(topics, 'тема', 'темы', 'тем')}, ${questions} отобранных ${plural(questions, 'вопрос', 'вопроса', 'вопросов')}`
    : 'Все темы и все вопросы'),
  freeFeatures: [
    'SRS-планирование и активное припоминание',
    'Сессии на время с самооценкой',
    'Шпаргалки, сохранённые вопросы, английский и русский',
    '10 AI-проверок в день',
  ],
  proLede: 'Всё из Free, плюс',
  proFeatures: [
    'Безлимитная AI-проверка',
    'Приоритетный ответ на письма',
  ],
  ctaFreeAnon: 'Начать бесплатно',
  ctaProUpgrade: 'Подключить Pro',
  ctaProActive: 'Управлять подпиской',
  ctaProSoon: 'Пока недоступно',
  ctaProSignup: 'Создать аккаунт',
  note: 'Вопросы или нужен командный тариф? ',
  noteLink: 'напиши нам',
  errCheckoutOff: 'Оплата ещё не подключена. Попробуй позже.',
  errCheckout: 'Не удалось открыть оплату. Попробуй ещё раз.',
  errPortal: 'Не удалось открыть портал оплаты. Попробуй ещё раз.',
};

const contactEn = {
  eyebrow: 'Contact',
  back: 'Back to home',
  title: 'Drop us a line',
  subtitle: 'Bugs, feature ideas, partnerships — a real person reads every message.',
  name: 'Name', namePh: 'Optional',
  email: 'Email', emailPh: 'you@example.com',
  message: 'Message', messagePh: 'Tell us what is on your mind…',
  submit: 'Send message', sending: 'Sending…',
  sentTitle: 'Message sent',
  sentSub: 'We reply within two business days.',
  err: {
    invalid_email: 'That email address is not valid. Check the spelling.',
    too_short: 'Add a bit more detail — at least 10 characters.',
    too_long: 'That message is over 4000 characters. Trim it down.',
    rate_limited: 'Too many messages just now. Try again in a few minutes.',
    generic: 'Could not send your message. Try again in a moment.',
  },
};

const contactRu: typeof contactEn = {
  eyebrow: 'Контакты',
  back: 'На главную',
  title: 'Напиши нам',
  subtitle: 'Баги, идеи, партнёрство — каждое сообщение читает живой человек.',
  name: 'Имя', namePh: 'Необязательно',
  email: 'Email', emailPh: 'you@example.com',
  message: 'Сообщение', messagePh: 'Расскажи, что у тебя…',
  submit: 'Отправить', sending: 'Отправляем…',
  sentTitle: 'Сообщение отправлено',
  sentSub: 'Отвечаем в течение двух рабочих дней.',
  err: {
    invalid_email: 'Некорректный email. Проверь написание.',
    too_short: 'Добавь деталей — хотя бы 10 символов.',
    too_long: 'Сообщение длиннее 4000 символов. Сократи его.',
    rate_limited: 'Слишком много сообщений подряд. Попробуй через несколько минут.',
    generic: 'Не удалось отправить сообщение. Попробуй ещё раз.',
  },
};

const notFoundEn = {
  docTitle: 'Page not found · Onsite',
  title: 'No such page',
  body: 'The link is broken or out of date. Head back to Today, or pick a topic from the catalogue.',
};

const notFoundRu: typeof notFoundEn = {
  docTitle: 'Страница не найдена · Onsite',
  title: 'Такой страницы нет',
  body: 'Ссылка битая или устарела. Вернись на «Сегодня» или выбери тему в каталоге.',
};

export type PricingCopy = typeof pricingEn;
export type ContactCopy = typeof contactEn;
export type ContactErrorKey = keyof ContactCopy['err'];
export type NotFoundCopy = typeof notFoundEn;

export const usePricingCopy = (lang: Lang): PricingCopy => (lang === 'ru' ? pricingRu : pricingEn);
export const useContactCopy = (lang: Lang): ContactCopy => (lang === 'ru' ? contactRu : contactEn);
export const useNotFoundCopy = (lang: Lang): NotFoundCopy => (lang === 'ru' ? notFoundRu : notFoundEn);
