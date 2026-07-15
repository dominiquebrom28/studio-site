import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const dirname = path.dirname(fileURLToPath(import.meta.url));

function getLastCommitRelativeTime(): string {
  try {
    return execSync('git log -1 --format=%cr', { cwd: dirname }).toString().trim();
  } catch {
    return '';
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
      '@content': path.resolve(dirname, './content'),
    },
  },
  server: {
    fs: {
      // content/ lives outside src/ (repo root), allow the dev server to read it
      allow: [path.resolve(dirname, '.')],
    },
  },
  define: {
    // build-time value, not a runtime fetch — no backend (spec §8 / design-brief §6 Footer)
    __LAST_COMMIT_RELATIVE__: JSON.stringify(getLastCommitRelativeTime()),
  },
  build: {
    // no secrets exist, but this is free hardening (spec §5 #36) — never ship .map in prod
    sourcemap: false,
  },
});
