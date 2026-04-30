import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Brain, Library, Bookmark, User } from 'lucide-react';
import { useAuth } from '../store/auth.js';
import { useLang } from '../i18n/LangContext.jsx';
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

/**
 * Mobile bottom navigation — visible under the `lg` breakpoint, hidden on
 * full-screen flows where the bar would compete for attention (Study card,
 * Mock interview, Round, the auth pages, the print/cheatsheet routes).
 *
 * The Account tab is conditional — it links to /settings when signed in,
 * /login otherwise. When the backend is unreachable the menu is suppressed
 * entirely (matches AccountMenu's behaviour).
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

  // Five-slot layout: Home · Study · Knowledge · Saved · Account.
  // On very narrow phones (<360px) we drop "Knowledge" to keep tap targets
  // at a comfortable size — Knowledge is still reachable via the sidebar
  // and command palette. Reactive so rotating the device works.
  const isNarrow = useNarrow(360);

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
    { to: '/study', icon: Brain, label: isRu ? 'Учить' : 'Study' },
    !isNarrow && { to: '/knowledge', icon: Library, label: isRu ? 'Знания' : 'Learn' },
    { to: '/bookmarks', icon: Bookmark, label: isRu ? 'Закладки' : 'Saved' },
    showAccount && { to: accountTo, icon: User, label: isRu ? 'Я' : 'Me' },
  ].filter(Boolean);

  const cols = items.length === 5 ? 'grid-cols-5' : 'grid-cols-4';

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
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  // Min-height 56px gives a comfy hit area for the whole tab,
                  // not just the icon pill — important since the label sits
                  // under the icon and users tap the whole stack.
                  'flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 transition-colors',
                  // Was text-[10px] which renders ~8px on narrow phones —
                  // below readable threshold for low-vision users.
                  'font-mono text-[11px] uppercase tracking-wider',
                  isActive
                    ? 'text-ink'
                    : 'text-muted hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'inline-flex h-8 w-11 items-center justify-center rounded-md border transition-all duration-200',
                      isActive
                        ? 'border-ink bg-ink text-paper shadow-codex-sm'
                        : 'border-transparent',
                    )}
                  >
                    <it.icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <span className="leading-none">{it.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
