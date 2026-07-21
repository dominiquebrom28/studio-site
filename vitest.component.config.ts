import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Component-level interaction tests (BACKLOG "Component-level test
// infrastructure is missing repo-wide") — the third leg alongside
// vitest.config.ts (node-env content/schema/loader logic, `*.test.ts` only)
// and vitest.smoke.config.ts (full-route real-DOM mounts, `*.smoke.test.tsx`
// only). Before this config existed, `vitest.config.ts`'s `include` was
// `src/**/*.test.ts` — no glob anywhere matched `.tsx`, so a component test
// file could sit in the repo, report "0 tests," and nobody would notice
// (there was no CI step that would even try to run it). This config closes
// that gap: it is the one place a single component's rendered DOM,
// click/keyboard interactions, and focus behavior get asserted on directly,
// rather than only indirectly through a full-route smoke mount.
//
// Deliberately excludes BOTH `src/smoke/**` (own config, own npm script,
// own CI step — full-route StrictMode mounts are a different kind of
// check, see vitest.smoke.config.ts's header) and `src/**/*.test.ts` (the
// node-env unit suite — no DOM needed there, keep it cheap) so the three
// configs each own a disjoint slice of the test tree with no double-running.
//
// jsdom + the React plugin + `__LAST_COMMIT_RELATIVE__` mirror
// vitest.smoke.config.ts exactly (same reasoning: `Footer.tsx` reads that
// global at build time; nothing here needs Tailwind's computed styles
// either, so the Tailwind Vite plugin stays out for the same startup-cost
// reason). Reuses `src/smoke/setup.ts` rather than forking it — those jsdom
// stubs (window.scrollTo, IntersectionObserver) exist because real
// components call real browser APIs jsdom doesn't implement, which is just
// as true when a component is mounted standalone as when it's mounted via
// a full route.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
      '@content': path.resolve(dirname, './content'),
    },
  },
  define: {
    __LAST_COMMIT_RELATIVE__: JSON.stringify(''),
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx'],
    exclude: ['**/node_modules/**', 'src/smoke/**'],
    setupFiles: ['src/smoke/setup.ts'],
  },
});
