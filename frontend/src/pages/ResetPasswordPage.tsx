import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import { authResetWithRecoveryCode } from '../api/api';
import { useLang } from '../i18n/LangContext';
import { useRecoveryCopy, type RecoveryCopy, type RecoveryErrorKey } from '../i18n/ui';
import { Button, Eyebrow, TextField, PasswordField } from '../ui/index';

/**
 * Recovery-code reset. There is no email provider, so the code the user saved
 * at signup is the credential: they prove they hold it, set a password, and
 * then sign in with it like anyone else — the server deliberately returns no
 * session here.
 *
 * The reply carries a *replacement* code (the one just typed is spent), so the
 * success screen has exactly the same "save this" job as signup and reuses the
 * same panel.
 */

// The code is validated by the server, which normalises case, spacing, dashes
// and the Crockford look-alikes. Checking anything beyond "not empty" here
// would only reject codes the server would have accepted.
const schema = z.object({
  email: z.string().trim().email({ message: 'invalid_email' }),
  code: z.string().trim().min(1, { message: 'code_required' }),
  password: z.string().min(8, { message: 'password_too_short' }).max(200),
});

type FieldName = 'email' | 'code' | 'password';
type FormErrors = Partial<Record<FieldName | 'form', RecoveryErrorKey>>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const T = useRecoveryCopy(lang);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  // The replacement code. Its presence is what swaps the form for the
  // save-this-code screen.
  const [issuedCode, setIssuedCode] = useState<string | null>(null);

  const errLabel = (key: RecoveryErrorKey | undefined): string | null =>
    (key ? T.errors[key] : null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setErrors({});

    const parsed = schema.safeParse({ email, code, password });
    if (!parsed.success) {
      const next: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'email' || field === 'code' || field === 'password') {
          next[field] = issue.message as RecoveryErrorKey;
        }
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const { recoveryCode } = await authResetWithRecoveryCode(
        parsed.data.email,
        parsed.data.code,
        parsed.data.password,
      );
      setIssuedCode(recoveryCode);
    } catch (err) {
      setErrors({ form: resetErrorKey(err) });
    } finally {
      setSubmitting(false);
    }
  };

  if (issuedCode) {
    return (
      <AuthShell>
        <Eyebrow>{T.resetDoneEyebrow}</Eyebrow>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
          {T.resetDoneTitle}
        </h1>
        <p className="mt-3 font-serif text-[17px] leading-relaxed text-ink-2">{T.resetDoneBody}</p>

        <div className="mt-8">
          <RecoveryCodePanel
            code={issuedCode}
            T={T}
            ctaLabel={T.toSignIn}
            onAcknowledge={() => navigate('/login', { replace: true })}
          />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Link
        to="/login"
        className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {T.resetBack}
      </Link>

      <Eyebrow>{T.resetEyebrow}</Eyebrow>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
        {T.resetTitle}
      </h1>
      <p className="mt-3 font-serif text-[17px] leading-relaxed text-ink-2">{T.resetSubtitle}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <TextField
          label={T.resetEmail}
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

        <TextField
          label={T.resetCode}
          autoComplete="off"
          autoCapitalize="characters"
          value={code}
          onChange={setCode}
          placeholder={T.resetCodePh}
          hint={T.resetCodeHint}
          error={errLabel(errors.code)}
        />

        <PasswordField
          label={T.resetNewPassword}
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          hint={T.resetNewPasswordHint}
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
          {submitting ? T.resetSubmitting : T.resetSubmit}
        </Button>
      </form>

      <p className="mt-8 border-t border-rule/12 pt-5 text-[13px] text-muted">{T.resetNoCode}</p>
    </AuthShell>
  );
}

export interface RecoveryCodePanelProps {
  code: string;
  T: RecoveryCopy;
  /** Label for the button that leaves this screen. */
  ctaLabel: string;
  onAcknowledge: () => void;
}

/**
 * The one moment a recovery code exists outside the user's own notes. Used by
 * signup, by this page's success screen and by Settings → Security, so all
 * three make the same promise in the same words.
 *
 * The acknowledgement checkbox is the point: a toast would let someone scroll
 * past the only copy of their code without reading it.
 */
export function RecoveryCodePanel({ code, T, ctaLabel, onAcknowledge }: RecoveryCodePanelProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the code above is still selectable */
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-[15px] leading-relaxed text-ink-2">{T.panelBody}</p>

      <div className="rounded-md border border-rule/15 bg-paper px-3 py-4">
        <p className="select-all break-all text-center font-mono text-[17px] font-medium text-ink sm:text-[20px]">
          {code}
        </p>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={copyCode} aria-live="polite">
        {copied
          ? <><Check className="h-3.5 w-3.5" />{T.copied}</>
          : <><Copy className="h-3.5 w-3.5" />{T.copy}</>}
      </Button>

      <label className="touch-target flex cursor-pointer items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="h-4 w-4 shrink-0 accent-ink"
        />
        {T.ack}
      </label>

      <Button
        type="button"
        variant="codex"
        className="w-full"
        disabled={!saved}
        onClick={onAcknowledge}
      >
        {ctaLabel}
      </Button>

      <p className="text-[13px] text-muted">{T.panelFooter}</p>
    </div>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-page flex min-h-full items-center justify-center px-4 py-14">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

// Axios rejections arrive as `unknown`. 401 is the deliberately generic
// "email and code do not match" — a wrong code and an unknown address are
// indistinguishable by design, so it is passed through untouched.
function resetErrorKey(err: unknown): RecoveryErrorKey {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 401) return 'invalid';
  if (status === 429) return 'rate_limited';
  const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
  if (apiError && /equal email/i.test(apiError)) return 'password_equals_email';
  return 'unknown_error';
}
