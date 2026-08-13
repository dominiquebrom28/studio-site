import { defineConfig } from 'vitest/config';

// A separate config from vitest.config.ts ON PURPOSE, same reasoning as
// vitest.content.config.ts (the content-validation gate) and
// vitest.smoke.config.ts (the real-DOM route mount): both files included
// below shell out to the REAL `gh` CLI over the network — this repo's only
// two test suites that do. Kept OUT of the default `npm test` sweep so that
// command stays hermetic (fast, no network, works for a contributor with no
// `gh` login) — see each test file's own header comment for its full design
// rationale (BACKLOG.md MEDIUM, 2026-08-06/07) and
// `.github/workflows/ci.yml`'s `backlog-checkoffs` job for where both still
// run, for real, on every PR.
//
// Both are listed here DELIBERATELY, not just the one that prompted this
// config's creation — `check-stranded-branches.test.ts` shipped an
// identical real-`gh` corpus block one day earlier (PR #106, 2026-08-05)
// than `check-backlog-checkoffs.test.ts`'s (PR #110, 2026-08-06), and the
// two were momentarily left inconsistent (one moved here, one still sitting
// in the default sweep) — a state strictly worse than either uniform
// answer, since it makes THIS file's own exclude/include lists an
// inaccurate map of what touches the network. See
// `check-stranded-branches.real-corpus.test.ts`'s header for the full
// correction.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/check-backlog-checkoffs.real-corpus.test.ts', 'scripts/check-stranded-branches.real-corpus.test.ts'],
  },
});
