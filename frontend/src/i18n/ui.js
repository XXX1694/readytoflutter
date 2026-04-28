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
    interviewPrep: 'Interview Prep',
    goToHomepage: 'Go to homepage',
    closeSidebar: 'Close sidebar',
    overallProgress: 'Overall Progress',
    questions: 'questions',
    dashboard: 'Dashboard',
    footerText: 'Flutter Developer Interview Prep',
    collapse: 'Collapse',
    expand: 'Expand',

    // HomePage
    heroTitle: 'Flutter Interview Prep',
    heroDesc: 'Comprehensive interview preparation covering Dart & Flutter from Junior to Senior level. Topics include state management, architecture patterns, DSA, native integration, and more.',
    totalQuestions: 'Total Questions',
    completed: 'Completed',
    inProgress: 'In Progress',
    completion: 'Completion',
    loadingTopics: 'Loading topics...',
    failedLoadTopics: 'Failed to load topics. Please try again.',
    tryAgain: 'Try Again',
    resetAllProgress: 'Reset All Progress',
    resetConfirm: 'Reset all progress? This cannot be undone.',
    failedReset: 'Failed to reset progress. Please try again.',
    progressReset: 'Progress reset',
    offline: 'Offline',
    offlineHint: 'Offline — writes are local',
    topicCount: (n) => `${n} topic${n !== 1 ? 's' : ''}`,
    completedOf: 'completed',

    // Level labels
    junior: { label: 'Junior Developer', short: 'Junior', desc: '0–2 years experience' },
    mid:    { label: 'Mid-Level Developer', short: 'Mid-Level', desc: '2–5 years experience' },
    senior: { label: 'Senior Developer', short: 'Senior', desc: '5+ years experience' },

    // TopicPage
    backToDashboard: 'Back to Dashboard',
    loadingTopic: 'Loading topic...',
    topicNotFound: 'Topic not found',
    redirectingHome: 'Redirecting to homepage...',
    filterAll: 'All',
    filterTodo: 'To Do',
    filterInProgress: 'In Progress',
    filterDone: 'Done',
    noQuestionsInCategory: 'No questions in this category. 🎉',

    // SearchPage
    searchHeading: 'Search:',
    resultCount: (n) => `${n} result${n !== 1 ? 's' : ''}`,
    noResultsFor: (q) => `No results found for "${q}"`,
    tryDifferentKeywords: 'Try different keywords or adjust filters',
    filterByLevel: 'Filter by level',
    filterByDifficulty: 'Filter by difficulty',
    allLevels: 'All Levels',
    juniorOption: 'Junior',
    midOption: 'Mid-Level',
    seniorOption: 'Senior',
    allDifficulties: 'All Difficulties',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    enterSearchQuery: 'Enter a search query to find questions',

    // QuestionCard
    markAs: 'Mark as:',
    failedUpdateStatus: 'Failed to update status. Please try again.',
    answer: 'Answer',
    showCodeExample: 'Show Code Example',
    hideCodeExample: 'Hide Code Example',
    myNotes: 'My Notes',
    addNotes: 'Add your notes...',
    personalNotes: 'Personal notes for this question',
    saveNotes: 'Save Notes',
    saving: 'Saving...',
    failedSaveNotes: 'Failed to save notes. Please try again.',

    // Statuses
    notStarted: 'Not Started',
    inProgressStatus: 'In Progress',
    completedStatus: 'Completed',

    // ErrorBoundary
    somethingWentWrong: 'Something Went Wrong',
    unexpectedError: 'We encountered an unexpected error. Please try refreshing the page.',
    errorDetails: 'Error Details (Dev Only)',
    refreshPage: 'Refresh Page',
    goHome: 'Go Home',

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
    interviewPrep: 'Подготовка к собеседованию',
    goToHomepage: 'На главную',
    closeSidebar: 'Закрыть меню',
    overallProgress: 'Общий прогресс',
    questions: 'вопросов',
    dashboard: 'Главная',
    footerText: 'Подготовка к собеседованию Flutter',
    collapse: 'Свернуть',
    expand: 'Развернуть',

    // HomePage
    heroTitle: 'Flutter — Подготовка к собеседованию',
    heroDesc: 'Комплексная подготовка к собеседованию по Dart и Flutter от уровня Junior до Senior. Темы включают управление состоянием, архитектурные паттерны, алгоритмы и структуры данных, нативную интеграцию и многое другое.',
    totalQuestions: 'Всего вопросов',
    completed: 'Выполнено',
    inProgress: 'В процессе',
    completion: 'Прогресс',
    loadingTopics: 'Загрузка тем...',
    failedLoadTopics: 'Не удалось загрузить темы. Попробуйте ещё раз.',
    tryAgain: 'Повторить',
    resetAllProgress: 'Сбросить весь прогресс',
    resetConfirm: 'Сбросить весь прогресс? Это действие нельзя отменить.',
    failedReset: 'Не удалось сбросить прогресс. Попробуйте ещё раз.',
    progressReset: 'Прогресс сброшен',
    offline: 'Офлайн',
    offlineHint: 'Нет сети — пишем локально',
    topicCount: (n) => `${n} ${n === 1 ? 'тема' : n < 5 ? 'темы' : 'тем'}`,
    completedOf: 'пройдено',

    // Level labels
    junior: { label: 'Junior-разработчик', short: 'Junior', desc: '0–2 года опыта' },
    mid:    { label: 'Middle-разработчик', short: 'Middle', desc: '2–5 лет опыта' },
    senior: { label: 'Senior-разработчик', short: 'Senior', desc: '5+ лет опыта' },

    // TopicPage
    backToDashboard: 'Назад к темам',
    loadingTopic: 'Загрузка темы...',
    topicNotFound: 'Тема не найдена',
    redirectingHome: 'Перенаправление на главную...',
    filterAll: 'Все',
    filterTodo: 'Не начато',
    filterInProgress: 'В процессе',
    filterDone: 'Готово',
    noQuestionsInCategory: 'Вопросов в этой категории нет. 🎉',

    // SearchPage
    searchHeading: 'Поиск:',
    resultCount: (n) => `${n} ${n === 1 ? 'результат' : n < 5 ? 'результата' : 'результатов'}`,
    noResultsFor: (q) => `Ничего не найдено по запросу "${q}"`,
    tryDifferentKeywords: 'Попробуйте другие ключевые слова или измените фильтры',
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
    enterSearchQuery: 'Введите запрос для поиска вопросов',

    // QuestionCard
    markAs: 'Отметить как:',
    failedUpdateStatus: 'Не удалось обновить статус. Попробуйте ещё раз.',
    answer: 'Ответ',
    showCodeExample: 'Показать пример кода',
    hideCodeExample: 'Скрыть пример кода',
    myNotes: 'Мои заметки',
    addNotes: 'Добавьте заметки...',
    personalNotes: 'Личные заметки к этому вопросу',
    saveNotes: 'Сохранить заметки',
    saving: 'Сохранение...',
    failedSaveNotes: 'Не удалось сохранить заметки. Попробуйте ещё раз.',

    // Statuses
    notStarted: 'Не начато',
    inProgressStatus: 'В процессе',
    completedStatus: 'Выполнено',

    // ErrorBoundary
    somethingWentWrong: 'Что-то пошло не так',
    unexpectedError: 'Произошла непредвиденная ошибка. Пожалуйста, обновите страницу.',
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

    // Misc
    openMenu: 'Открыть меню',
    closeMenu: 'Закрыть меню',
    searchOpenHint: 'Поиск или команда',
  },
};

export const useT = (lang) => UI[lang] || UI.en;
