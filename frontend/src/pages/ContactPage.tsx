import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '../store/auth';
import { useLang } from '../i18n/LangContext';
import { useContactCopy, type ContactErrorKey } from '../i18n/staticPages';
import { Button, PageHeader, PageShell, TextField, TextArea } from '../ui/index';
import { submitContact } from '../api/api';
import { track } from '../lib/analytics';
import { useDocumentMeta } from '../lib/useDocumentMeta';

const schema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal('').transform((): undefined => undefined)),
  email: z.string().trim().email({ message: 'invalid_email' }),
  message: z.string().trim().min(10, { message: 'too_short' }).max(4000, { message: 'too_long' }),
});

type FormErrors = Partial<Record<'email' | 'message' | 'form', string>>;

export default function ContactPage() {
  const { lang } = useLang();
  useDocumentMeta({ title: `${lang === 'ru' ? 'Контакты' : 'Contact'} — Onsite` });
  const T = useContactCopy(lang);
  const user = useAuth((s) => s.user);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  // Honeypot — invisible field, real users leave it blank.
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const errLabel = (key: string | undefined): string | null =>
    (key ? T.err[key as ContactErrorKey] ?? T.err.generic : null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setErrors({});
    const parsed = schema.safeParse({ name, email, message });
    if (!parsed.success) {
      const next: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'email' || field === 'message') next[field] = issue.message;
      }
      setErrors(next);
      return;
    }
    setSubmitting(true);
    try {
      await submitContact({ ...parsed.data, website });
      track('contact_submitted', { authed: !!user });
      setDone(true);
      toast.success(T.sentTitle);
    } catch (err) {
      const code = (err as { response?: { status?: number } })?.response?.status;
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErrors({ form: code === 429 ? 'rate_limited' : apiErr ?? 'generic' });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <PageShell width="reading">
        <PageHeader eyebrow={T.eyebrow} title={T.sentTitle} subtitle={T.sentSub} />
        <Link to="/" className="text-[15px] font-medium text-brand underline-offset-4 hover:underline">
          {T.back}
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell width="reading">
      <PageHeader
        eyebrow={T.eyebrow}
        title={T.title}
        subtitle={T.subtitle}
        back={{ to: '/', label: T.back }}
      />

      <form onSubmit={handleSubmit} className="max-w-md space-y-5" noValidate>
        <TextField
          label={T.name}
          type="text"
          value={name}
          onChange={setName}
          placeholder={T.namePh}
          autoComplete="name"
          maxLength={120}
        />

        <TextField
          label={T.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          placeholder={T.emailPh}
          error={errLabel(errors.email)}
        />

        <TextArea
          label={T.message}
          rows={6}
          value={message}
          onChange={setMessage}
          placeholder={T.messagePh}
          maxLength={4000}
          error={errLabel(errors.message)}
        />

        {/* Honeypot — hidden from real users. */}
        <input
          type="text"
          tabIndex={-1}
          aria-hidden
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
          name="website"
        />

        {errors.form && (
          <p role="alert" className="rounded-md border border-coral/30 bg-coral/8 px-3 py-2 text-[13px] text-coral">
            {errLabel(errors.form)}
          </p>
        )}

        <Button type="submit" variant="codex" className="w-full" disabled={submitting}>
          {submitting ? T.sending : T.submit}
        </Button>
      </form>
    </PageShell>
  );
}
