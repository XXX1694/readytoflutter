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
    interviewPrep: 'Mobile Interview Prep',
    goToHomepage: 'Go to homepage',
    closeSidebar: 'Close sidebar',
    overallProgress: 'Overall Progress',
    questions: 'questions',
    dashboard: 'Dashboard',
    footerText: 'Mobile Developer Interview Prep',
    collapse: 'Collapse',
    expand: 'Expand',

    // HomePage
    heroTitle: 'Mobile Interview Prep',
    heroDesc: 'Flutter, Swift / SwiftUI / UIKit, Kotlin / Jetpack Compose, KMP & cross-platform mobile — Junior to Senior. State, architecture, async, networking, security. Track what you know, drill what you don\'t.',
    totalQuestions: 'Total Questions',
    completed: 'Completed',
    inProgress: 'In Progress',
    completion: 'Completion',
    loadingTopics: 'Loading topics...',
    failedLoadTopics: 'Couldn\'t load topics. Try again.',
    tryAgain: 'Try Again',
    resetAllProgress: 'Reset All Progress',
    resetConfirm: 'Reset all progress? No undo.',
    failedReset: 'Couldn\'t reset progress. Try again.',
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
    redirectingHome: 'Heading back to dashboard…',
    filterAll: 'All',
    filterTodo: 'To Do',
    filterInProgress: 'In Progress',
    filterDone: 'Done',
    noQuestionsInCategory: 'Nothing left here. 🎉',

    // SearchPage
    searchHeading: 'Search:',
    resultCount: (n) => `${n} result${n !== 1 ? 's' : ''}`,
    noResultsFor: (q) => `Nothing found for “${q}”`,
    tryDifferentKeywords: 'Try different words or loosen the filters',
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
    enterSearchQuery: 'Type to search the question bank',

    // QuestionCard
    markAs: 'Mark as:',
    failedUpdateStatus: 'Couldn\'t update status. Try again.',
    answer: 'Answer',
    showCodeExample: 'Show Code Example',
    hideCodeExample: 'Hide Code Example',
    myNotes: 'My Notes',
    addNotes: 'Jot down notes…',
    personalNotes: 'Personal notes for this question',
    saveNotes: 'Save Notes',
    saving: 'Saving…',
    failedSaveNotes: 'Couldn\'t save notes. Try again.',

    // Statuses
    notStarted: 'Not Started',
    inProgressStatus: 'In Progress',
    completedStatus: 'Completed',

    // ErrorBoundary
    somethingWentWrong: 'Something broke',
    unexpectedError: 'Hit an unexpected error. Try refreshing the page.',
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

    // Platform filter (splits topic catalog by stack)
    platformLabel: 'Stack',
    platformAll: 'All',
    platformFlutter: 'Flutter',
    platformIos: 'iOS',
    platformAndroid: 'Android',
    platformCross: 'Cross-Platform',
    platformMobile: 'Mobile',
    platformEmpty: 'No topics for this stack yet.',

    // Hero feature highlight — drawn under the headline so first-time visitors
    // discover the AI grader without digging.
    heroAiGrader: 'AI answer grader',
    heroAiGraderModel: 'Claude Haiku 4.5',
    heroAiGraderHint: 'Type your answer in Mock or Study — Claude scores you against the reference and points out gaps.',

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
    interviewPrep: 'Mobile — собеседование',
    goToHomepage: 'На главную',
    closeSidebar: 'Закрыть меню',
    overallProgress: 'Общий прогресс',
    questions: 'вопросов',
    dashboard: 'Главная',
    footerText: 'Mobile Developer — собеседование',
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
    redirectingHome: 'Возвращаемся на главную…',
    filterAll: 'Все',
    filterTodo: 'Не начато',
    filterInProgress: 'В процессе',
    filterDone: 'Готово',
    noQuestionsInCategory: 'Здесь чисто. 🎉',

    // SearchPage
    searchHeading: 'Поиск:',
    resultCount: (n) => `${n} ${n === 1 ? 'результат' : n < 5 ? 'результата' : 'результатов'}`,
    noResultsFor: (q) => `Ничего по запросу «${q}»`,
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

    // Hero feature highlight
    heroAiGrader: 'ИИ-оценка ответа',
    heroAiGraderModel: 'Claude Haiku 4.5',
    heroAiGraderHint: 'Пиши ответ в Mock или Study — Claude сверит с эталоном и подсветит, чего не хватает.',

    // Misc
    openMenu: 'Открыть меню',
    closeMenu: 'Закрыть меню',
    searchOpenHint: 'Поиск или команда',
  },
};

export const useT = (lang) => UI[lang] || UI.en;
