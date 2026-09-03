import { useEffect, useState } from 'react';
import { Search, Sun, Moon, WifiOff } from 'lucide-react';
import { usePrefs } from '../store/prefs';
import { useLang, type Lang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { IconButton } from '../ui/index';
import { cn } from '../lib/cn';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import AccountMenu from './AccountMenu';

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl';
const LANGS: Lang[] = ['en', 'ru'];

/**
 * The desktop header: search, language, theme, account. The stack is not
 * here — it lives in the rail as a list you can see, since a choice that
 * recolours the whole app should not hide behind a menu.
 */
export default function Header() {
  const { lang, setLang } = useLang();
  const t = useT(lang);
  const theme = usePrefs((s) => s.theme);
  const toggleTheme = usePrefs((s) => s.toggleTheme);
  const setCommandOpen = usePrefs((s) => s.setCommandOpen);
  const online = useOnlineStatus();

  // The header gains a hairline once the page has scrolled — a border, not a
  // drop shadow, so the chrome stays flat.
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
        // Desktop only. The compact mobile chrome is MobileHeader, which
        // hides on scroll without leaving a gap in the flex column.
        'sticky top-0 z-30 hidden shrink-0 items-center gap-2 border-b bg-paper/80 px-6 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-paper/60 lg:flex',
        'transition-colors duration-200',
        scrolled ? 'border-rule/12' : 'border-transparent',
      )}
    >
      {/* Cmd+K trigger — looks like a search field but opens the palette */}
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-label={t.searchOpenHint}
        className="flex max-w-md flex-1 items-center gap-2.5 rounded-[10px] border border-rule/10 bg-paper-2 px-3 py-2 text-left text-sm shadow-codex-sm transition-colors hover:border-rule/24"
      >
        <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <span className="flex-1 truncate text-muted">{t.searchOpenHint}</span>
        <kbd className="flex items-center gap-0.5 rounded-md border border-rule/12 px-1.5 py-0.5 font-mono text-[11px] text-muted-2">
          {modKey}
          <span className="opacity-60">+</span>
          K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Offline notice — writes still succeed (they fall back to
            localStorage); this says they aren't reaching the server. */}
        {!online && (
          <span
            role="status"
            aria-live="polite"
            title={t.offlineHint}
            className="inline-flex h-9 items-center gap-1.5 px-1.5 text-[12px] text-coral"
          >
            <WifiOff className="h-3.5 w-3.5" aria-hidden />
            {t.offline}
          </span>
        )}

        {/* Language — EN / RU. The current one is a tinted chip, the same
            way the nav marks the page you are on. */}
        <div className="flex items-center rounded-full border border-rule/10 bg-paper-2 p-0.5 shadow-codex-sm">
          {LANGS.map((code) => {
            const active = lang === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => { if (!active) setLang(code); }}
                aria-pressed={active}
                aria-label={`${t.cmdSwitchLang} — ${code.toUpperCase()}`}
                className={cn(
                  'inline-flex h-7 items-center rounded-full px-2.5 text-[12px] font-semibold transition-colors',
                  active ? 'bg-brand text-on-brand' : 'text-muted hover:text-ink',
                )}
              >
                <span>{code.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {/* Theme — toggles light ↔ dark. The icon shows the *current* mode. */}
        <IconButton
          size="md"
          variant="ghost"
          label={
            theme === 'dark'
              ? (lang === 'ru' ? 'Тема: тёмная — переключить на светлую' : 'Theme: dark — switch to light')
              : (lang === 'ru' ? 'Тема: светлая — переключить на тёмную' : 'Theme: light — switch to dark')
          }
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </IconButton>

        <AccountMenu />
      </div>
    </header>
  );
}
