import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// A separate config from vitest.config.ts ON PURPOSE, even though this file
// runs the same node-environment content tests: the content-VALIDATION
// gate (src/content/validate-content.test.ts) is deliberately kept out of
// the default `npm test` sweep so it can be run, and reported on, as its
// own standalone command (`npm run validate:content`) whose result is
// independent of the existing unit-test suite's pass/fail state. See that
// file's header comment for why: it is expected to be able to fail against
// REAL committed content (that's the point of the gate), and this repo's
// author was told explicitly not to silently edit content to force it
// green. Keeping it out of `vitest.config.ts`'s `include` means a real,
// pre-existing content violation doesn't retroactively turn the existing,
// already-green `npm test` gate red.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
      '@content': path.resolve(dirname, './content'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/content/validate-content.test.ts'],
  },
});
