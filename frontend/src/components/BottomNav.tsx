import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useQuestions } from '../lib/queries';
import { getCardState } from '../lib/srs';
import { tapLight } from '../lib/haptics';
import { prefetch } from '../lib/prefetch';
import { cn } from '../lib/cn';
import { HIDE_BOTTOM_NAV, TAB_ROUTES, routeLabel } from '../lib/routes';

// Counts questions whose SRS card is overdue. The Start action carries a
// dot when the queue is non-empty, so "the queue grew while I was away"
// is visible without a number that manufactures urgency.
function useHasDue(): boolean {
  const { data: questions = [] } = useQuestions();
  return useMemo(() => {
    // "Due" is a function of wall-clock time, so reading the clock while
    // deriving the badge is the intent, not an accident.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    return questions.some((q) => {
      const s = getCardState(q.id);
      return s.reps > 0 && s.dueAt <= now;
    });
  }, [questions]);
}

/**
 * Mobile tab bar — visible under the `lg` breakpoint, hidden on full-screen
 * flows where it would compete for attention (session, timed, follow-ups,
 * the auth pages, the print/cheatsheet routes).
 *
 * Five slots: Today · Roadmap · Start · Topics · Me. Start is the one filled
 * control on the bar because it is the one action the product exists for.
 * The active tab is marked the way the rail marks its rows: ink icon and a
 * semibold ink label.
 */
export default function BottomNav() {
  const { lang } = useLang();
  const t = useT(lang);
  const location = useLocation();
  const path = location.pathname;

  // Hide the bar when a text input/textarea is focused — on iOS the virtual
  // keyboard pushes the bar up over the input, defeating its purpose.
  const [inputFocused, setInputFocused] = useState(false);
  useEffect(() => {
    const isField = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || el.isContentEditable;
    };
    const onFocusIn = (e: FocusEvent) => setInputFocused(isField(e.target));
    const onFocusOut = () => setInputFocused(false);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  const hasDue = useHasDue();

  if (HIDE_BOTTOM_NAV.some((re) => re.test(path))) return null;
  if (inputFocused) return null;

  return (
    <nav
      className={cn(
        'lg:hidden',
        'sticky bottom-0 z-30 shrink-0 border-t border-rule/12 bg-paper/95 backdrop-blur',
        'pb-[env(safe-area-inset-bottom,0px)]',
      )}
      aria-label={lang === 'ru' ? 'Нижняя навигация' : 'Bottom navigation'}
    >
      <ul className="grid grid-cols-5">
        {TAB_ROUTES.map((route) => {
          const label = route.tab === 'start' ? t.nav.start : routeLabel(t, route);
          return (
            <li key={route.path}>
              <NavLink
                to={route.path}
                end={route.end}
                onClick={() => tapLight()}
                onPointerDown={() => prefetch(route.path)}
                onTouchStart={() => prefetch(route.path)}
                className="flex min-h-[56px] flex-col items-center justify-center gap-1 py-1.5 text-[11px]"
              >
                {({ isActive }) => (
                  route.tab === 'start' ? (
                    <>
                      <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink text-paper">
                        <route.icon className="h-[19px] w-[19px]" aria-hidden />
                        {hasDue && (
                          <span
                            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-brand"
                            aria-label={lang === 'ru' ? 'Есть карточки на повторение' : 'Cards are due'}
                          />
                        )}
                      </span>
                      <span className="font-semibold leading-[1.4] text-ink">{label}</span>
                    </>
                  ) : (
                    <>
                      <route.icon
                        className={cn('h-[19px] w-[19px]', isActive ? 'text-ink' : 'text-muted')}
                        aria-hidden
                      />
                      <span className={cn('leading-[1.4]', isActive ? 'font-semibold text-ink' : 'text-muted')}>
                        {label}
                      </span>
                    </>
                  )
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
