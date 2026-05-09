import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, Check } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '../store/auth.js';
import { useLang } from '../i18n/LangContext.jsx';
import { Button, Eyebrow } from '../ui/index.js';
import { submitContact } from '../api/api.js';
import { track } from '../lib/analytics.js';
import { cn } from '../lib/cn.js';

const schema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  email: z.string().trim().email({ message: 'invalid_email' }),
  message: z.string().trim().min(10, { message: 'too_short' }).max(4000, { message: 'too_long' }),
});

const COPY = {
  en: {
    eyebrow: 'Contact',
    back: 'Back to home',
    title: 'Drop us a line',
    subtitle: 'Bug? Feature idea? Sponsorship? Anything else? Real human reads every message.',
    name: 'Name', namePh: 'optional',
    email: 'Email', emailPh: 'you@example.com',
    message: 'Message', messagePh: 'Tell us what\'s on your mind…',
    submit: 'Send', sending: 'Sending…',
    sentTitle: 'Got it', sentSub: 'Thanks — we\'ll get back to you within 2 business days.',
    err: { invalid_email: 'Looks like that email is invalid.', too_short: 'Add a bit more detail.', too_long: 'Message is too long.', generic: 'Could not send. Try again.' },
  },
  ru: {
    eyebrow: 'Контакты',
    back: 'На главную',
    title: 'Напиши нам',
    subtitle: 'Баг? Идея? Партнёрство? Что угодно — каждое сообщение читает живой человек.',
    name: 'Имя', namePh: 'необязательно',
    email: 'Email', emailPh: 'you@example.com',
    message: 'Сообщение', messagePh: 'Расскажи, что у тебя…',
    submit: 'Отправить', sending: 'Отправляем…',
    sentTitle: 'Принято', sentSub: 'Спасибо — ответим в течение 2 рабочих дней.',
    err: { invalid_email: 'Невалидный email.', too_short: 'Чуть подробнее, пожалуйста.', too_long: 'Сообщение слишком длинное.', generic: 'Не удалось отправить. Попробуй ещё раз.' },
  },
};

export default function ContactPage() {
  const { lang } = useLang();
  const T = COPY[lang === 'ru' ? 'ru' : 'en'];
  const user = useAuth((s) => s.user);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  // Honeypot — invisible field, real users leave it blank.
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const errLabel = (key) => (key ? T.err[key] || T.err.generic : null);
  const inputCls = (hasErr) => cn(
    'w-full rounded-md border bg-paper px-3 py-2 text-sm text-ink shadow-codex-sm transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-brand/30',
    hasErr ? 'border-coral/40' : 'border-rule/20 focus:border-rule/40',
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setErrors({});
    const parsed = schema.safeParse({ name, email, message });
    if (!parsed.success) {
      const next = {};
      for (const i of parsed.error.issues) next[i.path[0]] = i.message;
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
      const code = err?.response?.status;
      const msg = err?.response?.data?.error;
      if (code === 429) setErrors({ form: 'too_long' });
      else setErrors({ form: msg || 'generic' });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="bg-page flex min-h-full items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-mint/15 text-[rgb(var(--mint))]">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="font-display text-3xl font-medium text-ink">{T.sentTitle}</h1>
          <p className="mt-3 text-sm text-ink-2">{T.sentSub}</p>
          <Link to="/" className="mt-6 inline-block text-sm text-brand hover:text-brand-ink">{T.back} →</Link>
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
            <Mail className="mr-1 inline h-3 w-3" />
            {T.eyebrow}
          </Eyebrow>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl">
            {T.title}
          </h1>
          <p className="mt-2 text-sm text-ink-2">{T.subtitle}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted">{T.name}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={T.namePh}
                className={inputCls(false)}
                autoComplete="name"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted">{T.email}</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={T.emailPh}
                className={inputCls(!!errors.email)}
              />
              {errors.email && <span className="mt-1 block text-xs text-[rgb(var(--coral))]">{errLabel(errors.email)}</span>}
            </label>

            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted">{T.message}</span>
              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={T.messagePh}
                className={cn(inputCls(!!errors.message), 'resize-y')}
                maxLength={4000}
              />
              {errors.message && <span className="mt-1 block text-xs text-[rgb(var(--coral))]">{errLabel(errors.message)}</span>}
            </label>

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
              <div className="rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-xs text-[rgb(var(--coral))]">
                {errLabel(errors.form)}
              </div>
            )}

            <Button type="submit" variant="brand" size="md" className="w-full" disabled={submitting}>
              <Send className="h-4 w-4" />
              {submitting ? T.sending : T.submit}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
