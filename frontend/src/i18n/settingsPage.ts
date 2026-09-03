import type { Lang } from './LangContext';
import { ruPlural } from './plural';

// Copy for /settings ("Me"). The page works signed out, so most of this is
// read by anonymous visitors; the account flows below only appear once there
// is a session. Lives beside the page so the strings ship with its chunk.

const en = {
  // ── Account ─────────────────────────────────────────────────────────────
  accountTitle: 'Account',
  anonBody: 'You can study without an account — progress lives in this browser.',
  createAccount: 'Create account',
  joined: 'joined',

  profileTitle: 'Profile',
  profileSubtitle: 'Your name is only shown to you. Your email is your sign-in.',
  name: 'Name',
  namePh: 'What should we call you?',
  nameHint: 'Optional, up to 80 characters',
  email: 'Email',
  emailReadOnlyHint: 'Change it below',
  saveProfile: 'Save',
  saving: 'Saving…',
  profileSaved: 'Profile updated',

  securityTitle: 'Change password',
  securitySubtitle: 'At least 8 characters. Confirm with your current password.',
  currentPassword: 'Current password',
  newPassword: 'New password',
  newPasswordHint: 'At least 8 characters',
  confirmPassword: 'Confirm new password',
  showPwd: 'Show password',
  hidePwd: 'Hide password',
  changePassword: 'Change password',
  passwordChanged: 'Password updated',

  changeEmailTitle: 'Change email',
  changeEmailSubtitle: 'Your email is your sign-in. Confirm with your current password.',
  currentEmail: 'Current email',
  newEmail: 'New email',
  confirmWithPassword: 'Current password',
  changeEmail: 'Change email',
  emailChanged: 'Email updated',

  deleteTitle: 'Delete account',
  deleteSubtitle: 'Permanently deletes your account and the progress stored on the server. The copy in this browser stays.',
  deleteConfirmLabel: 'Type "delete" to confirm',
  deleteCta: 'Delete forever',
  deleting: 'Deleting…',
  deleteFinalConfirm: 'Delete your account? This cannot be undone.',
  accountDeleted: 'Account deleted',

  // ── Appearance ──────────────────────────────────────────────────────────
  stackTitle: 'Stack',
  stackSubtitle: 'What you are preparing for. Today, the roadmap and the topics all follow it.',
  appearanceTitle: 'Appearance',
  appearanceSubtitle: 'Saved on this device. Press T to switch themes from anywhere.',
  themeLabel: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  langLabel: 'Interface language',

  // ── Session ─────────────────────────────────────────────────────────────
  sessionTitle: 'Session',
  sessionSubtitle: 'Defaults for every session you start.',
  writeItFirstHint: 'Every card asks for the gist before it shows the answer. Press R to switch mid-session.',

  // ── Saved / Sources ─────────────────────────────────────────────────────
  savedRow: 'Saved questions',
  savedCount: (n: number) => `${n} question${n === 1 ? '' : 's'}`,
  sourcesRow: 'Books, docs and talks',
  sourcesMeta: 'The reading behind the questions',

  // ── Data ────────────────────────────────────────────────────────────────
  dataTitle: 'Data',
  dataSubtitle: 'Everything here is stored in this browser.',
  exportCta: 'Export progress',
  exportHint: 'Downloads one JSON file with your progress and saved questions.',
  exportEmpty: 'Nothing to export yet',

  // ── About ───────────────────────────────────────────────────────────────
  aboutTitle: 'About',
  aboutBody: 'Every topic, every question, spaced repetition and timed sessions are free; AI checks are capped per day.',
  pricing: 'Pricing',
  contact: 'Contact',

  errors: {
    password_too_short: 'Use at least 8 characters.',
    mismatch: 'The two new passwords differ. Retype them.',
    same_as_current: 'Pick a value different from the current one.',
    wrong_current: 'That current password is wrong. Try again.',
    wrong_password: 'That current password is wrong. Try again.',
    invalid_email: 'That email address is not valid. Check the spelling.',
    email_taken: 'That email is already registered. Use another one.',
    unknown_error: 'Something went wrong. Try again in a moment.',
  },
};

const ru: typeof en = {
  accountTitle: 'Аккаунт',
  anonBody: 'Можно заниматься без аккаунта — прогресс живёт в этом браузере.',
  createAccount: 'Создать аккаунт',
  joined: 'с',

  profileTitle: 'Профиль',
  profileSubtitle: 'Имя видно только тебе. Email используется для входа.',
  name: 'Имя',
  namePh: 'Как тебя называть?',
  nameHint: 'Опционально, до 80 символов',
  email: 'Email',
  emailReadOnlyHint: 'Меняется ниже',
  saveProfile: 'Сохранить',
  saving: 'Сохраняю…',
  profileSaved: 'Профиль обновлён',

  securityTitle: 'Смена пароля',
  securitySubtitle: 'Минимум 8 символов. Подтверди текущим паролем.',
  currentPassword: 'Текущий пароль',
  newPassword: 'Новый пароль',
  newPasswordHint: 'Минимум 8 символов',
  confirmPassword: 'Подтвердить новый',
  showPwd: 'Показать пароль',
  hidePwd: 'Скрыть пароль',
  changePassword: 'Сменить пароль',
  passwordChanged: 'Пароль обновлён',

  changeEmailTitle: 'Смена email',
  changeEmailSubtitle: 'Email используется для входа. Подтверди текущим паролем.',
  currentEmail: 'Текущий email',
  newEmail: 'Новый email',
  confirmWithPassword: 'Текущий пароль',
  changeEmail: 'Сменить email',
  emailChanged: 'Email обновлён',

  deleteTitle: 'Удалить аккаунт',
  deleteSubtitle: 'Безвозвратно удаляет аккаунт и прогресс на сервере. Копия в этом браузере останется.',
  deleteConfirmLabel: 'Напечатай «delete» для подтверждения',
  deleteCta: 'Удалить навсегда',
  deleting: 'Удаляю…',
  deleteFinalConfirm: 'Удалить аккаунт? Это действие нельзя отменить.',
  accountDeleted: 'Аккаунт удалён',

  stackTitle: 'Стек',
  stackSubtitle: 'К чему готовишься. Под него подстраиваются «Сегодня», маршрут и темы.',
  appearanceTitle: 'Внешний вид',
  appearanceSubtitle: 'Сохраняется на этом устройстве. Клавиша T переключает тему откуда угодно.',
  themeLabel: 'Тема',
  themeLight: 'Светлая',
  themeDark: 'Тёмная',
  langLabel: 'Язык интерфейса',

  sessionTitle: 'Сессия',
  sessionSubtitle: 'Настройки по умолчанию для каждой сессии.',
  writeItFirstHint: 'Каждая карточка сначала просит записать суть и только потом показывает ответ. Клавиша R переключает режим на ходу.',

  savedRow: 'Сохранённые вопросы',
  savedCount: (n) => `${n} ${ruPlural(n, 'вопрос', 'вопроса', 'вопросов')}`,
  sourcesRow: 'Книги, документация и доклады',
  sourcesMeta: 'То, из чего выросли вопросы',

  dataTitle: 'Данные',
  dataSubtitle: 'Всё здесь хранится в этом браузере.',
  exportCta: 'Скачать прогресс',
  exportHint: 'Скачивает один JSON с прогрессом и сохранёнными вопросами.',
  exportEmpty: 'Пока нечего скачивать',

  aboutTitle: 'О проекте',
  aboutBody: 'Все темы, все вопросы, интервальное повторение и сессии на время — бесплатно; число AI-проверок в день ограничено.',
  pricing: 'Цены',
  contact: 'Контакты',

  errors: {
    password_too_short: 'Нужно минимум 8 символов.',
    mismatch: 'Новые пароли не совпадают. Введи их заново.',
    same_as_current: 'Новое значение должно отличаться от текущего.',
    wrong_current: 'Текущий пароль неверный. Попробуй ещё раз.',
    wrong_password: 'Текущий пароль неверный. Попробуй ещё раз.',
    invalid_email: 'Некорректный email. Проверь написание.',
    email_taken: 'Этот email уже зарегистрирован. Возьми другой.',
    unknown_error: 'Что-то пошло не так. Попробуй ещё раз.',
  },
};

export type SettingsCopy = typeof en;
export type SettingsErrorKey = keyof SettingsCopy['errors'];

export const useSettingsCopy = (lang: Lang): SettingsCopy => (lang === 'ru' ? ru : en);
