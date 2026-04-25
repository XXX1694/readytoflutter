import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, X, Home as HomeIcon, Brain, Target, Bookmark } from 'lucide-react';
import { useTopics, useStats } from '../lib/queries.js';
import { usePrefs } from '../store/prefs.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { ProgressBar, IconButton, TopicGlyph } from '../ui/index.js';
import { cn } from '../lib/cn.js';

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
          'fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r-1.5 border-ink bg-paper-2',
          'transition-transform duration-300 ease-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex items-start justify-between gap-2 border-b-1.5 border-ink px-5 py-5">
          <NavLink
            to="/"
            onClick={close}
            className="group flex flex-col gap-0.5"
            aria-label={t.goToHomepage}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
              ReadyToFlutter
            </span>
            <span className="font-display text-2xl font-medium leading-none tracking-tightest text-ink">
              Codex<span className="text-brand">.</span>
            </span>
            <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-2">
              {t.interviewPrep}
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
          <div className="border-b-1.5 border-ink px-5 py-4">
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
          <NavLink
            to="/"
            end
            onClick={close}
            className={({ isActive }) =>
              cn(
                'mx-2 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-ink text-paper'
                  : 'text-ink-2 hover:bg-paper hover:text-ink',
              )
            }
          >
            <HomeIcon className="h-4 w-4" aria-hidden />
            {t.dashboard}
          </NavLink>
          <NavLink
            to="/study"
            onClick={close}
            className={({ isActive }) =>
              cn(
                'mx-2 mt-px flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-ink text-paper'
                  : 'text-ink-2 hover:bg-paper hover:text-ink',
              )
            }
          >
            <Brain className="h-4 w-4" aria-hidden />
            {lang === 'ru' ? 'Повторение' : 'Study'}
          </NavLink>
          <NavLink
            to="/mock"
            onClick={close}
            className={({ isActive }) =>
              cn(
                'mx-2 mt-px flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-ink text-paper'
                  : 'text-ink-2 hover:bg-paper hover:text-ink',
              )
            }
          >
            <Target className="h-4 w-4" aria-hidden />
            {lang === 'ru' ? 'Mock-собес' : 'Mock interview'}
          </NavLink>
          <NavLink
            to="/bookmarks"
            onClick={close}
            className={({ isActive }) =>
              cn(
                'mx-2 mt-px flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-ink text-paper'
                  : 'text-ink-2 hover:bg-paper hover:text-ink',
              )
            }
          >
            <Bookmark className="h-4 w-4" aria-hidden />
            {lang === 'ru' ? 'Закладки' : 'Bookmarks'}
          </NavLink>

          <div className="my-3 mx-5 h-px bg-rule" />

          {LEVELS.map((level, idx) => {
            const levelT = t[level.key];
            const items = topics.filter((tp) => tp.level === level.key);
            if (!items.length) return null;
            const isOpen = expanded[level.key];
            return (
              <div key={level.key} className="mb-1">
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setExpanded((e) => ({ ...e, [level.key]: !e[level.key] }));
                  }}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-paper sm:py-2"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="font-mono text-[10px] tabular-nums text-brand">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className={cn('h-1.5 w-1.5 rounded-full', level.dot)} />
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">
                      {levelT.short}
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 text-muted transition-transform',
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
                                'group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                                'mx-1',
                                isActive
                                  ? 'bg-brand/10 text-ink dark:bg-brand/15'
                                  : 'text-ink-2 hover:bg-paper hover:text-ink',
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

        <div className="border-t-1.5 border-ink px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-2">
          {t.footerText}
        </div>
      </aside>
    </>
  );
}
