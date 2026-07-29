/**
 * CSP hash-guard for `index.html`'s inline theme-bootstrap `<script>`.
 *
 * WHY THIS EXISTS: `vercel.json`'s `Content-Security-Policy` header ships
 * `script-src 'self' 'sha256-<hash>'` — the hash allowlists the one inline
 * script in `index.html` (the pre-paint dark-mode bootstrap, see that
 * file's comment) without a blanket `'unsafe-inline'`. A CSP hash is a
 * byte-exact fingerprint of the script's text content: if a future edit to
 * that inline script (even whitespace) changes its bytes, the hash in
 * `vercel.json` silently stops matching, the browser silently drops the
 * script under CSP, and dark mode breaks (flash-of-wrong-theme) in
 * production only — nothing fails locally, nothing fails at build time,
 * because Vite's dev server doesn't send these headers at all.
 *
 * `inlineScriptHash.test.ts` closes that gap: it recomputes the hash from
 * the CURRENT `index.html` on every `npm test` run and fails loudly if it
 * no longer matches the hash embedded in `vercel.json`. Whoever edits the
 * inline script gets a red test with the new hash to paste in, instead of a
 * silent prod-only breakage.
 */
import { createHash } from 'node:crypto';

/**
 * Returns the raw text content of every inline (no `src` attribute) inline
 * `<script>` element in an HTML document, in source order. Deliberately
 * naive regex parsing (no real HTML parser dependency) — this only ever
 * runs against our own `index.html`, a small, hand-written, well-formed
 * file, not arbitrary/untrusted HTML.
 */
export function extractInlineScripts(html: string): string[] {
  const scripts: string[] = [];
  const scriptTagRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptTagRe.exec(html))) {
    const attrs = match[1];
    const body = match[2];
    // "inline" = no `src` attribute. A `type="module"` script that DOES
    // have `src` (e.g. the Vite entry point) is a fetched, same-origin
    // script — governed by `script-src 'self'`, not by a hash.
    if (!/\bsrc\s*=/.test(attrs)) {
      scripts.push(body);
    }
  }
  return scripts;
}

/** CSP-format `sha256-<base64>` hash of a script's exact text content, per
 * https://www.w3.org/TR/CSP3/#hash_algo — the browser hashes the raw UTF-8
 * source text between the tags, so this must NOT trim/normalize `content`. */
export function computeCspScriptHash(content: string): string {
  const digest = createHash('sha256').update(content, 'utf8').digest('base64');
  return `sha256-${digest}`;
}

/** Pulls the `'sha256-...'` token(s) out of a `script-src` (or any) CSP
 * directive value string, e.g. the `Content-Security-Policy` header value
 * from `vercel.json`. */
export function extractCspHashes(cspHeaderValue: string): string[] {
  const matches = cspHeaderValue.match(/'sha256-[^']+'/g) ?? [];
  return matches.map((token) => token.slice(1, -1));
}

/** Finds the `Content-Security-Policy` header value from a parsed
 * `vercel.json`'s `headers` array (Vercel's `{ source, headers: [{key,value}] }`
 * shape). Throws with a clear message if the shape ever changes so a caller
 * fails loudly rather than silently comparing against `undefined`.
 *
 * Shared by both the SOURCE-side guard (`inlineScriptHash.test.ts`, which
 * checks `index.html` pre-build) and the DIST-side guard
 * (`distIndexHash.test.ts`, which checks `dist/index.html` post-build) —
 * one implementation, so the two checks can never quietly disagree about
 * what "the shipped hash" means. */
export function findCspHeaderValue(vercelConfig: unknown): string {
  const config = vercelConfig as { headers?: Array<{ headers?: Array<{ key: string; value: string }> }> };
  for (const rule of config.headers ?? []) {
    for (const header of rule.headers ?? []) {
      if (header.key === 'Content-Security-Policy') return header.value;
    }
  }
  throw new Error(
    "No 'Content-Security-Policy' header found in vercel.json's headers[] — " +
      'has the headers config shape changed?',
  );
}
