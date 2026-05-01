import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home as HomeIcon, Brain, Library, Bookmark, User } from 'lucide-react';
import { useAuth } from '../store/auth.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useQuestions } from '../lib/queries.js';
import { getCardState } from '../lib/srs.js';
import { tapLight } from '../lib/haptics.js';
import { prefetch } from '../lib/prefetch.js';
import { cn } from '../lib/cn.js';

// Reactive narrow-screen check — `window.innerWidth` once at render time
// would freeze when the user rotates from landscape to portrait. matchMedia
// fires whenever the breakpoint flips. Returns `false` until mounted so SSR
// / hydration stay deterministic.
function useNarrow(maxWidth = 360) {
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
function useDueCount() {
  const { data: questions = [] } = useQuestions();
  return useMemo(() => {
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
 * The active tab is marked with a sliding pill driven by framer-motion's
 * shared layout — the pill animates between tabs on click instead of cutting.
 * Haptic feedback fires on tap (Android-only on real devices; no-ops on iOS
 * Safari which blocks `navigator.vibrate`).
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
    const isField = (el) => {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || el.isContentEditable;
    };
    const onFocusIn = (e) => { if (isField(e.target)) setInputFocused(true); };
    const onFocusOut = (e) => { if (isField(e.target)) setInputFocused(false); };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  const isNarrow = useNarrow(360);
  const dueCount = useDueCount();

  // Hide on routes where the bar would clash with the running UI
  const HIDE_PATTERNS = [
    /^\/study(\/|$)/,
    /^\/mock(\/|$)/,
    /^\/round(\/|$)/,
    /^\/login(\/|$)/,
    /^\/signup(\/|$)/,
    /\/print$/,
    /\/cheatsheet$/,
  ];
  if (HIDE_PATTERNS.some((re) => re.test(path))) return null;
  if (inputFocused) return null;

  const accountTo = token ? '/settings' : '/login';
  const showAccount = backendAvailable !== false;
  const items = [
    { to: '/', end: true, icon: HomeIcon, label: isRu ? 'Главная' : 'Home' },
    { to: '/study', icon: Brain, label: isRu ? 'Учить' : 'Study', badge: dueCount },
    !isNarrow && { to: '/knowledge', icon: Library, label: isRu ? 'Знания' : 'Learn' },
    { to: '/bookmarks', icon: Bookmark, label: isRu ? 'Закладки' : 'Saved' },
    showAccount && { to: accountTo, icon: User, label: isRu ? 'Я' : 'Me' },
  ].filter(Boolean);

  const cols = items.length === 5 ? 'grid-cols-5' : 'grid-cols-4';

  // Determine which tab matches the current path so framer can place the
  // pill. End-matched routes (Home) need exact equality; others match by
  // prefix so /topic/* still highlights nothing (none of the tabs match).
  const activeIndex = items.findIndex((it) => {
    if (it.end) return path === it.to;
    return path === it.to || path.startsWith(it.to + '/');
  });

  return (
    <nav
      className={cn(
        'lg:hidden',
        'sticky bottom-0 z-30 shrink-0 border-t border-rule/15 bg-paper/95 backdrop-blur',
        'pb-[env(safe-area-inset-bottom,0px)]',
      )}
      aria-label={isRu ? 'Нижняя навигация' : 'Bottom navigation'}
    >
      <ul className={cn('grid', cols)}>
        {items.map((it, idx) => {
          const isActive = idx === activeIndex;
          return (
            <li key={it.to}>
              <NavLink
                to={it.to}
                end={it.end}
                onClick={() => tapLight()}
                onPointerDown={() => prefetch(it.to)}
                onTouchStart={() => prefetch(it.to)}
                className="relative flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 font-mono text-[11px] uppercase tracking-wider text-muted transition-colors aria-[current=page]:text-ink"
              >
                {/* Sliding active pill — shared layoutId so framer animates
                    the indicator across taps. Behind icon (z-0). */}
                <span className="relative inline-flex h-8 w-11 items-center justify-center">
                  {isActive && (
                    <motion.span
                      layoutId="bn-active-pill"
                      className="absolute inset-0 rounded-md bg-ink shadow-[0_2px_8px_-2px_rgb(var(--shadow)/0.30)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <it.icon
                    className={cn(
                      'relative h-[18px] w-[18px] transition-colors',
                      isActive ? 'text-paper' : 'text-muted',
                    )}
                    aria-hidden
                  />
                  {/* Due-count badge — top-right corner of the icon pill.
                      Capped at 9+ so the pill keeps a tidy width. */}
                  {it.badge > 0 && (
                    <span
                      className={cn(
                        'absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1',
                        'bg-coral text-[9px] font-semibold leading-none text-white shadow-[0_1px_3px_0_rgb(var(--shadow)/0.30)]',
                      )}
                      aria-label={isRu ? `${it.badge} к повторению` : `${it.badge} due`}
                    >
                      {it.badge > 9 ? '9+' : it.badge}
                    </span>
                  )}
                </span>
                <span className={cn('leading-none transition-colors', isActive ? 'text-ink' : 'text-muted')}>
                  {it.label}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
