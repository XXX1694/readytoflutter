import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const inferredBase = isGithubActions && repoName ? `/${repoName}/` : '/';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || inferredBase,
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
