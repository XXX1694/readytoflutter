import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../store/auth';
import {
  authUpdateName, authChangePassword, authChangeEmail, authDeleteAccount,
} from '../api/api';
import { useLang, type Lang } from '../i18n/LangContext';
import { usePrefs, type Theme } from '../store/prefs';
import { Button, Eyebrow, TextField, PasswordField } from '../ui/index';
import { cn } from '../lib/cn';
import type { User } from '../types/domain';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const isRu = lang === 'ru';
  const T = isRu ? RU : EN;

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const clearSession = useAuth((s) => s.clearSession);
  const qc = useQueryClient();

  // Soft-redirect to login if not authenticated
  useEffect(() => {
    if (!token) navigate('/login', { replace: true });
  }, [token, navigate]);
  if (!token || !user) return null;

  const handleAccountDeleted = () => {
    clearSession();
    qc.invalidateQueries();
    navigate('/login');
  };

  const joined = new Date(user.created_at).toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {T.back}
        </Link>

        <header className="mb-8 border-b border-rule/12 pb-6">
          <Eyebrow>{T.eyebrow}</Eyebrow>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
            {T.title}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {user.email} · {T.joined} {joined}
          </p>
        </header>

        <Tabs.Root defaultValue="preferences">
          <Tabs.List
            className="no-scrollbar mb-8 flex gap-1 overflow-x-auto border-b border-rule/12"
            aria-label={T.tabs}
          >
            <TabTrigger value="preferences">{T.tabPreferences}</TabTrigger>
            <TabTrigger value="profile">{T.tabProfile}</TabTrigger>
            <TabTrigger value="security">{T.tabSecurity}</TabTrigger>
            <TabTrigger value="account">{T.tabAccount}</TabTrigger>
          </Tabs.List>

          <Tabs.Content value="preferences">
            <PreferencesSection T={T} />
          </Tabs.Content>

          <Tabs.Content value="profile">
            <ProfileSection user={user} token={token} T={T} />
          </Tabs.Content>

          <Tabs.Content value="security">
            <SecuritySection T={T} />
          </Tabs.Content>

          <Tabs.Content value="account" className="space-y-6">
            <ChangeEmailSection user={user} T={T} />
            <DeleteAccountSection T={T} onDeleted={handleAccountDeleted} />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}

// ── Preferences (theme, language, recall mode) ─────────────────────────────
function PreferencesSection({ T }: { T: Copy }) {
  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const recallMode = usePrefs((s) => s.recallMode);
  const setRecallMode = usePrefs((s) => s.setRecallMode);
  const { lang, setLang } = useLang();

  return (
    <div className="space-y-6">
      <Section title={T.appearanceTitle} subtitle={T.appearanceSubtitle}>
        <div className="space-y-5">
          <Segmented<Theme>
            label={T.themeLabel}
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: T.themeLight },
              { value: 'dark', label: T.themeDark },
            ]}
          />
          <Segmented<Lang>
            label={T.langLabel}
            value={lang}
            onChange={setLang}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ru', label: 'Русский' },
            ]}
          />
        </div>
      </Section>

      <Section title={T.studyTitle} subtitle={T.studySubtitle}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">{T.recallLabel}</p>
            <p className="mt-1 text-[13px] text-muted">{T.recallHint}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={recallMode}
            aria-label={T.recallLabel}
            onClick={() => setRecallMode(!recallMode)}
            /* The track is 24px tall; the vertical padding brings the hit area
               to the 44px touch target without changing what you see. */
            className="-my-2.5 shrink-0 py-2.5"
          >
            <span
              className={cn(
                'flex h-6 w-11 items-center rounded-full border transition-colors',
                recallMode ? 'border-ink bg-ink' : 'border-rule/25 bg-paper',
              )}
            >
              <span
                className={cn(
                  'h-4 w-4 rounded-full bg-paper-2 transition-transform',
                  recallMode ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </span>
          </button>
        </div>
      </Section>
    </div>
  );
}

// ── Profile (name; email is read-only here) ────────────────────────────────
function ProfileSection({ user, token, T }: { user: User; token: string; T: Copy }) {
  const setSession = useAuth((s) => s.setSession);
  const qc = useQueryClient();
  const [name, setName] = useState(user.name ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== (user.name ?? '').trim();

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const { user: updated } = await authUpdateName(name.trim() || null);
      setSession(token, updated);
      qc.invalidateQueries();
      toast.success(T.profileSaved);
    } catch {
      toast.error(T.errors.unknown_error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title={T.profileTitle} subtitle={T.profileSubtitle}>
      <form onSubmit={save} className="space-y-5">
        <TextField
          label={T.name}
          hint={T.nameHint}
          value={name}
          onChange={setName}
          placeholder={T.namePh}
          autoCapitalize="words"
          autoComplete="name"
          maxLength={80}
        />
        <TextField
          label={T.email}
          hint={T.emailReadOnlyHint}
          type="email"
          value={user.email}
          readOnly
        />
        <Button type="submit" variant="codex" disabled={!dirty || saving}>
          {saving ? T.saving : T.saveProfile}
        </Button>
      </form>
    </Section>
  );
}

// ── Security (change password) ─────────────────────────────────────────────
function SecuritySection({ T }: { T: Copy }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (next.length < 8) return setError('password_too_short');
    if (next !== confirm) return setError('mismatch');
    if (next === current) return setError('same_as_current');

    setSaving(true);
    try {
      await authChangePassword(current, next);
      toast.success(T.passwordChanged);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(httpStatus(err) === 401 ? 'wrong_current' : apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title={T.securityTitle} subtitle={T.securitySubtitle}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <PasswordField
          label={T.currentPassword}
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
          showLabel={T.showPwd}
          hideLabel={T.hidePwd}
        />
        <PasswordField
          label={T.newPassword}
          hint={T.newPasswordHint}
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          showLabel={T.showPwd}
          hideLabel={T.hidePwd}
        />
        <PasswordField
          label={T.confirmPassword}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          showLabel={T.showPwd}
          hideLabel={T.hidePwd}
        />

        <ErrorNote T={T} error={error} />

        <Button type="submit" variant="codex" disabled={saving || !current || !next || !confirm}>
          {saving ? T.saving : T.changePassword}
        </Button>
      </form>
    </Section>
  );
}

// ── Account (change email / delete) ────────────────────────────────────────
function ChangeEmailSection({ user, T }: { user: User; T: Copy }) {
  const setSession = useAuth((s) => s.setSession);
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!/.+@.+\..+/.test(newEmail)) return setError('invalid_email');
    if (newEmail.trim().toLowerCase() === user.email) return setError('same_as_current');

    setSaving(true);
    try {
      const { user: updated, token: newToken } = await authChangeEmail(password, newEmail.trim());
      setSession(newToken, updated);
      qc.invalidateQueries();
      toast.success(T.emailChanged);
      setPassword('');
      setNewEmail('');
    } catch (err) {
      const code = httpStatus(err);
      if (code === 401) setError('wrong_password');
      else if (code === 409) setError('email_taken');
      else setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title={T.changeEmailTitle} subtitle={T.changeEmailSubtitle}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <TextField label={T.currentEmail} type="email" value={user.email} readOnly />
        <TextField
          label={T.newEmail}
          type="email"
          value={newEmail}
          onChange={setNewEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <PasswordField
          label={T.confirmWithPassword}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          showLabel={T.showPwd}
          hideLabel={T.hidePwd}
        />

        <ErrorNote T={T} error={error} />

        <Button type="submit" variant="outline" disabled={saving || !password || !newEmail}>
          {saving ? T.saving : T.changeEmail}
        </Button>
      </form>
    </Section>
  );
}

function DeleteAccountSection({ T, onDeleted }: { T: Copy; onDeleted: () => void }) {
  const [confirmText, setConfirmText] = useState('');
  const [working, setWorking] = useState(false);
  const matches = confirmText.trim().toLowerCase() === 'delete';

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!matches || working) return;
    if (!window.confirm(T.deleteFinalConfirm)) return;
    setWorking(true);
    try {
      await authDeleteAccount();
      toast.success(T.accountDeleted);
      onDeleted();
    } catch {
      toast.error(T.errors.unknown_error);
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="rounded-lg border border-coral/30 bg-paper-2 p-5 sm:p-6">
      <div className="mb-5 border-b border-coral/20 pb-3">
        <h2 className="font-display text-lg font-semibold text-coral">{T.deleteTitle}</h2>
        <p className="mt-1 text-[13px] text-ink-2">{T.deleteSubtitle}</p>
      </div>
      <form onSubmit={submit} className="space-y-5">
        <TextField
          label={T.deleteConfirmLabel}
          value={confirmText}
          onChange={setConfirmText}
          placeholder="delete"
          autoComplete="off"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={!matches || working}
          className="border-coral/40 text-coral hover:border-coral hover:bg-coral/8"
        >
          {working ? T.deleting : T.deleteCta}
        </Button>
      </form>
    </section>
  );
}

// ── Reusable bits ──────────────────────────────────────────────────────────

function TabTrigger({ value, children }: { value: string; children: ReactNode }) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        '-mb-px shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted',
        'transition-colors hover:text-ink data-[state=active]:border-ink data-[state=active]:text-ink',
      )}
    >
      {children}
    </Tabs.Trigger>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-rule/12 bg-paper-2 p-5 shadow-codex-sm sm:p-6">
      <div className="mb-5 border-b border-rule/12 pb-3">
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ErrorNote({ T, error }: { T: Copy; error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-md border border-coral/30 bg-coral/8 px-3 py-2 text-[13px] text-coral">
      {T.errors[error as ErrorKey] ?? T.errors.unknown_error}
    </p>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}

function Segmented<T extends string>({ label, value, onChange, options }: SegmentedProps<T>) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-ink-2">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex items-center gap-1 rounded-md border border-rule/12 bg-paper p-1"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded px-3.5 py-2 text-[13px] font-medium transition-colors',
              value === option.value ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Axios errors reach us as `unknown`; both helpers narrow without pulling the
// axios types into a presentational module.
const httpStatus = (err: unknown): number | undefined =>
  (err as { response?: { status?: number } })?.response?.status;

const apiError = (err: unknown): string =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'unknown_error';

const EN = {
  back: 'Back to dashboard',
  eyebrow: 'Account',
  title: 'Settings',
  joined: 'joined',
  tabs: 'Settings sections',
  tabPreferences: 'Preferences',
  tabProfile: 'Profile',
  tabSecurity: 'Security',
  tabAccount: 'Account',

  appearanceTitle: 'Appearance',
  appearanceSubtitle: 'Saved on this device. Press T to switch themes from anywhere.',
  themeLabel: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  langLabel: 'Interface language',

  studyTitle: 'Study behaviour',
  studySubtitle: 'Recall hides the answer behind a hint ladder so you retrieve it instead of re-reading it.',
  recallLabel: 'Active recall',
  recallHint: 'Cards open blurred with a hint ladder. Press R to toggle it mid-session.',

  profileTitle: 'Profile',
  profileSubtitle: 'Your name is only shown to you. Your email is your sign-in.',
  name: 'Name',
  namePh: 'What should we call you?',
  nameHint: 'Optional, up to 80 characters',
  email: 'Email',
  emailReadOnlyHint: 'Change it under Account',
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

type Copy = typeof EN;
type ErrorKey = keyof Copy['errors'];

const RU: Copy = {
  back: 'На главную',
  eyebrow: 'Аккаунт',
  title: 'Настройки',
  joined: 'с',
  tabs: 'Разделы настроек',
  tabPreferences: 'Предпочтения',
  tabProfile: 'Профиль',
  tabSecurity: 'Безопасность',
  tabAccount: 'Аккаунт',

  appearanceTitle: 'Внешний вид',
  appearanceSubtitle: 'Сохраняется на этом устройстве. Клавиша T переключает тему откуда угодно.',
  themeLabel: 'Тема',
  themeLight: 'Светлая',
  themeDark: 'Тёмная',
  langLabel: 'Язык интерфейса',

  studyTitle: 'Учебный режим',
  studySubtitle: 'Recall прячет ответ за подсказкой, чтобы ты вспоминал, а не перечитывал.',
  recallLabel: 'Активное припоминание',
  recallHint: 'Карточки открываются с подсказкой и блюром. Клавиша R переключает режим на ходу.',

  profileTitle: 'Профиль',
  profileSubtitle: 'Имя видно только тебе. Email используется для входа.',
  name: 'Имя',
  namePh: 'Как тебя называть?',
  nameHint: 'Опционально, до 80 символов',
  email: 'Email',
  emailReadOnlyHint: 'Меняется в разделе «Аккаунт»',
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
  deleteConfirmLabel: 'Напечатай "delete" для подтверждения',
  deleteCta: 'Удалить навсегда',
  deleting: 'Удаляю…',
  deleteFinalConfirm: 'Удалить аккаунт? Это действие нельзя отменить.',
  accountDeleted: 'Аккаунт удалён',

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
