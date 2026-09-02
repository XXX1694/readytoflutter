import { useEffect, type ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, Cloud, Trash2, Shield, ChevronDown, Settings, Sparkles, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../store/auth';
import {
  authLogout, authDeleteAccount, bulkSyncProgress,
  readLocalProgress, serializeLocalProgress, clearLocalProgress, apiBaseUrl,
} from '../api/api';
import { track, resetIdentity } from '../lib/analytics';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { cn } from '../lib/cn';
import type { User } from '../types/domain';

const initialsOf = (user: User | null): string => {
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
  const t = useT(lang);

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

  const handleLogout = async () => {
    try { await authLogout(); } catch { /* ignore */ }
    track('logout');
    resetIdentity();
    clearSession();
    qc.invalidateQueries();
    toast.success(isRu ? 'Вышел из аккаунта' : 'Signed out');
    navigate('/');
  };

  const handleSync = async () => {
    const items = serializeLocalProgress(readLocalProgress());
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
      track('account_deleted');
      resetIdentity();
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

  const tier = user?.pro_tier;
  const tierLabel = tier === 'lifetime'
    ? (isRu ? 'Навсегда' : 'Lifetime')
    : tier === 'pro'
      ? 'Pro'
      : null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rule/12 pl-1 pr-1.5 transition-colors hover:border-rule/24"
          aria-label={isRu ? 'Меню аккаунта' : 'Account menu'}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-ink text-[11px] font-semibold text-paper">
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
            'z-50 w-64 overflow-hidden rounded-xl border border-rule/12 glass p-1 shadow-codex-lg',
            'data-[state=open]:animate-fade-in',
          )}
        >
          <div className="border-b border-rule/12 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-sm font-medium text-ink">
                  {user?.name || user?.email}
                </div>
                {user?.name && (
                  <div className="truncate font-mono text-[11px] text-muted-2">
                    {user.email}
                  </div>
                )}
              </div>
              {/* Tier marker — Pro / Lifetime only. Free users see the
                  Upgrade row below instead. */}
              {tierLabel && (
                <span className="shrink-0 rounded bg-rule/8 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
                  {tierLabel}
                </span>
              )}
            </div>
            {lastSyncLabel && (
              <div className="mt-1.5 text-[12px] text-muted-2">
                {isRu ? 'Синхронизация' : 'Last sync'} · {lastSyncLabel}
              </div>
            )}
          </div>

          {/* Upgrade row — only shown to free-plan users so paying users
              never see a "buy" prompt again. */}
          {(!tier || tier === 'free') && (
            <Item
              icon={<Sparkles className="h-3.5 w-3.5" />}
              onSelect={() => navigate('/pricing')}
              accent
            >
              {isRu ? 'Перейти на Pro' : 'Upgrade to Pro'}
            </Item>
          )}

          <Item icon={<Settings className="h-3.5 w-3.5" />} onSelect={() => navigate('/settings')}>
            {t.nav.me}
          </Item>
          {user?.is_admin ? (
            <Item icon={<Shield className="h-3.5 w-3.5" />} onSelect={() => navigate('/admin')}>
              {isRu ? 'Админка' : 'Admin'}
            </Item>
          ) : null}
          <Item icon={<Cloud className="h-3.5 w-3.5" />} onSelect={handleSync}>
            {isRu ? 'Синхронизировать локальный прогресс' : 'Sync local progress'}
          </Item>
          <Item icon={<Mail className="h-3.5 w-3.5" />} onSelect={() => navigate('/contact')}>
            {isRu ? 'Связаться с нами' : 'Contact us'}
          </Item>
          <Item icon={<LogOut className="h-3.5 w-3.5" />} onSelect={handleLogout}>
            {isRu ? 'Выйти' : 'Sign out'}
          </Item>

          <DropdownMenu.Separator className="my-1 h-px bg-rule/12" />

          <Item
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onSelect={handleDelete}
            danger
          >
            {isRu ? 'Удалить аккаунт' : 'Delete account'}
          </Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

interface ItemProps {
  icon: ReactNode;
  children: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  accent?: boolean;
}

function Item({ icon, children, onSelect, danger, accent }: ItemProps) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded px-3 py-2 text-sm outline-none',
        'data-[highlighted]:bg-rule/8 data-[highlighted]:text-ink',
        danger
          ? 'text-coral data-[highlighted]:!bg-coral/12'
          : accent
            ? 'font-medium text-ink'
            : 'text-ink-2',
      )}
    >
      <span className={cn('shrink-0', danger ? 'text-coral' : 'text-muted')}>{icon}</span>
      <span>{children}</span>
    </DropdownMenu.Item>
  );
}
