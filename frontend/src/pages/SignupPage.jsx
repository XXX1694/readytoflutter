import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { UserPlus, Eye, EyeOff, ArrowLeft, Lock, AtSign, User, Cloud, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../store/auth.js';
import { authRegister, bulkSyncProgress, readLocalProgress, clearLocalProgress } from '../api/api.js';
import { useLang } from '../i18n/LangContext.jsx';
import { Button, Eyebrow } from '../ui/index.js';
import { cn } from '../lib/cn.js';

const schema = z.object({
  name: z.string().trim().max(80).optional().or(z.literal('').transform(() => undefined)),
  email: z.string().trim().email({ message: 'invalid_email' }),
  password: z.string().min(8, { message: 'password_too_short' }).max(200),
});

export default function SignupPage() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const markSynced = useAuth((s) => s.markSynced);
  const qc = useQueryClient();
  const { lang } = useLang();
  const isRu = lang === 'ru';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'sync'
  const [syncSummary, setSyncSummary] = useState(null);

  const T = isRu ? RU : EN;
  const errLabel = (key) => (key ? T.errors[key] || key : null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setErrors({});

    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) {
      const next = {};
      for (const issue of parsed.error.issues) {
        next[issue.path[0]] = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const { user, token } = await authRegister(parsed.data.email, parsed.data.password, parsed.data.name || null);
      setSession(token, user);
      qc.invalidateQueries();
      // Inspect localStorage progress for the optional import step
      const localItems = serializeLocalProgress(readLocalProgress());
      if (localItems.length > 0) {
        setSyncSummary({ count: localItems.length, items: localItems, user });
        setStep('sync');
      } else {
        toast.success(isRu ? `Привет, ${user.name || user.email}!` : `Welcome aboard, ${user.name || user.email}`);
        navigate('/', { replace: true });
      }
    } catch (err) {
      const apiErr = err?.response?.data?.error;
      const code = err?.response?.status;
      if (code === 409) setErrors({ form: 'email_taken' });
      else if (code === 429) setErrors({ form: 'rate_limited' });
      else if (apiErr?.toLowerCase?.().includes('password')) setErrors({ password: 'password_too_short' });
      else setErrors({ form: apiErr || 'unknown_error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async () => {
    if (!syncSummary) return;
    setSubmitting(true);
    try {
      const result = await bulkSyncProgress(syncSummary.items);
      clearLocalProgress();
      markSynced();
      qc.invalidateQueries();
      toast.success(isRu
        ? `Импортировано ${result.imported} карточек`
        : `Imported ${result.imported} cards`);
    } catch {
      toast.error(isRu ? 'Не удалось импортировать прогресс' : 'Import failed');
    } finally {
      setSubmitting(false);
      navigate('/', { replace: true });
    }
  };

  const handleSkip = () => navigate('/', { replace: true });

  if (step === 'sync' && syncSummary) {
    return (
      <div className="bg-page flex min-h-full items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-md border border-rule/15 bg-paper-2 p-6 shadow-codex sm:p-8">
          <Eyebrow accent="brand">
            <Cloud className="mr-1 inline h-3 w-3" />
            {T.syncEyebrow}
          </Eyebrow>
          <h1 className="mt-3 font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-3xl">
            {T.syncTitle(syncSummary.count)}
          </h1>
          <p className="mt-2 text-sm text-ink-2">{T.syncSubtitle}</p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="brand"
              size="md"
              className="flex-1"
              onClick={handleImport}
              disabled={submitting}
            >
              <Check className="h-4 w-4" />
              {submitting ? T.syncing : T.syncConfirm}
            </Button>
            <Button variant="ghost" size="md" className="flex-1" onClick={handleSkip} disabled={submitting}>
              {T.syncSkip}
            </Button>
          </div>

          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-wider text-muted-2">
            {T.syncNote}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-page flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" />
          {T.back}
        </Link>

        <div className="rounded-md border border-rule/15 bg-paper-2 p-6 shadow-codex sm:p-8">
          <Eyebrow accent="brand">
            <UserPlus className="mr-1 inline h-3 w-3" />
            {T.eyebrow}
          </Eyebrow>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl">
            {T.title}
          </h1>
          <p className="mt-2 text-sm text-ink-2">{T.subtitle}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <Field label={T.name} icon={<User className="h-3.5 w-3.5" />} optional={T.optional}>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={T.namePh}
                className={inputClass(false)}
              />
            </Field>

            <Field label={T.email} icon={<AtSign className="h-3.5 w-3.5" />} error={errLabel(errors.email)}>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass(errors.email)}
              />
            </Field>

            <Field
              label={T.password}
              icon={<Lock className="h-3.5 w-3.5" />}
              error={errLabel(errors.password)}
              hint={T.passwordHint}
              trailing={(
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink"
                  aria-label={showPwd ? T.hidePwd : T.showPwd}
                >
                  {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              )}
            >
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={T.passwordPh}
                className={inputClass(errors.password)}
              />
            </Field>

            {errors.form && (
              <div className="rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-xs text-[rgb(var(--coral))]">
                {errLabel(errors.form)}
              </div>
            )}

            <Button type="submit" variant="brand" size="md" className="w-full" disabled={submitting}>
              <UserPlus className="h-4 w-4" />
              {submitting ? T.submitting : T.submit}
            </Button>
          </form>

          <div className="mt-6 border-t border-rule pt-5 text-center font-mono text-[11px] uppercase tracking-wider text-muted">
            {T.haveAccount}{' '}
            <Link to="/login" className="text-brand hover:text-brand-ink">
              {T.toLogin}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, error, hint, trailing, optional, children }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {icon}
          {label}
          {optional && <span className="ml-1 normal-case tracking-normal text-muted-2">· {optional}</span>}
        </span>
        {trailing}
      </div>
      {children}
      {hint && !error && (
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-muted-2">
          {hint}
        </span>
      )}
      {error && (
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-[rgb(var(--coral))]">
          {error}
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

// Translate localStorage progress shape into the bulk-import payload shape.
function serializeLocalProgress(progress) {
  return Object.entries(progress || {}).map(([key, value]) => ({
    questionId: Number(key),
    status: value?.status,
    notes: value?.notes || null,
    updated_at: value?.updated_at || new Date().toISOString(),
  })).filter((p) => p.questionId && p.status);
}

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
