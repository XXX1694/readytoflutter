// LoginPage copy lives in its own dictionary so the page component stays
// presentation-only. Both locales share the same shape — keep them in lockstep
// when adding fields.

const RU = {
  back: 'На главную',
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
  errors: {
    invalid_email: 'Некорректный email',
    password_required: 'Введите пароль',
    invalid_credentials: 'Неверный email или пароль',
    rate_limited: 'Слишком много попыток. Попробуйте через несколько минут.',
    unknown_error: 'Что-то пошло не так. Попробуйте ещё раз.',
  },
};

const EN = {
  back: 'Back to dashboard',
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
  errors: {
    invalid_email: 'Invalid email address',
    password_required: 'Enter your password',
    invalid_credentials: 'Wrong email or password',
    rate_limited: 'Too many attempts. Try again in a few minutes.',
    unknown_error: 'Something went wrong. Try again.',
  },
};

export const loginCopy = { ru: RU, en: EN };

export const useLoginCopy = (lang) => (lang === 'ru' ? RU : EN);
