import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const initialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

export const usePrefs = create(
  persist(
    (set, get) => ({
      // Theme
      theme: 'light',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
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
    }),
    {
      name: 'rtf:prefs:v1',
      storage: createJSONStorage(() => localStorage),
      // Only persist user-controllable bits, not transient UI state.
      partialize: (s) => ({
        theme: s.theme,
        topicFilter: s.topicFilter,
        searchFacets: s.searchFacets,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    },
  ),
);

// Hydrate theme synchronously on module load so the dark class is applied before
// React mounts (avoids the FOUC of light → dark on first paint).
if (typeof window !== 'undefined') {
  const t = initialTheme();
  applyTheme(t);
  // Push it into the store too so the rest of the app reads consistent state
  // even before persist rehydrates.
  usePrefs.setState({ theme: t });
}
