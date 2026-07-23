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
    // Excluded here on purpose — this is the content-validation GATE, run
    // (and reported on) separately via `npm run validate:content` /
    // vitest.content.config.ts. See that config's header comment.
    exclude: ['**/node_modules/**', 'src/content/validate-content.test.ts'],
  },
});
