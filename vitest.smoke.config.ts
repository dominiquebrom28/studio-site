import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Separate from vitest.config.ts (node-env content tests) AND vite.config.ts
// (the real app build) on purpose:
//
// - Needs a real DOM (jsdom) + the React plugin for JSX — the unit-test
//   config deliberately stays DOM-free and light.
// - Needs `__LAST_COMMIT_RELATIVE__` defined (Footer.tsx reads it as a
//   build-time global) but does NOT need Tailwind — nothing here asserts on
//   computed styles, only on DOM structure/content, so skipping the
//   Tailwind Vite plugin keeps this config's startup cheap.
//
// This is what src/smoke/*.smoke.test.tsx runs under (see the `test:smoke`
// npm script) — a real mount of the actual router tree under
// <StrictMode>, not `renderToStaticMarkup`. That distinction is the whole
// point: see src/smoke/routes.smoke.test.tsx's file-level doc comment.
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
    include: ['src/smoke/**/*.smoke.test.tsx'],
    setupFiles: ['src/smoke/setup.ts'],
  },
});
