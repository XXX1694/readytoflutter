// The panels the two AI graders share: the verdict heading, the ruled margin
// lists and the daily-cap notice. Lifted out of AnswerGrader.tsx when /live
// grew a second panel — two copies of the verdict words would have drifted
// the first time one of them was reworded. The error shape they both read
// lives in lib/aiErrors.ts.

import { Link } from 'react-router-dom';
import { Button, Pill, type PillTone } from '../ui/index';
import { track } from '../lib/analytics';
import { cn } from '../lib/cn';

import type { Lang } from '../i18n/LangContext';
import type { PaywallInfo } from '../lib/aiErrors';

/** The four words both the answer grader and the code review report. */
type Verdict = 'great' | 'good' | 'rough' | 'off';

const VERDICT_TONE: Record<Verdict, PillTone> = {
  great: 'mint',
  good:  'brand',
  rough: 'amber',
  off:   'coral',
};

const VERDICT_LABEL: Record<Verdict, Record<Lang, string>> = {
  great: { ru: 'Отлично', en: 'Great' },
  good:  { ru: 'Уверенно', en: 'Solid' },
  rough: { ru: 'С трудом', en: 'Rough' },
  off:   { ru: 'Мимо', en: 'Off' },
};

/** One annotated list — a ruled margin, a label, and the points themselves. */
export function GradeNotes({ label, rule, items }: { label: string; rule: string; items: string[] }) {
  return (
    <div className={cn('border-l-2 pl-3', rule)}>
      <div className="eyebrow mb-1.5">{label}</div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-[13px] leading-relaxed text-ink-2">{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** The verdict word and the score, as both panels head their result. */
export function VerdictHeading({ verdict, score, lang }: { verdict: Verdict; score: number; lang: Lang }) {
  return (
    <div className="flex items-center gap-2">
      <Pill tone={VERDICT_TONE[verdict] || 'neutral'} size="sm">
        {VERDICT_LABEL[verdict]?.[lang] || verdict}
      </Pill>
      <span className="num text-[15px] text-ink">
        {score}<span className="text-muted-2">/100</span>
      </span>
    </div>
  );
}

/**
 * Shown when an /api/ai/* call returns 402.
 *
 * Pro is withdrawn (see BILLING_ENABLED), so this no longer offers an upgrade
 * — the daily cap is a cost limit on a paid model, not a paywall, and saying
 * otherwise would sell something that isn't for sale. A guest is still told
 * that signing in raises the allowance, because that part is true. **If Pro
 * comes back, this copy has to come back with it.**
 */
export function PaywallPanel({ info, lang }: { info: PaywallInfo; lang: Lang }) {
  const ru = lang === 'ru';
  const isAnon = info.tier === 'anon' || info.reason === 'anon_quota_exceeded';
  const title = isAnon
    ? (ru ? 'Лимит для гостей исчерпан' : 'Guest limit reached for today')
    : (ru ? 'Дневной лимит Free исчерпан' : 'Free plan limit reached for today');
  const body = isAnon
    ? (ru
        ? 'Зарегистрируйся — проверок в день станет больше. Остальное в приложении и так бесплатно.'
        : 'Sign in for a bigger daily allowance. Everything else in the app is free either way.')
    : (ru
        ? `Использовано ${info.used} из ${info.cap} за сегодня. Лимит обновится завтра.`
        : `${info.used} of ${info.cap} used today. Your allowance resets tomorrow.`);

  return (
    <section className="mb-5 rounded-lg border border-amber/25 bg-amber/6 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="font-display text-[15px] font-medium text-ink">{title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{body}</p>
        </div>
        {/* Signing up is the only thing this wall can honestly offer, and it
            keeps paywall_hit from being a dead end — you still learn whether
            hitting the cap converts anyone. */}
        {isAnon && (
          <div className="shrink-0">
            <Link to="/signup" onClick={() => track('upgrade_click', { from: 'paywall', cta: 'signup', tier: info.tier ?? null })}>
              <Button variant="outline" size="sm">{ru ? 'Зарегистрироваться' : 'Sign up'}</Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
