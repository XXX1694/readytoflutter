import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { LogIn, Eye, EyeOff, ArrowLeft, Lock, AtSign } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../store/auth.js';
import { authLogin } from '../api/api.js';
import { useLang } from '../i18n/LangContext.jsx';
import { Button, Eyebrow } from '../ui/index.js';
import { cn } from '../lib/cn.js';

const schema = z.object({
  email: z.string().trim().email({ message: 'invalid_email' }),
  password: z.string().min(1, { message: 'password_required' }),
});

// Open-redirect guard — the post-login `from` value comes from router state,
// which a malicious deep link could populate with `//evil.com` or
// `https://evil.com`. Only accept clean internal paths starting with `/`.
function safeRedirect(target) {
  if (typeof target !== 'string') return '/';
  if (!target.startsWith('/') || target.startsWith('//')) return '/';
  if (/^\/(login|signup)(\/|$)/.test(target)) return '/';
  return target;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuth((s) => s.setSession);
  const qc = useQueryClient();
  const { lang } = useLang();
  const isRu = lang === 'ru';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const T = isRu ? RU : EN;
  const errLabel = (key) => (key ? T.errors[key] || key : null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setErrors({});

    const parsed = schema.safeParse({ email, password });
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
      const { user, token } = await authLogin(parsed.data.email, parsed.data.password);
      setSession(token, user);
      // Invalidate all queries so subsequent fetches go out with the new
      // Authorization header and reflect the user's server-side progress.
      qc.invalidateQueries();
      toast.success(isRu ? `С возвращением, ${user.name || user.email}` : `Welcome back, ${user.name || user.email}`);
      const next = safeRedirect(location.state?.from);
      navigate(next, { replace: true });
    } catch (err) {
      const apiErr = err?.response?.data?.error;
      const code = err?.response?.status;
      if (code === 401) {
        setErrors({ form: 'invalid_credentials' });
      } else if (code === 429) {
        setErrors({ form: 'rate_limited' });
      } else {
        setErrors({ form: apiErr || 'unknown_error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

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
            <LogIn className="mr-1 inline h-3 w-3" />
            {T.eyebrow}
          </Eyebrow>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl">
            {T.title}
          </h1>
          <p className="mt-2 text-sm text-ink-2">{T.subtitle}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <Field
              label={T.email}
              icon={<AtSign className="h-3.5 w-3.5" />}
              error={errLabel(errors.email)}
            >
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass(errors.email)}
                autoFocus
              />
            </Field>

            <Field
              label={T.password}
              icon={<Lock className="h-3.5 w-3.5" />}
              error={errLabel(errors.password)}
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass(errors.password)}
              />
            </Field>

            {errors.form && (
              <div className="rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-xs text-[rgb(var(--coral))]">
                {errLabel(errors.form)}
              </div>
            )}

            <Button
              type="submit"
              variant="brand"
              size="md"
              className="w-full"
              disabled={submitting}
            >
              <LogIn className="h-4 w-4" />
              {submitting ? T.submitting : T.submit}
            </Button>
          </form>

          <div className="mt-6 border-t border-rule pt-5 text-center font-mono text-[11px] uppercase tracking-wider text-muted">
            {T.noAccount}{' '}
            <Link to="/signup" className="text-brand hover:text-brand-ink">
              {T.toSignup}
            </Link>
          </div>
        </div>

        <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-wider text-muted-2">
          {T.guestNote}
        </p>
      </div>
    </div>
  );
}

function Field({ label, icon, error, trailing, children }) {
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
