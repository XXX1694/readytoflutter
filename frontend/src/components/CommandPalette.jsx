import { useEffect, useState } from 'react';
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
import { useTopics } from '../lib/queries.js';
import { usePrefs } from '../store/prefs.js';
import { PLATFORMS, filterTopicsByPlatform } from '../lib/platform.js';
import { useAuth } from '../store/auth.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import {
  resetProgress, authLogout, bulkSyncProgress,
  readLocalProgress, clearLocalProgress,
} from '../api/api.js';
import { useQueryClient } from '@tanstack/react-query';

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
  const [query, setQuery] = useState('');

  // All keyboard shortcuts now live in `GlobalHotkeys` so they work even
  // before the user opens the palette for the first time (this whole
  // module is lazy-loaded the moment `commandOpen` flips to true).

  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const close = () => setOpen(false);

  const run = (fn) => () => { close(); fn(); };

  const goTopic = (slug) => run(() => navigate(`/topic/${slug}`));

  const handleReset = run(async () => {
    if (!window.confirm(t.resetConfirm)) return;
    try {
      await resetProgress();
      qc.invalidateQueries();
      toast.success(t.completed + ' ✓');
    } catch {
      toast.error(t.failedReset);
    }
  });

  // Topic shortcuts respect the active stack — when the user has narrowed to
  // iOS the palette shouldn't dump 23 Flutter rows.
  const scopedTopics = filterTopicsByPlatform(topics, platform);
  const groupedTopics = {
    junior: scopedTopics.filter((tp) => tp.level === 'junior'),
    mid: scopedTopics.filter((tp) => tp.level === 'mid'),
    senior: scopedTopics.filter((tp) => tp.level === 'senior'),
  };

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
            className="overflow-hidden rounded-2xl border border-rule/12 glass shadow-[0_8px_16px_-4px_rgb(var(--shadow)/0.15),0_24px_64px_-12px_rgb(var(--shadow)/0.30)]"
          >
            <div className="flex items-center gap-2 border-b border-rule/8 px-4 py-3.5">
              <Search className="h-4 w-4 text-muted shrink-0" aria-hidden />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder={t.commandPlaceholder}
                inputMode="search"
                enterKeyHint="search"
                autoCorrect="off"
                spellCheck={false}
                autoCapitalize="off"
                className="flex-1 bg-transparent text-base sm:text-[15px] text-ink placeholder:text-muted-2 outline-none"
              />
              <kbd className="hidden sm:flex items-center gap-1 rounded-md border border-rule/15 bg-paper-2 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-2">
                ESC
              </kbd>
            </div>

            {/* Cap with `dvh` so the palette body shrinks with the iOS keyboard;
                bigger ceiling on phones because we open near the top. */}
            <Command.List className="max-h-[70dvh] sm:max-h-[60vh] overflow-y-auto overscroll-contain p-2">
              <Command.Empty className="py-8 text-center text-sm text-muted">
                {t.cmdNoResults}
              </Command.Empty>

              <Command.Group
                heading={t.cmdNavigation}
                className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted"
              >
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
                <CmdItem
                  icon={<Pencil />}
                  onSelect={run(() => navigate('/admin'))}
                  trailing="⌘+E"
                >
                  {lang === 'ru' ? 'Редактор вопросов' : 'Question editor'}
                </CmdItem>
                <CmdItem
                  icon={<HelpCircle />}
                  onSelect={run(() => {
                    try { localStorage.removeItem('rtf:welcome:v1'); } catch {}
                    window.location.reload();
                  })}
                >
                  {lang === 'ru' ? 'Показать гайд снова' : 'Show welcome tour'}
                </CmdItem>
              </Command.Group>

              {backendAvailable && (
                <Command.Group
                  heading={lang === 'ru' ? 'Аккаунт' : 'Account'}
                  className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted"
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
                      <CmdItem
                        icon={<Cloud />}
                        onSelect={run(async () => {
                          const local = readLocalProgress();
                          const items = Object.entries(local).map(([k, v]) => ({
                            questionId: Number(k),
                            status: v?.status,
                            notes: v?.notes || null,
                            updated_at: v?.updated_at || new Date().toISOString(),
                          })).filter((p) => p.questionId && p.status);
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
                        })}
                      >
                        {lang === 'ru' ? 'Синхронизировать прогресс' : 'Sync local progress'}
                      </CmdItem>
                      <CmdItem
                        icon={<LogOut />}
                        onSelect={run(async () => {
                          try { await authLogout(); } catch {}
                          clearSession();
                          qc.invalidateQueries();
                          toast.success(lang === 'ru' ? 'Вышел' : 'Signed out');
                          navigate('/');
                        })}
                        trailing={authUser?.email}
                      >
                        {lang === 'ru' ? 'Выйти' : 'Sign out'}
                      </CmdItem>
                    </>
                  )}
                </Command.Group>
              )}

              <Command.Group
                heading={t.platformLabel}
                className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted"
              >
                {PLATFORMS.map((p) => (
                  <CmdItem
                    key={p.key}
                    icon={<Smartphone />}
                    onSelect={run(() => setPlatform(p.key))}
                    trailing={platform === p.key ? '●' : ''}
                  >
                    {t[p.labelKey]}
                  </CmdItem>
                ))}
              </Command.Group>

              <Command.Group
                heading={t.cmdAppearance}
                className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted"
              >
                <CmdItem
                  icon={<Sun />}
                  onSelect={run(() => setTheme('light'))}
                  trailing={theme === 'light' ? '●' : ''}
                >
                  {lang === 'ru' ? 'Тема — светлая' : 'Theme — light'}
                </CmdItem>
                <CmdItem
                  icon={<Moon />}
                  onSelect={run(() => setTheme('dark'))}
                  trailing={theme === 'dark' ? '●' : ''}
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
                  trailing={recallMode ? 'ON' : 'OFF'}
                >
                  {lang === 'ru'
                    ? 'Режим активного припоминания'
                    : 'Active recall mode'}
                </CmdItem>
              </Command.Group>

              {(['junior', 'mid', 'senior']).map((level) => {
                const items = groupedTopics[level];
                if (!items.length) return null;
                return (
                  <Command.Group
                    key={level}
                    heading={`${t.cmdTopics} · ${t[level].short}`}
                    className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted"
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

              <Command.Group
                heading={t.cmdActions}
                className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted"
              >
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

function CmdItem({ icon, children, trailing, onSelect, danger }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={
        'group flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm text-ink-2 ' +
        'data-[selected=true]:bg-brand/10 data-[selected=true]:text-ink dark:data-[selected=true]:bg-brand/15 ' +
        (danger ? 'data-[selected=true]:!bg-coral/15 data-[selected=true]:!text-[rgb(var(--coral))]' : '')
      }
    >
      <span className="grid h-5 w-5 place-items-center text-muted group-data-[selected=true]:text-brand">
        {icon}
      </span>
      <span className="flex-1 truncate">{children}</span>
      {trailing && (
        <span className="font-mono text-[11px] text-muted">{trailing}</span>
      )}
      <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-data-[selected=true]:opacity-100 text-brand" aria-hidden />
    </Command.Item>
  );
}
