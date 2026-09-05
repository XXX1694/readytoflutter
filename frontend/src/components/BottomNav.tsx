import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useQuestions } from '../lib/queries';
import { getCardState, readAll } from '../lib/srs';
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
    const cards = readAll();
    return questions.some((q) => {
      const s = getCardState(q.id, cards);
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
 * control on the bar because it is the one action the product exists for —
 * a brand capsule with its own name inside, so it reads as a button among
 * destinations rather than a sixth place to go. The tab you are on is
 * marked the way the rail marks its row: a tint of the stack colour behind
 * the icon and the label set in it.
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
        // In flow under <main>, so nothing ever scrolls beneath it — plain
        // paper and a hairline are the whole surface.
        'sticky bottom-0 z-30 shrink-0 border-t border-rule/12 bg-paper',
        'pb-[env(safe-area-inset-bottom,0px)]',
      )}
      aria-label={lang === 'ru' ? 'Нижняя навигация' : 'Bottom navigation'}
    >
      {/* The capsule takes the width its name needs; the four destinations
          share the rest evenly. */}
      <ul className="grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center px-1">
        {TAB_ROUTES.map((route) => {
          const isStart = route.tab === 'start';
          const label = isStart ? t.nav.start : routeLabel(t, route);
          return (
            <li key={route.path} className="flex justify-center">
              <NavLink
                to={route.path}
                end={route.end}
                onClick={() => tapLight()}
                onPointerDown={() => prefetch(route.path)}
                onTouchStart={() => prefetch(route.path)}
                className={
                  isStart
                    ? 'relative mx-2 inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-[13px] font-semibold text-on-brand transition-transform active:scale-[0.96]'
                    : 'flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 pb-1 pt-1.5 text-[12px] leading-4 transition-opacity active:opacity-70'
                }
              >
                {({ isActive }) => (
                  isStart ? (
                    <>
                      <route.icon className="h-[18px] w-[18px]" aria-hidden />
                      {label}
                      {hasDue && (
                        <span
                          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-coral"
                          aria-label={lang === 'ru' ? 'Есть карточки на повторение' : 'Cards are due'}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <span
                        className={cn(
                          'inline-flex h-7 w-11 items-center justify-center rounded-full transition-colors',
                          isActive && 'bg-brand/10',
                        )}
                      >
                        <route.icon
                          className={cn('h-5 w-5', isActive ? 'text-brand' : 'text-muted')}
                          strokeWidth={isActive ? 2.25 : 1.9}
                          aria-hidden
                        />
                      </span>
                      <span className={isActive ? 'font-semibold text-brand' : 'font-medium text-muted'}>
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
