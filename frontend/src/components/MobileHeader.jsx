import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, ArrowLeft, Search, X } from 'lucide-react';
import { usePrefs } from '../store/prefs.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { useTopics } from '../lib/queries.js';
import { useScrollDirection } from '../lib/useScrollDirection.js';
import { tapLight } from '../lib/haptics.js';
import { cn } from '../lib/cn.js';

/**
 * Native-style mobile header. Visible under the `lg` breakpoint, fixed to
 * the top so it can hide-on-scroll without leaving a 56px hole in the flex
 * column. Layout pads `<main>` to compensate via `.mobile-header-spacer`.
 *
 * Slot anatomy:
 *   [back / menu] ………………………………… [page title] ………………………………… [primary action]
 *
 * - Home → menu (opens sidebar drawer).
 * - Anywhere else → back arrow (history.back). Falls back to `/` when there
 *   is no prior entry (deep link / first visit).
 * - The right action is `Search` everywhere; on focus-flow routes (Study /
 *   Mock / Round / login / signup) the X close swaps in instead.
 */
const FOCUS_ROUTES = [/^\/study(\/|$)/, /^\/mock(\/|$)/, /^\/round(\/|$)/, /^\/login(\/|$)/, /^\/signup(\/|$)/];

const slugToLabel = (slug) =>
  slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

function usePageTitle() {
  const location = useLocation();
  const { lang } = useLang();
  const { topicTitle } = useContent(lang);
  const { data: topics = [] } = useTopics();

  const path = location.pathname;
  const topicMatch = path.match(/^\/(?:topic|round)\/([^/]+)/);
  if (topicMatch) {
    const topic = topics.find((tp) => tp.slug === topicMatch[1]);
    if (topic) return topicTitle(topic);
    return slugToLabel(topicMatch[1]);
  }
  if (path === '/' || path === '') return 'prepiroshi';
  if (path === '/study')     return lang === 'ru' ? 'Повторение' : 'Study';
  if (path === '/mock')      return lang === 'ru' ? 'Mock-собес' : 'Mock';
  if (path === '/search')    return lang === 'ru' ? 'Поиск' : 'Search';
  if (path === '/knowledge') return lang === 'ru' ? 'База знаний' : 'Knowledge';
  if (path === '/bookmarks') return lang === 'ru' ? 'Закладки' : 'Saved';
  if (path === '/stats')     return lang === 'ru' ? 'Статистика' : 'Mastery';
  if (path === '/settings')  return lang === 'ru' ? 'Настройки' : 'Settings';
  if (path === '/admin')     return 'Admin';
  if (path === '/login')     return lang === 'ru' ? 'Войти' : 'Sign in';
  if (path === '/signup')    return lang === 'ru' ? 'Регистрация' : 'Sign up';
  return '';
}

export default function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLang();
  const t = useT(lang);
  const toggleSidebar = usePrefs((s) => s.toggleSidebar);
  const setCommandOpen = usePrefs((s) => s.setCommandOpen);

  const title = usePageTitle();
  const isHome = location.pathname === '/';
  const isFocus = FOCUS_ROUTES.some((re) => re.test(location.pathname));

  // Track scroll direction on the main scroller so we can auto-hide the
  // bar like Twitter/Instagram. `mainEl` resolves after Layout mounts —
  // the hook handles a null target gracefully on the first render.
  const [mainEl, setMainEl] = useState(null);
  useEffect(() => {
    const find = () => setMainEl(document.querySelector('main'));
    find();
    // The main element is created once, but routing remounts may swap it.
    // Re-run after a frame to catch any deferred mounts.
    const id = requestAnimationFrame(find);
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);
  const { direction, atTop } = useScrollDirection(() => mainEl, { threshold: 6 });
  const hidden = direction === 'down' && !atTop;

  const onMenu = () => { tapLight(); toggleSidebar(); };
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
        'glass border-b border-rule/8',
        'transition-transform duration-300 ease-out',
        'will-change-transform',
        hidden ? '-translate-y-full' : 'translate-y-0',
      )}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      aria-label={lang === 'ru' ? 'Заголовок' : 'Page header'}
    >
      <div className="relative flex h-14 items-center px-2">
        {/* Leading slot — menu on home, back arrow elsewhere. The button
            wrapper is 48×48 so even tapping near the edge stays inside the
            target. */}
        <div className="flex w-12 shrink-0 items-center">
          {isHome ? (
            <button
              type="button"
              onClick={onMenu}
              aria-label={t.openMenu}
              className="touch-target tap-feedback ml-0.5 inline-flex items-center justify-center rounded-xl text-ink-2 active:text-ink"
            >
              <Menu className="h-[22px] w-[22px]" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={onBack}
              aria-label={lang === 'ru' ? 'Назад' : 'Back'}
              className="touch-target tap-feedback ml-0.5 inline-flex items-center justify-center rounded-xl text-ink-2 active:text-ink"
            >
              <ArrowLeft className="h-[22px] w-[22px]" aria-hidden />
            </button>
          )}
        </div>

        {/* Title — absolutely centered so it doesn't shift when actions
            change. Truncates beyond 60% width to keep edges clear. */}
        <h1
          className="pointer-events-none absolute left-1/2 top-1/2 max-w-[64%] -translate-x-1/2 -translate-y-1/2 truncate text-center font-display text-[15px] font-semibold leading-tight tracking-tight text-ink"
          aria-live="polite"
        >
          {title}
        </h1>

        {/* Trailing slot — search by default, X on focus-flow routes. */}
        <div className="ml-auto flex w-12 shrink-0 items-center justify-end">
          {isFocus ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'ru' ? 'Выйти' : 'Close'}
              className="touch-target tap-feedback mr-0.5 inline-flex items-center justify-center rounded-xl text-ink-2 active:text-ink"
            >
              <X className="h-[22px] w-[22px]" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSearch}
              aria-label={t.searchOpenHint}
              className="touch-target tap-feedback mr-0.5 inline-flex items-center justify-center rounded-xl text-ink-2 active:text-ink"
            >
              <Search className="h-[22px] w-[22px]" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
