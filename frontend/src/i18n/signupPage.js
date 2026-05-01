// SignupPage copy. Mirrors the loginPage.js shape — both pages share the
// auth visual language so keeping their dicts side-by-side makes it easy
// to spot drift (e.g. a label phrased one way on signup, another on login).

const RU = {
  back: 'На главную',
  eyebrow: 'Регистрация',
  title: 'Создать аккаунт.',
  subtitle: 'Один email + пароль. Прогресс будет синхронизироваться между устройствами.',
  name: 'Имя',
  optional: 'опционально',
  namePh: 'Как тебя называть?',
  email: 'Email',
  password: 'Пароль',
  passwordHint: 'Минимум 8 символов',
  passwordPh: '••••••••',
  showPwd: 'Показать пароль',
  hidePwd: 'Скрыть пароль',
  submit: 'Зарегистрироваться',
  submitting: 'Создаю…',
  haveAccount: 'Уже есть аккаунт?',
  toLogin: 'Войти',
  syncEyebrow: 'Синхронизация',
  syncTitle: (n) => `Импортировать ${n} ${n === 1 ? 'карточку' : n < 5 ? 'карточки' : 'карточек'}?`,
  syncSubtitle: 'У тебя есть прогресс в этом браузере. Перенести на сервер? Локальная копия очистится после успешного импорта.',
  syncConfirm: 'Импортировать',
  syncing: 'Импортирую…',
  syncSkip: 'Пропустить',
  syncNote: 'Можно сделать позже из меню аккаунта',
  errors: {
    invalid_email: 'Некорректный email',
    password_too_short: 'Минимум 8 символов',
    email_taken: 'Этот email уже зарегистрирован',
    rate_limited: 'Слишком много попыток. Подожди немного.',
    unknown_error: 'Что-то пошло не так. Попробуйте ещё раз.',
  },
};

const EN = {
  back: 'Back to dashboard',
  eyebrow: 'Create account',
  title: 'Create your account.',
  subtitle: 'Email + password. Your progress syncs across devices.',
  name: 'Name',
  optional: 'optional',
  namePh: 'What should we call you?',
  email: 'Email',
  password: 'Password',
  passwordHint: 'At least 8 characters',
  passwordPh: '••••••••',
  showPwd: 'Show password',
  hidePwd: 'Hide password',
  submit: 'Create account',
  submitting: 'Creating…',
  haveAccount: 'Already have an account?',
  toLogin: 'Sign in',
  syncEyebrow: 'Sync',
  syncTitle: (n) => `Import ${n} ${n === 1 ? 'card' : 'cards'}?`,
  syncSubtitle: 'You have local progress in this browser. Push it to the server? Local copy is cleared after a successful import.',
  syncConfirm: 'Import',
  syncing: 'Importing…',
  syncSkip: 'Skip',
  syncNote: 'You can do this later from the account menu',
  errors: {
    invalid_email: 'Invalid email address',
    password_too_short: 'At least 8 characters',
    email_taken: 'This email is already registered',
    rate_limited: 'Too many attempts. Slow down for a bit.',
    unknown_error: 'Something went wrong. Try again.',
  },
};

export const signupCopy = { ru: RU, en: EN };

export const useSignupCopy = (lang) => (lang === 'ru' ? RU : EN);
