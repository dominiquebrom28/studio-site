import { defineConfig } from 'vitest/config';

// A separate config from vitest.config.ts ON PURPOSE, same reasoning as
// vitest.content.config.ts (the content-validation gate) and
// vitest.smoke.config.ts (the real-DOM route mount): the three real-corpus
// tests in check-backlog-checkoffs.real-corpus.test.ts shell out to the REAL
// `gh` CLI over the network — this repo's only test suite that does. Kept
// OUT of the default `npm test` sweep so that command stays hermetic (fast,
// no network, works for a contributor with no `gh` login) — see that test
// file's own header comment for the full design rationale (BACKLOG.md
// MEDIUM, 2026-08-06/07) and `.github/workflows/ci.yml`'s `backlog-checkoffs`
// job for where this still runs, for real, on every PR.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/check-backlog-checkoffs.real-corpus.test.ts'],
  },
});
