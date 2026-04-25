import { NavLink, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Brain, Search, User } from 'lucide-react';
import { useAuth } from '../store/auth.js';
import { useLang } from '../i18n/LangContext.jsx';
import { cn } from '../lib/cn.js';

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

  const accountTo = token ? '/settings' : '/login';
  const showAccount = backendAvailable !== false;

  const items = [
    { to: '/', end: true, icon: HomeIcon, label: isRu ? 'Главная' : 'Home' },
    { to: '/bookmarks', icon: Brain, label: isRu ? 'Закладки' : 'Saved' },
    { to: '/search', icon: Search, label: isRu ? 'Поиск' : 'Search' },
    showAccount && { to: accountTo, icon: User, label: isRu ? 'Профиль' : 'Account' },
  ].filter(Boolean);

  return (
    <nav
      className={cn(
        'lg:hidden',
        'sticky bottom-0 z-30 shrink-0 border-t-1.5 border-ink bg-paper/95 backdrop-blur',
        'pb-[env(safe-area-inset-bottom,0px)]',
      )}
      aria-label={isRu ? 'Нижняя навигация' : 'Bottom navigation'}
    >
      <ul className="grid grid-cols-4">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors',
                  'font-mono text-[9px] uppercase tracking-wider',
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
                      'inline-flex h-8 w-12 items-center justify-center rounded-md border-1.5 transition-colors',
                      isActive
                        ? 'border-ink bg-ink text-paper'
                        : 'border-transparent',
                    )}
                  >
                    <it.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span>{it.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
