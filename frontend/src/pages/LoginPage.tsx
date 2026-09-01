import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../store/auth';
import {
  authLogin,
  bulkSyncProgress,
  readLocalProgress,
  clearLocalProgress,
  serializeLocalProgress,
} from '../api/api';
import { track, identify } from '../lib/analytics';
import { useLang } from '../i18n/LangContext';
import { useLoginCopy, type LoginCopy } from '../i18n/loginPage';
import { useRecoveryCopy } from '../i18n/ui';
import { Button, Eyebrow, TextField, PasswordField } from '../ui/index';

const schema = z.object({
  email: z.string().trim().email({ message: 'invalid_email' }),
  password: z.string().min(1, { message: 'password_required' }),
});

type FieldName = 'email' | 'password';
type FormErrors = Partial<Record<FieldName | 'form', string>>;

// Open-redirect guard — the post-login `from` value comes from router state,
// which a malicious deep link could populate with `//evil.com` or
// `https://evil.com`. Only accept clean internal paths starting with `/`.
function safeRedirect(target: unknown): string {
  if (typeof target !== 'string') return '/';
  if (!target.startsWith('/') || target.startsWith('//')) return '/';
  if (/^\/(login|signup|reset)(\/|$)/.test(target)) return '/';
  return target;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuth((s) => s.setSession);
  const markSynced = useAuth((s) => s.markSynced);
  const qc = useQueryClient();
  const { lang } = useLang();
  const isRu = lang === 'ru';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const T = useLoginCopy(lang);
  const R = useRecoveryCopy(lang);
  const errLabel = (key: string | undefined): string | null =>
    (key ? T.errors[key as keyof LoginCopy['errors']] ?? T.errors.unknown_error : null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setErrors({});

    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const next: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'email' || field === 'password') next[field] = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const { user, token } = await authLogin(parsed.data.email, parsed.data.password);
      setSession(token, user);
      identify(String(user.id), { email: user.email });
      track('login', { method: 'email' });

      // Push any progress accumulated in localStorage (during offline /
      // anonymous use) up to the server. The server upserts last-write-wins
      // by updated_at, so it never clobbers fresher server rows.
      try {
        const localItems = serializeLocalProgress(readLocalProgress());
        if (localItems.length > 0) {
          const result = await bulkSyncProgress(localItems);
          clearLocalProgress();
          markSynced();
          if (result.imported > 0) {
            toast.message(
              isRu ? `Синхронизировано ${result.imported} карточек` : `Synced ${result.imported} cards`,
            );
          }
        }
      } catch {
        // Sync failure is non-fatal — the local data stays in place and the
        // user can retry by signing out and back in.
      }

      // Invalidate all queries so subsequent fetches go out with the new
      // Authorization header and reflect the user's server-side progress.
      qc.invalidateQueries();
      toast.success(isRu ? `С возвращением, ${user.name || user.email}` : `Welcome back, ${user.name || user.email}`);
      navigate(safeRedirect((location.state as { from?: unknown } | null)?.from), { replace: true });
    } catch (err) {
      const code = (err as { response?: { status?: number } })?.response?.status;
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (code === 401) setErrors({ form: 'invalid_credentials' });
      else if (code === 429) setErrors({ form: 'rate_limited' });
      else setErrors({ form: apiErr ?? 'unknown_error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-page flex min-h-full items-center justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {T.back}
        </Link>

        <Eyebrow>{T.eyebrow}</Eyebrow>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
          <span className="marker decoration-clone">{T.title}</span>
        </h1>
        <p className="mt-3 font-serif text-[17px] leading-relaxed text-ink-2">{T.subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <TextField
            label={T.email}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            error={errLabel(errors.email)}
            autoFocus
          />

          <PasswordField
            label={T.password}
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={errLabel(errors.password)}
            showLabel={T.showPwd}
            hideLabel={T.hidePwd}
          />

          {errors.form && (
            <p role="alert" className="rounded-md border border-coral/30 bg-coral/8 px-3 py-2 text-[13px] text-coral">
              {errLabel(errors.form)}
            </p>
          )}

          <Button type="submit" variant="codex" className="w-full" disabled={submitting}>
            {submitting ? T.submitting : T.submit}
          </Button>
        </form>

        <p className="mt-4 text-[13px] text-muted">
          {R.forgotLead}{' '}
          <Link to="/reset" className="text-brand underline-offset-4 hover:underline">
            {R.forgotLink}
          </Link>
        </p>

        <p className="mt-8 border-t border-rule/12 pt-5 text-sm text-muted">
          {T.noAccount}{' '}
          <Link to="/signup" className="font-medium text-brand underline-offset-4 hover:underline">
            {T.toSignup}
          </Link>
        </p>
        <p className="mt-3 text-[13px] text-muted-2">{T.guestNote}</p>
      </div>
    </div>
  );
}
