import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { useTopics } from '../lib/queries';
import { useScrollDirection } from '../lib/useScrollDirection';
import { tapLight } from '../lib/haptics';
import { cn } from '../lib/cn';
import { FOCUS_ROUTES, routeAt, routeLabel } from '../lib/routes';

/**
 * Native-style mobile header. Visible under the `lg` breakpoint, fixed to
 * the top so it can hide-on-scroll without leaving a 56px hole in the flex
 * column. Layout pads `<main>` to compensate via `.mobile-header-spacer`.
 *
 * Slot anatomy:
 *   [wordmark | back] ……………………… [page title] ……………………… [search | close]
 *
 * - Home → the wordmark sits in the leading slot; there is no drawer to open.
 * - Anywhere else → back arrow (history.back). Falls back to `/` when there
 *   is no prior entry (deep link / first visit).
 * - The right action is `Search` everywhere; on focus-flow routes (session,
 *   timed, follow-ups, login, signup) the X close swaps in instead.
 */
const slugToLabel = (slug: string): string =>
  slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

function usePageTitle(): string {
  const location = useLocation();
  const { lang } = useLang();
  const t = useT(lang);
  const { topicTitle } = useContent(lang);
  const { data: topics = [] } = useTopics();

  const path = location.pathname;
  const topicMatch = path.match(/^\/(?:topic|round)\/([^/]+)/);
  if (topicMatch) {
    const topic = topics.find((tp) => tp.slug === topicMatch[1]);
    if (topic) return topicTitle(topic);
    return slugToLabel(topicMatch[1]);
  }
  const route = routeAt(path);
  if (route) return routeLabel(t, route);
  if (path === '/admin')  return 'Admin';
  if (path === '/login')  return t.nav.signIn;
  if (path === '/signup') return lang === 'ru' ? 'Регистрация' : 'Sign up';
  if (path === '/reset')  return lang === 'ru' ? 'Восстановление' : 'Recovery';
  if (path === '/pricing') return lang === 'ru' ? 'Цены' : 'Pricing';
  if (path === '/contact') return lang === 'ru' ? 'Контакты' : 'Contact';
  return '';
}

const ACTION_CLASS =
  'touch-target tap-feedback inline-flex items-center justify-center rounded-lg text-ink-2 active:text-ink';

export default function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLang();
  const t = useT(lang);
  const setCommandOpen = usePrefs((s) => s.setCommandOpen);

  const title = usePageTitle();
  const isHome = location.pathname === '/';
  const isFocus = FOCUS_ROUTES.some((re) => re.test(location.pathname));

  // Track scroll direction on the main scroller so we can auto-hide the
  // bar. `mainEl` resolves after Layout mounts — the hook handles a null
  // target gracefully on the first render.
  const [mainEl, setMainEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const find = () => setMainEl(document.querySelector('main'));
    find();
    const id = requestAnimationFrame(find);
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);
  const { direction, atTop } = useScrollDirection(() => mainEl, { threshold: 6 });
  const hidden = direction === 'down' && !atTop;

  const onBack = () => {
    tapLight();
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };
  const onSearch = () => { tapLight(); setCommandOpen(true); };
  const onClose = () => { tapLight(); navigate('/'); };

  return (
    <header
      data-mobile-header
      className={cn(
        'fixed inset-x-0 top-0 z-40 lg:hidden',
        'border-b border-rule/8 bg-paper/95 backdrop-blur',
        'transition-transform duration-300 ease-out',
        'will-change-transform',
        hidden ? '-translate-y-full' : 'translate-y-0',
      )}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      aria-label={lang === 'ru' ? 'Заголовок' : 'Page header'}
    >
      <div className="relative flex h-14 items-center px-2">
        {/* Leading slot — the wordmark on home, back everywhere else. */}
        <div className="flex shrink-0 items-center">
          {isHome ? (
            <span className="pl-2 font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">Onsite</span>
          ) : (
            <button
              type="button"
              onClick={onBack}
              aria-label={lang === 'ru' ? 'Назад' : 'Back'}
              className={cn(ACTION_CLASS, 'ml-0.5')}
            >
              <ArrowLeft className="h-[22px] w-[22px]" aria-hidden />
            </button>
          )}
        </div>

        {/* Title — absolutely centred so it doesn't shift when actions
            change. Truncates beyond 60% width to keep edges clear. */}
        {!isHome && (
          <span className="pointer-events-none absolute left-1/2 top-1/2 max-w-[60%] -translate-x-1/2 -translate-y-1/2 truncate text-center font-display text-[15px] font-semibold leading-tight tracking-tight text-ink">
            {title}
          </span>
        )}

        {/* Trailing slot — search by default, X on focus-flow routes. */}
        <div className="ml-auto flex w-12 shrink-0 items-center justify-end">
          {isFocus ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'ru' ? 'Выйти' : 'Close'}
              className={cn(ACTION_CLASS, 'mr-0.5')}
            >
              <X className="h-[22px] w-[22px]" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSearch}
              aria-label={t.searchOpenHint}
              className={cn(ACTION_CLASS, 'mr-0.5')}
            >
              <Search className="h-[22px] w-[22px]" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
