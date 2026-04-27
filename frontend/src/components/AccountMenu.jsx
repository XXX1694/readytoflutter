import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, UserPlus, Cloud, Trash2, Shield, ChevronDown, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../store/auth.js';
import {
  authLogout, authDeleteAccount, bulkSyncProgress,
  readLocalProgress, clearLocalProgress, apiBaseUrl,
} from '../api/api.js';
import { useLang } from '../i18n/LangContext.jsx';
import { cn } from '../lib/cn.js';

const initialsOf = (user) => {
  const source = user?.name?.trim() || user?.email || '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (source.includes('@')) return source[0].toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

export default function AccountMenu() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const isRu = lang === 'ru';

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const backendAvailable = useAuth((s) => s.backendAvailable);
  const probeBackend = useAuth((s) => s.probeBackend);
  const clearSession = useAuth((s) => s.clearSession);
  const markSynced = useAuth((s) => s.markSynced);
  const lastSyncAt = useAuth((s) => s.lastSyncAt);
  const qc = useQueryClient();

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
    return <div className="h-9 w-9 rounded-xl border border-rule/10 bg-paper-2/40" aria-hidden />;
  }

  // Logged out
  if (!token) {
    return (
      <Link
        to="/login"
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rule/12 bg-paper-2/60 px-3 font-mono text-[11px] uppercase tracking-wider text-ink transition-all hover:border-rule/25 hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden />
        {isRu ? 'Войти' : 'Sign in'}
      </Link>
    );
  }

  const handleLogout = async () => {
    try { await authLogout(); } catch { /* ignore */ }
    clearSession();
    qc.invalidateQueries();
    toast.success(isRu ? 'Вышел из аккаунта' : 'Signed out');
    navigate('/');
  };

  const handleSync = async () => {
    const local = readLocalProgress();
    const items = Object.entries(local).map(([k, v]) => ({
      questionId: Number(k),
      status: v?.status,
      notes: v?.notes || null,
      updated_at: v?.updated_at || new Date().toISOString(),
    })).filter((p) => p.questionId && p.status);

    if (items.length === 0) {
      toast.info(isRu ? 'Локального прогресса нет' : 'No local progress to import');
      return;
    }
    try {
      const r = await bulkSyncProgress(items);
      clearLocalProgress();
      markSynced();
      qc.invalidateQueries();
      toast.success(isRu ? `Импортировано ${r.imported}` : `Imported ${r.imported}`);
    } catch {
      toast.error(isRu ? 'Не удалось синхронизировать' : 'Sync failed');
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm(isRu
      ? 'Удалить аккаунт навсегда? Прогресс будет стёрт. Действие нельзя отменить.'
      : 'Delete your account permanently? Progress will be erased. This cannot be undone.');
    if (!confirm) return;
    try {
      await authDeleteAccount();
      clearSession();
      qc.invalidateQueries();
      toast.success(isRu ? 'Аккаунт удалён' : 'Account deleted');
      navigate('/');
    } catch {
      toast.error(isRu ? 'Не удалось удалить' : 'Delete failed');
    }
  };

  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString(isRu ? 'ru-RU' : 'en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-rule/12 bg-paper-2/60 px-1.5 transition-all hover:border-rule/25 hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          aria-label={isRu ? 'Меню аккаунта' : 'Account menu'}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-sky font-mono text-[10px] font-semibold uppercase text-white shadow-[0_2px_4px_-1px_rgb(var(--brand)/0.40)]">
            {initialsOf(user)}
          </span>
          <ChevronDown className="hidden h-3 w-3 text-muted sm:block" aria-hidden />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className={cn(
            'z-50 w-64 overflow-hidden rounded-2xl border border-rule/12 glass p-1 shadow-[0_8px_16px_-4px_rgb(var(--shadow)/0.15),0_24px_48px_-12px_rgb(var(--shadow)/0.20)]',
            'data-[state=open]:animate-fade-in',
          )}
        >
          <div className="border-b border-rule/15 px-3 py-3">
            <div className="font-display text-sm font-medium text-ink truncate">
              {user?.name || user?.email}
            </div>
            {user?.name && (
              <div className="font-mono text-[10px] text-muted-2 truncate">
                {user.email}
              </div>
            )}
            {lastSyncLabel && (
              <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-2">
                {isRu ? 'Синх:' : 'Sync:'} {lastSyncLabel}
              </div>
            )}
          </div>

          <Item icon={<Settings className="h-3.5 w-3.5" />} onSelect={() => navigate('/settings')}>
            {isRu ? 'Настройки' : 'Settings'}
          </Item>
          <Item icon={<Cloud className="h-3.5 w-3.5" />} onSelect={handleSync}>
            {isRu ? 'Синхронизировать локальный прогресс' : 'Sync local progress'}
          </Item>
          <Item icon={<LogOut className="h-3.5 w-3.5" />} onSelect={handleLogout}>
            {isRu ? 'Выйти' : 'Sign out'}
          </Item>

          <DropdownMenu.Separator className="my-1 h-px bg-rule" />

          <Item
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onSelect={handleDelete}
            danger
          >
            {isRu ? 'Удалить аккаунт' : 'Delete account'}
          </Item>

          <DropdownMenu.Separator className="my-1 h-px bg-rule" />

          <div className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-muted-2">
            <Shield className="mr-1 inline h-2.5 w-2.5" />
            {isRu ? 'JWT · 30 дней' : 'JWT · 30-day session'}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Item({ icon, children, onSelect, danger }) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-sm px-3 py-2 text-sm outline-none',
        'data-[highlighted]:bg-brand/10 data-[highlighted]:text-ink dark:data-[highlighted]:bg-brand/15',
        danger
          ? 'text-[rgb(var(--coral))] data-[highlighted]:!bg-coral/15'
          : 'text-ink-2',
      )}
    >
      <span className="text-muted">{icon}</span>
      <span>{children}</span>
    </DropdownMenu.Item>
  );
}

// Auto-sign-out helper — wired to the api.js 401 interceptor (which already
// clears the session). Exposed here in case a feature needs to drop the
// session manually from outside the menu.
export const signOut = () => useAuth.getState().clearSession();
