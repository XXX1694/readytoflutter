import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import {
  Home,
  Search,
  Sun,
  Moon,
  Languages,
  RotateCcw,
  Layers,
  ArrowRight,
  Brain,
  Target,
  Library,
  Bookmark,
  Pencil,
  TrendingUp,
  HelpCircle,
  Edit3,
  LogIn,
  LogOut,
  UserPlus,
  Cloud,
  Settings as SettingsIcon,
  Smartphone,
} from 'lucide-react';
import { useTopics } from '../lib/queries';
import { usePrefs } from '../store/prefs';
import { PLATFORMS, filterTopicsByPlatform } from '../lib/platform';
import { useAuth } from '../store/auth';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { useContent } from '../i18n/content';
import {
  resetProgress, authLogout, bulkSyncProgress,
  readLocalProgress, serializeLocalProgress, clearLocalProgress,
} from '../api/api';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '../lib/cn';
import type { Level } from '../types/domain';

// Group headings are sentence case in the grotesk — see DESIGN.md rule 2.
const GROUP_CLASS =
  'px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted';

const LEVELS: Level[] = ['junior', 'mid', 'senior'];

// `PLATFORMS` stores its i18n keys as plain strings — resolve them against the
// copy table without widening the table to `any`.
const copy = (t: UICopy, key: string): string => {
  const value = t[key as keyof UICopy];
  return typeof value === 'string' ? value : '';
};

export default function CommandPalette() {
  const open = usePrefs((s) => s.commandOpen);
  const setOpen = usePrefs((s) => s.setCommandOpen);
  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const recallMode = usePrefs((s) => s.recallMode);
  const toggleRecallMode = usePrefs((s) => s.toggleRecallMode);
  const platform = usePrefs((s) => s.platform);
  const setPlatform = usePrefs((s) => s.setPlatform);
  const authToken = useAuth((s) => s.token);
  const authUser = useAuth((s) => s.user);
  const backendAvailable = useAuth((s) => s.backendAvailable);
  const clearSession = useAuth((s) => s.clearSession);
  const markSynced = useAuth((s) => s.markSynced);
  const navigate = useNavigate();
  const { lang, setLang } = useLang();
  const t = useT(lang);
  const { topicTitle } = useContent(lang);
  const { data: topics = [] } = useTopics();
  const qc = useQueryClient();

  // All keyboard shortcuts now live in `GlobalHotkeys` so they work even
  // before the user opens the palette for the first time (this whole
  // module is lazy-loaded the moment `commandOpen` flips to true).
  //
  // The search box is uncontrolled: Radix unmounts Dialog.Content on close,
  // which takes cmdk's internal search state with it, so every open starts
  // empty without us mirroring the value into React state.

  const close = () => setOpen(false);

  const run = (fn: () => void | Promise<void>) => () => { close(); void fn(); };

  const goTopic = (slug: string) => run(() => navigate(`/topic/${slug}`));

  const handleReset = run(async () => {
    if (!window.confirm(t.resetConfirm)) return;
    try {
      await resetProgress();
      qc.invalidateQueries();
      toast.success(t.progressReset);
    } catch {
      toast.error(t.failedReset);
    }
  });

  const handleSync = run(async () => {
    const items = serializeLocalProgress(readLocalProgress());
    if (items.length === 0) {
      toast.info(lang === 'ru' ? 'Локального прогресса нет' : 'Nothing to sync');
      return;
    }
    try {
      const r = await bulkSyncProgress(items);
      clearLocalProgress();
      markSynced();
      qc.invalidateQueries();
      toast.success(lang === 'ru' ? `Импортировано ${r.imported}` : `Imported ${r.imported}`);
    } catch {
      toast.error(lang === 'ru' ? 'Не удалось импортировать' : 'Sync failed');
    }
  });

  const handleSignOut = run(async () => {
    try { await authLogout(); } catch { /* the session is dropped either way */ }
    clearSession();
    qc.invalidateQueries();
    toast.success(lang === 'ru' ? 'Вышел' : 'Signed out');
    navigate('/');
  });

  // Topic shortcuts respect the active stack — when the user has narrowed to
  // iOS the palette shouldn't dump 23 Flutter rows.
  const scopedTopics = filterTopicsByPlatform(topics, platform);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        {/*
          Mobile: snap near the top with a small inset (4vh) and let the body
          scroll inside Command.List — `top-[16vh]` would push half the
          palette off the screen on a 568pt iPhone with the keyboard up.
          Desktop (sm+): center-ish 16vh as before.
        */}
        <Dialog.Content className="fixed left-1/2 top-[4vh] sm:top-[16vh] z-50 w-[92vw] max-w-2xl -translate-x-1/2 outline-none data-[state=open]:animate-slide-up">
          <Dialog.Title className="sr-only">{t.commandPlaceholder}</Dialog.Title>
          <Dialog.Description className="sr-only">{t.commandHint}</Dialog.Description>
          <Command
            label={t.commandPlaceholder}
            className="overflow-hidden rounded-xl border border-rule/12 glass shadow-codex-lg"
          >
            <div className="flex items-center gap-2 border-b border-rule/8 px-4 py-3.5">
              <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <Command.Input
                placeholder={t.commandPlaceholder}
                inputMode="search"
                enterKeyHint="search"
                autoCorrect="off"
                spellCheck={false}
                autoCapitalize="off"
                className="flex-1 bg-transparent text-base sm:text-[15px] text-ink placeholder:text-muted-2 outline-none"
              />
              <kbd className="hidden items-center rounded border border-rule/12 px-1.5 py-0.5 font-mono text-[11px] text-muted-2 sm:flex">
                Esc
              </kbd>
            </div>

            {/* Cap with `dvh` so the palette body shrinks with the iOS keyboard;
                bigger ceiling on phones because we open near the top. */}
            <Command.List className="max-h-[70dvh] sm:max-h-[60vh] overflow-y-auto overscroll-contain p-2">
              <Command.Empty className="py-8 text-center text-sm text-muted">
                {t.cmdNoResults}
              </Command.Empty>

              <Command.Group heading={t.cmdNavigation} className={GROUP_CLASS}>
                <CmdItem icon={<Home />} onSelect={run(() => navigate('/'))}>
                  {t.cmdGoDashboard}
                </CmdItem>
                <CmdItem icon={<Search />} onSelect={run(() => navigate('/search'))}>
                  {t.cmdGoSearch}
                </CmdItem>
                <CmdItem
                  icon={<Brain />}
                  onSelect={run(() => navigate('/study'))}
                  trailing="⌘+S"
                >
                  {lang === 'ru' ? 'Начать сессию повторения' : 'Start study session'}
                </CmdItem>
                <CmdItem
                  icon={<Target />}
                  onSelect={run(() => navigate('/mock'))}
                  trailing="⌘+M"
                >
                  {lang === 'ru' ? 'Mock-собеседование' : 'Mock interview'}
                </CmdItem>
                <CmdItem
                  icon={<Library />}
                  onSelect={run(() => navigate('/knowledge'))}
                >
                  {lang === 'ru' ? 'База знаний' : 'Knowledge base'}
                </CmdItem>
                <CmdItem
                  icon={<Bookmark />}
                  onSelect={run(() => navigate('/bookmarks'))}
                  trailing="⌘+B"
                >
                  {lang === 'ru' ? 'Закладки' : 'Bookmarks'}
                </CmdItem>
                <CmdItem
                  icon={<TrendingUp />}
                  onSelect={run(() => navigate('/stats'))}
                >
                  {lang === 'ru' ? 'Статистика' : 'Mastery map'}
                </CmdItem>
                {backendAvailable && (
                  <CmdItem
                    icon={<SettingsIcon />}
                    onSelect={run(() => navigate('/settings'))}
                    trailing="⌘+,"
                  >
                    {lang === 'ru' ? 'Настройки' : 'Settings'}
                  </CmdItem>
                )}
                {import.meta.env.DEV && (
                  <CmdItem
                    icon={<Pencil />}
                    onSelect={run(() => navigate('/admin'))}
                    trailing="⌘+E"
                  >
                    {lang === 'ru' ? 'Редактор вопросов' : 'Question editor'}
                  </CmdItem>
                )}
                <CmdItem
                  icon={<HelpCircle />}
                  onSelect={run(() => {
                    try { localStorage.removeItem('rtf:welcome:v1'); } catch { /* private mode */ }
                    window.location.reload();
                  })}
                >
                  {lang === 'ru' ? 'Показать гайд снова' : 'Show welcome tour'}
                </CmdItem>
              </Command.Group>

              {backendAvailable && (
                <Command.Group
                  heading={lang === 'ru' ? 'Аккаунт' : 'Account'}
                  className={GROUP_CLASS}
                >
                  {!authToken ? (
                    <>
                      <CmdItem icon={<LogIn />} onSelect={run(() => navigate('/login'))}>
                        {lang === 'ru' ? 'Войти' : 'Sign in'}
                      </CmdItem>
                      <CmdItem icon={<UserPlus />} onSelect={run(() => navigate('/signup'))}>
                        {lang === 'ru' ? 'Регистрация' : 'Create account'}
                      </CmdItem>
                    </>
                  ) : (
                    <>
                      <CmdItem icon={<Cloud />} onSelect={handleSync}>
                        {lang === 'ru' ? 'Синхронизировать прогресс' : 'Sync local progress'}
                      </CmdItem>
                      <CmdItem
                        icon={<LogOut />}
                        onSelect={handleSignOut}
                        trailing={authUser?.email}
                      >
                        {lang === 'ru' ? 'Выйти' : 'Sign out'}
                      </CmdItem>
                    </>
                  )}
                </Command.Group>
              )}

              <Command.Group heading={t.platformLabel} className={GROUP_CLASS}>
                {PLATFORMS.map((p) => (
                  <CmdItem
                    key={p.key}
                    icon={<Smartphone />}
                    onSelect={run(() => setPlatform(p.key))}
                    current={platform === p.key}
                  >
                    {copy(t, p.labelKey)}
                  </CmdItem>
                ))}
              </Command.Group>

              <Command.Group heading={t.cmdAppearance} className={GROUP_CLASS}>
                <CmdItem
                  icon={<Sun />}
                  onSelect={run(() => setTheme('light'))}
                  current={theme === 'light'}
                >
                  {lang === 'ru' ? 'Тема — светлая' : 'Theme — light'}
                </CmdItem>
                <CmdItem
                  icon={<Moon />}
                  onSelect={run(() => setTheme('dark'))}
                  current={theme === 'dark'}
                >
                  {lang === 'ru' ? 'Тема — тёмная' : 'Theme — dark'}
                </CmdItem>
                <CmdItem
                  icon={<Languages />}
                  onSelect={run(() => setLang(lang === 'en' ? 'ru' : 'en'))}
                  trailing={lang === 'en' ? 'RU' : 'EN'}
                >
                  {t.cmdSwitchLang}
                </CmdItem>
                <CmdItem
                  icon={<Edit3 />}
                  onSelect={run(toggleRecallMode)}
                  trailing={recallMode
                    ? (lang === 'ru' ? 'Вкл' : 'On')
                    : (lang === 'ru' ? 'Выкл' : 'Off')}
                >
                  {lang === 'ru'
                    ? 'Режим активного припоминания'
                    : 'Active recall mode'}
                </CmdItem>
              </Command.Group>

              {LEVELS.map((level) => {
                const items = scopedTopics.filter((tp) => tp.level === level);
                if (!items.length) return null;
                return (
                  <Command.Group
                    key={level}
                    heading={`${t.cmdTopics} · ${t[level].short}`}
                    className={GROUP_CLASS}
                  >
                    {items.map((topic) => (
                      <CmdItem
                        key={topic.id}
                        icon={<Layers />}
                        onSelect={goTopic(topic.slug)}
                        trailing={`${topic.completed_count || 0}/${topic.question_count || 0}`}
                      >
                        {topicTitle(topic)}
                      </CmdItem>
                    ))}
                  </Command.Group>
                );
              })}

              <Command.Group heading={t.cmdActions} className={GROUP_CLASS}>
                <CmdItem icon={<RotateCcw />} onSelect={handleReset} danger>
                  {t.cmdReset}
                </CmdItem>
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface CmdItemProps {
  icon: ReactNode;
  children: ReactNode;
  onSelect: () => void;
  /** Trailing hint — a keyboard shortcut, a count, an account email. */
  trailing?: ReactNode;
  /** This row is the value currently in effect (stack, theme, recall mode). */
  current?: boolean;
  danger?: boolean;
}

function CmdItem({ icon, children, trailing, current, onSelect, danger }: CmdItemProps) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        'group flex cursor-pointer items-center gap-3 rounded px-2.5 py-2 text-sm text-ink-2',
        'data-[selected=true]:bg-rule/8 data-[selected=true]:text-ink',
        danger && 'data-[selected=true]:!bg-coral/12 data-[selected=true]:!text-coral',
      )}
    >
      <span className={cn('grid h-5 w-5 shrink-0 place-items-center', danger ? 'text-coral' : 'text-muted')}>
        {icon}
      </span>
      {/* The marker means "this is the one in effect" — the same signal the
          Sidebar and BottomNav give for the route you are on. */}
      <span className="min-w-0 flex-1 truncate">
        <span className={cn(current && 'marker font-medium text-ink')}>{children}</span>
      </span>
      {trailing && (
        <span className="shrink-0 font-mono text-[11px] text-muted-2">{trailing}</span>
      )}
      <ArrowRight
        className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-data-[selected=true]:opacity-100"
        aria-hidden
      />
    </Command.Item>
  );
}
