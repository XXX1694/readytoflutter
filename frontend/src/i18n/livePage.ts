import type { Lang } from './LangContext';
import { ruPlural } from './plural';

// Copy for /live — live coding. Only what this screen adds: the four grade
// words, the clock labels and "what you wrote" come from `sessionPage.ts`,
// because a live task closes the same way a session card does and the two
// screens must not drift apart. Task content itself (prompts, rubrics, notes)
// is authored in English in the seed and is not translated.

const en = {
  // ── Setup ───────────────────────────────────────────────────────────────
  intro: 'One card, one clock, one honest review. No hints, no autocomplete — just what you would type in the room.',
  optionDifficulty: 'Difficulty',
  optionBudget: 'Time budget',
  difficultyMixed: 'Mixed',
  noTimer: 'No timer',
  deal: 'Deal a card',
  dealAnother: 'Deal another',
  cardsAvailable: (n: number) => `${n} ${n === 1 ? 'card' : 'cards'} in this scope`,
  noneMatch: 'No cards match this scope. Loosen one.',

  // ── The task ────────────────────────────────────────────────────────────
  budget: (n: number) => `${n} min`,
  /** On the finished card: what an interviewer would have allowed for it. */
  budgetWas: (n: number) => `a ${n}-minute task`,
  clockLeft: 'Left',
  clockElapsed: 'Elapsed',
  editorLabel: 'Your code',
  editorHint: 'Tab inserts two spaces. Nothing is run — this is the room, not the IDE.',
  submit: 'Submit',
  giveUp: 'Give up — show the answer',
  chars: (n: number) => `${n} ${n === 1 ? 'char' : 'chars'}`,

  // ── Review ──────────────────────────────────────────────────────────────
  outOfTime: 'Time is up',
  rubricTitle: 'What a good answer had to do',
  rubricHint: 'Tick the points your code actually covers. This is the grading key, not a style guide.',
  rubricScore: (met: number, total: number) => `${met} of ${total}`,
  referenceTitle: 'Reference solution',
  referenceHint: 'One correct answer, not the only one.',
  notesTitle: 'Why it is shaped this way',

  // ── The AI panel ────────────────────────────────────────────────────────
  reviewIdleTitle: 'Have Claude read your code',
  reviewIdleBody: 'You get a verdict against the rubric above, what landed, what is missing, and the question an interviewer would ask next.',
  reviewShortTitle: 'Too little code to review',
  reviewShortBody: 'The rubric and the reference are still below.',
  reviewLoadingTitle: 'Claude is reading your code',
  reviewLoadingBody: 'Checking it against the rubric, point by point.',
  reviewFailedTitle: 'Could not review that',
  reviewRun: 'Review it',
  reviewRunning: 'Reading',
  reviewRetry: 'Try again',
  reviewAgain: 'Review again',
  reviewNotFound: 'This task is no longer in the catalogue.',
  reviewRubricTitle: 'Against the rubric',
  reviewStrengths: 'What landed',
  reviewGaps: 'What was missing',
  reviewFollowUp: 'An interviewer would ask next',
};

const ru: typeof en = {
  intro: 'Одна карточка, один таймер, один честный разбор. Без подсказок и автодополнения — только то, что ты набрал бы на собеседовании.',
  optionDifficulty: 'Сложность',
  optionBudget: 'Сколько времени',
  difficultyMixed: 'Любая',
  noTimer: 'Без таймера',
  deal: 'Взять карточку',
  dealAnother: 'Ещё карточку',
  cardsAvailable: (n) => `${n} ${ruPlural(n, 'карточка', 'карточки', 'карточек')} в этой выборке`,
  noneMatch: 'Под эту выборку карточек нет. Смягчи фильтр.',

  budget: (n) => `${n} мин`,
  budgetWas: (n) => `задача на ${n} ${ruPlural(n, 'минуту', 'минуты', 'минут')}`,
  clockLeft: 'Осталось',
  clockElapsed: 'Прошло',
  editorLabel: 'Твой код',
  editorHint: 'Tab вставляет два пробела. Код не запускается — это собеседование, а не IDE.',
  submit: 'Сдать',
  giveUp: 'Сдаться — показать ответ',
  chars: (n) => `${n} ${ruPlural(n, 'знак', 'знака', 'знаков')}`,

  outOfTime: 'Время вышло',
  rubricTitle: 'Что должно было быть в ответе',
  rubricHint: 'Отметь пункты, которые твой код действительно закрывает. Это критерий оценки, а не стиль.',
  rubricScore: (met, total) => `${met} из ${total}`,
  referenceTitle: 'Эталонное решение',
  referenceHint: 'Один из верных вариантов, а не единственный.',
  notesTitle: 'Почему задача такая',

  reviewIdleTitle: 'Пусть Claude прочитает твой код',
  reviewIdleBody: 'Получишь оценку по критериям выше, что зашло, чего не хватило и вопрос, который задал бы интервьюер дальше.',
  reviewShortTitle: 'Кода слишком мало для разбора',
  reviewShortBody: 'Критерии и эталон всё равно ниже.',
  reviewLoadingTitle: 'Claude читает твой код',
  reviewLoadingBody: 'Сверяем с критериями, пункт за пунктом.',
  reviewFailedTitle: 'Не получилось разобрать',
  reviewRun: 'Разобрать',
  reviewRunning: 'Читаю',
  reviewRetry: 'Ещё раз',
  reviewAgain: 'Разобрать заново',
  reviewNotFound: 'Этой задачи больше нет в каталоге.',
  reviewRubricTitle: 'По критериям',
  reviewStrengths: 'Что зашло',
  reviewGaps: 'Чего не хватило',
  reviewFollowUp: 'Интервьюер спросил бы дальше',
};

export type LiveCopy = typeof en;

export const useLiveCopy = (lang: Lang): LiveCopy => (lang === 'ru' ? ru : en);
