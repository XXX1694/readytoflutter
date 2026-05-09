import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Sparkles, Zap, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../store/auth.js';
import { useLang } from '../i18n/LangContext.jsx';
import { Button, Eyebrow, Pill } from '../ui/index.js';
import { billingHealth, billingCheckout, billingPortal } from '../api/api.js';
import { track } from '../lib/analytics.js';
import { cn } from '../lib/cn.js';

const COPY = {
  en: {
    eyebrow: 'Pricing',
    back: 'Back to home',
    title: 'Pay if it pays you back.',
    subtitle: 'Free covers the bulk of prep. Pro unlocks unlimited AI grading and deeper analytics — useful when interview week is 3 days out.',
    free: 'Free', pro: 'Pro',
    perMonth: '/ month', billed: 'Billed monthly. Cancel anytime.',
    freeFeatures: [
      'All 53 topics, 392 curated questions',
      'SRS scheduling & active recall mode',
      'Mock interviews with self-grade',
      'Cheatsheets, bookmarks, EN / RU',
      '10 AI-grade reviews per day',
    ],
    proFeatures: [
      'Everything in Free, plus:',
      'Unlimited AI-grade with follow-up questions',
      'Priority feedback when you email us',
      'Deeper stats: weak-topic radar, mastery curve',
      'Early access to new question packs',
    ],
    ctaFreeAuth: 'You\'re on Free', ctaFreeAnon: 'Start free',
    ctaProUpgrade: 'Upgrade to Pro', ctaProActive: 'Manage subscription',
    ctaProSoon: 'Coming soon', ctaProSignup: 'Create an account',
    ctaProAuthLogin: 'Sign in to upgrade',
    note: 'Pro is for solo learners. Need team plans? Hit ',
    noteLink: 'contact',
    proBadge: 'Most popular',
    activeBadge: 'Active',
  },
  ru: {
    eyebrow: 'Цены',
    back: 'На главную',
    title: 'Платишь, если окупается.',
    subtitle: 'Free закрывает основу подготовки. Pro даёт безлимитную AI-проверку и глубже статистику — пригодится, когда интервью через 3 дня.',
    free: 'Бесплатно', pro: 'Pro',
    perMonth: '/ месяц', billed: 'Ежемесячно. Отмена в любой момент.',
    freeFeatures: [
      'Все 53 темы, 392 кураторских вопроса',
      'SRS-планирование + активное припоминание',
      'Mock-интервью с self-grade',
      'Шпаргалки, закладки, EN / RU',
      '10 AI-проверок в день',
    ],
    proFeatures: [
      'Всё из Free, плюс:',
      'Безлимитная AI-проверка с follow-up вопросами',
      'Приоритетный ответ на email',
      'Глубже статистика: радар слабых тем, mastery curve',
      'Ранний доступ к новым пакам вопросов',
    ],
    ctaFreeAuth: 'У тебя Free', ctaFreeAnon: 'Начать бесплатно',
    ctaProUpgrade: 'Подключить Pro', ctaProActive: 'Управлять подпиской',
    ctaProSoon: 'Скоро', ctaProSignup: 'Создать аккаунт',
    ctaProAuthLogin: 'Войти, чтобы оформить',
    note: 'Pro — для одного человека. Нужен team-план? Пиши в ',
    noteLink: 'контактах',
    proBadge: 'Популярно',
    activeBadge: 'Активно',
  },
};

// Display price. Wired to your Stripe Price; the number on this card is
// purely cosmetic — what users actually pay is whatever the linked
// `STRIPE_PRICE_ID` says. Keep them in sync when you change the plan.
const PRICE_USD = 9;

export default function PricingPage() {
  const { lang } = useLang();
  const T = COPY[lang === 'ru' ? 'ru' : 'en'];
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const backendAvailable = useAuth((s) => s.backendAvailable);
  const isPro = user && user.pro_tier && user.pro_tier !== 'free';

  const [billing, setBilling] = useState({ enabled: false, reason: 'loading' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (backendAvailable === false) { setBilling({ enabled: false, reason: 'no_backend' }); return; }
    billingHealth().then(setBilling).catch(() => setBilling({ enabled: false, reason: 'unreachable' }));
  }, [backendAvailable]);

  const startUpgrade = async () => {
    if (busy) return;
    if (!token) {
      navigate(`/signup?next=${encodeURIComponent('/pricing')}`);
      return;
    }
    setBusy(true);
    try {
      track('upgrade_click', { from: 'pricing' });
      const { url } = await billingCheckout();
      if (url) window.location.href = url;
      else throw new Error('no url');
    } catch (err) {
      const code = err?.response?.status;
      toast.error(code === 503 ? (lang === 'ru' ? 'Биллинг ещё не подключён' : 'Billing not configured') : (lang === 'ru' ? 'Не удалось открыть оплату' : 'Could not open checkout'));
      setBusy(false);
    }
  };

  const openPortal = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { url } = await billingPortal();
      if (url) window.location.href = url;
    } catch {
      toast.error(lang === 'ru' ? 'Не удалось открыть портал' : 'Could not open portal');
      setBusy(false);
    }
  };

  // Pick the right CTA for the Pro card based on auth + billing state.
  let proCta = null;
  if (isPro) {
    proCta = (
      <Button variant="codex" size="md" className="w-full" onClick={openPortal} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {T.ctaProActive}
      </Button>
    );
  } else if (!billing.enabled) {
    proCta = (
      <Button variant="codex" size="md" className="w-full" disabled>
        {T.ctaProSoon}
      </Button>
    );
  } else if (!token) {
    proCta = (
      <Button variant="brand" size="md" className="w-full" onClick={startUpgrade}>
        <Sparkles className="h-4 w-4" />
        {T.ctaProSignup}
      </Button>
    );
  } else {
    proCta = (
      <Button variant="brand" size="md" className="w-full" onClick={startUpgrade} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {T.ctaProUpgrade}
      </Button>
    );
  }

  return (
    <div className="bg-page min-h-full px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" />
          {T.back}
        </Link>

        <header className="mb-10 sm:mb-14">
          <Eyebrow accent="brand">
            <Star className="mr-1 inline h-3 w-3" />
            {T.eyebrow}
          </Eyebrow>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
            {T.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-ink-2 sm:text-base">{T.subtitle}</p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          {/* Free */}
          <section
            className={cn(
              'relative flex flex-col rounded-2xl border bg-paper-2 p-6 shadow-codex-sm sm:p-8',
              isPro ? 'border-rule/12' : 'border-rule/20',
            )}
          >
            <header className="mb-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{T.free}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-medium tracking-tight text-ink">$0</span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{T.perMonth}</span>
              </div>
            </header>
            <ul className="mb-6 space-y-2.5 text-sm text-ink-2">
              {T.freeFeatures.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto">
              {token ? (
                <Button variant="ghost" size="md" className="w-full" disabled>
                  {T.ctaFreeAuth}
                </Button>
              ) : (
                <Link to="/signup" className="block">
                  <Button variant="codex" size="md" className="w-full">{T.ctaFreeAnon}</Button>
                </Link>
              )}
            </div>
          </section>

          {/* Pro */}
          <section
            className={cn(
              'relative flex flex-col rounded-2xl border-2 p-6 shadow-codex sm:p-8',
              'border-brand/40 bg-gradient-to-b from-brand/5 to-transparent',
            )}
          >
            <div className="absolute -top-3 left-6">
              <Pill tone="brand">
                <Zap className="mr-1 inline h-3 w-3" />
                {isPro ? T.activeBadge : T.proBadge}
              </Pill>
            </div>
            <header className="mb-5 mt-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">{T.pro}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-medium tracking-tight text-ink">${PRICE_USD}</span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{T.perMonth}</span>
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-2">{T.billed}</div>
            </header>
            <ul className="mb-6 space-y-2.5 text-sm text-ink-2">
              {T.proFeatures.map((f, i) => (
                <li key={f} className="flex gap-2">
                  <Check className={cn('mt-0.5 h-4 w-4 shrink-0', i === 0 ? 'text-muted' : 'text-brand')} />
                  <span className={i === 0 ? 'font-medium text-ink' : ''}>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto">{proCta}</div>
          </section>
        </div>

        <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-wider text-muted">
          {T.note}
          <Link to="/contact" className="text-brand hover:text-brand-ink">{T.noteLink}</Link>.
        </p>
      </div>
    </div>
  );
}
