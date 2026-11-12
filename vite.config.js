import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

// Multi-page build for GitHub Pages:
//   /        -> index.html        (public leaderboard + TV / projector mode)
//   /admin/  -> admin/index.html  (login + role-based dashboard)
// base: './' keeps every asset URL relative, so the site works from
// https://<user>.github.io/<repo>/ without hard-coding the repository name.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: `${root}index.html`,
        admin: `${root}admin/index.html`,
      },
    },
  },
});
