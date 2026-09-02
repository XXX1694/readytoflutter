import type { Lang } from './LangContext';

// Copy for /stats (Progress). Lives beside the page, like i18n/topicsPage.ts,
// so the strings ship with the page chunk rather than the entry.
//
// "Mastery" is deliberately absent: the page has one progress figure —
// completed questions over the total in scope — and calling a blend of
// completion and SM-2 ease by a second name was what made the old page
// unreadable.
const en = {
  subtitle: (done: number, total: number, stack: string) =>
    `${done} of ${total} questions in ${stack} are marked completed.`,
  subtitleAll: (done: number, total: number) =>
    `${done} of ${total} questions across every stack are marked completed.`,

  // Figures
  completed: 'Completed',
  dueToday: 'Due today',
  streak: 'Streak',
  activeDays: 'Active days',
  days: 'days',

  // Activity
  activity: (weeks: number) => `Activity · last ${weeks} weeks`,
  activityHint: 'One square per day, counting every question you marked.',

  // Short lists
  needsReview: 'Needs review',
  needsReviewHint: 'Started, and either due for review or under 80% done.',
  notStarted: 'Not started',
  notStartedHint: 'No question marked and no card scheduled yet.',

  // Stack × level matrix
  byStack: 'By stack',
  byStackHint: 'Rows are stacks, columns are levels. Numbers are completed questions out of the total.',
  colTotal: 'Total',

  due: (n: number) => `${n} due`,
  completedOf: 'completed',
};

const ru: typeof en = {
  subtitle: (done, total, stack) => `${done} из ${total} вопросов в стеке ${stack} отмечены пройденными.`,
  subtitleAll: (done, total) => `${done} из ${total} вопросов по всем стекам отмечены пройденными.`,

  completed: 'Пройдено',
  dueToday: 'К повторению',
  streak: 'Серия',
  activeDays: 'Активных дней',
  days: 'дн.',

  activity: (weeks) => `Активность · последние ${weeks} недель`,
  activityHint: 'Один квадрат — один день, считаем каждый отмеченный вопрос.',

  needsReview: 'Нужно повторить',
  needsReviewHint: 'Начато, но пора повторить или пройдено меньше 80%.',
  notStarted: 'Ещё не начато',
  notStartedHint: 'Ни одного отмеченного вопроса и ни одной карточки.',

  byStack: 'По стекам',
  byStackHint: 'Строка — стек, колонка — уровень. Цифры — пройдено из всего.',
  colTotal: 'Всего',

  due: (n) => `${n} на повторение`,
  completedOf: 'пройдено',
};

export type StatsCopy = typeof en;

export const useStatsCopy = (lang: Lang): StatsCopy => (lang === 'ru' ? ru : en);
