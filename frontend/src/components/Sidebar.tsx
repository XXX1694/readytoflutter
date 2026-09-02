import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import {
  ChevronRight, X, Home as HomeIcon, Brain, Target, Bookmark, TrendingUp, Library,
  type LucideIcon,
} from 'lucide-react';
import { useTopics } from '../lib/queries';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { ProgressBar, IconButton, TopicGlyph } from '../ui/index';
import { cn } from '../lib/cn';
import { tapLight } from '../lib/haptics';
import { useIsCompact } from '../lib/useMediaQuery';
import { filterTopicsByPlatform, topicPlatform, PLATFORM_GROUPS } from '../lib/platform';
import type { PlatformKey } from '../types/domain';

/**
 * The active-state device for the whole app chrome is the citron marker laid
 * behind the label — the same wash Sidebar, BottomNav and MobileHeader use, so
 * "where am I" reads identically in all three. Nothing else marks selection:
 * no pill, no tinted row, no ring.
 */
const navRowClass = (isActive: boolean): string =>
  cn(
    'mx-2 flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] transition-colors lg:py-2',
    isActive ? 'text-ink font-semibold' : 'font-medium text-ink-2 hover:bg-rule/6 hover:text-ink',
  );

/**
 * `PLATFORMS` stores its i18n keys as plain strings, so resolve them against
 * the copy table by hand rather than widening the table to `any`.
 */
const copy = (t: UICopy, key: string): string => {
  const value = t[key as keyof UICopy];
  return typeof value === 'string' ? value : '';
};

interface MainNavLinkProps {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  onClose: () => void;
  children: ReactNode;
}

function MainNavLink({ to, end, onClose, icon: Icon, children }: MainNavLinkProps) {
  return (
    <NavLink to={to} end={end} onClick={onClose} className={({ isActive }) => navRowClass(isActive)}>
      {({ isActive }) => (
        <>
          <Icon
            className={cn('h-4 w-4 shrink-0', isActive ? 'text-ink' : 'text-muted')}
            aria-hidden
          />
          <span className={cn(isActive && 'marker')}>{children}</span>
        </>
      )}
    </NavLink>
  );
}

interface GroupStat { total: number; completed: number }

// Sidebar groups topics by PLATFORM (Flutter / iOS / Android / Cross / Mobile,
// plus anything the team adds later — see lib/platform) rather than by
// interview grade. Grade is still surfaced inside the dashboard hero.

export default function Sidebar() {
  const sidebarOpen = usePrefs((s) => s.sidebarOpen);
  const setSidebarOpen = usePrefs((s) => s.setSidebarOpen);

  const { lang } = useLang();
  const t = useT(lang);
  const { topicTitle } = useContent(lang);

  const { data: topics = [] } = useTopics();
  const platform = usePrefs((s) => s.platform);

  // Sidebar always shows every stack with its own progress so the user can
  // size up the whole catalog at a glance. The active stack only controls
  // which group is expanded by default and which one the top progress block
  // summarizes — never which groups are visible.
  const groupStats = useMemo(() => {
    const map = new Map<PlatformKey, GroupStat>();
    for (const topic of topics) {
      const key = topicPlatform(topic);
      const row = map.get(key) || { total: 0, completed: 0 };
      row.total += topic.question_count || 0;
      row.completed += topic.completed_count || 0;
      map.set(key, row);
    }
    return map;
  }, [topics]);

  // Default-expand the platform that's currently selected; when 'all', open
  // the first non-empty group so the user always sees something on first paint.
  const [expanded, setExpanded] = useState<Partial<Record<PlatformKey, boolean>>>({});
  const firstNonEmptyKey = PLATFORM_GROUPS
    .find((g) => topics.some((tp) => topicPlatform(tp) === g.key))?.key;
  const expandedFor = (key: PlatformKey): boolean => {
    const override = expanded[key];
    if (override !== undefined) return override;
    if (platform !== 'all') return platform === key;
    return key === firstNonEmptyKey;
  };

  // Top progress block: when a specific stack is active we report just that
  // stack's progress (with its label), otherwise we show the overall blend.
  const scopedTopics = useMemo(
    () => filterTopicsByPlatform(topics, platform),
    [topics, platform],
  );
  const total = scopedTopics.reduce((s, tp) => s + (tp.question_count || 0), 0);
  const completed = scopedTopics.reduce((s, tp) => s + (tp.completed_count || 0), 0);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const activeGroup = PLATFORM_GROUPS.find((g) => g.key === platform);
  const overallLabel = activeGroup
    ? `${t.overallProgress} · ${copy(t, activeGroup.labelKey)}`
    : t.overallProgress;

  const isCompact = useIsCompact();
  const close = () => { tapLight(); setSidebarOpen(false); };

  // Under lg the drawer is a modal, and has to behave like one: it announces
  // as a dialog, takes focus when it opens, closes on Escape and hands focus
  // back to whatever opened it. While it is parked off-screen it is `inert`,
  // otherwise Tab from the page walks through forty invisible links before it
  // reaches anything you can see.
  const asideRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerOpen = isCompact && sidebarOpen;
  const drawerParked = isCompact && !sidebarOpen;

  useEffect(() => {
    asideRef.current?.toggleAttribute('inert', drawerParked);
  }, [drawerParked]);

  useEffect(() => {
    if (!drawerOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      // The palette sits above the drawer and owns Escape while it is open.
      if (e.key !== 'Escape' || usePrefs.getState().commandOpen) return;
      e.preventDefault();
      tapLight();
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [drawerOpen, setSidebarOpen]);

  // Pointer-driven drag to close — committed when the user pulls the drawer
  // > 80px to the left or flicks it. Below threshold it springs back.
  // Disabled at lg+ since the drawer is static (always visible).
  const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -80 || info.velocity.x < -300) close();
  };

  return (
    <>
      {/* Mobile overlay — fades in/out under the drawer. AnimatePresence
          keeps the unmount transition smooth so the backdrop doesn't blink. */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="sidebar-overlay"
            className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm lg:hidden"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <motion.aside
        ref={asideRef}
        role={drawerOpen ? 'dialog' : undefined}
        aria-modal={drawerOpen || undefined}
        aria-label={drawerOpen ? (lang === 'ru' ? 'Меню' : 'Menu') : undefined}
        // Use framer-motion under <lg so we get spring open/close + drag.
        // At lg+ we drop the inline transform entirely and let Tailwind hold
        // the drawer in its static slot.
        // No mount animation: without this framer tweens from the element's
        // natural x=0 to the parked -100% on every page load, so the drawer
        // was seen sliding off-screen each time a phone opened the app.
        initial={false}
        drag={isCompact ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.08, right: 0 }}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        animate={isCompact ? { x: sidebarOpen ? 0 : '-100%' } : { x: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 38, mass: 0.9 }}
        // `data-drawer-mobile` lets us override the `glass` look at <lg
        // via a media-query rule in index.css — solid, slightly darker
        // paper instead of frosted near-white that washes out on bright
        // backgrounds.
        data-drawer-mobile
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[86vw] shrink-0 flex-col',
          'glass border-r border-rule/8',
          'lg:static lg:w-64 lg:max-w-none',
          'touch-pan-y', // allow vertical scroll inside, horizontal drag steals
        )}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Wordmark. Set in the grotesk and marked with the citron — the name
            is the mark, so there is no icon tile to go stale. */}
        <div className="flex items-center justify-between gap-2 border-b border-rule/8 px-5 py-4">
          <NavLink to="/" onClick={close} className="rounded-sm" aria-label={t.goToHomepage}>
            <span className="marker font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">
              Onsite
            </span>
          </NavLink>
          <IconButton
            ref={closeButtonRef}
            size="md"
            variant="ghost"
            label={t.closeSidebar}
            onClick={close}
            className="touch-target -mr-2 lg:hidden"
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Stack-scoped progress — re-computes when the user switches stack
            so they see "where am I on iOS" instead of the global blend. */}
        {total > 0 && (
          <div className="border-b border-rule/8 px-5 py-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="eyebrow truncate">{overallLabel}</span>
              <span className="num shrink-0 text-[17px] text-ink">{pct}%</span>
            </div>
            <ProgressBar value={completed} max={total} tone="ink" size="xs" className="mt-2" />
            <div className="mt-1.5 text-[12px] text-muted-2">
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

          <div className="mx-5 my-3 h-px bg-rule/10" />

          {PLATFORM_GROUPS.map((group) => {
            const items = topics.filter((tp) => topicPlatform(tp) === group.key);
            if (!items.length) return null;
            const isOpen = expandedFor(group.key);
            const groupRow = groupStats.get(group.key) || { total: 0, completed: 0 };
            const groupPct = groupRow.total > 0
              ? Math.round((groupRow.completed / groupRow.total) * 100)
              : 0;
            return (
              <div key={group.key} className="mb-0.5">
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setExpanded((e) => ({ ...e, [group.key]: !isOpen }));
                  }}
                  aria-expanded={isOpen}
                  className="mx-2 flex w-[calc(100%-1rem)] flex-col gap-1.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-rule/6"
                >
                  <span className="flex w-full items-center gap-2">
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200',
                        isOpen && 'rotate-90',
                      )}
                      aria-hidden
                    />
                    <span className="flex-1 truncate text-[13px] font-medium text-ink-2">
                      {copy(t, group.labelKey)}
                    </span>
                    <span className="num shrink-0 text-[12px] font-normal text-muted-2">
                      {items.length}
                    </span>
                  </span>
                  {groupRow.completed > 0 && (
                    <ProgressBar
                      value={groupRow.completed}
                      max={groupRow.total}
                      tone={groupPct === 100 ? 'mint' : 'ink'}
                      size="xs"
                    />
                  )}
                </button>

                {isOpen && (
                  <ul className="ml-2 space-y-px py-1">
                    {items.map((topic) => {
                      const tPct = (topic.question_count || 0) > 0
                        ? Math.round(((topic.completed_count || 0) / (topic.question_count || 1)) * 100)
                        : 0;
                      return (
                        <li key={topic.id}>
                          <NavLink
                            to={`/topic/${topic.slug}`}
                            onClick={close}
                            className={({ isActive }) =>
                              cn(
                                'mx-3 flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] transition-colors lg:py-1.5',
                                isActive ? 'text-ink' : 'text-ink-2 hover:bg-rule/6 hover:text-ink',
                              )
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <TopicGlyph topic={topic} size="sm" />
                                <span className="min-w-0 flex-1">
                                  {/* The wash goes on an inline child so it
                                      hugs the title instead of the full row. */}
                                  <span className="block truncate leading-tight">
                                    <span className={cn(isActive && 'marker font-semibold')}>
                                      {topicTitle(topic)}
                                    </span>
                                  </span>
                                  {tPct > 0 && (
                                    <ProgressBar
                                      value={tPct}
                                      max={100}
                                      size="xs"
                                      tone={tPct === 100 ? 'mint' : 'ink'}
                                      className="mt-1"
                                    />
                                  )}
                                </span>
                                <span className="num shrink-0 text-[12px] font-normal text-muted-2">
                                  {topic.question_count}
                                </span>
                              </>
                            )}
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

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-rule/8 px-5 py-3 text-[12px] text-muted-2">
          <NavLink
            to="/pricing"
            onClick={close}
            className={({ isActive }) =>
              cn('inline-flex min-h-[32px] items-center transition-colors hover:text-ink', isActive && 'text-ink')
            }
          >
            {lang === 'ru' ? 'Цены' : 'Pricing'}
          </NavLink>
          <NavLink
            to="/contact"
            onClick={close}
            className={({ isActive }) =>
              cn('inline-flex min-h-[32px] items-center transition-colors hover:text-ink', isActive && 'text-ink')
            }
          >
            {lang === 'ru' ? 'Контакты' : 'Contact'}
          </NavLink>
        </div>
      </motion.aside>
    </>
  );
}
