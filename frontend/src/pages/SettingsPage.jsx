import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, User, Lock, AtSign, Trash2, Save, Eye, EyeOff, Shield,
  Mail, AlertTriangle, Sliders, Sun, Moon, Languages, Edit3,
} from 'lucide-react';
import { useAuth } from '../store/auth.js';
import {
  authUpdateName, authChangePassword, authChangeEmail, authDeleteAccount,
} from '../api/api.js';
import { useLang } from '../i18n/LangContext.jsx';
import { usePrefs } from '../store/prefs.js';
import { Button, Eyebrow } from '../ui/index.js';
import { cn } from '../lib/cn.js';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const isRu = lang === 'ru';
  const T = isRu ? RU : EN;

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const setSession = useAuth((s) => s.setSession);
  const clearSession = useAuth((s) => s.clearSession);
  const qc = useQueryClient();

  // Soft-redirect to login if not authenticated
  useEffect(() => {
    if (!token) navigate('/login', { replace: true });
  }, [token, navigate]);
  if (!token || !user) return null;

  const handleLogoutAll = () => {
    clearSession();
    qc.invalidateQueries();
    navigate('/login');
  };

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" />
          {T.back}
        </Link>

        {/* Header */}
        <header className="mb-8 border-b border-rule/15 pb-6">
          <Eyebrow accent="brand">
            <User className="mr-1 inline h-3 w-3" />
            {T.eyebrow}
          </Eyebrow>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl">
            {T.title}
          </h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted">
            {user.email} · {T.joined} {new Date(user.created_at).toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </header>

        <Tabs.Root defaultValue="preferences">
          <Tabs.List
            className="mb-6 inline-flex items-center gap-px rounded-md border border-rule/15 bg-paper-2 p-0.5 shadow-codex-sm"
            aria-label={T.tabs}
          >
            <TabTrigger value="preferences" icon={<Sliders className="h-3.5 w-3.5" />}>{T.tabPreferences}</TabTrigger>
            <TabTrigger value="profile" icon={<User className="h-3.5 w-3.5" />}>{T.tabProfile}</TabTrigger>
            <TabTrigger value="security" icon={<Lock className="h-3.5 w-3.5" />}>{T.tabSecurity}</TabTrigger>
            <TabTrigger value="danger" icon={<AlertTriangle className="h-3.5 w-3.5" />}>{T.tabDanger}</TabTrigger>
          </Tabs.List>

          <Tabs.Content value="preferences" className="outline-none">
            <PreferencesSection T={T} isRu={isRu} />
          </Tabs.Content>

          <Tabs.Content value="profile" className="outline-none">
            <ProfileSection user={user} setSession={setSession} token={token} qc={qc} T={T} />
          </Tabs.Content>

          <Tabs.Content value="security" className="outline-none">
            <SecuritySection T={T} />
          </Tabs.Content>

          <Tabs.Content value="danger" className="outline-none">
            <DangerSection user={user} setSession={setSession} token={token} qc={qc} T={T} onLogout={handleLogoutAll} />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}

function TabTrigger({ value, icon, children }) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted transition-colors',
        'data-[state=active]:bg-ink data-[state=active]:text-paper hover:text-ink',
      )}
    >
      {icon}
      {children}
    </Tabs.Trigger>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section className="rounded-md border border-rule/15 bg-paper-2 p-5 shadow-codex-sm sm:p-6">
      <div className="mb-5 border-b border-rule pb-3">
        <h2 className="font-display text-xl font-medium tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// ── Preferences (theme, language, recall mode) ─────────────────────────────
function PreferencesSection({ T, isRu }) {
  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const recallMode = usePrefs((s) => s.recallMode);
  const setRecallMode = usePrefs((s) => s.setRecallMode);
  const { lang, setLang } = useLang();

  const themes = [
    {
      key: 'light',
      label: isRu ? 'Светлая' : 'Light',
      Icon: Sun,
      // Visual swatch — paper + ink stripes so the choice is obvious at a glance.
      swatch: 'bg-[#fafaf9]',
      stripeA: 'bg-[#171717]',
      stripeB: 'bg-[#06b6d4]',
    },
    {
      key: 'dark',
      label: isRu ? 'Тёмная' : 'Dark',
      Icon: Moon,
      swatch: 'bg-[#0a0a0a]',
      stripeA: 'bg-[#fafafa]',
      stripeB: 'bg-[#22d3ee]',
    },
  ];

  return (
    <div className="space-y-5">
      <Section
        title={isRu ? 'Внешний вид' : 'Appearance'}
        subtitle={isRu
          ? 'Тема и шрифт сохраняются на этом устройстве.'
          : 'Theme is saved per device. Hotkey: T to cycle.'}
      >
        <div className="space-y-5">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              <Sun className="h-3 w-3" />
              {isRu ? 'Тема' : 'Theme'}
            </div>
            <div role="radiogroup" aria-label={isRu ? 'Тема' : 'Theme'} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {themes.map((t) => {
                const active = theme === t.key;
                const { Icon } = t;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTheme(t.key)}
                    className={cn(
                      'group relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all',
                      active
                        ? 'border-ink shadow-codex-sm ring-2 ring-brand/30'
                        : 'border-rule/15 hover:border-rule/30 hover:shadow-codex-sm',
                    )}
                  >
                    {/* Mini "browser" swatch — body + two stripes hint at ink + brand */}
                    <div className={cn('relative h-20 w-full overflow-hidden rounded-md border border-rule/15', t.swatch)}>
                      <div className={cn('absolute left-3 top-3 h-1.5 w-12 rounded-full', t.stripeA)} />
                      <div className={cn('absolute left-3 top-6 h-1.5 w-8 rounded-full', t.stripeB, 'opacity-80')} />
                      <div className={cn('absolute bottom-3 right-3 h-2 w-2 rounded-full', t.stripeB)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 font-display text-sm font-medium text-ink">
                        <Icon className="h-3.5 w-3.5 text-muted" />
                        {t.label}
                      </span>
                      {active && (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-brand">
                          {isRu ? 'выбрано' : 'active'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              <Languages className="h-3 w-3" />
              {isRu ? 'Язык интерфейса' : 'Interface language'}
            </div>
            <div role="radiogroup" aria-label={isRu ? 'Язык' : 'Language'} className="inline-flex items-center gap-px rounded-md border border-rule/15 bg-paper-2 p-0.5 shadow-codex-sm">
              {['en', 'ru'].map((code) => {
                const active = lang === code;
                return (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setLang(code)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors',
                      active
                        ? 'bg-ink text-paper'
                        : 'text-muted hover:text-ink',
                    )}
                  >
                    {code === 'en' ? 'English' : 'Русский'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title={isRu ? 'Учебный режим' : 'Study behavior'}
        subtitle={isRu
          ? 'Recall прячет ответ за подсказкой, чтобы ты вспоминал, а не читал.'
          : 'Recall hides the answer behind a hint ladder so you retrieve, not re-read.'}
      >
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-rule/15 bg-paper p-4 transition-colors hover:border-rule/30">
          <span className="flex-1">
            <span className="inline-flex items-center gap-1.5 font-display text-sm font-medium text-ink">
              <Edit3 className="h-3.5 w-3.5 text-muted" />
              {isRu ? 'Активное припоминание' : 'Active recall'}
            </span>
            <span className="mt-1 block text-xs text-muted">
              {isRu
                ? 'Карточки откроются с подсказкой и блюром. Хоткей: R.'
                : 'Cards open blurred with a hint ladder. Hotkey: R.'}
            </span>
          </span>
          <span
            role="switch"
            aria-checked={recallMode}
            tabIndex={0}
            onClick={() => setRecallMode(!recallMode)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setRecallMode(!recallMode);
              }
            }}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors',
              recallMode ? 'border-ink bg-ink' : 'border-rule/30 bg-paper-2',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 rounded-full bg-paper transition-transform',
                recallMode ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </span>
        </label>
      </Section>
    </div>
  );
}

// ── Profile (name + email read-only) ────────────────────────────────────────
function ProfileSection({ user, setSession, token, qc, T }) {
  const [name, setName] = useState(user.name || '');
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== (user.name || '').trim();

  const save = async (e) => {
    e.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const { user: updated } = await authUpdateName(name.trim() || null);
      setSession(token, updated);
      qc.invalidateQueries();
      toast.success(T.profileSaved);
    } catch {
      toast.error(T.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title={T.profileTitle} subtitle={T.profileSubtitle}>
      <form onSubmit={save} className="space-y-4">
        <Field label={T.name} icon={<User className="h-3.5 w-3.5" />} hint={T.nameHint}>
          <input
            type="text"
            autoCapitalize="words"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={focusCenter}
            placeholder={T.namePh}
            maxLength={80}
            className={inputClass(false)}
          />
        </Field>

        <Field label={T.email} icon={<AtSign className="h-3.5 w-3.5" />} hint={T.emailReadOnlyHint}>
          <input
            type="email"
            value={user.email}
            readOnly
            disabled
            className={cn(inputClass(false), 'cursor-not-allowed bg-paper text-muted')}
          />
        </Field>

        <Button type="submit" variant="brand" size="md" disabled={!dirty || saving}>
          <Save className="h-4 w-4" />
          {saving ? T.saving : T.saveProfile}
        </Button>
      </form>
    </Section>
  );
}

// ── Security (change password) ─────────────────────────────────────────────
function SecuritySection({ T }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
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
      const code = err?.response?.status;
      const apiErr = err?.response?.data?.error;
      if (code === 401) setError('wrong_current');
      else setError(apiErr || 'unknown_error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title={T.securityTitle} subtitle={T.securitySubtitle}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field
          label={T.currentPassword}
          icon={<Lock className="h-3.5 w-3.5" />}
          trailing={
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="text-muted hover:text-ink"
              aria-label={showCurrent ? T.hidePwd : T.showPwd}
            >
              {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          }
        >
          <input
            type={showCurrent ? 'text' : 'password'}
            autoComplete="current-password"
            autoCorrect="off"
            spellCheck={false}
            autoCapitalize="off"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            onFocus={focusCenter}
            className={inputClass(false)}
          />
        </Field>

        <Field
          label={T.newPassword}
          icon={<Lock className="h-3.5 w-3.5" />}
          hint={T.newPasswordHint}
          trailing={
            <button
              type="button"
              onClick={() => setShowNext((v) => !v)}
              className="text-muted hover:text-ink"
              aria-label={showNext ? T.hidePwd : T.showPwd}
            >
              {showNext ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          }
        >
          <input
            type={showNext ? 'text' : 'password'}
            autoComplete="new-password"
            autoCorrect="off"
            spellCheck={false}
            autoCapitalize="off"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            onFocus={focusCenter}
            className={inputClass(false)}
          />
        </Field>

        <Field label={T.confirmPassword} icon={<Lock className="h-3.5 w-3.5" />}>
          <input
            type={showNext ? 'text' : 'password'}
            autoComplete="new-password"
            autoCorrect="off"
            spellCheck={false}
            autoCapitalize="off"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onFocus={focusCenter}
            className={inputClass(false)}
          />
        </Field>

        {error && (
          <div className="rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-xs text-[rgb(var(--coral))]">
            {T.errors[error] || error}
          </div>
        )}

        <Button type="submit" variant="brand" size="md" disabled={saving || !current || !next || !confirm}>
          <Shield className="h-4 w-4" />
          {saving ? T.saving : T.changePassword}
        </Button>
      </form>
    </Section>
  );
}

// ── Danger (change email / delete) ─────────────────────────────────────────
function DangerSection({ user, setSession, token, qc, T, onLogout }) {
  return (
    <div className="space-y-5">
      <ChangeEmailSection user={user} setSession={setSession} qc={qc} T={T} />
      <DeleteAccountSection T={T} onAfter={onLogout} />
    </div>
  );
}

function ChangeEmailSection({ user, setSession, qc, T }) {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
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
      const code = err?.response?.status;
      const apiErr = err?.response?.data?.error;
      if (code === 401) setError('wrong_password');
      else if (code === 409) setError('email_taken');
      else setError(apiErr || 'unknown_error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title={T.changeEmailTitle} subtitle={T.changeEmailSubtitle}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={T.currentEmail} icon={<Mail className="h-3.5 w-3.5" />}>
          <input
            type="email"
            value={user.email}
            readOnly
            disabled
            className={cn(inputClass(false), 'cursor-not-allowed bg-paper text-muted')}
          />
        </Field>

        <Field label={T.newEmail} icon={<AtSign className="h-3.5 w-3.5" />}>
          <input
            type="email"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass(false)}
          />
        </Field>

        <Field
          label={T.confirmWithPassword}
          icon={<Lock className="h-3.5 w-3.5" />}
          trailing={
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="text-muted hover:text-ink"
            >
              {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          }
        >
          <input
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass(false)}
          />
        </Field>

        {error && (
          <div className="rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-xs text-[rgb(var(--coral))]">
            {T.errors[error] || error}
          </div>
        )}

        <Button type="submit" variant="codex" size="md" disabled={saving || !password || !newEmail}>
          <Save className="h-4 w-4" />
          {saving ? T.saving : T.changeEmail}
        </Button>
      </form>
    </Section>
  );
}

function DeleteAccountSection({ T, onAfter }) {
  const [confirmText, setConfirmText] = useState('');
  const [working, setWorking] = useState(false);
  const matches = confirmText.trim().toLowerCase() === 'delete';

  const submit = async (e) => {
    e.preventDefault();
    if (!matches || working) return;
    if (!window.confirm(T.deleteFinalConfirm)) return;
    setWorking(true);
    try {
      await authDeleteAccount();
      toast.success(T.accountDeleted);
      onAfter();
    } catch {
      toast.error(T.errorGeneric);
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="rounded-md border border-coral/60 bg-coral/5 p-5 shadow-codex-sm sm:p-6">
      <div className="mb-5 border-b border-coral/30 pb-3">
        <h2 className="inline-flex items-center gap-2 font-display text-xl font-medium tracking-tight text-[rgb(var(--coral))]">
          <Trash2 className="h-4 w-4" />
          {T.deleteTitle}
        </h2>
        <p className="mt-1 text-xs text-ink-2">{T.deleteSubtitle}</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <Field label={T.deleteConfirmLabel} icon={<AlertTriangle className="h-3.5 w-3.5" />}>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="delete"
            className={inputClass(false)}
          />
        </Field>
        <Button
          type="submit"
          variant="codex"
          size="md"
          disabled={!matches || working}
          className={cn(
            'border-coral text-[rgb(var(--coral))] hover:bg-coral/10',
            !matches && 'opacity-50',
          )}
        >
          <Trash2 className="h-4 w-4" />
          {working ? T.saving : T.deleteCta}
        </Button>
      </form>
    </section>
  );
}

// ── Reusable bits ──────────────────────────────────────────────────────────

function Field({ label, icon, hint, trailing, children }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {icon}
          {label}
        </span>
        {trailing}
      </div>
      {children}
      {hint && (
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-muted-2">
          {hint}
        </span>
      )}
    </label>
  );
}

const inputClass = (hasErr) => cn(
  'w-full rounded-xl border bg-paper-2/60 px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted-2 outline-none transition-all duration-200',
  hasErr
    ? 'border-coral/60 focus:border-coral focus:ring-2 focus:ring-coral/20'
    : 'border-rule/12 focus:border-brand/40 focus:bg-paper-2 focus:ring-2 focus:ring-brand/20',
);

// Re-center the focused field on phones — iOS often hides it behind the
// virtual keyboard otherwise.
const focusCenter = (e) => {
  setTimeout(() => {
    try { e.target?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    catch { /* older Safari */ }
  }, 250);
};

const RU = {
  back: 'На главную',
  eyebrow: 'Аккаунт',
  title: 'Настройки',
  joined: 'с',
  tabs: 'Разделы настроек',
  tabPreferences: 'Настройки',
  tabProfile: 'Профиль',
  tabSecurity: 'Безопасность',
  tabDanger: 'Опасная зона',

  profileTitle: 'Профиль',
  profileSubtitle: 'Имя видно только тебе. Email используется для входа.',
  name: 'Имя',
  namePh: 'Как тебя называть?',
  nameHint: 'Опционально, до 80 символов',
  email: 'Email',
  emailReadOnlyHint: 'Меняется в разделе «Опасная зона»',
  saveProfile: 'Сохранить',
  saving: 'Сохраняю…',
  profileSaved: 'Профиль обновлён',

  securityTitle: 'Смена пароля',
  securitySubtitle: 'Минимум 8 символов. Текущий пароль нужен для подтверждения.',
  currentPassword: 'Текущий пароль',
  newPassword: 'Новый пароль',
  newPasswordHint: 'Минимум 8 символов',
  confirmPassword: 'Подтвердить новый',
  showPwd: 'Показать',
  hidePwd: 'Скрыть',
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
  deleteSubtitle: 'Безвозвратно удалит аккаунт и весь прогресс на сервере. Локальная копия остаётся.',
  deleteConfirmLabel: 'Напечатай "delete" для подтверждения',
  deleteCta: 'Удалить навсегда',
  deleteFinalConfirm: 'Точно удалить аккаунт? Это действие нельзя отменить.',
  accountDeleted: 'Аккаунт удалён',

  errorGeneric: 'Что-то пошло не так. Попробуй ещё раз.',
  errors: {
    password_too_short: 'Минимум 8 символов',
    mismatch: 'Пароли не совпадают',
    same_as_current: 'Новое значение должно отличаться от текущего',
    wrong_current: 'Текущий пароль неверный',
    wrong_password: 'Текущий пароль неверный',
    invalid_email: 'Некорректный email',
    email_taken: 'Этот email уже занят',
    unknown_error: 'Что-то пошло не так',
  },
};

const EN = {
  back: 'Back to dashboard',
  eyebrow: 'Account',
  title: 'Settings',
  joined: 'joined',
  tabs: 'Settings sections',
  tabPreferences: 'Preferences',
  tabProfile: 'Profile',
  tabSecurity: 'Security',
  tabDanger: 'Danger zone',

  profileTitle: 'Profile',
  profileSubtitle: 'Name is just for you. Email is your sign-in.',
  name: 'Name',
  namePh: 'What should we call you?',
  nameHint: 'Optional, up to 80 characters',
  email: 'Email',
  emailReadOnlyHint: 'Change it in the Danger zone',
  saveProfile: 'Save',
  saving: 'Saving…',
  profileSaved: 'Profile updated',

  securityTitle: 'Change password',
  securitySubtitle: 'At least 8 characters. Current password required to confirm.',
  currentPassword: 'Current password',
  newPassword: 'New password',
  newPasswordHint: 'At least 8 characters',
  confirmPassword: 'Confirm new password',
  showPwd: 'Show',
  hidePwd: 'Hide',
  changePassword: 'Change password',
  passwordChanged: 'Password updated',

  changeEmailTitle: 'Change email',
  changeEmailSubtitle: 'Email is your sign-in. Confirm with current password.',
  currentEmail: 'Current email',
  newEmail: 'New email',
  confirmWithPassword: 'Current password',
  changeEmail: 'Change email',
  emailChanged: 'Email updated',

  deleteTitle: 'Delete account',
  deleteSubtitle: 'Permanently deletes your account and server-side progress. Local copy remains.',
  deleteConfirmLabel: 'Type "delete" to confirm',
  deleteCta: 'Delete forever',
  deleteFinalConfirm: 'Really delete your account? This cannot be undone.',
  accountDeleted: 'Account deleted',

  errorGeneric: 'Something went wrong. Try again.',
  errors: {
    password_too_short: 'At least 8 characters',
    mismatch: 'Passwords don\'t match',
    same_as_current: 'New value must differ from current',
    wrong_current: 'Current password is incorrect',
    wrong_password: 'Current password is incorrect',
    invalid_email: 'Invalid email address',
    email_taken: 'Email is already in use',
    unknown_error: 'Something went wrong',
  },
};
