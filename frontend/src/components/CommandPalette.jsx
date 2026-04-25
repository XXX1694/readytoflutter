import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import * as Dialog from '@radix-ui/react-dialog';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import {
  Home,
  Search,
  SunMoon,
  Languages,
  RotateCcw,
  Layers,
  ArrowRight,
  Brain,
  Target,
  Bookmark,
  Pencil,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';
import { useTopics } from '../lib/queries.js';
import { usePrefs } from '../store/prefs.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { resetProgress } from '../api/api.js';
import { useQueryClient } from '@tanstack/react-query';

export default function CommandPalette() {
  const open = usePrefs((s) => s.commandOpen);
  const setOpen = usePrefs((s) => s.setCommandOpen);
  const toggleTheme = usePrefs((s) => s.toggleTheme);
  const navigate = useNavigate();
  const { lang, setLang } = useLang();
  const t = useT(lang);
  const { topicTitle } = useContent(lang);
  const { data: topics = [] } = useTopics();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');

  useHotkeys('mod+k', (e) => { e.preventDefault(); setOpen(!open); }, { enableOnFormTags: true });
  useHotkeys('mod+/', (e) => { e.preventDefault(); setOpen(!open); }, { enableOnFormTags: true });
  useHotkeys('mod+s', (e) => { e.preventDefault(); navigate('/study'); }, { enableOnFormTags: true });
  useHotkeys('mod+m', (e) => { e.preventDefault(); navigate('/mock'); }, { enableOnFormTags: true });
  useHotkeys('mod+b', (e) => { e.preventDefault(); navigate('/bookmarks'); }, { enableOnFormTags: true });
  useHotkeys('mod+e', (e) => { e.preventDefault(); navigate('/admin'); }, { enableOnFormTags: true });

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

  const groupedTopics = {
    junior: topics.filter((tp) => tp.level === 'junior'),
    mid: topics.filter((tp) => tp.level === 'mid'),
    senior: topics.filter((tp) => tp.level === 'senior'),
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-[18vh] z-50 w-[92vw] max-w-2xl -translate-x-1/2 outline-none data-[state=open]:animate-slide-up">
          <Dialog.Title className="sr-only">{t.commandPlaceholder}</Dialog.Title>
          <Dialog.Description className="sr-only">{t.commandHint}</Dialog.Description>
          <Command
            label={t.commandPlaceholder}
            className="overflow-hidden rounded-md border-1.5 border-ink bg-paper-2 shadow-codex-lg"
          >
            <div className="flex items-center gap-2 border-b-1.5 border-ink px-4 py-3">
              <Search className="h-4 w-4 text-muted shrink-0" aria-hidden />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder={t.commandPlaceholder}
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted-2 outline-none"
              />
              <kbd className="hidden sm:flex items-center gap-1 rounded border border-rule-strong px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
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

              <Command.Group
                heading={t.cmdAppearance}
                className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted"
              >
                <CmdItem icon={<SunMoon />} onSelect={run(toggleTheme)}>
                  {t.cmdToggleTheme}
                </CmdItem>
                <CmdItem
                  icon={<Languages />}
                  onSelect={run(() => setLang(lang === 'en' ? 'ru' : 'en'))}
                  trailing={lang === 'en' ? 'RU' : 'EN'}
                >
                  {t.cmdSwitchLang}
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
