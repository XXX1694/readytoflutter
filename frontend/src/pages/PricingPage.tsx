import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../store/auth';
import { useLang } from '../i18n/LangContext';
import { Button, buttonVariants, Eyebrow } from '../ui/index';
import { billingHealth, billingCheckout, billingPortal } from '../api/api';
import { track } from '../lib/analytics';
import { cn } from '../lib/cn';

const EN = {
  eyebrow: 'Pricing',
  back: 'Back to home',
  title: 'Pay if it pays you back.',
  subtitle: 'Free covers the bulk of prep. Pro unlocks unlimited AI grading — the part that earns its keep when interview week is three days out.',
  // Shown instead of the above while Pro is withdrawn.
  titleFree: 'All of it, free.',
  subtitleFree: 'There is no paid plan at the moment. Every topic, every question, spaced repetition, mock interviews and the cheatsheets are yours for nothing, with no account required.',
  aiNote: 'AI answer-grading is capped per day. That is a cost limit, not a paywall — the grading runs against a paid model and the cap keeps it affordable to leave switched on for everyone.',
  free: 'Free',
  pro: 'Pro',
  perMonth: 'per month',
  billed: 'Billed monthly. Cancel anytime.',
  currentPlan: 'Your plan',
  freeFeatures: [
    'All 53 topics, 392 curated questions',
    'SRS scheduling and active recall',
    'Mock interviews with self-grading',
    'Cheatsheets, bookmarks, English and Russian',
    '10 AI-graded answers per day',
  ],
  proLede: 'Everything in free, plus',
  // Only what actually exists. This list previously advertised deeper stats
  // and early access to question packs; neither was ever built, and StatsPage
  // has no tier check at all. Follow-up questions moved out because the AI
  // grader returns one to everybody.
  proFeatures: [
    'Unlimited AI grading',
    'Priority replies when you email us',
  ],
  ctaFreeAnon: 'Start free',
  ctaProUpgrade: 'Upgrade to Pro',
  ctaProActive: 'Manage subscription',
  ctaProSoon: 'Not available yet',
  ctaProSignup: 'Create an account',
  note: 'Questions, or want a team plan? ',
  noteLink: 'get in touch',
  errCheckoutOff: 'Checkout is not switched on yet. Try again later.',
  errCheckout: 'Could not open checkout. Try again in a moment.',
  errPortal: 'Could not open the billing portal. Try again in a moment.',
};

type Copy = typeof EN;

const RU: Copy = {
  eyebrow: 'Цены',
  back: 'На главную',
  title: 'Платишь, если окупается.',
  subtitle: 'Free закрывает основу подготовки. Pro даёт безлимитную AI-проверку — то, что окупается, когда интервью через три дня.',
  titleFree: 'Всё бесплатно.',
  subtitleFree: 'Платного тарифа сейчас нет. Все темы и вопросы, интервальное повторение, mock-интервью и шпаргалки доступны бесплатно и без аккаунта.',
  aiNote: 'У AI-проверки ответов есть дневной лимит. Это ограничение по стоимости, а не пейволл: проверка идёт через платную модель, и лимит позволяет держать её включённой для всех.',
  free: 'Бесплатно',
  pro: 'Pro',
  perMonth: 'в месяц',
  billed: 'Списание раз в месяц. Отмена в любой момент.',
  currentPlan: 'Твой план',
  freeFeatures: [
    'Все 53 темы, 392 кураторских вопроса',
    'SRS-планирование и активное припоминание',
    'Mock-интервью с самопроверкой',
    'Шпаргалки, закладки, английский и русский',
    '10 AI-проверок в день',
  ],
  proLede: 'Всё из Free, плюс',
  proFeatures: [
    'Безлимитная AI-проверка',
    'Приоритетный ответ на письма',
  ],
  ctaFreeAnon: 'Начать бесплатно',
  ctaProUpgrade: 'Подключить Pro',
  ctaProActive: 'Управлять подпиской',
  ctaProSoon: 'Пока недоступно',
  ctaProSignup: 'Создать аккаунт',
  note: 'Вопросы или нужен командный тариф? ',
  noteLink: 'напиши нам',
  errCheckoutOff: 'Оплата ещё не подключена. Попробуй позже.',
  errCheckout: 'Не удалось открыть оплату. Попробуй ещё раз.',
  errPortal: 'Не удалось открыть портал оплаты. Попробуй ещё раз.',
};

// Display price. Wired to your Stripe Price; the number on this page is
// purely cosmetic — what users actually pay is whatever the linked
// `STRIPE_PRICE_ID` says. Keep them in sync when you change the plan.
const PRICE_USD = 9;

export default function PricingPage() {
  const { lang } = useLang();
  const T = lang === 'ru' ? RU : EN;
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const backendAvailable = useAuth((s) => s.backendAvailable);
  const isPro = !!user && !!user.pro_tier && user.pro_tier !== 'free';

  // Stays false until the probe answers, so the upgrade CTA never offers a
  // checkout the backend cannot open. `billingHealth` resolves to disabled
  // rather than rejecting, so there is nothing to catch here.
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (backendAvailable === false) return;
    let live = true;
    billingHealth().then((health) => { if (live) setBillingEnabled(health.enabled); });
    return () => { live = false; };
  }, [backendAvailable]);

  const startUpgrade = async () => {
    if (busy) return;
    // Tracked before the auth branch: a signed-out click is intent too, and it
    // used to be dropped because the event sat below this early return.
    track('upgrade_click', { from: 'pricing', authed: Boolean(token) });
    if (!token) {
      navigate(`/signup?next=${encodeURIComponent('/pricing')}`);
      return;
    }
    setBusy(true);
    try {
      const { url } = await billingCheckout();
      if (url) window.location.href = url;
      else throw new Error('no url');
    } catch (err) {
      const code = (err as { response?: { status?: number } })?.response?.status;
      toast.error(code === 503 ? T.errCheckoutOff : T.errCheckout);
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
      toast.error(T.errPortal);
      setBusy(false);
    }
  };

  // Pick the right CTA for the Pro plan based on auth + billing state.
  let proCta: ReactNode;
  if (isPro) {
    proCta = (
      <Button variant="outline" className="w-full" onClick={openPortal} disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {T.ctaProActive}
      </Button>
    );
  } else if (!billingEnabled) {
    proCta = <Button variant="outline" className="w-full" disabled>{T.ctaProSoon}</Button>;
  } else if (!token) {
    proCta = <Button variant="codex" className="w-full" onClick={startUpgrade}>{T.ctaProSignup}</Button>;
  } else {
    proCta = (
      <Button variant="codex" className="w-full" onClick={startUpgrade} disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {T.ctaProUpgrade}
      </Button>
    );
  }

  // Pro is withdrawn until it has something to sell (BILLING_ENABLED on the
  // server). An existing subscriber still sees their plan and the portal —
  // hiding it would leave them no way to cancel.
  const showPro = billingEnabled || isPro;

  return (
    <div className="bg-page min-h-full px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {T.back}
        </Link>

        <header className="mb-12">
          <Eyebrow>{T.eyebrow}</Eyebrow>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-5xl">
            {showPro ? T.title : T.titleFree}
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-[17px] leading-relaxed text-ink-2">
            {showPro ? T.subtitle : T.subtitleFree}
          </p>
        </header>

        <div className="border-b border-rule/12">
          {/* "per month" only earns its place beside a price it contrasts
              with; with no Pro column it is boilerplate. */}
          <Plan
            name={T.free}
            price="$0"
            period={showPro ? T.perMonth : ''}
            features={T.freeFeatures}
            currentLabel={token && !isPro ? T.currentPlan : null}
            cta={token ? null : (
              <Link to="/signup" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
                {T.ctaFreeAnon}
              </Link>
            )}
          />
          {showPro && (
            <Plan
              name={T.pro}
              price={`$${PRICE_USD}`}
              period={T.perMonth}
              note={T.billed}
              lede={T.proLede}
              features={T.proFeatures}
              currentLabel={isPro ? T.currentPlan : null}
              marked
              cta={proCta}
            />
          )}
        </div>

        {!showPro && (
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted">{T.aiNote}</p>
        )}

        <p className="mt-8 text-sm text-muted">
          {T.note}
          <Link to="/contact" className="font-medium text-brand underline-offset-4 hover:underline">
            {T.noteLink}
          </Link>.
        </p>
      </div>
    </div>
  );
}

interface PlanProps {
  name: string;
  price: string;
  period: string;
  features: string[];
  /** Shown under the plan name when this is the plan the reader is already on. */
  currentLabel?: string | null;
  note?: string;
  lede?: string;
  /** Lays the citron marker behind the price — the one accent on this page. */
  marked?: boolean;
  cta: ReactNode;
}

function Plan({ name, price, period, features, currentLabel, note, lede, marked, cta }: PlanProps) {
  return (
    <section className="grid gap-4 border-t border-rule/12 py-8 sm:grid-cols-[9rem_1fr] sm:gap-8">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">{name}</h2>
        {currentLabel && <p className="mt-1 text-[13px] text-muted">{currentLabel}</p>}
      </div>

      <div>
        <p className="flex items-baseline gap-2">
          <span className={cn('num text-4xl text-ink', marked && 'marker')}>{price}</span>
          <span className="text-sm text-muted">{period}</span>
        </p>
        {note && <p className="mt-2 text-[13px] text-muted">{note}</p>}
        {lede && <p className="mt-6 text-sm font-medium text-ink">{lede}</p>}

        <ul className="mt-4 divide-y divide-rule/8 border-t border-rule/8">
          {features.map((feature) => (
            <li key={feature} className="py-2.5 text-[15px] text-ink-2">{feature}</li>
          ))}
        </ul>

        {cta && <div className="mt-6 sm:max-w-[15rem]">{cta}</div>}
      </div>
    </section>
  );
}
