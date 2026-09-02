import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Brain, Library, Bookmark, User, type LucideIcon } from 'lucide-react';
import { useAuth } from '../store/auth';
import { useLang } from '../i18n/LangContext';
import { useQuestions } from '../lib/queries';
import { getCardState } from '../lib/srs';
import { tapLight } from '../lib/haptics';
import { prefetch } from '../lib/prefetch';
import { cn } from '../lib/cn';

// Routes where the bar would clash with the running UI.
const HIDE_PATTERNS = [
  /^\/study(\/|$)/,
  /^\/mock(\/|$)/,
  /^\/round(\/|$)/,
  /^\/login(\/|$)/,
  /^\/signup(\/|$)/,
  /\/print$/,
  /\/cheatsheet$/,
];

interface TabItem {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

// Written out rather than interpolated so Tailwind's scanner keeps the
// classes. Three tabs happens on a ≤360px screen with no backend — the old
// `length === 5 ? 5 : 4` left an empty column there.
const COLS: Record<number, string> = {
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

// Reactive narrow-screen check — `window.innerWidth` once at render time
// would freeze when the user rotates from landscape to portrait. matchMedia
// fires whenever the breakpoint flips. Returns `false` until mounted so SSR
// / hydration stay deterministic.
function useNarrow(maxWidth = 360): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const handler = () => setNarrow(mql.matches);
    handler();
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, [maxWidth]);
  return narrow;
}

// Counts questions whose SRS card is overdue. Used for the Study tab badge so
// the user sees "the queue grew while I was away" without opening the page.
function useDueCount(): number {
  const { data: questions = [] } = useQuestions();
  return useMemo(() => {
    // "Due" is a function of wall-clock time, so reading the clock while
    // deriving the badge is the intent, not an accident.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    let n = 0;
    for (const q of questions) {
      const s = getCardState(q.id);
      if (s.reps > 0 && s.dueAt <= now) n++;
    }
    return n;
  }, [questions]);
}

/**
 * Mobile bottom navigation — visible under the `lg` breakpoint, hidden on
 * full-screen flows where the bar would compete for attention (Study card,
 * Mock interview, Round, the auth pages, the print/cheatsheet routes).
 *
 * The active tab is marked the same way the Sidebar marks its rows: ink icon
 * and a semibold ink label. One device, three components. Haptic feedback
 * fires on tap (Android-only on real devices; it
 * no-ops on iOS Safari, which blocks `navigator.vibrate`).
 */
export default function BottomNav() {
  const { lang } = useLang();
  const isRu = lang === 'ru';
  const location = useLocation();
  const path = location.pathname;

  const token = useAuth((s) => s.token);
  const backendAvailable = useAuth((s) => s.backendAvailable);

  // Hide the bar when a text input/textarea is focused — on iOS the virtual
  // keyboard pushes the bar up over the input, defeating its purpose. We
  // listen at the document level so any focused field anywhere collapses
  // the bar. Hook is declared before any conditional return to keep
  // hooks-order stable.
  const [inputFocused, setInputFocused] = useState(false);
  useEffect(() => {
    const isField = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || el.isContentEditable;
    };
    // Track the element that *has* focus rather than pairing up field-only
    // focusin/focusout events: when a focused field is unmounted (closing the
    // command palette, say) the browser fires no focusout for it, so the old
    // pairing left the bar hidden until the next field was focused and blurred.
    const onFocusIn = (e: FocusEvent) => setInputFocused(isField(e.target));
    const onFocusOut = () => setInputFocused(false);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  const isNarrow = useNarrow(360);
  const dueCount = useDueCount();

  if (HIDE_PATTERNS.some((re) => re.test(path))) return null;
  if (inputFocused) return null;

  const accountTo = token ? '/settings' : '/login';
  const items: TabItem[] = [
    { to: '/', end: true, icon: HomeIcon, label: isRu ? 'Главная' : 'Home' },
    { to: '/study', icon: Brain, label: isRu ? 'Учить' : 'Study', badge: dueCount },
    ...(isNarrow ? [] : [{ to: '/knowledge', icon: Library, label: isRu ? 'Знания' : 'Learn' }]),
    { to: '/bookmarks', icon: Bookmark, label: isRu ? 'Закладки' : 'Saved' },
    ...(backendAvailable === false
      ? []
      : [{ to: accountTo, icon: User, label: isRu ? 'Я' : 'Me' }]),
  ];

  const cols = COLS[items.length] ?? 'grid-cols-4';

  return (
    <nav
      className={cn(
        'lg:hidden',
        'sticky bottom-0 z-30 shrink-0 border-t border-rule/12 bg-paper/95 backdrop-blur',
        'pb-[env(safe-area-inset-bottom,0px)]',
      )}
      aria-label={isRu ? 'Нижняя навигация' : 'Bottom navigation'}
    >
      <ul className={cn('grid', cols)}>
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              end={it.end}
              onClick={() => tapLight()}
              onPointerDown={() => prefetch(it.to)}
              onTouchStart={() => prefetch(it.to)}
              className="flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[11px]"
            >
              {({ isActive }) => (
                <>
                  <span className="relative inline-flex items-center justify-center">
                    <it.icon
                      className={cn('h-[19px] w-[19px]', isActive ? 'text-ink' : 'text-muted')}
                      aria-hidden
                    />
                    {/* Due-count badge — top-right corner of the icon.
                        Capped at 9+ so the tab keeps a tidy width. */}
                    {(it.badge ?? 0) > 0 && (
                      <span
                        className="absolute -right-2.5 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-coral px-1 text-[9px] font-semibold leading-none text-paper"
                        aria-label={isRu ? `${it.badge} к повторению` : `${it.badge} due`}
                      >
                        {(it.badge ?? 0) > 9 ? '9+' : it.badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'leading-[1.4]',
                      isActive ? 'font-semibold text-ink' : 'text-muted',
                    )}
                  >
                    {it.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
