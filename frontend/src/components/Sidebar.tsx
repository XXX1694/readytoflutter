import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTopics } from '../lib/queries';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { ProgressBar } from '../ui/index';
import { cn } from '../lib/cn';
import { filterTopicsByPlatform, PLATFORMS } from '../lib/platform';
import { RAIL_ROUTES, routeLabel } from '../lib/routes';

/**
 * The active-state device for the app chrome is weight plus a tinted row —
 * the same signal BottomNav and MobileHeader give, so "where am I" reads
 * identically everywhere. No pill, no ring, no highlight wash.
 */
const navRowClass = (isActive: boolean): string =>
  cn(
    'mx-2 flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] transition-colors',
    isActive ? 'bg-rule/8 font-semibold text-ink' : 'font-medium text-ink-2 hover:bg-rule/6 hover:text-ink',
  );

const copy = (t: UICopy, key: string): string => {
  const value = t[key as keyof UICopy];
  return typeof value === 'string' ? value : '';
};

/**
 * The desktop rail: the wordmark, five destinations and the one progress
 * figure. It is not a catalogue — the 53 topics live on /topics — and it
 * does not exist under `lg`, where the tab bar does its job.
 */
export default function Sidebar() {
  const { lang } = useLang();
  const t = useT(lang);
  const { data: topics = [] } = useTopics();
  const platform = usePrefs((s) => s.platform);

  const scoped = useMemo(() => filterTopicsByPlatform(topics, platform), [topics, platform]);
  const total = scoped.reduce((s, tp) => s + (tp.question_count || 0), 0);
  const completed = scoped.reduce((s, tp) => s + (tp.completed_count || 0), 0);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const stackMeta = PLATFORMS.find((p) => p.key === platform);
  const scopeLabel = platform !== 'all' && stackMeta ? copy(t, stackMeta.labelKey) : t.nav.allStacks;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-rule/8 bg-paper lg:flex">
      {/* Wordmark. Set in the grotesk — the name is the mark. */}
      <div className="border-b border-rule/8 px-5 py-4">
        <NavLink to="/" className="rounded-sm" aria-label={t.goToHomepage}>
          <span className="font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">Onsite</span>
        </NavLink>
      </div>

      <nav className="flex-1 py-3" aria-label={t.cmdNavigation}>
        {RAIL_ROUTES.map((route) => (
          <NavLink key={route.path} to={route.path} end={route.end} className={({ isActive }) => navRowClass(isActive)}>
            {({ isActive }) => (
              <>
                <route.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-ink' : 'text-muted')} aria-hidden />
                <span>{routeLabel(t, route)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* The one figure: completed over total in the active stack. */}
      {total > 0 && (
        <NavLink to="/stats" className="block border-t border-rule/8 px-5 py-4 transition-colors hover:bg-rule/4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="eyebrow truncate">{t.nav.progress} · {scopeLabel}</span>
            <span className="num shrink-0 text-[15px] text-ink">{pct}%</span>
          </div>
          <ProgressBar value={completed} max={total} tone="ink" size="xs" className="mt-2" label={t.nav.progress} />
          <div className="mt-1.5 text-[12px] text-muted-2">
            <span className="num">{completed}</span> / <span className="num">{total}</span> {t.questions}
          </div>
        </NavLink>
      )}
    </aside>
  );
}
