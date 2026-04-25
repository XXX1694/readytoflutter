import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';

/**
 * Auth store — single source of truth for the current session.
 *
 * Persists `token` and `user` to localStorage so a refresh stays signed in.
 * The token is also placed on a default Authorization header on a shared
 * axios instance the rest of the app reads (frontend/src/api/api.js).
 *
 * `backendAvailable` is determined once at startup by pinging
 * /api/auth/health — when the bundle is served from GitHub Pages without a
 * backend, it stays false and the auth UI hides itself.
 */

const STORAGE_KEY = 'rtf:auth:v1';

export const useAuth = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      backendAvailable: null, // null = unknown, true | false once probed
      probing: false,
      // Last successful sync timestamp (ms) — informational only.
      lastSyncAt: null,

      // ── Setters ────────────────────────────────────────────────────────────
      setSession: (token, user) => {
        set({ token, user });
      },
      clearSession: () => {
        set({ token: null, user: null });
      },
      setBackendAvailable: (backendAvailable) => set({ backendAvailable }),
      markSynced: () => set({ lastSyncAt: Date.now() }),

      // ── Probes / actions ──────────────────────────────────────────────────
      // Fired once on app boot so we know whether to show auth UI at all.
      probeBackend: async (apiBase) => {
        if (get().probing) return get().backendAvailable;
        set({ probing: true });
        try {
          await axios.get(`${apiBase}/auth/health`, { timeout: 2500 });
          set({ backendAvailable: true });
        } catch {
          set({ backendAvailable: false });
        } finally {
          set({ probing: false });
        }
        return get().backendAvailable;
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Don't persist transient probe state.
      partialize: (s) => ({ token: s.token, user: s.user, lastSyncAt: s.lastSyncAt }),
    },
  ),
);

// Convenience selectors
export const isAuthenticated = () => Boolean(useAuth.getState().token);
