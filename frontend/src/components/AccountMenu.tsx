import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../store/auth';
import { apiBaseUrl } from '../api/api';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import AccountTrigger from './AccountTrigger';

// The menu itself (and with it the whole Radix chunk) loads on the first
// hover, focus or tap of the avatar — never for anonymous visitors.
const AccountDropdown = lazy(() => import('./AccountDropdown'));

export default function AccountMenu() {
  const { lang } = useLang();
  const isRu = lang === 'ru';
  const t = useT(lang);

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const backendAvailable = useAuth((s) => s.backendAvailable);
  const probeBackend = useAuth((s) => s.probeBackend);

  // `wanted` flips once and requests the chunk; `open` is the menu state,
  // handed to the dropdown once it has loaded so a tap that arrived before
  // the chunk still opens the menu.
  const [wanted, setWanted] = useState(false);
  const [open, setOpen] = useState(false);

  // Probe once on mount so we know whether to show the auth UI at all.
  useEffect(() => {
    if (backendAvailable === null) probeBackend(apiBaseUrl);
  }, [backendAvailable, probeBackend]);

  // Backend unreachable (e.g. GitHub Pages without a server) — hide the menu
  // entirely. The local-only experience is the same as before.
  if (backendAvailable === false) return null;

  // Probing — render a placeholder of the same dimensions to avoid layout
  // jumps when the probe resolves.
  if (backendAvailable === null) {
    return <div className="h-9 w-9 rounded-lg border border-rule/10" aria-hidden />;
  }

  // Logged out
  if (!token) {
    return (
      <Link
        to="/login"
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rule/12 px-3 text-[13px] font-medium text-ink transition-colors hover:border-rule/24"
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden />
        {t.nav.signIn}
      </Link>
    );
  }

  const warm = () => setWanted(true);
  const standIn = (
    <AccountTrigger
      user={user}
      aria-label={isRu ? 'Меню аккаунта' : 'Account menu'}
      aria-haspopup="menu"
      onPointerEnter={warm}
      onFocus={warm}
      onClick={() => { setWanted(true); setOpen(true); }}
    />
  );
  if (!wanted) return standIn;

  return (
    <Suspense fallback={standIn}>
      <AccountDropdown open={open} onOpenChange={setOpen} />
    </Suspense>
  );
}
