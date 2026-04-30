import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, X, Home as HomeIcon, Brain, Target, Bookmark, TrendingUp, Library, Rocket } from 'lucide-react';
import { useTopics, useStats } from '../lib/queries.js';
import { usePrefs } from '../store/prefs.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { ProgressBar, IconButton, TopicGlyph } from '../ui/index.js';
import { cn } from '../lib/cn.js';

const NAV_LINK_CLASS = ({ isActive }) =>
  cn(
    'mx-2 mt-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200',
    isActive
      ? 'bg-ink text-paper shadow-[0_1px_2px_0_rgb(var(--shadow)/0.16),0_4px_12px_-2px_rgb(var(--shadow)/0.20)]'
      : 'text-ink-2 hover:bg-rule/8 hover:text-ink',
  );

function MainNavLink({ to, end, onClose, icon: Icon, children }) {
  return (
    <NavLink to={to} end={end} onClick={onClose} className={NAV_LINK_CLASS}>
      <Icon className="h-4 w-4" aria-hidden />
      {children}
    </NavLink>
  );
}

const LEVELS = [
  { key: 'junior', dot: 'bg-brand' },
  { key: 'mid',    dot: 'bg-plum' },
  { key: 'senior', dot: 'bg-mint' },
];

export default function Sidebar() {
  const sidebarOpen = usePrefs((s) => s.sidebarOpen);
  const setSidebarOpen = usePrefs((s) => s.setSidebarOpen);
  const [expanded, setExpanded] = useState({ junior: true, mid: false, senior: false });

  const { lang } = useLang();
  const t = useT(lang);
  const { topicTitle } = useContent(lang);

  const { data: topics = [] } = useTopics();
  const { data: stats } = useStats();

  const total = stats?.totalQuestions ?? 0;
  const completed = stats?.completed ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const close = () => setSidebarOpen(false);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm lg:hidden"
          onClick={close}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col',
          'glass border-r border-rule/8',
          'transition-transform duration-300 ease-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex items-start justify-between gap-2 border-b border-rule/8 px-5 py-5">
          <NavLink
            to="/"
            onClick={close}
            className="group flex items-center gap-2.5"
            aria-label={t.goToHomepage}
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-sky text-white shadow-[0_4px_12px_-2px_rgb(var(--brand)/0.40)]">
              <Rocket className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <span className="flex flex-col">
              <span className="font-display text-[15px] font-semibold leading-tight tracking-tight text-ink">
                ReadyToFlutter
              </span>
              {/* Tracking dropped from 0.22em → 0.08em — at the previous
                  spacing the Cyrillic подписи split into ghost-words; the
                  English "Interview prep" looked too sparse too. */}
              <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-2">
                {t.interviewPrep}
              </span>
            </span>
          </NavLink>
          <IconButton
            size="sm"
            variant="ghost"
            label={t.closeSidebar}
            onClick={close}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Overall progress */}
        {total > 0 && (
          <div className="border-b border-rule/8 px-5 py-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                {t.overallProgress}
              </span>
              <span className="num text-2xl text-ink">
                {pct}
                <span className="text-sm text-muted">%</span>
              </span>
            </div>
            <ProgressBar value={completed} max={total} tone="gradient" size="sm" />
            <div className="mt-1.5 font-mono text-[10px] text-muted">
              {completed}/{total} {t.questions}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          <MainNavLink to="/" end onClose={close} icon={HomeIcon}>
            {t.dashboard}
          </MainNavLink>
          <MainNavLink to="/study" onClose={close} icon={Brain}>
            {lang === 'ru' ? 'Повторение' : 'Study'}
          </MainNavLink>
          <MainNavLink to="/mock" onClose={close} icon={Target}>
            {lang === 'ru' ? 'Mock-собес' : 'Mock interview'}
          </MainNavLink>
          <MainNavLink to="/knowledge" onClose={close} icon={Library}>
            {lang === 'ru' ? 'База знаний' : 'Knowledge'}
          </MainNavLink>
          <MainNavLink to="/stats" onClose={close} icon={TrendingUp}>
            {lang === 'ru' ? 'Статистика' : 'Mastery'}
          </MainNavLink>
          <MainNavLink to="/bookmarks" onClose={close} icon={Bookmark}>
            {lang === 'ru' ? 'Закладки' : 'Bookmarks'}
          </MainNavLink>

          <div className="my-3 mx-5 h-px bg-rule/10" />

          {LEVELS.map((level, idx) => {
            const levelT = t[level.key];
            const items = topics.filter((tp) => tp.level === level.key);
            if (!items.length) return null;
            const isOpen = expanded[level.key];
            return (
              <div key={level.key} className="mb-0.5">
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setExpanded((e) => ({ ...e, [level.key]: !e[level.key] }));
                  }}
                  aria-expanded={isOpen}
                  className="mx-2 flex w-[calc(100%-1rem)] items-center justify-between rounded-xl px-3 py-2 text-left transition-all duration-200 hover:bg-rule/8"
                >
                  <span className="flex items-center gap-2">
                    <span className={cn('h-1.5 w-1.5 rounded-full', level.dot)} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
                      {levelT.short}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-2">
                      {items.length}
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 text-muted transition-transform duration-200',
                      isOpen && 'rotate-90',
                    )}
                    aria-hidden
                  />
                </button>

                {isOpen && (
                  <ul className="ml-2 space-y-px py-1">
                    {items.map((topic) => {
                      const tPct = topic.question_count > 0
                        ? Math.round((topic.completed_count / topic.question_count) * 100)
                        : 0;
                      return (
                        <li key={topic.id}>
                          <NavLink
                            to={`/topic/${topic.slug}`}
                            onClick={close}
                            className={({ isActive }) =>
                              cn(
                                'group mx-3 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-all duration-200',
                                isActive
                                  ? 'bg-brand/10 text-ink ring-1 ring-brand/20'
                                  : 'text-ink-2 hover:bg-rule/8 hover:text-ink',
                              )
                            }
                          >
                            <TopicGlyph topic={topic} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] leading-tight">
                                {topicTitle(topic)}
                              </span>
                              {tPct > 0 && (
                                <ProgressBar
                                  value={tPct}
                                  max={100}
                                  size="xs"
                                  tone={tPct === 100 ? 'mint' : 'brand'}
                                  className="mt-1"
                                />
                              )}
                            </span>
                            <span className="font-mono text-[10px] tabular-nums text-muted shrink-0">
                              {topic.question_count}
                            </span>
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-rule/8 px-5 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-2">
          {t.footerText}
        </div>
      </aside>
    </>
  );
}
