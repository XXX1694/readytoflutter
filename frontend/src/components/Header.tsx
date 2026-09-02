import { useEffect, useState } from 'react';
import { Search, Sun, Moon, ExternalLink, WifiOff } from 'lucide-react';
import { usePrefs } from '../store/prefs';
import { useLang, type Lang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { IconButton } from '../ui/index';
import { cn } from '../lib/cn';
import AccountMenu from './AccountMenu';
import { PLATFORMS } from '../lib/platform';

// Subscribes to navigator.onLine so the header can show a small offline
// badge when writes are going to localStorage instead of the server.
function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

// `PLATFORMS` stores its i18n keys as plain strings — resolve them against the
// copy table without widening the table to `any`.
const copy = (t: UICopy, key: string): string => {
  const value = t[key as keyof UICopy];
  return typeof value === 'string' ? value : '';
};

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl';
const LANGS: Lang[] = ['en', 'ru'];

export default function Header() {
  const { lang, setLang } = useLang();
  const t = useT(lang);
  const theme = usePrefs((s) => s.theme);
  const toggleTheme = usePrefs((s) => s.toggleTheme);
  const setCommandOpen = usePrefs((s) => s.setCommandOpen);
  const platform = usePrefs((s) => s.platform);
  const online = useOnlineStatus();
  const platformMeta = PLATFORMS.find((p) => p.key === platform) || PLATFORMS[0];
  const platformName = copy(t, platformMeta.labelKey);

  // The header gains a hairline once the page has scrolled — a border, not a
  // drop shadow, so the chrome stays flat (DESIGN.md rule 4).
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
        // The desktop header now lives only at `lg+`. The compact mobile
        // chrome is a separate component (MobileHeader) so it can hide on
        // scroll without leaving a gap in the flex column.
        'sticky top-0 z-30 hidden shrink-0 items-center gap-2 border-b bg-paper/80 px-3 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-paper/60 lg:flex sm:px-6',
        'transition-colors duration-200',
        scrolled ? 'border-rule/12' : 'border-rule/8',
      )}
    >
      {/* Active stack — always-visible context. Clicking opens the command
          palette where the Stack group lets you switch in one keystroke. */}
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-label={`${t.platformLabel}: ${platformName}`}
        title={`${t.platformLabel}: ${platformName}`}
        className="hidden h-9 shrink-0 items-center rounded-md border border-rule/12 px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:border-rule/24 hover:text-ink sm:inline-flex"
      >
        {platformName}
      </button>

      {/* Cmd+K trigger — looks like a search field but opens the palette */}
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-label={t.searchOpenHint}
        className="flex max-w-xl flex-1 items-center gap-2.5 rounded-md border border-rule/12 px-3 py-2 text-left text-sm transition-colors hover:border-rule/24"
      >
        <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <span className="flex-1 truncate text-muted">{t.searchOpenHint}</span>
        <kbd className="hidden items-center gap-0.5 rounded border border-rule/12 px-1.5 py-0.5 font-mono text-[11px] text-muted-2 sm:flex">
          {modKey}
          <span className="opacity-60">+</span>
          K
        </kbd>
      </button>

      <div className="flex items-center gap-1.5">
        {/* Offline notice — shown only when navigator reports we're offline.
            Writes still succeed (they fall back to localStorage), but this
            tells the user their progress isn't reaching the server. */}
        {!online && (
          <span
            role="status"
            aria-live="polite"
            title={t.offlineHint}
            className="hidden h-9 items-center gap-1.5 px-1.5 text-[12px] text-coral sm:inline-flex"
          >
            <WifiOff className="h-3.5 w-3.5" aria-hidden />
            {t.offline}
          </span>
        )}

        {/* Language — EN / RU. The current one is ink on a tinted chip, the
            same way the nav marks the page you are on. */}
        <div className="hidden items-center sm:flex">
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
                  'inline-flex h-9 items-center rounded-md px-1.5 text-[12px] font-semibold transition-colors',
                  active ? 'bg-rule/8 text-ink' : 'text-muted hover:text-ink',
                )}
              >
                <span>{code.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {/* Theme — toggles light ↔ dark. The icon shows the *current* mode;
            the title hints what comes next. */}
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

        {/* Docs link — retargets to the canonical reference for the active
            stack (Apple Docs on iOS, developer.android.com on Android, KMP
            guide on Cross-Platform). Falls back to flutter.dev for the
            All-stack default. Defined alongside PLATFORMS in lib/platform. */}
        <a
          href={platformMeta.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={platformMeta.docsLabel}
          className="hidden h-9 items-center gap-1 rounded-md px-2 text-[13px] text-muted transition-colors hover:text-ink md:inline-flex"
        >
          {platformMeta.docsLabel}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>

        {/* Account */}
        <AccountMenu />
      </div>
    </header>
  );
}
