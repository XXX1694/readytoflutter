import { useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Search, Sun, Moon, WifiOff } from 'lucide-react';
import { usePrefs } from '../store/prefs';
import { useLang, type Lang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { IconButton } from '../ui/index';
import { cn } from '../lib/cn';
import { track } from '../lib/analytics';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import AccountMenu from './AccountMenu';
import { PLATFORMS } from '../lib/platform';
import type { PlatformKey } from '../types/domain';

// `PLATFORMS` stores its i18n keys as plain strings — resolve them against the
// copy table without widening the table to `any`.
const copy = (t: UICopy, key: string): string => {
  const value = t[key as keyof UICopy];
  return typeof value === 'string' ? value : '';
};

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl';
const LANGS: Lang[] = ['en', 'ru'];

/**
 * The stack is identity: chosen once, shown once, changeable here from any
 * screen. This is the only stack control in the chrome; pages scope to it
 * instead of repeating the choice.
 */
function StackMenu({ t }: { t: UICopy }) {
  const platform = usePrefs((s) => s.platform);
  const setPlatform = usePrefs((s) => s.setPlatform);
  const current = PLATFORMS.find((p) => p.key === platform) || PLATFORMS[0];
  const choose = (value: string) => {
    const key = value as PlatformKey;
    if (key !== platform) track('stack_selected', { stack: key, source: 'header' });
    setPlatform(key);
  };
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`${t.nav.stack}: ${copy(t, current.labelKey)}`}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-rule/12 px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:border-rule/24 hover:text-ink"
        >
          {copy(t, current.labelKey)}
          <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-[200px] rounded-lg border border-rule/12 bg-paper-2 p-1 shadow-codex-lg">
          <DropdownMenu.Label className="px-2.5 pb-1 pt-1.5 text-[12px] font-medium text-muted">{t.nav.stack}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={platform} onValueChange={choose}>
            {PLATFORMS.map((p) => (
              <DropdownMenu.RadioItem
                key={p.key}
                value={p.key}
                className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-md px-2.5 py-2 text-[13.5px] text-ink outline-none data-[highlighted]:bg-rule/8"
              >
                {copy(t, p.labelKey)}
                <DropdownMenu.ItemIndicator>
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default function Header() {
  const { lang, setLang } = useLang();
  const t = useT(lang);
  const theme = usePrefs((s) => s.theme);
  const toggleTheme = usePrefs((s) => s.toggleTheme);
  const setCommandOpen = usePrefs((s) => s.setCommandOpen);
  const online = useOnlineStatus();

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
        // Desktop only. The compact mobile chrome is MobileHeader, which
        // hides on scroll without leaving a gap in the flex column.
        'sticky top-0 z-30 hidden shrink-0 items-center gap-2 border-b bg-paper/80 px-6 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-paper/60 lg:flex',
        'transition-colors duration-200',
        scrolled ? 'border-rule/12' : 'border-rule/8',
      )}
    >
      {/* Cmd+K trigger — looks like a search field but opens the palette */}
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-label={t.searchOpenHint}
        className="flex max-w-md flex-1 items-center gap-2.5 rounded-md border border-rule/12 px-3 py-2 text-left text-sm transition-colors hover:border-rule/24"
      >
        <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <span className="flex-1 truncate text-muted">{t.searchOpenHint}</span>
        <kbd className="flex items-center gap-0.5 rounded border border-rule/12 px-1.5 py-0.5 font-mono text-[11px] text-muted-2">
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

        <StackMenu t={t} />

        {/* Language — EN / RU. The current one is ink on a tinted chip, the
            same way the nav marks the page you are on. */}
        <div className="flex items-center">
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
