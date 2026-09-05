import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '../store/auth';
import { useLang } from '../i18n/LangContext';
import { useContactCopy, type ContactErrorKey } from '../i18n/staticPages';
import { Button, buttonVariants, PageHeader, PageShell, TextField, TextArea } from '../ui/index';
import { submitContact } from '../api/api';
import { track } from '../lib/analytics';
import { cn } from '../lib/cn';
import { useDocumentMeta } from '../lib/useDocumentMeta';

// The repo this app is deployed from. It is the only inbox that works when
// there is no backend to accept the form.
const ISSUES_URL = 'https://github.com/XXX1694/readytoflutter/issues';

const schema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal('').transform((): undefined => undefined)),
  email: z.string().trim().email({ message: 'invalid_email' }),
  message: z.string().trim().min(10, { message: 'too_short' }).max(4000, { message: 'too_long' }),
});

type FormErrors = Partial<Record<'email' | 'message' | 'form', string>>;

export default function ContactPage() {
  const { lang } = useLang();
  const T = useContactCopy(lang);
  useDocumentMeta({
    title: `${lang === 'ru' ? 'Контакты' : 'Contact'} — Onsite`,
    description: T.metaDescription,
    // Trailing slash: the form GitHub Pages serves with a 200, and the form
    // the sitemap lists. The no-slash path is a 301.
    canonical: '/contact/',
  });
  const user = useAuth((s) => s.user);
  const backendAvailable = useAuth((s) => s.backendAvailable);

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
      // No `response` at all means the request never reached a server —
      // "try again in a moment" is the wrong advice for that.
      const res = (err as { response?: { status?: number; data?: { error?: string } } })?.response;
      let form = 'unreachable';
      if (res) form = res.status === 429 ? 'rate_limited' : res.data?.error ?? 'generic';
      setErrors({ form });
    } finally {
      setSubmitting(false);
    }
  };

  // `null` means the probe is still running — only a settled `false` swaps the
  // form out, so a deploy that has a backend never flashes this.
  if (backendAvailable === false) {
    return (
      <PageShell width="reading">
        <PageHeader
          eyebrow={T.eyebrow}
          title={T.title}
          subtitle={T.issuesSub}
          back={{ to: '/', label: T.back }}
        />

        <div className="max-w-md space-y-6">
          <p className="text-[15px] leading-relaxed text-ink-2">{T.issuesBody}</p>
          <a
            href={ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'codex' }), 'w-full')}
          >
            {T.issuesCta}
          </a>
        </div>
      </PageShell>
    );
  }

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
