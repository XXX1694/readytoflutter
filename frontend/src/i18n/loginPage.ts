// LoginPage copy lives in its own dictionary so the page component stays
// presentation-only. Both locales share the same shape — keep them in lockstep
// when adding fields.

const RU = {
  back: 'Назад',
  eyebrow: 'Вход',
  title: 'С возвращением.',
  subtitle: 'Войди, чтобы прогресс синхронизировался между устройствами.',
  email: 'Email',
  password: 'Пароль',
  showPwd: 'Показать пароль',
  hidePwd: 'Скрыть пароль',
  submit: 'Войти',
  submitting: 'Вхожу…',
  noAccount: 'Нет аккаунта?',
  toSignup: 'Регистрация',
  guestNote: 'Можно учиться и без аккаунта — прогресс сохранится в этом браузере.',
  // Shown instead of the form when there is no backend on this deploy.
  unavailable: {
    eyebrow: 'Только локально',
    title: 'Вход здесь недоступен.',
    body: 'Эта сборка работает без сервера: аккаунтов и синхронизации между устройствами нет. Всё, что ты изучаешь, сохраняется в этом браузере.',
    toHome: 'Продолжить учиться',
    toSettings: 'Где хранится прогресс',
  },
  // The same state for /reset, which is only reachable from this page.
  resetUnavailable: {
    eyebrow: 'Только локально',
    title: 'Восстановление пароля здесь недоступно.',
    body: 'Эта сборка работает без сервера: аккаунтов и паролей здесь нет. Всё, что ты изучаешь, сохраняется в этом браузере.',
    toHome: 'Продолжить учиться',
    toSettings: 'Где хранится прогресс',
  },
  errors: {
    invalid_email: 'Некорректный email',
    password_required: 'Введи пароль',
    invalid_credentials: 'Неверный email или пароль',
    rate_limited: 'Слишком много попыток. Попробуй через несколько минут.',
    network_error: 'Не удаётся связаться с сервером. Проверь соединение и попробуй ещё раз.',
    unknown_error: 'Что-то пошло не так. Попробуй ещё раз.',
  },
};

const EN = {
  back: 'Back',
  eyebrow: 'Sign in',
  title: 'Welcome back.',
  subtitle: 'Sign in so your progress syncs across devices.',
  email: 'Email',
  password: 'Password',
  showPwd: 'Show password',
  hidePwd: 'Hide password',
  submit: 'Sign in',
  submitting: 'Signing in…',
  noAccount: 'No account yet?',
  toSignup: 'Create one',
  guestNote: 'You can study without an account — progress lives in this browser.',
  // Shown instead of the form when there is no backend on this deploy.
  unavailable: {
    eyebrow: 'Local only',
    title: 'Sign-in is not available here.',
    body: 'This build runs without a server, so accounts and cross-device sync do not exist. Everything you study is saved in this browser.',
    toHome: 'Keep studying',
    toSettings: 'How your progress is stored',
  },
  // The same state for /reset, which is only reachable from this page.
  resetUnavailable: {
    eyebrow: 'Local only',
    title: 'Password recovery is not available here.',
    body: 'This build runs without a server, so there are no accounts or passwords to recover. Everything you study is saved in this browser.',
    toHome: 'Keep studying',
    toSettings: 'How your progress is stored',
  },
  errors: {
    invalid_email: 'Invalid email address',
    password_required: 'Enter your password',
    invalid_credentials: 'Wrong email or password',
    rate_limited: 'Too many attempts. Try again in a few minutes.',
    network_error: 'Cannot reach the server. Check your connection and try again.',
    unknown_error: 'Something went wrong. Try again.',
  },
};

export type LoginCopy = typeof EN;


export const useLoginCopy = (lang: 'en' | 'ru'): LoginCopy => (lang === 'ru' ? RU : EN);
