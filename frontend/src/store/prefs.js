import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Two reading themes: light and dark. Sepia was removed (low usage, tripled
// the surface area for every CSS-touching change). Persisted 'sepia' is
// migrated to 'light' on hydrate — see THEMES guard in initialTheme.
export const THEMES = ['light', 'dark'];

const initialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('theme');
  if (THEMES.includes(saved)) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const THEME_COLORS = {
  light: '#FAFAFB',
  dark:  '#09090B',
};

const applyTheme = (theme) => {
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
  let meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
};

const nextTheme = (current) => {
  const i = THEMES.indexOf(current);
  return THEMES[(i + 1) % THEMES.length];
};

export const usePrefs = create(
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

      // Sidebar (mobile)
      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // Topic page filter
      topicFilter: 'all', // 'all' | 'not_started' | 'in_progress' | 'completed'
      setTopicFilter: (topicFilter) => set({ topicFilter }),

      // Dashboard / sidebar platform scope — splits the 50+ topic catalog into
      // Flutter / iOS / Android / Cross-Platform / Mobile so users can focus
      // on the stack they're interviewing for. 'all' shows every topic.
      platform: 'all', // 'all' | 'flutter' | 'ios' | 'android' | 'cross' | 'mobile'
      setPlatform: (platform) => set({ platform }),

      // Search facets
      searchFacets: { level: null, difficulty: null, status: null },
      setSearchFacet: (key, value) =>
        set((s) => ({ searchFacets: { ...s.searchFacets, [key]: value } })),
      resetSearchFacets: () =>
        set({ searchFacets: { level: null, difficulty: null, status: null } }),

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
      partialize: (s) => ({
        theme: s.theme,
        topicFilter: s.topicFilter,
        searchFacets: s.searchFacets,
        recallMode: s.recallMode,
        platform: s.platform,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    },
  ),
);

// Hydrate theme synchronously on module load so the dark class is applied
// before React mounts (avoids the FOUC of light → dark on first paint).
//
// Migration: a previously-persisted 'sepia' value won't pass THEMES.includes
// in initialTheme, so it falls back to the system pref → effectively
// migrating those users to light/dark. We also write the migrated value
// back to localStorage so the legacy string never resurfaces.
if (typeof window !== 'undefined') {
  const t = initialTheme();
  applyTheme(t);
  usePrefs.setState({ theme: t });
  try {
    if (localStorage.getItem('theme') === 'sepia') {
      localStorage.setItem('theme', t);
    }
  } catch { /* private mode / quota — fine */ }
}
