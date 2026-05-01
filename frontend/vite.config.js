import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const inferredBase = isGithubActions && repoName ? `/${repoName}/` : '/';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || inferredBase,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['seed/static-data.json', 'favicon.svg', 'maskable-icon.svg'],
      manifest: {
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
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        lang: 'en',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'maskable-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Bump the cache size cap so Shiki's WASM bundle doesn't blow it.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,woff2,json}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/seed/static-data.json'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'rtf-static-data' },
          },
        ],
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
