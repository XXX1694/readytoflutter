import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTopics } from '../lib/queries';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { ProgressBar } from '../ui/index';
import { cn } from '../lib/cn';
import { filterTopicsByPlatform } from '../lib/platform';
import { RAIL_ROUTES, routeLabel } from '../lib/routes';
import { StackRows } from './StackSwitcher';
import { useCurrentStack } from '../lib/useStack';

/**
 * The active-state device for the app chrome is a tinted row in the stack's
 * colour — the same signal BottomNav and the stack list give, so "where am
 * I" reads identically everywhere.
 */
const navRowClass = (isActive: boolean): string =>
  cn(
    'mx-3 flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] transition-colors',
    isActive ? 'bg-brand/10 font-semibold text-brand' : 'font-medium text-ink-2 hover:bg-rule/6 hover:text-ink',
  );

/**
 * The desktop rail: the wordmark, five destinations, the stack list and the
 * one progress figure. It is not a catalogue — the 53 topics live on /topics
 * — and it does not exist under `lg`, where the tab bar does its job.
 */
export default function Sidebar() {
  const { lang } = useLang();
  const t = useT(lang);
  const { data: topics = [] } = useTopics();
  const platform = usePrefs((s) => s.platform);
  const current = useCurrentStack();

  const scoped = useMemo(() => filterTopicsByPlatform(topics, platform), [topics, platform]);
  const total = scoped.reduce((s, tp) => s + (tp.question_count || 0), 0);
  const completed = scoped.reduce((s, tp) => s + (tp.completed_count || 0), 0);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-rule/8 bg-paper lg:flex">
      {/* Wordmark. Set in the grotesk — the name is the mark; the dot after
          it is the one pixel of stack colour on the top row. */}
      <div className="px-6 pb-3 pt-5">
        <NavLink to="/" className="inline-flex items-baseline rounded-sm" aria-label={t.goToHomepage}>
          <span className="font-display text-[20px] font-bold tracking-[-0.025em] text-ink">Onsite</span>
          <span className="ml-0.5 inline-block h-[7px] w-[7px] rounded-full bg-brand" aria-hidden />
        </NavLink>
      </div>

      <nav className="py-1" aria-label={t.cmdNavigation}>
        {RAIL_ROUTES.map((route) => (
          <NavLink key={route.path} to={route.path} end={route.end} className={({ isActive }) => navRowClass(isActive)}>
            {({ isActive }) => (
              <>
                <route.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-brand' : 'text-muted')} strokeWidth={isActive ? 2.25 : 1.9} aria-hidden />
                <span>{routeLabel(t, route)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* The stack. Always in view, one click to change, and the change is
          the whole app recolouring — no menu to open first. */}
      <div className="mt-3 flex-1 overflow-y-auto border-t border-rule/8 px-3 pt-4">
        <div className="mb-2 flex items-baseline justify-between px-2">
          <span className="eyebrow">{t.nav.stack}</span>
        </div>
        <StackRows variant="rail" source="rail" />
      </div>

      {/* The one figure: completed over total in the active stack. */}
      {total > 0 && (
        <NavLink to="/stats" className="block border-t border-rule/8 px-5 py-4 transition-colors hover:bg-rule/4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="eyebrow truncate">{t.nav.progress} · {current.label}</span>
            <span className="num shrink-0 text-[15px] text-brand">{pct}%</span>
          </div>
          <ProgressBar value={completed} max={total} tone="brand" size="sm" className="mt-2" label={t.nav.progress} />
          <div className="mt-1.5 text-[12px] text-muted-2">
            <span className="num">{completed}</span> / <span className="num">{total}</span> {t.questions}
          </div>
        </NavLink>
      )}
    </aside>
  );
}
