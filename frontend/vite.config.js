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
      includeAssets: ['seed/static-data.json'],
      manifest: {
        name: 'ReadyToFlutter — Codex',
        short_name: 'Codex',
        description: 'Flutter & Dart interview prep with spaced repetition.',
        theme_color: '#0175C2',
        background_color: '#FAF8F4',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💙</text></svg>",
            sizes: '512x512',
            type: 'image/svg+xml',
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
