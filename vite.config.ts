import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import fs from 'node:fs';
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

// Hand-made git worktrees (see BACKLOG.md worktree-isolation items) share a single
// `node_modules` via a manually-created symlink, so `npm install` isn't run per
// worktree. Vite's default `cacheDir` is `<root>/node_modules/.vite`, computed from
// *this* checkout's root — but when `node_modules` is that shared symlink, the
// computed path resolves through it to the SAME physical directory on disk for
// every worktree (verified: two worktrees' `node_modules/.vite` share one
// realpath). Concurrent dev servers then read/write the same dep-optimizer cache
// and corrupt each other's pre-bundled chunks (`Invalid hook call ... more than
// one copy of React`). Give a symlinked checkout its own cache dir OUTSIDE
// node_modules (so the symlink can't make it collide with another worktree's). A
// normal checkout — where node_modules is a real directory, not a symlink — is
// left with Vite's untouched default so this has zero effect there.
// Residual gap: this does not fix `npm install` replacing the node_modules symlink
// inside a worktree — that's a separate, already-known trap tracked in
// BACKLOG.md's worktree-isolation items.
const isSymlinkedNodeModules = (() => {
  try {
    return fs.lstatSync(path.resolve(dirname, 'node_modules')).isSymbolicLink();
  } catch {
    return false;
  }
})();
const cacheDir = isSymlinkedNodeModules ? path.resolve(dirname, '.vite-cache') : undefined;

// https://vite.dev/config/
export default defineConfig({
  cacheDir,
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
