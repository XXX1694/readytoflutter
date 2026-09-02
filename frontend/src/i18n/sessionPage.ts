import type { Lang } from './LangContext';
import { ruPlural } from './plural';

// Copy for the three session runners — /study (Session), /mock (Timed
// session) and /round/:slug (Follow-ups). One dictionary, because the three
// screens deliberately share a vocabulary: the same grade words, the same
// draft prompt, the same recap. Lives beside the pages so the strings ship
// with those chunks rather than the entry.

/** One inline control in the timed-session setup sentence. */
export type SetupSlot = 'count' | 'level' | 'timer';
export interface SetupSegment {
  before?: string;
  slot: SetupSlot;
  after?: string;
}

export interface FollowUp {
  key: string;
  label: string;
  body: string;
}

const en = {
  // ── Shared runner chrome ────────────────────────────────────────────────
  close: 'Close',
  sessionProgress: 'Session progress',
  showAnswer: 'Show answer',
  or: 'or',
  skip: 'Skip',
  isNew: 'new',
  writeItFirstHint: 'Write the gist before the answer',
  gistPrompt: 'What do you remember? A line or two',
  gistPlaceholder: 'Even one word commits the thought',
  answerPrompt: 'Answer the way you would say it out loud',
  chars: (n: number) => `${n} chars`,
  whatYouWrote: 'What you wrote',
  nothingWritten: 'Nothing written',
  reference: 'Reference',
  showCode: 'Show the code',
  hideCode: 'Hide the code',
  howDidThatGo: 'How did that go?',
  endConfirm: 'End the session?',

  // ── The one grade scale ─────────────────────────────────────────────────
  grades: { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' },
  /** What each grade schedules — the reason the scale is worth reading. */
  gradeHints: { again: '< 1d', hard: '~1d', good: '~6d', easy: '~14d' },
  skippedLabel: 'Skipped',
  skippedShort: 'skipped',

  // ── Recap, shared by all three ──────────────────────────────────────────
  recapTitle: 'Session done',
  cardsReviewed: (n: number) => `${n} cards reviewed`,
  questionsCount: (n: number) => `${n} questions`,
  skippedCount: (n: number) => `${n} skipped`,
  again: 'One more set',
  dashboard: 'Today',

  // ── Session (/study) ────────────────────────────────────────────────────
  bookmarksScope: 'Saved',
  staleTitle: 'This link has no questions left',
  staleBody: 'The set it pointed to has changed. Start today\'s session instead.',
  emptyTitle: 'No questions in this scope',
  emptyBody: 'Try another level or topic.',
  caughtUpTitle: 'All caught up',
  caughtUpBody: 'The next cards come due tomorrow.',

  // ── Timed session (/mock) ───────────────────────────────────────────────
  setupIntro: 'A random set, a timer per question, an honest self-grade. The more of these you run, the calmer the real one gets.',
  setupSentence: [
    { slot: 'count', after: ' questions' },
    { slot: 'level', after: ' level' },
    { slot: 'timer', after: ' per question' },
  ] as readonly SetupSegment[],
  levelMixed: 'Mixed',
  noTimer: 'No timer',
  minutes: (n: number) => `${n} min`,
  optionsToggle: 'Options',
  optionStack: 'Stack',
  optionLevel: 'Level',
  optionCount: 'How many questions',
  optionTimer: 'Timer per question',
  start: 'Start',
  cancel: 'Cancel',
  availableOf: (picked: number, total: number) => `${picked} of ${total} available`,
  noneMatch: 'No questions match these filters. Loosen one.',
  clockTotal: 'Total',
  clockLeft: 'Left',
  questionByQuestion: 'Question by question',

  // ── Follow-ups (/round/:slug) ───────────────────────────────────────────
  digDeeper: 'Dig deeper',
  followUps: [
    { key: 'why', label: 'But why?', body: 'Explain the mechanism. Why this approach over the others?' },
    { key: 'edge', label: 'Edge case?', body: 'What input breaks this — null, empty, enormous?' },
    { key: 'scale', label: '10× the scale?', body: 'What happens an order of magnitude up? Where does it bottleneck first?' },
  ] as readonly FollowUp[],
  chainAria: 'Question chain',
  theChain: 'The chain',
  conceptsCovered: 'Concepts covered',
  topicEmpty: 'This topic has no questions yet',
};

const ru: typeof en = {
  close: 'Закрыть',
  sessionProgress: 'Прогресс сессии',
  showAnswer: 'Показать ответ',
  or: 'или',
  skip: 'Пропустить',
  isNew: 'новая',
  writeItFirstHint: 'Записывать суть до ответа',
  gistPrompt: 'Что помнишь? Пара строк',
  gistPlaceholder: 'Даже одно слово фиксирует мысль',
  answerPrompt: 'Отвечай так, как сказал бы вслух',
  chars: (n) => `${n} ${ruPlural(n, 'знак', 'знака', 'знаков')}`,
  whatYouWrote: 'Ты написал',
  nothingWritten: 'Ничего',
  reference: 'Эталон',
  showCode: 'Показать код',
  hideCode: 'Скрыть код',
  howDidThatGo: 'Как прошло?',
  endConfirm: 'Закончить сессию?',

  grades: { again: 'Снова', hard: 'Тяжело', good: 'Хорошо', easy: 'Легко' },
  gradeHints: { again: '< 1д', hard: '~1д', good: '~6д', easy: '~14д' },
  skippedLabel: 'Пропущено',
  skippedShort: 'пропуск',

  recapTitle: 'Сессия закрыта',
  cardsReviewed: (n) => `${n} ${ruPlural(n, 'карточка повторена', 'карточки повторены', 'карточек повторено')}`,
  questionsCount: (n) => `${n} ${ruPlural(n, 'вопрос', 'вопроса', 'вопросов')}`,
  skippedCount: (n) => `${n} пропущено`,
  again: 'Ещё подход',
  dashboard: 'На главную',

  bookmarksScope: 'Сохранённое',
  staleTitle: 'В этой ссылке не осталось вопросов',
  staleBody: 'Набор, на который она вела, изменился. Начни сегодняшнюю сессию.',
  emptyTitle: 'Здесь пока нет вопросов',
  emptyBody: 'Попробуй другой уровень или тему.',
  caughtUpTitle: 'Всё повторено',
  caughtUpBody: 'Новые карточки будут завтра.',

  setupIntro: 'Случайный набор вопросов, таймер на каждый и честная самооценка. Чем чаще проходишь, тем спокойнее на настоящем собеседовании.',
  setupSentence: [
    { slot: 'count', after: ' вопросов' },
    { before: 'уровень ', slot: 'level' },
    { slot: 'timer', after: ' на вопрос' },
  ],
  levelMixed: 'Все',
  noTimer: 'Без таймера',
  minutes: (n) => `${n} мин`,
  optionsToggle: 'Настройки',
  optionStack: 'Стек',
  optionLevel: 'Уровень',
  optionCount: 'Сколько вопросов',
  optionTimer: 'Таймер на вопрос',
  start: 'Начать',
  cancel: 'Отмена',
  availableOf: (picked, total) => `${picked} из ${total} доступных`,
  noneMatch: 'Под эти фильтры вопросов нет. Смягчи их.',
  clockTotal: 'Всего',
  clockLeft: 'Осталось',
  questionByQuestion: 'По вопросам',

  digDeeper: 'Копни глубже',
  followUps: [
    { key: 'why', label: 'А почему так?', body: 'Объясни механизм. Почему именно так, а не иначе?' },
    { key: 'edge', label: 'Граничный случай?', body: 'Какой сценарий ломает решение? Что с null, пустым, огромным вводом?' },
    { key: 'scale', label: 'Масштаб 10×?', body: 'Что происходит при росте нагрузки на порядок? Что станет узким местом?' },
  ],
  chainAria: 'Цепочка вопросов',
  theChain: 'Цепочка',
  conceptsCovered: 'Что было затронуто',
  topicEmpty: 'В этой теме пока нет вопросов',
};

export type SessionCopy = typeof en;

export const useSessionCopy = (lang: Lang): SessionCopy => (lang === 'ru' ? ru : en);
