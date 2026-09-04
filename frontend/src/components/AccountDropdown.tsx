import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Cloud, Trash2, Shield, Settings, Sparkles, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../store/auth';
import {
  authLogout, authDeleteAccount, bulkSyncProgress,
  readLocalProgress, serializeLocalProgress, clearLocalProgress,
} from '../api/api';
import { track, resetIdentity } from '../lib/analytics';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { cn } from '../lib/cn';
import AccountTrigger from './AccountTrigger';

export interface AccountDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The signed-in account menu. Loaded lazily by AccountMenu on the first
 * hover or tap of the avatar: it is the only thing in the app shell that
 * needs Radix, and anonymous visitors (every GitHub Pages reader) never open
 * it, so the whole Radix chunk stays off their critical path.
 */
export default function AccountDropdown({ open, onOpenChange }: AccountDropdownProps) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const isRu = lang === 'ru';
  const t = useT(lang);

  const user = useAuth((s) => s.user);
  const clearSession = useAuth((s) => s.clearSession);
  const markSynced = useAuth((s) => s.markSynced);
  const lastSyncAt = useAuth((s) => s.lastSyncAt);
  const qc = useQueryClient();

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
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <AccountTrigger user={user} aria-label={isRu ? 'Меню аккаунта' : 'Account menu'} />
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
