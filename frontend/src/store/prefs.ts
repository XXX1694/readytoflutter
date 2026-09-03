import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { PlatformKey, ProgressStatus, Level, Difficulty, RoadmapTrackKey } from '../types/domain.ts';

// Two reading themes: light and dark. Sepia was removed (low usage, tripled
// the surface area for every CSS-touching change). Persisted 'sepia' is
// migrated to 'light' on hydrate — see THEMES guard in initialTheme.
export type Theme = 'light' | 'dark';
export const THEMES: Theme[] = ['light', 'dark'];

export type TopicFilter = 'all' | ProgressStatus;
export interface SearchFacets {
  level: Level | null;
  difficulty: Difficulty | null;
  status: ProgressStatus | null;
}

export interface PrefsState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  topicFilter: TopicFilter;
  setTopicFilter: (topicFilter: TopicFilter) => void;

  platform: PlatformKey;
  setPlatform: (platform: PlatformKey) => void;

  // The track the roadmap page was last switched to. `null` until the user
  // picks one there; the page then follows the global stack filter (or
  // Flutter when that filter is 'all'), so the two never need reconciling.
  roadmapTrack: RoadmapTrackKey | null;
  setRoadmapTrack: (roadmapTrack: RoadmapTrackKey) => void;

  commandOpen: boolean;
  setCommandOpen: (commandOpen: boolean) => void;
  toggleCommand: () => void;

  recallMode: boolean;
  setRecallMode: (recallMode: boolean) => void;
  toggleRecallMode: () => void;
}

const initialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Mirrors --paper in index.css (and the <meta name="theme-color"> pair in
// index.html) so the status bar blends with the page instead of a stale grey.
const THEME_COLORS: Record<Theme, string> = {
  light: '#F6F6F3',
  dark:  '#0E0E0D',
};

const applyTheme = (theme: Theme): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  // Toggle one class per theme so CSS can target each variant; light is the
  // default (no class). The .sepia class is also stripped here in case a
  // returning user still has it on <html> from before the removal.
  root.classList.toggle('dark', theme === 'dark');
  root.classList.remove('sepia');

  // Sync the iOS status-bar / Android chrome theme-color so the app shell
  // visually merges with the chosen surface. We override every existing
  // theme-color tag (including the prefers-color-scheme keyed pair in the
  // HTML head) since user choice trumps system pref.
  const color = THEME_COLORS[theme] || THEME_COLORS.light;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
};

// The accent colour is the active stack's. index.css keys `--brand` off
// `data-stack` on <html>, so this one attribute recolours every button, link,
// tile and bar in the app. Anything that changes `platform` — setPlatform,
// the ?stack= URL sync, rehydration — goes through the subscription below.
const applyStack = (platform: PlatformKey): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (platform === 'all') delete root.dataset.stack;
  else root.dataset.stack = platform;
};

const nextTheme = (current: Theme): Theme => {
  const i = THEMES.indexOf(current);
  return THEMES[(i + 1) % THEMES.length];
};

interface PersistedPrefs {
  theme: Theme;
  topicFilter: TopicFilter;
  recallMode: boolean;
  platform: PlatformKey;
  roadmapTrack: RoadmapTrackKey | null;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'light',
      setTheme: (theme) => {
        if (!THEMES.includes(theme)) return;
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next = nextTheme(get().theme);
        applyTheme(next);
        set({ theme: next });
      },

      // Topic page filter
      topicFilter: 'all',
      setTopicFilter: (topicFilter) => set({ topicFilter }),

      // Dashboard / sidebar platform scope — splits the 50+ topic catalog into
      // Flutter / iOS / Android / Cross-Platform / Mobile so users can focus
      // on the stack they're interviewing for. 'all' shows every topic.
      platform: 'all',
      setPlatform: (platform) => set({ platform }),

      roadmapTrack: null,
      setRoadmapTrack: (roadmapTrack) => set({ roadmapTrack }),

      // Command palette open state
      commandOpen: false,
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),

      // Active Recall mode — when true:
      //  - QuestionCard hides answers behind a hint-ladder reveal
      //  - StudyPage shows a one-line gist input before flipping
      // Default off so first-time experience stays light.
      recallMode: false,
      setRecallMode: (recallMode) => set({ recallMode }),
      toggleRecallMode: () => set((s) => ({ recallMode: !s.recallMode })),
    }),
    {
      name: 'rtf:prefs:v1',
      storage: createJSONStorage(() => localStorage),
      // Only persist user-controllable bits, not transient UI state.
      partialize: (s): PersistedPrefs => ({
        theme: s.theme,
        topicFilter: s.topicFilter,
        recallMode: s.recallMode,
        platform: s.platform,
        roadmapTrack: s.roadmapTrack,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
        if (state?.platform) applyStack(state.platform);
      },
    },
  ),
);

// Mirror `platform` to <html data-stack> however it changes.
usePrefs.subscribe((state, prev) => {
  if (state.platform !== prev.platform) applyStack(state.platform);
});

// Hydrate theme synchronously on module load so the dark class is applied
// before React mounts (avoids the FOUC of light → dark on first paint).
//
// Migration: a previously-persisted 'sepia' value won't pass the union check
// in initialTheme, so it falls back to the system pref → effectively
// migrating those users to light/dark. We also write the migrated value
// back to localStorage so the legacy string never resurfaces.
if (typeof window !== 'undefined') {
  // persist hydrates synchronously (localStorage), so the store already holds
  // the user's saved choice here. Applying `initialTheme()` and setState-ing it
  // back overwrote that choice with the system preference on every reload —
  // the legacy 'theme' key it reads is one nothing writes any more. Apply the
  // hydrated value instead; fall back to the system preference only when there
  // is nothing persisted.
  const t = usePrefs.getState().theme || initialTheme();
  applyTheme(t);
  if (t !== usePrefs.getState().theme) usePrefs.setState({ theme: t });
  applyStack(usePrefs.getState().platform);
}
