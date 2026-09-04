import {
  Bookmark, Brain, Home, LayoutGrid, Library, Milestone, Search, Timer, TrendingUp, User,
  type LucideIcon,
} from 'lucide-react';
import type { UICopy } from '../i18n/ui';

/**
 * The single registry of app destinations. The desktop rail, the mobile tab
 * bar, the mobile header's titles, the command palette, the route-transition
 * tab roots and the prefetch warm-up all read from here, so a destination is
 * added or renamed in one place and every surface agrees on its name.
 *
 * Only the label key lives here — copy stays in i18n/ui.ts under `nav`.
 */
export type NavLabelKey = 'today' | 'roadmap' | 'topics' | 'progress' | 'me' | 'saved' | 'sources' | 'search' | 'session' | 'timed';

export interface AppRoute {
  path: string;
  labelKey: NavLabelKey;
  icon: LucideIcon;
  /** Listed in the desktop rail, in array order. */
  rail?: boolean;
  /** Slot in the mobile tab bar; `start` is the centre action. */
  tab?: 'left' | 'start' | 'right';
  /** Listed in the command palette's Navigation group. */
  palette?: boolean;
  /** Moving between two tab roots is a lateral swap, not a push. */
  tabRoot?: boolean;
  /** NavLink `end` — only the exact path counts as active. */
  end?: boolean;
  /** The page chunk, for idle prefetch and tap-time warm-up. */
  load: () => Promise<unknown>;
}

export const ROUTES: AppRoute[] = [
  { path: '/',          labelKey: 'today',    icon: Home,       rail: true, tab: 'left',  palette: true, tabRoot: true, end: true, load: () => import('../pages/HomePage') },
  { path: '/roadmap',   labelKey: 'roadmap',  icon: Milestone,  rail: true, tab: 'left',  palette: true, tabRoot: true, load: () => import('../pages/RoadmapPage') },
  { path: '/study',     labelKey: 'session',  icon: Brain,                  tab: 'start', palette: true, tabRoot: true, load: () => import('../pages/StudyPage') },
  { path: '/topics',    labelKey: 'topics',   icon: LayoutGrid, rail: true, tab: 'right', palette: true, tabRoot: true, load: () => import('../pages/TopicsPage') },
  // The knowledge base is a destination in its own right, so it sits in the
  // rail next to the catalogue; phones reach it from Topics and Me.
  { path: '/knowledge', labelKey: 'sources',  icon: Library,    rail: true,               palette: true, tabRoot: true, load: () => import('../pages/KnowledgePage') },
  { path: '/stats',     labelKey: 'progress', icon: TrendingUp, rail: true,               palette: true, tabRoot: true, load: () => import('../pages/StatsPage') },
  { path: '/settings',  labelKey: 'me',       icon: User,       rail: true, tab: 'right', palette: true, tabRoot: true, load: () => import('../pages/SettingsPage') },
  { path: '/bookmarks', labelKey: 'saved',    icon: Bookmark,                             palette: true, tabRoot: true, load: () => import('../pages/BookmarksPage') },
  { path: '/mock',      labelKey: 'timed',    icon: Timer,                                palette: true, tabRoot: true, load: () => import('../pages/MockPage') },
  { path: '/search',    labelKey: 'search',   icon: Search,                                              tabRoot: true, load: () => import('../pages/SearchPage') },
];

export const RAIL_ROUTES: AppRoute[] = ROUTES.filter((r) => r.rail);

/** Tab bar order: left slots, the centre action, right slots. */
export const TAB_ROUTES: AppRoute[] = [
  ...ROUTES.filter((r) => r.tab === 'left'),
  ...ROUTES.filter((r) => r.tab === 'start'),
  ...ROUTES.filter((r) => r.tab === 'right'),
];

export const PALETTE_ROUTES: AppRoute[] = ROUTES.filter((r) => r.palette);

export const TAB_ROOTS: string[] = [...ROUTES.filter((r) => r.tabRoot).map((r) => r.path), '/login', '/signup'];

/** Full-screen flows where the tab bar would compete with the running UI. */
export const HIDE_BOTTOM_NAV: RegExp[] = [
  /^\/study(\/|$)/,
  /^\/mock(\/|$)/,
  /^\/round(\/|$)/,
  /^\/login(\/|$)/,
  /^\/signup(\/|$)/,
  /\/print$/,
  /\/cheatsheet$/,
];

/** Routes whose mobile header shows Close instead of Search. */
export const FOCUS_ROUTES: RegExp[] = [/^\/study(\/|$)/, /^\/mock(\/|$)/, /^\/round(\/|$)/, /^\/login(\/|$)/, /^\/signup(\/|$)/];

export const routeLabel = (t: UICopy, route: Pick<AppRoute, 'labelKey'>): string => t.nav[route.labelKey];

/** The registered destination at an exact path, if any. */
export const routeAt = (path: string): AppRoute | undefined => ROUTES.find((r) => r.path === path);
