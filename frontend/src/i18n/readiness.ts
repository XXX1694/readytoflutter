import type { Lang } from './LangContext';

// Copy for the readiness forecast — the roadmap's card and Today's one-line
// version of it. Its own file rather than a page's: two pages read it, and it
// ships with whichever of them the visitor opens first.

/** Russian plural pick: [one, few, many] for 1 / 2–4 / 5+. */
const plural = (n: number, forms: [string, string, string]): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
};

const en = {
  eyebrow: 'Interview date',
  dateLabel: 'The day you are interviewing',
  change: 'Change',
  clear: 'Clear',

  // Before a date is set: what naming one buys.
  inviteTitle: 'Name the day and this becomes a plan',
  inviteBody:
    'The scheduler already knows how fast each answer fades. Give it a date and it will say what you will still remember by then — and what to fix first.',

  readyPct: (pct: number) => `${pct}% ready`,
  forRung: (rung: string) => `for ${rung}`,
  daysLeft: (n: number) => (n === 0 ? 'today' : `${n} ${n === 1 ? 'day' : 'days'} left`),
  datePassed: 'that day has passed',
  allSolid: 'Nothing is forecast to fade. Keep the streak and you walk in ready.',
  willFade: (n: number) => `${n} ${n === 1 ? 'answer' : 'answers'} will have faded`,
  perDay: (n: number) => `${n} a day closes it`,
  weakest: 'Weakest by then',
  fixFirst: 'Fix these first',

  /** Today's one-line version of the whole card. */
  readyBy: (pct: number, date: string) => `${pct}% ready by ${date}`,
};

const ru: typeof en = {
  eyebrow: 'Дата собеса',
  dateLabel: 'День, когда у тебя собес',
  change: 'Изменить',
  clear: 'Убрать',

  inviteTitle: 'Назови день — и это станет планом',
  inviteBody:
    'Планировщик уже знает, как быстро выветривается каждый ответ. Дай ему дату — он скажет, что ты вспомнишь к этому дню, а что чинить первым.',

  readyPct: (pct) => `Готовность ${pct}%`,
  forRung: (rung) => `к уровню ${rung}`,
  daysLeft: (n) => (n === 0 ? 'сегодня' : `осталось ${n} ${plural(n, ['день', 'дня', 'дней'])}`),
  datePassed: 'этот день уже прошёл',
  allSolid: 'Ничего не должно выветриться. Держи серию — придёшь готовым.',
  willFade: (n) => `${n} ${plural(n, ['ответ', 'ответа', 'ответов'])} выветрится`,
  perDay: (n) => `${n} в день закрывает это`,
  weakest: 'Слабее всего к дате',
  fixFirst: 'Чинить первым',

  readyBy: (pct, date) => `Готовность ${pct}% к ${date}`,
};

export type ReadinessCopy = typeof en;

export const useReadinessCopy = (lang: Lang): ReadinessCopy => (lang === 'ru' ? ru : en);

/** "27 Sept" / "27 сент." — the short form the one-line version uses. */
export const shortDate = (at: number, lang: Lang): string =>
  new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(at);
