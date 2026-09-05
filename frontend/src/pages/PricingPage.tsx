import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../store/auth';
import { useLang } from '../i18n/LangContext';
import { usePricingCopy } from '../i18n/staticPages';
import { Button, buttonVariants, PageHeader, PageShell } from '../ui/index';
import { billingHealth, billingCheckout, billingPortal } from '../api/api';
import { useAiHealth } from '../components/AnswerGrader';
import { useStats, useTopics } from '../lib/queries';
import { track } from '../lib/analytics';
import { cn } from '../lib/cn';
import { useDocumentMeta } from '../lib/useDocumentMeta';

// Display price. Wired to your Stripe Price; the number on this page is
// purely cosmetic — what users actually pay is whatever the linked
// `STRIPE_PRICE_ID` says. Keep them in sync when you change the plan.
const PRICE_USD = 9;

export default function PricingPage() {
  const { lang } = useLang();
  const T = usePricingCopy(lang);
  useDocumentMeta({
    title: `${lang === 'ru' ? 'Цены' : 'Pricing'} — Onsite`,
    description: T.metaDescription,
    // Trailing slash: the form GitHub Pages serves with a 200, and the form
    // the sitemap lists. The no-slash path is a 301.
    canonical: '/pricing/',
  });
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const backendAvailable = useAuth((s) => s.backendAvailable);
  const isPro = !!user && !!user.pro_tier && user.pro_tier !== 'free';

  // The catalogue figure is whatever the data actually holds — the page used
  // to advertise a question count that went stale the moment the seed grew.
  const { data: topics = [] } = useTopics();
  const { data: stats } = useStats();

  // Stays false until the probe answers, so the upgrade CTA never offers a
  // checkout the backend cannot open. `billingHealth` resolves to disabled
  // rather than rejecting, so there is nothing to catch here.
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  // Same fail-closed probe the grader itself runs, off the same module-level
  // cache. A build with no backend has no AI grading, so the page must not
  // list it — this page used to sell it unconditionally.
  const aiEnabled = useAiHealth().enabled;

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
  const freeFeatures = [
    T.catalogue(topics.length, stats?.totalQuestions ?? 0),
    ...T.freeFeatures,
    ...(aiEnabled ? [T.aiFeature] : []),
  ];

  return (
    <PageShell width="reading">
      <PageHeader
        eyebrow={T.eyebrow}
        title={showPro ? T.title : T.titleFree}
        subtitle={showPro ? T.subtitle : T.subtitleFree}
        back={{ to: '/', label: T.back }}
      />

      <div className="divide-y divide-rule/12 border-b border-rule/12">
        {/* "per month" only earns its place beside a price it contrasts
            with; with no Pro column it is boilerplate. */}
        <Plan
          name={T.free}
          price="$0"
          period={showPro ? T.perMonth : ''}
          features={freeFeatures}
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

      {!showPro && aiEnabled && (
        <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-muted">{T.aiNote}</p>
      )}

      <p className="mt-8 text-[15px] text-muted">
        {T.note}
        <Link to="/contact" className="font-medium text-brand underline-offset-4 hover:underline">
          {T.noteLink}
        </Link>.
      </p>
    </PageShell>
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
  /** Sets the price in the pen's blue — the one accent on this page. */
  marked?: boolean;
  cta: ReactNode;
}

function Plan({ name, price, period, features, currentLabel, note, lede, marked, cta }: PlanProps) {
  return (
    <section className="grid gap-4 py-8 sm:grid-cols-[9rem_1fr] sm:gap-8">
      <div>
        <h2 className="font-display text-[20px] font-semibold text-ink">{name}</h2>
        {currentLabel && <p className="mt-1 text-[13px] text-muted">{currentLabel}</p>}
      </div>

      <div>
        <p className="flex items-baseline gap-2">
          <span className={cn('num text-4xl', marked ? 'text-brand' : 'text-ink')}>{price}</span>
          <span className="text-[13px] text-muted">{period}</span>
        </p>
        {note && <p className="mt-2 text-[13px] text-muted">{note}</p>}
        {lede && <p className="mt-6 text-[15px] font-medium text-ink">{lede}</p>}

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
