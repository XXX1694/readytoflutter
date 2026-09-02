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
      // A new worker installs and waits; PwaPrompts applies it (and reloads)
      // at the first moment that interrupts nothing — never inside a
      // session, and not under a reader's feet. 'autoUpdate' reloaded the
      // page the instant the worker activated, mid-mock-interview included.
      registerType: 'prompt',
      // Nothing from public/ goes into the precache beyond the manifest and
      // its icons (the plugin adds those itself): a precached
      // static-data.json is served from the cache first, which is exactly
      // the staleness this configuration exists to avoid. Runtime caching
      // below covers everything else network-first.
      includeAssets: [],
      manifest: {
        // `id`, `start_url` and `scope` are left to the plugin, which derives
        // them from `base` — on GitHub Pages that is /<repo>/, and a hardcoded
        // '/' launched the installed app at the wrong site.
        name: 'Onsite — Mobile Interview Prep',
        short_name: 'Onsite',
        description: 'Flutter, iOS, Android & cross-platform mobile interview workspace with spaced repetition, mock interviews and a curated knowledge base.',
        // Theme color tracks the app's light surface so the iOS status bar
        // and the Android system chrome blend with the paper background.
        // The dark variant is exposed via <meta name="theme-color"> in
        // index.html, keyed off prefers-color-scheme.
        theme_color: '#F9F9F6',
        background_color: '#F9F9F6',
        display: 'standalone',
        // `window-controls-overlay` lets the desktop PWA pull title-bar
        // real estate; falls back gracefully on browsers that ignore it.
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait',
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
            url: 'study',
            icons: [{ src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Mock interview',
            short_name: 'Mock',
            description: 'Run a timed mock interview',
            url: 'mock',
            icons: [{ src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Knowledge base',
            short_name: 'Knowledge',
            description: 'Curated learning resources',
            url: 'knowledge',
            icons: [{ src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Saved questions',
            short_name: 'Saved',
            description: 'Your bookmarked questions',
            url: 'bookmarks',
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
        // Our own push + notificationclick handlers. generateSW writes the
        // service worker, so importScripts is the only way to add code to it.
        // push-sw.js is copied verbatim from public/ and lands beside sw.js,
        // so the relative path resolves under any base path.
        //
        // It deliberately stays inside globPatterns below: precaching it is
        // what gives it a revision hash inside sw.js, and that hash changing
        // is what makes the browser notice a worker update. Excluding it
        // would pin every user to the handlers they first installed.
        importScripts: ['push-sw.js'],
        // Bump the cache size cap so a large grammar can't blow it.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // No app-shell precache. Precaching served index.html and every
        // asset cache-first, so a deploy was invisible until the worker
        // was swapped and the page reloaded — users kept seeing the old
        // build for a full visit. Of our own files only push-sw.js is
        // precached: its revision hash inside sw.js is what makes the
        // browser notice a change to the push handlers.
        globPatterns: ['push-sw.js'],
        // No precached shell to fall back to; the navigation route below
        // keeps the last fetched documents for offline use, and falls back
        // to one of them for a path it has never seen.
        navigateFallback: null,
        // Old precache caches are dropped when the new worker activates,
        // so nobody keeps serving a stale shell from a cache we no longer
        // write to.
        cleanupOutdatedCaches: true,
        // Everything same-origin is network-first: online you always get
        // the current build, offline you get the last one that loaded.
        // Hashed /assets/ are the exception — their URL changes with their
        // content, so cache-first is both safe and fast.
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.mode === 'navigate' && !url.pathname.includes('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rtf-pages',
              networkTimeoutSeconds: 4,
              // `/?stack=ios` and `/topics?level=junior` are the same document
              // as the bare path: match on the path so a query string never
              // turns into an offline miss.
              matchOptions: { ignoreSearch: true },
              expiration: { maxEntries: 50 },
              plugins: [
                {
                  // GitHub Pages sends max-age=600 on HTML, and a plain fetch
                  // from the worker honours the browser's HTTP cache — the
                  // page could stay ten minutes behind a deploy. Workbox
                  // ignores `fetchOptions` for navigation requests
                  // (workbox#1796), so the request itself is rebuilt with
                  // `no-cache`: a conditional request, answered with 304 when
                  // nothing changed and with the new document when it did.
                  requestWillFetch: async ({ request }) =>
                    new globalThis.Request(request.url, { cache: 'no-cache', credentials: 'same-origin' }),
                },
                {
                  // Offline, on a path this cache has never seen — a home
                  // screen shortcut, a notification tap, any route reached
                  // by pushState rather than a full load — serve the last
                  // document fetched. The app is one shell: it renders the
                  // route from the cached static data. Without this the
                  // browser shows its own error page.
                  handlerDidError: async () => {
                    const cache = await globalThis.caches.open('rtf-pages');
                    const shell = await cache.match(globalThis.registration.scope, { ignoreSearch: true });
                    if (shell) return shell;
                    const [first] = await cache.keys();
                    return first ? cache.match(first) : undefined;
                  },
                },
              ],
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.includes('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'rtf-assets',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/seed/static-data.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rtf-static-data',
              networkTimeoutSeconds: 4,
              fetchOptions: { cache: 'no-cache' },
              cacheableResponse: { statuses: [200] },
            },
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
          {
            // Icons, manifest, fonts outside /assets/ — anything else on
            // this origin that is not the backend.
            urlPattern: ({ sameOrigin, url }) => sameOrigin && !url.pathname.includes('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rtf-shell',
              networkTimeoutSeconds: 4,
              fetchOptions: { cache: 'no-cache' },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
        // A new worker waits for PwaPrompts to say when (registerType
        // 'prompt' above); once told, it takes over every open tab.
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
        // Hand-rolled chunking: keep the Shiki payload separate from the main
        // bundle so the dashboard's first paint isn't blocked by it.
        manualChunks: (id) => {
          // Grammars are deliberately NOT forced into the shared chunk —
          // highlighter.ts imports each one dynamically, so leaving them to
          // Rollup gives one chunk per language and a Dart question downloads
          // only the Dart grammar. Lumping them together here would undo that.
          if (id.includes('@shikijs/langs')) return;
          // Shiki core + the JS regex engine (and the oniguruma-to-es / regex
          // transpiler it depends on) are shared by every snippet, so they
          // belong in one chunk rather than duplicated per grammar.
          if (
            id.includes('shiki')
            || id.includes('@shikijs')
            || id.includes('oniguruma-to-es')
            || id.includes('regex-recursion')
            || id.includes('regex-utilities')
            || /node_modules\/regex\//.test(id)
          ) return 'shiki';
          // The hast / character-entity helpers are shared by Shiki's HTML
          // serialiser and react-markdown; in their own small chunk neither
          // side has to import the other's parser.
          if (/node_modules\/(hast-util-to-html|hast-util-[a-z-]+|property-information|space-separated-tokens|comma-separated-tokens|ccount|zwitch|stringify-entities|character-entities|character-entities-legacy|character-reference-invalid|decode-named-character-reference|html-void-elements|is-decimal|is-hexadecimal|is-alphanumerical|is-alphabetical|@types\/hast|@types\/unist)/.test(id)) return 'hast';
          if (id.includes('framer-motion')) return 'motion';
          // react-markdown pulls the unified / micromark / mdast family in;
          // every page that shows an answer shares one chunk of it. The tiny
          // hast/property helpers it shares with Shiki are left to Rollup so
          // a highlighted snippet does not drag the whole parser in.
          if (/node_modules\/(react-markdown|remark-|micromark|mdast-|unified|unist-|vfile|trim-lines|bail|is-plain-obj|trough|devlop|markdown-table|longest-streak|style-to-js|style-to-object|inline-style-parser|estree-util-is-identifier-name|html-url-attributes)/.test(id)) return 'markdown';
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
  // `vite preview` is the only local way to exercise the service worker —
  // devOptions.enabled is false, so `npm run dev` has no worker at all — and
  // without this it served the built app with no backend behind it, silently
  // dropping into the anonymous static-data fallback. Mirrors the dev proxy.
  preview: {
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
    include: ['src/**/*.test.{ts,tsx,js,jsx}'],
    setupFiles: ['./vitest.setup.js'],
  },
});
