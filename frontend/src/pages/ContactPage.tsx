import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '../store/auth';
import { useLang } from '../i18n/LangContext';
import { Button, Eyebrow, TextField, TextArea } from '../ui/index';
import { submitContact } from '../api/api';
import { track } from '../lib/analytics';

const schema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal('').transform((): undefined => undefined)),
  email: z.string().trim().email({ message: 'invalid_email' }),
  message: z.string().trim().min(10, { message: 'too_short' }).max(4000, { message: 'too_long' }),
});

const EN = {
  eyebrow: 'Contact',
  back: 'Back to home',
  title: 'Drop us a line',
  subtitle: 'Bugs, feature ideas, partnerships — a real person reads every message.',
  name: 'Name', namePh: 'Optional',
  email: 'Email', emailPh: 'you@example.com',
  message: 'Message', messagePh: 'Tell us what is on your mind…',
  submit: 'Send message', sending: 'Sending…',
  sentTitle: 'Message sent',
  sentSub: 'We reply within two business days.',
  err: {
    invalid_email: 'That email address is not valid. Check the spelling.',
    too_short: 'Add a bit more detail — at least 10 characters.',
    too_long: 'That message is over 4000 characters. Trim it down.',
    rate_limited: 'Too many messages just now. Try again in a few minutes.',
    generic: 'Could not send your message. Try again in a moment.',
  },
};

type Copy = typeof EN;
type ErrorKey = keyof Copy['err'];
type FormErrors = Partial<Record<'email' | 'message' | 'form', string>>;

const RU: Copy = {
  eyebrow: 'Контакты',
  back: 'На главную',
  title: 'Напиши нам',
  subtitle: 'Баги, идеи, партнёрство — каждое сообщение читает живой человек.',
  name: 'Имя', namePh: 'Необязательно',
  email: 'Email', emailPh: 'you@example.com',
  message: 'Сообщение', messagePh: 'Расскажи, что у тебя…',
  submit: 'Отправить', sending: 'Отправляем…',
  sentTitle: 'Сообщение отправлено',
  sentSub: 'Отвечаем в течение двух рабочих дней.',
  err: {
    invalid_email: 'Некорректный email. Проверь написание.',
    too_short: 'Добавь деталей — хотя бы 10 символов.',
    too_long: 'Сообщение длиннее 4000 символов. Сократи его.',
    rate_limited: 'Слишком много сообщений подряд. Попробуй через несколько минут.',
    generic: 'Не удалось отправить сообщение. Попробуй ещё раз.',
  },
};

export default function ContactPage() {
  const { lang } = useLang();
  const T = lang === 'ru' ? RU : EN;
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
    (key ? T.err[key as ErrorKey] ?? T.err.generic : null);

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
      <Shell>
        <h1 className="font-display text-3xl font-semibold text-ink">
          <span className="marker decoration-clone">{T.sentTitle}</span>
        </h1>
        <p className="mt-4 font-serif text-[17px] leading-relaxed text-ink-2">{T.sentSub}</p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {T.back}
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {T.back}
      </Link>

      <Eyebrow>{T.eyebrow}</Eyebrow>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">{T.title}</h1>
      <p className="mt-3 font-serif text-[17px] leading-relaxed text-ink-2">{T.subtitle}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
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
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-page flex min-h-full items-center justify-center px-4 py-14">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
