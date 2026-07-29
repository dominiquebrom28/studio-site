import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// A separate config from vitest.config.ts ON PURPOSE, same reasoning as
// vitest.content.config.ts's split-out: `src/lib/csp/distIndexHash.test.ts`
// asserts against `dist/index.html` (the BUILD OUTPUT), so it can only be
// run correctly AFTER `npm run build` — it is deliberately excluded from
// `vitest.config.ts`'s default `include`/`exclude` (see that file's
// comment) so a bare `npm test` (which runs pre-build) can't false-fail
// (no dist/ yet) or false-pass against a stale local dist/ from an earlier
// build. This config exists so that ordering constraint is enforced by
// which npm script/CI step you run, not by developer discipline.
//
// Node environment, no plugins — this only reads two files off disk and
// hashes a string, same shape as vitest.content.config.ts.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
      '@content': path.resolve(dirname, './content'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/lib/csp/distIndexHash.test.ts'],
  },
});
