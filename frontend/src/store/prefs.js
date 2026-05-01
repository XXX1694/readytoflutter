import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Three reading themes: cool paper / warm ink / sepia (eye-friendly evenings).
// Cycle in this order when toggling so users discover sepia naturally.
export const THEMES = ['light', 'sepia', 'dark'];

const initialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('theme');
  if (THEMES.includes(saved)) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  // Toggle one class per theme so CSS can target each variant; light is the
  // default (no class).
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('sepia', theme === 'sepia');
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

// Hydrate theme synchronously on module load so the dark/sepia class is applied
// before React mounts (avoids the FOUC of light → dark on first paint).
if (typeof window !== 'undefined') {
  const t = initialTheme();
  applyTheme(t);
  usePrefs.setState({ theme: t });
}
