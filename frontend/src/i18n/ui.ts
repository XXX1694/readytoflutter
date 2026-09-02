export const UI = {
  en: {
    // App loader
    loading: 'Loading...',

    // Header
    toggleMenu: 'Toggle menu',
    searchPlaceholder: 'Search...',
    searchPlaceholderLong: 'Search questions, topics, concepts...',
    toggleTheme: 'Toggle theme',
    light: 'Light',
    dark: 'Dark',
    docs: 'Docs ↗',
    langSwitch: 'RU',

    // Sidebar
    goToHomepage: 'Go to homepage',
    closeSidebar: 'Close sidebar',
    overallProgress: 'Overall progress',
    questions: 'questions',
    dashboard: 'Dashboard',
    collapse: 'Collapse',
    expand: 'Expand',

    // HomePage
    heroTitle: 'Mobile interview prep',
    heroDesc: 'Flutter, Swift / SwiftUI / UIKit, Kotlin / Jetpack Compose, KMP & cross-platform mobile — Junior to Senior. State, architecture, async, networking, security. Track what you know, drill what you don\'t.',
    totalQuestions: 'Total questions',
    completed: 'Completed',
    inProgress: 'In progress',
    completion: 'Completion',
    loadingTopics: 'Loading topics...',
    failedLoadTopics: 'Couldn\'t load topics. Try again.',
    tryAgain: 'Try again',
    resetAllProgress: 'Reset all progress',
    resetConfirm: 'Reset all progress? No undo.',
    failedReset: 'Couldn\'t reset progress. Try again.',
    progressReset: 'Progress reset',
    offline: 'Offline',
    offlineHint: 'Offline — writes are local',
    topicCount: (n: number) => `${n} topic${n !== 1 ? 's' : ''}`,
    completedOf: 'completed',

    // Level labels
    junior: { label: 'Junior Developer', short: 'Junior', desc: '0–2 years experience' },
    mid:    { label: 'Mid-Level Developer', short: 'Mid-Level', desc: '2–5 years experience' },
    senior: { label: 'Senior Developer', short: 'Senior', desc: '5+ years experience' },
    staff:  { label: 'Staff Engineer', short: 'Staff', desc: 'Leads across teams and platforms' },

    // Roadmap — sixteen rungs from Junior 1 to Staff, per stack
    roadmap: {
      title: 'Roadmap',
      subtitle: 'From Junior 1 to Staff',
      intro: 'Sixteen rungs, each a set of questions from the catalogue. Open a rung to see its topics and questions, drill them, and mark what you know. A rung counts as passed at 80% completed.',
      track: 'Track',
      band: { junior: 'Junior', mid: 'Middle', senior: 'Senior', staff: 'Staff' } as Record<string, string>,
      bandDesc: {
        junior: 'Syntax, the first screens and the object model',
        mid: 'Data, state and architecture that scale',
        senior: 'Internals, performance, security and delivery',
        staff: 'Systems that span every platform',
      } as Record<string, string>,
      yourLevel: 'Your level',
      notStarted: 'Not started',
      nextUp: 'Next up',
      allPassed: 'Every rung passed',
      passed: 'Passed',
      current: 'Current',
      drillRung: 'Drill this rung',
      drillNext: 'Drill the next rung',
      drillNode: 'Drill these',
      openTopic: 'Open topic',
      openRoadmap: 'Open roadmap',
      rungs: (n: number) => `${n} rung${n === 1 ? '' : 's'}`,
      questions: (n: number) => `${n} question${n === 1 ? '' : 's'}`,
      tier: { easy: 'Foundations', medium: 'Core', hard: 'Advanced', all: 'Whole topic' } as Record<string, string>,
      metaDesc: 'A sixteen-rung interview roadmap for Flutter, iOS and Android — Junior 1 to Staff — where every rung is a set of real interview questions.',
    },

    // TopicPage
    backToDashboard: 'Back to dashboard',
    loadingTopic: 'Loading topic...',
    topicNotFound: 'Topic not found',
    redirectingHome: 'Heading back to dashboard…',
    filterAll: 'All',
    filterTodo: 'To do',
    filterInProgress: 'In progress',
    filterDone: 'Done',
    noQuestionsInCategory: 'No questions match this filter.',

    // SearchPage
    searchHeading: 'Search:',
    resultCount: (n: number) => `${n} result${n !== 1 ? 's' : ''}`,
    noResultsFor: (q: string) => `Nothing found for “${q}”`,
    tryDifferentKeywords: 'Try different words or loosen the filters',
    filterByLevel: 'Filter by level',
    filterByDifficulty: 'Filter by difficulty',
    allLevels: 'All levels',
    juniorOption: 'Junior',
    midOption: 'Mid-Level',
    seniorOption: 'Senior',
    allDifficulties: 'All difficulties',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    enterSearchQuery: 'Type to search the question bank',

    // QuestionCard
    markAs: 'Mark as:',
    failedUpdateStatus: 'Couldn\'t update status. Try again.',
    answer: 'Answer',
    showCodeExample: 'Show code example',
    hideCodeExample: 'Hide code example',
    myNotes: 'My notes',
    addNotes: 'Jot down notes…',
    personalNotes: 'Personal notes for this question',
    saveNotes: 'Save notes',
    saving: 'Saving…',
    failedSaveNotes: 'Couldn\'t save notes. Try again.',

    // Statuses
    notStarted: 'Not started',
    inProgressStatus: 'In progress',
    completedStatus: 'Completed',

    // ErrorBoundary
    somethingWentWrong: 'Something broke',
    unexpectedError: 'Hit an unexpected error. Try refreshing the page.',
    errorDetails: 'Error details (dev only)',
    refreshPage: 'Refresh page',
    goHome: 'Go home',

    // Command palette
    commandPlaceholder: 'Type a command or search…',
    commandHint: 'Press ⌘K anywhere',
    cmdNavigation: 'Navigation',
    cmdTopics: 'Topics',
    cmdActions: 'Actions',
    cmdAppearance: 'Appearance',
    cmdGoDashboard: 'Go to dashboard',
    cmdGoSearch: 'Open search',
    cmdToggleTheme: 'Toggle theme',
    cmdSwitchLang: 'Switch language',
    cmdReset: 'Reset all progress',
    cmdNoResults: 'No commands match',

    // Platform filter (splits topic catalog by stack)
    platformLabel: 'Stack',
    platformAll: 'All',
    platformFlutter: 'Flutter',
    platformIos: 'iOS',
    platformAndroid: 'Android',
    platformCross: 'Cross-Platform',
    platformMobile: 'Mobile',
    platformEmpty: 'No topics for this stack yet.',

    // Mastery breakdown table on /stats when stack=all
    masteryByStack: 'Mastery by stack',
    masteryByStackHint: 'Each row is a platform · each column is a grade. Numbers are completed / total questions.',
    masteryColJunior: 'Junior',
    masteryColMid: 'Mid',
    masteryColSenior: 'Senior',
    masteryColTotal: 'Total',

    // First-launch stack picker
    stackPickerEyebrow: 'Welcome',
    stackPickerTitle: 'Which stack are you preparing for?',
    stackPickerSubtitle: 'Pick one to focus the catalog. You can switch any time from the dashboard or Cmd+K.',
    stackPickerLater: 'Decide later',
    stackPickerCount: (n: number) => `${n} topic${n === 1 ? '' : 's'}`,
    platformDescAll: 'See every topic across every stack — good for browsing.',
    platformDescFlutter: 'Flutter & Dart — widgets, state, async, navigation, internals.',
    platformDescIos: 'Swift, SwiftUI, UIKit, Combine, iOS architecture & performance.',
    platformDescAndroid: 'Kotlin, Jetpack Compose, Coroutines, Android architecture & DI.',
    platformDescCross: 'Kotlin Multiplatform & Compose Multiplatform — share code across stores.',
    platformDescMobile: 'Cross-stack mobile concerns — system design, security, CI/CD.',

    // Misc
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    searchOpenHint: 'Search or run command',
  },

  ru: {
    // App loader
    loading: 'Загрузка...',

    // Header
    toggleMenu: 'Открыть меню',
    searchPlaceholder: 'Поиск...',
    searchPlaceholderLong: 'Поиск вопросов, тем, концепций...',
    toggleTheme: 'Сменить тему',
    light: 'Светлая',
    dark: 'Тёмная',
    docs: 'Документация ↗',
    langSwitch: 'EN',

    // Sidebar
    goToHomepage: 'На главную',
    closeSidebar: 'Закрыть меню',
    overallProgress: 'Общий прогресс',
    questions: 'вопросов',
    dashboard: 'Главная',
    collapse: 'Свернуть',
    expand: 'Развернуть',

    // HomePage
    heroTitle: 'Mobile — Собеседование',
    heroDesc: 'Flutter, Swift / SwiftUI / UIKit, Kotlin / Jetpack Compose, KMP и кросс-платформенная мобилка — от Junior до Senior. Состояние, архитектура, асинхронность, сеть, безопасность. Отмечай выученное, добивай слабое.',
    totalQuestions: 'Всего вопросов',
    completed: 'Выполнено',
    inProgress: 'В процессе',
    completion: 'Прогресс',
    loadingTopics: 'Загрузка тем...',
    failedLoadTopics: 'Темы не загрузились. Попробуй ещё раз.',
    tryAgain: 'Повторить',
    resetAllProgress: 'Сбросить весь прогресс',
    resetConfirm: 'Сбросить весь прогресс? Назад не откатится.',
    failedReset: 'Прогресс не сбросился. Попробуй ещё раз.',
    progressReset: 'Прогресс сброшен',
    offline: 'Офлайн',
    offlineHint: 'Нет сети — пишем локально',
    topicCount: (n: number) => `${n} ${n === 1 ? 'тема' : n < 5 ? 'темы' : 'тем'}`,
    completedOf: 'пройдено',

    // Level labels
    junior: { label: 'Junior-разработчик', short: 'Junior', desc: '0–2 года опыта' },
    mid:    { label: 'Middle-разработчик', short: 'Middle', desc: '2–5 лет опыта' },
    senior: { label: 'Senior-разработчик', short: 'Senior', desc: '5+ лет опыта' },
    staff:  { label: 'Staff-инженер', short: 'Staff', desc: 'Ведёт команды и платформы' },

    // Roadmap
    roadmap: {
      title: 'Роадмап',
      subtitle: 'От Junior 1 до Staff',
      intro: 'Шестнадцать ступеней, каждая — набор вопросов из базы. Открой ступень, чтобы увидеть её темы и вопросы, прогнать их и отметить, что знаешь. Ступень считается пройденной на 80%.',
      track: 'Трек',
      band: { junior: 'Junior', mid: 'Middle', senior: 'Senior', staff: 'Staff' } as Record<string, string>,
      bandDesc: {
        junior: 'Синтаксис, первые экраны и объектная модель',
        mid: 'Данные, состояние и архитектура, которые масштабируются',
        senior: 'Внутренности, производительность, безопасность и поставка',
        staff: 'Системы, охватывающие все платформы',
      } as Record<string, string>,
      yourLevel: 'Твой уровень',
      notStarted: 'Не начато',
      nextUp: 'Дальше',
      allPassed: 'Все ступени пройдены',
      passed: 'Пройдено',
      current: 'Текущая',
      drillRung: 'Прогнать ступень',
      drillNext: 'Прогнать следующую ступень',
      drillNode: 'Прогнать эти',
      openTopic: 'Открыть тему',
      openRoadmap: 'Открыть роадмап',
      rungs: (n: number) => `${n} ${n === 1 ? 'ступень' : n < 5 ? 'ступени' : 'ступеней'}`,
      questions: (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'вопрос' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'вопроса' : 'вопросов'}`,
      tier: { easy: 'Основы', medium: 'База', hard: 'Продвинутое', all: 'Вся тема' } as Record<string, string>,
      metaDesc: 'Роадмап подготовки к собеседованию для Flutter, iOS и Android из шестнадцати ступеней — от Junior 1 до Staff, где каждая ступень — набор реальных вопросов.',
    },

    // TopicPage
    backToDashboard: 'Назад к темам',
    loadingTopic: 'Загрузка темы...',
    topicNotFound: 'Тема не найдена',
    redirectingHome: 'Возвращаемся на главную…',
    filterAll: 'Все',
    filterTodo: 'Не начато',
    filterInProgress: 'В процессе',
    filterDone: 'Готово',
    noQuestionsInCategory: 'Под этот фильтр ничего не подошло.',

    // SearchPage
    searchHeading: 'Поиск:',
    resultCount: (n: number) => `${n} ${n === 1 ? 'результат' : n < 5 ? 'результата' : 'результатов'}`,
    noResultsFor: (q: string) => `Ничего по запросу «${q}»`,
    tryDifferentKeywords: 'Попробуй другие слова или сними фильтры',
    filterByLevel: 'Фильтр по уровню',
    filterByDifficulty: 'Фильтр по сложности',
    allLevels: 'Все уровни',
    juniorOption: 'Junior',
    midOption: 'Middle',
    seniorOption: 'Senior',
    allDifficulties: 'Любая сложность',
    easy: 'Лёгкий',
    medium: 'Средний',
    hard: 'Сложный',
    enterSearchQuery: 'Введи запрос — пройдёмся по базе вопросов',

    // QuestionCard
    markAs: 'Отметить как:',
    failedUpdateStatus: 'Статус не обновился. Попробуй ещё раз.',
    answer: 'Ответ',
    showCodeExample: 'Показать пример кода',
    hideCodeExample: 'Скрыть пример кода',
    myNotes: 'Мои заметки',
    addNotes: 'Запиши свои мысли…',
    personalNotes: 'Личные заметки к этому вопросу',
    saveNotes: 'Сохранить заметки',
    saving: 'Сохраняю…',
    failedSaveNotes: 'Заметки не сохранились. Попробуй ещё раз.',

    // Statuses
    notStarted: 'Не начато',
    inProgressStatus: 'В процессе',
    completedStatus: 'Выполнено',

    // ErrorBoundary
    somethingWentWrong: 'Что-то пошло не так',
    unexpectedError: 'Поймали неожиданную ошибку. Обнови страницу.',
    errorDetails: 'Детали ошибки (только для разработки)',
    refreshPage: 'Обновить страницу',
    goHome: 'На главную',

    // Command palette
    commandPlaceholder: 'Команда или поиск…',
    commandHint: 'Нажми ⌘K в любом месте',
    cmdNavigation: 'Навигация',
    cmdTopics: 'Темы',
    cmdActions: 'Действия',
    cmdAppearance: 'Внешний вид',
    cmdGoDashboard: 'На главную',
    cmdGoSearch: 'Открыть поиск',
    cmdToggleTheme: 'Сменить тему',
    cmdSwitchLang: 'Сменить язык',
    cmdReset: 'Сбросить прогресс',
    cmdNoResults: 'Ничего не найдено',

    // Platform filter
    platformLabel: 'Стек',
    platformAll: 'Все',
    platformFlutter: 'Flutter',
    platformIos: 'iOS',
    platformAndroid: 'Android',
    platformCross: 'Кросс-платформа',
    platformMobile: 'Mobile',
    platformEmpty: 'По этому стеку тем пока нет.',

    // Mastery breakdown
    masteryByStack: 'Mastery по стекам',
    masteryByStackHint: 'Строка — платформа, колонка — грейд. Цифры — закрыто / всего вопросов.',
    masteryColJunior: 'Junior',
    masteryColMid: 'Middle',
    masteryColSenior: 'Senior',
    masteryColTotal: 'Всего',

    // First-launch stack picker
    stackPickerEyebrow: 'Привет',
    stackPickerTitle: 'Какой стек готовишь?',
    stackPickerSubtitle: 'Выбери один — каталог свернётся под него. Поменять можно в любой момент с дашборда или из Cmd+K.',
    stackPickerLater: 'Позже',
    stackPickerCount: (n: number) => `${n} ${n === 1 ? 'тема' : n < 5 ? 'темы' : 'тем'}`,
    platformDescAll: 'Все темы по всем стекам — для общего обзора.',
    platformDescFlutter: 'Flutter и Dart — виджеты, состояние, async, навигация, внутренности.',
    platformDescIos: 'Swift, SwiftUI, UIKit, Combine, архитектура и перформанс iOS.',
    platformDescAndroid: 'Kotlin, Jetpack Compose, корутины, архитектура и DI Android.',
    platformDescCross: 'Kotlin Multiplatform и Compose Multiplatform — шаринг кода между сторами.',
    platformDescMobile: 'Cross-stack темы — system design, безопасность, CI/CD.',

    // Misc
    openMenu: 'Открыть меню',
    closeMenu: 'Закрыть меню',
    searchOpenHint: 'Поиск или команда',
  },
};

export type UICopy = typeof UI.en;

export const useT = (lang: 'en' | 'ru'): UICopy => (UI[lang] || UI.en) as UICopy;

// ── Account recovery ────────────────────────────────────────────────────────
// There is no email provider, so "forgot password" is a single-use recovery
// code. The same words appear on three screens — signup, /reset and Settings →
// Security — so they live in one dictionary rather than three page dicts.

const RECOVERY_EN = {
  // The "save this code" panel. Shared verbatim by all three call sites,
  // because the promise it makes (shown once, never again) is the same one.
  panelEyebrow: 'Recovery code',
  panelTitle: 'Save this code',
  panelBody:
    'This code is the only way back into your account if you forget your password. '
    + 'It is shown once and cannot be shown again — the server keeps only a hash of it. '
    + 'Put it somewhere you will still have in a year: a password manager, or paper.',
  copy: 'Copy code',
  copied: 'Copied',
  ack: 'I have saved this code',
  panelFooter: 'If you lose it, sign in and generate a new one under Settings → Security.',
  continue: 'Continue',
  toSignIn: 'Go to sign in',
  done: 'Done',

  // LoginPage — the one quiet way into the reset flow.
  forgotLead: 'Forgot your password?',
  forgotLink: 'Use your recovery code',

  // ResetPasswordPage
  resetEyebrow: 'Account recovery',
  resetTitle: 'Reset your password',
  resetSubtitle:
    'Enter the recovery code you saved when you created the account. '
    + 'You set a new password here, then sign in with it.',
  resetEmail: 'Email',
  resetCode: 'Recovery code',
  resetCodePh: 'XXXXX-XXXXX-XXXXX-XXXXX',
  resetCodeHint: 'Case, spaces and dashes do not matter. Paste it however you saved it.',
  resetNewPassword: 'New password',
  resetNewPasswordHint: 'At least 8 characters',
  showPwd: 'Show password',
  hidePwd: 'Hide password',
  resetSubmit: 'Set new password',
  resetSubmitting: 'Setting password…',
  resetBack: 'Back to sign in',
  resetNoCode: 'No code saved? An account without one cannot be recovered — sign in and generate one under Settings → Security.',
  resetDoneEyebrow: 'Password changed',
  resetDoneTitle: 'Your new password is set',
  resetDoneBody: 'The code you just used is spent. Here is its replacement — save this one the same way.',

  // SettingsPage → Security
  settingsTitle: 'Recovery code',
  settingsSubtitle: 'The way back into your account if you forget your password. There is no reset email.',
  statusHas: 'This account has a recovery code.',
  statusNone: 'This account has no recovery code yet.',
  generateNote: 'Generate one now and save it. Without a code, a forgotten password locks you out for good.',
  replaceWarning: 'Generating a new code invalidates the current one straight away. Do this if you no longer have the old one.',
  currentPassword: 'Current password',
  generateCta: 'Generate code',
  replaceCta: 'Replace code',
  generating: 'Generating…',

  errors: {
    invalid_email: 'That email address is not valid. Check the spelling.',
    code_required: 'Enter your recovery code.',
    password_too_short: 'Use at least 8 characters.',
    // The server answers a wrong code and an unknown address identically, on
    // purpose. Saying anything sharper here would leak whether an account
    // exists, so this is the server's own sentence and nothing more.
    invalid: 'That email and recovery code do not match.',
    password_equals_email: 'Your password cannot be your email address. Pick something else.',
    wrong_password: 'That current password is wrong. Try again.',
    rate_limited: 'Too many attempts. Try again in a few minutes.',
    unknown_error: 'Something went wrong. Try again in a moment.',
  },
};

export type RecoveryCopy = typeof RECOVERY_EN;
export type RecoveryErrorKey = keyof RecoveryCopy['errors'];

const RECOVERY_RU: RecoveryCopy = {
  panelEyebrow: 'Код восстановления',
  panelTitle: 'Сохрани этот код',
  panelBody:
    'Этот код — единственный способ вернуться в аккаунт, если забудешь пароль. '
    + 'Он показывается один раз и повторно показан не будет: на сервере остаётся только его хеш. '
    + 'Положи его туда, где он будет и через год: в менеджер паролей или на бумагу.',
  copy: 'Скопировать код',
  copied: 'Скопировано',
  ack: 'Я сохранил этот код',
  panelFooter: 'Если потеряешь — войди в аккаунт и создай новый в разделе «Настройки → Безопасность».',
  continue: 'Продолжить',
  toSignIn: 'Перейти ко входу',
  done: 'Готово',

  forgotLead: 'Забыл пароль?',
  forgotLink: 'Войти по коду восстановления',

  resetEyebrow: 'Восстановление доступа',
  resetTitle: 'Сброс пароля',
  resetSubtitle:
    'Введи код восстановления, который сохранил при регистрации. '
    + 'Здесь задашь новый пароль, потом войдёшь с ним.',
  resetEmail: 'Email',
  resetCode: 'Код восстановления',
  resetCodePh: 'XXXXX-XXXXX-XXXXX-XXXXX',
  resetCodeHint: 'Регистр, пробелы и дефисы не важны. Вставь так, как сохранил.',
  resetNewPassword: 'Новый пароль',
  resetNewPasswordHint: 'Минимум 8 символов',
  showPwd: 'Показать пароль',
  hidePwd: 'Скрыть пароль',
  resetSubmit: 'Задать новый пароль',
  resetSubmitting: 'Сохраняю пароль…',
  resetBack: 'Назад ко входу',
  resetNoCode: 'Кода нет? Аккаунт без кода восстановить нельзя — войди и создай код в разделе «Настройки → Безопасность».',
  resetDoneEyebrow: 'Пароль изменён',
  resetDoneTitle: 'Новый пароль сохранён',
  resetDoneBody: 'Код, который ты только что ввёл, использован. Вот его замена — сохрани её так же.',

  settingsTitle: 'Код восстановления',
  settingsSubtitle: 'Способ вернуться в аккаунт, если забудешь пароль. Письма для сброса тут нет.',
  statusHas: 'У этого аккаунта есть код восстановления.',
  statusNone: 'У этого аккаунта пока нет кода восстановления.',
  generateNote: 'Создай код и сохрани его. Без кода забытый пароль закроет доступ навсегда.',
  replaceWarning: 'Новый код сразу отменяет текущий. Делай это, если старого кода у тебя больше нет.',
  currentPassword: 'Текущий пароль',
  generateCta: 'Создать код',
  replaceCta: 'Заменить код',
  generating: 'Создаю…',

  errors: {
    invalid_email: 'Некорректный email. Проверь написание.',
    code_required: 'Введи код восстановления.',
    password_too_short: 'Нужно минимум 8 символов.',
    invalid: 'Email и код восстановления не совпадают.',
    password_equals_email: 'Пароль не может совпадать с email. Придумай другой.',
    wrong_password: 'Текущий пароль неверный. Попробуй ещё раз.',
    rate_limited: 'Слишком много попыток. Попробуй через несколько минут.',
    unknown_error: 'Что-то пошло не так. Попробуй ещё раз.',
  },
};

export const useRecoveryCopy = (lang: 'en' | 'ru'): RecoveryCopy =>
  (lang === 'ru' ? RECOVERY_RU : RECOVERY_EN);
