import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Standalone from vite.config.ts on purpose: the loader/frontmatter/schema
// suite under test is pure TS + Vite's `import.meta.glob`, no React/Tailwind
// needed, so we keep the test runtime light (node environment, no plugins).
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
      '@content': path.resolve(dirname, './content'),
    },
  },
  test: {
    environment: 'node',
    // `scripts/**/*.test.ts` added for the provenance parser/generator
    // (`scripts/provenance/*.mjs`) — colocated with the `.mjs` files they
    // test, same convention as every other suite in this config living
    // next to its source. Node-environment content tests otherwise; this is
    // no exception (no DOM, pure functions + fixture files on disk).
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    // Excluded here on purpose:
    // - `validate-content.test.ts` is the content-validation GATE, run (and
    //   reported on) separately via `npm run validate:content` /
    //   vitest.content.config.ts. See that config's header comment.
    // - `distIndexHash.test.ts` asserts against `dist/index.html`, which
    //   does not exist yet when `npm test` runs (this config's suite is
    //   PRE-build in the `build` job). Included here it would either
    //   false-fail on every run (no dist/) or false-pass against a stale
    //   dist/ left over from a previous local build — neither is the point.
    //   It runs POST-build instead, via `npm run verify:dist-csp-hash` /
    //   vitest.dist-csp.config.ts. See that test file's header comment.
    // - `check-backlog-checkoffs.real-corpus.test.ts` shells out to the REAL
    //   `gh` CLI over the network (BACKLOG.md MEDIUM, 2026-08-06/07) — kept
    //   out of the default hermetic sweep, run instead via `npm run
    //   test:real-corpus` / vitest.real-corpus.config.ts. See that test
    //   file's own header comment for the full rationale.
    exclude: [
      '**/node_modules/**',
      'src/content/validate-content.test.ts',
      'src/lib/csp/distIndexHash.test.ts',
      'scripts/check-backlog-checkoffs.real-corpus.test.ts',
    ],
  },
});
