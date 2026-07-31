import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCspScriptHash, extractCspHashes, extractInlineScripts, findCspHeaderValue } from './inlineScriptHash';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
// This file lives at src/lib/csp/ — three levels below the repo root.
const REPO_ROOT = path.resolve(DIRNAME, '../../..');
const DIST_INDEX_PATH = path.join(REPO_ROOT, 'dist', 'index.html');

/**
 * DIST-side counterpart to `inlineScriptHash.test.ts` (security-auditor P2,
 * PR #42 review).
 *
 * WHY THIS IS A SEPARATE CHECK, NOT JUST THE EXISTING ONE RUN TWICE:
 * `inlineScriptHash.test.ts` runs in `npm test` (pre-build) and asserts the
 * CSP hash in `vercel.json` against the SOURCE `index.html` at the repo
 * root. But the browser never receives that file — it receives whatever
 * Vite emits to `dist/index.html` after `npm run build`. Today the two are
 * byte-identical (lead-verified: Vite passes this particular inline
 * `<script>` through untouched), so the source-side test currently also
 * proves the dist-side property, but only BY COINCIDENCE, not by
 * construction. Nothing pins that coincidence down: a future Vite version
 * bump (a minifier pass that starts touching inline scripts, an HTML
 * transform change, etc.) could change what actually ships to `dist/`
 * without touching `index.html` at the repo root at all — every existing
 * gate, including the source-side test, would stay green while the CSP
 * hash silently stops matching what's actually served, and dark mode
 * breaks (flash-of-wrong-theme) in production only.
 *
 * MUST RUN POST-BUILD: this is why it is deliberately kept OUT of
 * `vitest.config.ts`'s default `include` (see that file's `exclude` entry
 * for this path) and instead lives behind its own npm script
 * (`npm run verify:dist-csp-hash`, `vitest.dist-csp.config.ts`), wired into
 * `.github/workflows/ci.yml`'s `build` job as its own step immediately
 * AFTER the `Build` step — the exact ordering the source-side test cannot
 * offer, since `npm test` (and therefore `inlineScriptHash.test.ts`) runs
 * before `npm run build` in that same job.
 *
 * Reuses the exact extraction/hashing/CSP-parsing code the source-side test
 * uses (`computeCspScriptHash`, `extractCspHashes`, `extractInlineScripts`,
 * `findCspHeaderValue`, all from `./inlineScriptHash`) rather than
 * reimplementing any of it — the two checks must never be able to quietly
 * disagree about what "the hash" means.
 */
describe('dist/index.html inline script hash matches vercel.json CSP (post-build regression guard)', () => {
  it('dist/index.html exists (this suite must run AFTER `npm run build`)', () => {
    expect(
      existsSync(DIST_INDEX_PATH),
      `${DIST_INDEX_PATH} does not exist. This check runs against the BUILD OUTPUT, ` +
        'not the source index.html at the repo root — run `npm run build` first ' +
        '(see the "verify:dist-csp-hash" npm script and the CI step that runs it ' +
        'immediately after the Build step).',
    ).toBe(true);
  });

  it('dist/index.html has exactly one inline (no-src) script — the theme bootstrap, post-build', () => {
    const html = readFileSync(DIST_INDEX_PATH, 'utf8');
    const inlineScripts = extractInlineScripts(html);
    expect(inlineScripts).toHaveLength(1);
  });

  it(
    "the sha256 hash in vercel.json matches a fresh hash of dist/index.html's inline " +
      'script (what the browser actually receives)',
    () => {
      const html = readFileSync(DIST_INDEX_PATH, 'utf8');
      const [inlineScript] = extractInlineScripts(html);
      const freshHash = computeCspScriptHash(inlineScript);

      const vercelJsonRaw = readFileSync(path.join(REPO_ROOT, 'vercel.json'), 'utf8');
      const vercelConfig = JSON.parse(vercelJsonRaw);
      const csp = findCspHeaderValue(vercelConfig);
      const [shippedHash] = extractCspHashes(csp);

      expect(
        freshHash,
        `CSP hash mismatch (DIST-SIDE): dist/index.html's inline <script> — what the ` +
          `browser actually receives — no longer matches the 'sha256-...' hash shipped ` +
          `in vercel.json's Content-Security-Policy header, even though the SOURCE-side ` +
          `check (inlineScriptHash.test.ts) is green. This means the BUILD PIPELINE ` +
          `(Vite) is now transforming the inline script's bytes between index.html and ` +
          `dist/index.html (e.g. a minifier or HTML-transform change), not that the ` +
          `script itself was hand-edited. In production the browser will silently drop ` +
          `the script under CSP and dark mode will break (flash of wrong theme). ` +
          `Recompute the hash against the BUILT dist/index.html (computeCspScriptHash ` +
          `from src/lib/csp/inlineScriptHash.ts) and paste the new 'sha256-...' value ` +
          `into vercel.json's Content-Security-Policy script-src. Fresh (dist) hash: ` +
          `'${freshHash}'`,
      ).toBe(shippedHash);
    },
  );
});
