import { defineConfig, devices } from '@playwright/test';

/**
 * Real-browser lane (BACKLOG P1 "Real-browser responsive/visual testing").
 *
 * WHY THIS EXISTS: jsdom (vitest.smoke.config.ts / vitest.component.config.ts)
 * cannot evaluate CSS media queries at all — every `lg:hidden` / `hidden
 * lg:block` responsive split in the app renders as "both branches present in
 * the DOM" under jsdom (see `src/pages/BlogPost.test.tsx`'s own comment on
 * this), so a real per-viewport visibility bug is structurally invisible to
 * the existing suites. That gap produced a real P0 on 2026-07-17 (mobile
 * metadata stacked after the entire article body — reports/2026-07-17.md)
 * and a second one on 2026-07-18 (the same metadata visible twice at once at
 * desktop width). `e2e/reading-order.spec.ts` is the test that would have
 * caught both.
 *
 * WHY `vite preview` AGAINST `dist/`, NOT the dev server: the dev server
 * serves unminified, unbundled modules with an HMR client injected — a
 * meaningfully different artifact from what actually ships. `vite preview`
 * serves the exact `dist/` output `npm run build` produces (same asset
 * hashes, same minified CSS/JS, same `index.html`), which is what a real
 * user's browser evaluates media queries against. Using Playwright's
 * `webServer` (rather than a separate manually-managed `vite preview &`
 * process) lets Playwright start/health-check/stop it itself, identically in
 * CI and locally — no separate process-lifecycle script to maintain.
 *
 * NOTE: `vite preview` does NOT apply `vercel.json`'s response headers
 * (CSP, HSTS, etc.) — those are a Vercel platform feature, not something
 * `vite preview` reproduces. This lane cannot verify headers; that remains
 * `scripts/check-deployed-routes.mjs`'s territory (a real deployed URL) or a
 * future dedicated header-assertion script (BACKLOG P2 "dist-side CSP hash
 * assertion").
 *
 * Chromium only (see .github/workflows/ci.yml's `e2e` job comment for the
 * cost/coverage tradeoff — this is a deliberate, revisitable choice, not an
 * oversight).
 */

const PORT = 4319; // deliberately not Vite's dev (5173) or preview (4173) default — avoid colliding with another concurrent local session's server on this shared machine
// `localhost`, not `127.0.0.1`: `vite preview` binds to the hostname
// `localhost` resolves to (IPv6 `::1` on this machine) — polling
// `127.0.0.1` directly missed it entirely and the webServer health check
// timed out (falsified while wiring this up).
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Single worker in CI: this lane is brand new (introduced 2026-07-24) and
  // Playwright lanes are notoriously flaky on first introduction — trading
  // a little CI time for determinism while it proves itself out, per the
  // advisory-first sequencing recommendation in this PR's report. Revisit
  // once it's had a few weeks of green runs.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // `npm run build` is NOT run here — CI's `e2e` job builds separately
    // first (see ci.yml) so the build log is visible as its own step; the
    // local dev loop is expected to run `npm run build` once, then iterate
    // on `npm run test:e2e` against the same `dist/` without rebuilding
    // every time.
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
