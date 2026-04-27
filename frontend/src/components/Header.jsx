import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Sun, Moon, Coffee, ExternalLink } from 'lucide-react';
import { usePrefs } from '../store/prefs.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { IconButton } from '../ui/index.js';
import { cn } from '../lib/cn.js';
import AccountMenu from './AccountMenu.jsx';

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl';

export default function Header() {
  const navigate = useNavigate();
  const { lang, setLang } = useLang();
  const t = useT(lang);
  const theme = usePrefs((s) => s.theme);
  const toggleTheme = usePrefs((s) => s.toggleTheme);
  const toggleSidebar = usePrefs((s) => s.toggleSidebar);
  const setCommandOpen = usePrefs((s) => s.setCommandOpen);

  // Subtle scroll-shadow on the header — gives the page a sense of depth
  // when the user starts scrolling the main content.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const onScroll = () => setScrolled(main.scrollTop > 8);
    onScroll();
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b bg-paper/80 px-3 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-paper/60 sm:px-6',
        'transition-shadow duration-300',
        scrolled
          ? 'border-rule/12 shadow-[0_4px_16px_-8px_rgb(var(--shadow)/0.10)]'
          : 'border-rule/8 shadow-none',
      )}
    >
      {/* Mobile menu */}
      <IconButton
        size="md"
        variant="ghost"
        label={t.openMenu}
        className="lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </IconButton>

      {/* Cmd+K trigger — looks like a modern search input but opens the palette */}
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-label={t.searchOpenHint}
        className="group flex flex-1 max-w-xl items-center gap-2.5 rounded-xl border border-rule/12 bg-paper-2/60 px-3 py-2 text-left text-sm transition-all hover:border-rule/25 hover:bg-paper-2 focus-visible:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
      >
        <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <span className="flex-1 truncate text-muted">{t.searchOpenHint}</span>
        <kbd className="hidden items-center gap-0.5 rounded-md border border-rule/15 bg-paper-2 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-2 sm:flex">
          {modKey}
          <span className="text-[8px] opacity-60">+</span>
          K
        </kbd>
      </button>

      <div className="flex items-center gap-1.5">
        {/* Language — segmented EN / RU control */}
        <div className="hidden h-9 items-center rounded-xl border border-rule/12 bg-paper-2/60 p-0.5 font-mono text-[11px] uppercase sm:inline-flex">
          {(['en', 'ru']).map((code) => {
            const active = lang === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => lang !== code && setLang(code)}
                aria-pressed={active}
                aria-label={`${t.cmdSwitchLang} — ${code.toUpperCase()}`}
                className={cn(
                  'inline-flex h-7 items-center rounded-lg px-2 transition-all duration-200',
                  active
                    ? 'bg-ink text-paper'
                    : 'text-muted hover:text-ink',
                )}
              >
                {code.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Theme — cycles light → sepia → dark → light. The icon shows the
            *current* mode; the title hints what comes next. */}
        <IconButton
          size="md"
          variant="outline"
          label={
            theme === 'dark'
              ? (lang === 'ru' ? 'Тема: тёмная — переключить на светлую' : 'Theme: dark — switch to light')
              : theme === 'sepia'
                ? (lang === 'ru' ? 'Тема: сепия — переключить на тёмную' : 'Theme: sepia — switch to dark')
                : (lang === 'ru' ? 'Тема: светлая — переключить на сепию' : 'Theme: light — switch to sepia')
          }
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Moon className="h-4 w-4" />
            : theme === 'sepia' ? <Coffee className="h-4 w-4" />
              : <Sun className="h-4 w-4" />}
        </IconButton>

        {/* Docs link */}
        <a
          href="https://flutter.dev/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden h-9 items-center gap-1 rounded-md px-2 font-mono text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-ink md:inline-flex"
        >
          {t.docs}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>

        {/* Account */}
        <AccountMenu />
      </div>
    </header>
  );
}
