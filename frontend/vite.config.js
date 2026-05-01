import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const inferredBase = isGithubActions && repoName ? `/${repoName}/` : '/';
const base = process.env.VITE_BASE_PATH || inferredBase;

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // `prompt` lets us surface an "Update available — refresh" toast
      // instead of the user discovering a stale UI on next reload. The
      // SW skips waiting + claims clients in one click.
      registerType: 'prompt',
      includeAssets: [
        'seed/static-data.json', 'favicon.svg', 'icon-source.svg',
        'pwa/apple-touch-icon.png',
        'pwa/apple-touch-icon-167.png',
        'pwa/apple-touch-icon-152.png',
        'pwa/apple-touch-icon-120.png',
        'pwa/favicon-32.png',
        'pwa/favicon-16.png',
      ],
      manifest: {
        // Stable identifier so `start_url` query strings don't fork the
        // installed PWA into multiple "apps" in Chrome.
        id: '/',
        name: 'prepiroshi — Mobile Interview Prep',
        short_name: 'prepiroshi',
        description: 'Flutter, iOS, Android & cross-platform mobile interview workspace with spaced repetition, mock interviews and a curated knowledge base.',
        // Theme color tracks the app's light surface so the iOS status bar
        // and the Android system chrome blend with the paper background.
        // The dark variant is exposed via <meta name="theme-color"> in
        // index.html, keyed off prefers-color-scheme.
        theme_color: '#FAFAFB',
        background_color: '#FAFAFB',
        display: 'standalone',
        // `window-controls-overlay` lets the desktop PWA pull title-bar
        // real estate; falls back gracefully on browsers that ignore it.
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        dir: 'ltr',
        categories: ['education', 'productivity'],
        prefer_related_applications: false,
        // Long-press the home-screen icon on Android → these jump straight
        // into the relevant flow.
        shortcuts: [
          {
            name: 'Start a study session',
            short_name: 'Study',
            description: 'Open the SRS queue',
            url: '/study',
            icons: [{ src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Mock interview',
            short_name: 'Mock',
            description: 'Run a timed mock interview',
            url: '/mock',
            icons: [{ src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Knowledge base',
            short_name: 'Knowledge',
            description: 'Curated learning resources',
            url: '/knowledge',
            icons: [{ src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Saved questions',
            short_name: 'Saved',
            description: 'Your bookmarked questions',
            url: '/bookmarks',
            icons: [{ src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        icons: [
          // PNG icons take priority on platforms (Android, iOS) that do
          // not yet honour SVG manifest entries reliably. SVG is kept as
          // a fallback for desktop browsers / Chromium install UI which
          // can sharpen to any DPI.
          {
            src: 'pwa/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon-source.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // Bump the cache size cap so Shiki's WASM bundle doesn't blow it.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // Precache the entire build output, including images, fonts and the
        // generated PWA bitmap assets so the app cold-boots offline.
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,avif,woff2,json,ico}'],
        // Routes inside the SPA — workbox serves index.html for any
        // navigation that doesn't match a real precached file. Must match
        // the actual precached path, which includes the base prefix on
        // sub-path deploys (e.g. /readytoflutter/index.html on GH Pages).
        navigateFallback: `${base}index.html`,
        // Exclude /api/* (backend) and the base-prefixed /api/* so the SW
        // never intercepts backend requests regardless of base path.
        navigateFallbackDenylist: [/\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/seed/static-data.json'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'rtf-static-data' },
          },
          {
            // Cache YouTube thumbnails (Knowledge page recents strip) so
            // they appear instantly on revisit and survive offline.
            urlPattern: /^https:\/\/i\.ytimg\.com\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'rtf-youtube-thumbs',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Skip-waiting + clients-claim wired through `messageSkipWaiting`
        // — the React update toast triggers it on user click.
        skipWaiting: false,
        clientsClaim: true,
      },
      // Make the service worker available in `npm run dev` too so we can
      // test the install + update flow without a production build.
      devOptions: {
        enabled: false, // SW in dev confuses HMR; flip to `true` for PWA QA.
        type: 'module',
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Hand-rolled chunking: keep the Shiki + WASM payload separate from
        // the main bundle so the dashboard's first paint isn't blocked by it.
        manualChunks: (id) => {
          if (id.includes('shiki') || id.includes('@shikijs')) return 'shiki';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('@tanstack')) return 'tanstack';
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['./vitest.setup.js'],
  },
});
