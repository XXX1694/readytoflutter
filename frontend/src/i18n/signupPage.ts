import { ruPlural } from './plural';
// SignupPage copy. Mirrors the loginPage.js shape — both pages share the
// auth visual language so keeping their dicts side-by-side makes it easy
// to spot drift (e.g. a label phrased one way on signup, another on login).

const RU = {
  back: 'Назад',
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
  syncTitle: (n: number) => `Импортировать ${n} ${ruPlural(n, 'карточку', 'карточки', 'карточек')}?`,
  syncSubtitle: 'У тебя есть прогресс в этом браузере. Перенести на сервер? Локальная копия очистится после успешного импорта.',
  syncConfirm: 'Импортировать',
  syncing: 'Импортирую…',
  syncSkip: 'Пропустить',
  syncNote: 'Можно сделать позже из меню аккаунта',
  // Shown instead of the form when there is no backend on this deploy.
  unavailable: {
    eyebrow: 'Только локально',
    title: 'Регистрация здесь недоступна.',
    body: 'Эта сборка работает без сервера, поэтому регистрироваться не нужно. Всё, что ты изучаешь, сохраняется в этом браузере.',
    toHome: 'Продолжить учиться',
    toSettings: 'Где хранится прогресс',
  },
  errors: {
    invalid_email: 'Некорректный email',
    password_too_short: 'Минимум 8 символов',
    email_taken: 'Этот email уже зарегистрирован',
    rate_limited: 'Слишком много попыток. Подожди немного.',
    network_error: 'Не удаётся связаться с сервером. Проверь соединение и попробуй ещё раз.',
    unknown_error: 'Что-то пошло не так. Попробуй ещё раз.',
  },
};

const EN = {
  back: 'Back',
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
  syncTitle: (n: number) => `Import ${n} ${n === 1 ? 'card' : 'cards'}?`,
  syncSubtitle: 'You have local progress in this browser. Push it to the server? Local copy is cleared after a successful import.',
  syncConfirm: 'Import',
  syncing: 'Importing…',
  syncSkip: 'Skip',
  syncNote: 'You can do this later from the account menu',
  // Shown instead of the form when there is no backend on this deploy.
  unavailable: {
    eyebrow: 'Local only',
    title: 'Accounts are not available here.',
    body: 'This build runs without a server, so there is nothing to sign up for. Everything you study is saved in this browser — no account needed.',
    toHome: 'Keep studying',
    toSettings: 'How your progress is stored',
  },
  errors: {
    invalid_email: 'Invalid email address',
    password_too_short: 'At least 8 characters',
    email_taken: 'This email is already registered',
    rate_limited: 'Too many attempts. Slow down for a bit.',
    network_error: 'Cannot reach the server. Check your connection and try again.',
    unknown_error: 'Something went wrong. Try again.',
  },
};

export type SignupCopy = typeof EN;


export const useSignupCopy = (lang: 'en' | 'ru'): SignupCopy => (lang === 'ru' ? RU : EN);
