import { useNavigate } from 'react-router-dom';
import { Menu, Search, Sun, Moon, ExternalLink } from 'lucide-react';
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

  return (
    <header className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b-1.5 border-ink bg-paper/80 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-paper/60 sm:px-6">
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

      {/* Cmd+K trigger — looks like a search input but opens the palette */}
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-label={t.searchOpenHint}
        className="group flex flex-1 max-w-xl items-center gap-2.5 rounded-md border-1.5 border-ink bg-paper-2 px-3 py-2 text-left text-sm shadow-codex-sm transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-codex active:translate-x-px active:translate-y-px active:shadow-none"
      >
        <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <span className="flex-1 truncate text-muted">{t.searchOpenHint}</span>
        <kbd className="hidden items-center gap-0.5 rounded border border-rule-strong px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted sm:flex">
          {modKey}
          <span className="text-[8px]">+</span>
          K
        </kbd>
      </button>

      <div className="flex items-center gap-1.5">
        {/* Language — segmented EN / RU control */}
        <div className="hidden h-9 items-center rounded-md border-1.5 border-rule-strong bg-paper-2 p-0.5 font-mono text-[11px] uppercase shadow-codex-sm sm:inline-flex">
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
                  'inline-flex h-7 items-center rounded-sm px-2 transition-colors',
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

        {/* Theme */}
        <IconButton
          size="md"
          variant="outline"
          label={t.toggleTheme}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
