import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../store/auth';
import {
  authRegister,
  bulkSyncProgress,
  readLocalProgress,
  clearLocalProgress,
  serializeLocalProgress,
  type BulkProgressItem,
} from '../api/api';
import { syncSrs } from '../lib/srsSync';
import { track, identify } from '../lib/analytics';
import { useLang } from '../i18n/LangContext';
import { useSignupCopy, type SignupCopy } from '../i18n/signupPage';
import { useRecoveryCopy } from '../i18n/ui';
import { Button, PageHeader, PageShell, TextField, PasswordField } from '../ui/index';
import { RecoveryCodePanel } from './ResetPasswordPage';
import { useDocumentMeta } from '../lib/useDocumentMeta';

const schema = z.object({
  name: z.string().trim().max(80).optional().or(z.literal('').transform((): undefined => undefined)),
  email: z.string().trim().email({ message: 'invalid_email' }),
  password: z.string().min(8, { message: 'password_too_short' }).max(200),
});

type FieldName = 'email' | 'password';
type FormErrors = Partial<Record<FieldName | 'form', string>>;

export default function SignupPage() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const markSynced = useAuth((s) => s.markSynced);
  const qc = useQueryClient();
  const { lang } = useLang();
  useDocumentMeta({ title: `${lang === 'ru' ? 'Регистрация' : 'Create account'} — Onsite` });
  const isRu = lang === 'ru';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  // Set once the account exists and there is local progress worth importing —
  // its presence is what swaps the form out for the import step.
  const [pendingImport, setPendingImport] = useState<BulkProgressItem[] | null>(null);
  // The recovery code, which the register response carries exactly once. It
  // takes over the screen ahead of the import step: the account is already
  // created, so the only thing that can still be lost here is the code.
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('');

  const T = useSignupCopy(lang);
  const R = useRecoveryCopy(lang);
  const errLabel = (key: string | undefined): string | null =>
    (key ? T.errors[key as keyof SignupCopy['errors']] ?? T.errors.unknown_error : null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setErrors({});

    const parsed = schema.safeParse({ name, email, password });
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
    // Fired after client-side validation passes, so signup_start → signup is
    // "the form was good and the server still said no" rather than typos.
    track('signup_start', { method: 'email', named: Boolean(parsed.data.name) });
    try {
      const { user, token, recoveryCode } = await authRegister(
        parsed.data.email,
        parsed.data.password,
        parsed.data.name || null,
      );
      setSession(token, user);
      identify(String(user.id), { email: user.email });
      track('signup', { method: 'email' });
      qc.invalidateQueries();
      // Offer the optional import step only when this browser holds progress.
      const localItems = serializeLocalProgress(readLocalProgress());
      const nextImport = localItems.length > 0 ? localItems : null;
      setPendingImport(nextImport);
      const welcome = isRu
        ? `Привет, ${user.name || user.email}`
        : `Welcome aboard, ${user.name || user.email}`;
      setGreeting(welcome);
      if (recoveryCode) {
        setIssuedCode(recoveryCode);
      } else if (!nextImport) {
        toast.success(welcome);
        navigate('/', { replace: true });
      }
    } catch (err) {
      const code = (err as { response?: { status?: number } })?.response?.status;
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (code === 409) setErrors({ form: 'email_taken' });
      else if (code === 429) setErrors({ form: 'rate_limited' });
      else if (apiErr?.toLowerCase().includes('password')) setErrors({ password: 'password_too_short' });
      else setErrors({ form: apiErr ?? 'unknown_error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async () => {
    if (!pendingImport) return;
    setSubmitting(true);
    try {
      const result = await bulkSyncProgress(pendingImport);
      // The review schedule rides along with the import rather than going up
      // silently on signup: it is the same anonymous study history, and this
      // is where the user says yes to carrying it into the account.
      await syncSrs();
      clearLocalProgress();
      markSynced();
      qc.invalidateQueries();
      toast.success(isRu
        ? `Импортировано ${result.imported} карточек`
        : `Imported ${result.imported} cards`);
    } catch {
      toast.error(isRu
        ? 'Не удалось импортировать прогресс. Он остался в этом браузере — попробуй позже.'
        : 'Could not import your progress. It is still in this browser — try again later.');
    } finally {
      setSubmitting(false);
      navigate('/', { replace: true });
    }
  };

  // Only reachable from the acknowledgement button on the code panel.
  const finishRecovery = () => {
    setIssuedCode(null);
    if (pendingImport) return; // the import step renders next
    toast.success(greeting);
    navigate('/', { replace: true });
  };

  if (issuedCode) {
    return (
      <PageShell width="narrow" centered>
        <PageHeader eyebrow={R.panelEyebrow} title={R.panelTitle} />
        <RecoveryCodePanel
          code={issuedCode}
          T={R}
          ctaLabel={R.continue}
          onAcknowledge={finishRecovery}
        />
      </PageShell>
    );
  }

  if (pendingImport) {
    return (
      <PageShell width="narrow" centered>
        <PageHeader
          eyebrow={T.syncEyebrow}
          title={T.syncTitle(pendingImport.length)}
          subtitle={T.syncSubtitle}
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="codex" className="flex-1" onClick={handleImport} disabled={submitting}>
            {submitting ? T.syncing : T.syncConfirm}
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => navigate('/', { replace: true })}
            disabled={submitting}
          >
            {T.syncSkip}
          </Button>
        </div>

        <p className="mt-5 text-[13px] text-muted-2">{T.syncNote}</p>
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow" centered>
      <PageHeader
        eyebrow={T.eyebrow}
        title={T.title}
        subtitle={T.subtitle}
        back={{ to: '/', label: T.back }}
      />

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <TextField
          label={`${T.name} · ${T.optional}`}
          autoComplete="name"
          autoCapitalize="words"
          value={name}
          onChange={setName}
          placeholder={T.namePh}
        />

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
        />

        <PasswordField
          label={T.password}
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          placeholder={T.passwordPh}
          hint={T.passwordHint}
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

      <p className="mt-8 border-t border-rule/12 pt-5 text-[15px] text-muted">
        {T.haveAccount}{' '}
        <Link to="/login" className="font-medium text-brand underline-offset-4 hover:underline">
          {T.toLogin}
        </Link>
      </p>
    </PageShell>
  );
}
