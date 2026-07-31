import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeCspScriptHash,
  extractCspHashes,
  extractInlineScripts,
  findCspHeaderValue,
} from './inlineScriptHash';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
// This file lives at src/lib/csp/ — three levels below the repo root.
const REPO_ROOT = path.resolve(DIRNAME, '../../..');

describe('extractInlineScripts (unit)', () => {
  it('returns only scripts with no src attribute, in source order', () => {
    const html = `
      <script>const a = 1;</script>
      <script type="module" src="/src/main.tsx"></script>
      <script>const b = 2;</script>
    `;
    expect(extractInlineScripts(html)).toEqual(['const a = 1;', 'const b = 2;']);
  });

  it('returns an empty array when there are no inline scripts', () => {
    const html = '<script type="module" src="/src/main.tsx"></script>';
    expect(extractInlineScripts(html)).toEqual([]);
  });
});

describe('computeCspScriptHash (unit)', () => {
  it('matches a known sha256 CSP hash for a trivial script', () => {
    // Cross-checked against `openssl dgst -sha256 -binary | openssl base64`.
    expect(computeCspScriptHash('console.log("x")')).toBe(
      'sha256-UhmjnsS5y53J5R2rogJZ1Nssebi34s+ck3+meO17Kik=',
    );
  });

  it('is sensitive to a single-byte change (the exact failure mode this guard exists for)', () => {
    const a = computeCspScriptHash('const x = 1;');
    const b = computeCspScriptHash('const x = 2;');
    expect(a).not.toBe(b);
  });
});

describe('extractCspHashes (unit)', () => {
  it('extracts one or more sha256 tokens from a CSP directive value', () => {
    const value = "script-src 'self' 'sha256-AAAA=' 'sha256-BBBB='; style-src 'self'";
    expect(extractCspHashes(value)).toEqual(['sha256-AAAA=', 'sha256-BBBB=']);
  });

  it('returns an empty array when there is no hash token', () => {
    expect(extractCspHashes("script-src 'self'")).toEqual([]);
  });
});

describe('index.html inline script hash matches vercel.json CSP (regression guard)', () => {
  // This is the guard the P1 spec (§46) calls for: if index.html's inline
  // theme-bootstrap script ever changes, this test goes red with a clear
  // message instead of dark mode silently breaking in production only
  // (vercel.json headers never apply on the Vite dev server, so nothing
  // else would ever catch this locally).
  it('has exactly one inline (no-src) script in index.html — the theme bootstrap', () => {
    const html = readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
    const inlineScripts = extractInlineScripts(html);
    expect(inlineScripts).toHaveLength(1);
  });

  it('vercel.json is valid JSON and its CSP script-src carries exactly one sha256 hash', () => {
    const vercelJsonRaw = readFileSync(path.join(REPO_ROOT, 'vercel.json'), 'utf8');
    const vercelConfig = JSON.parse(vercelJsonRaw);
    const csp = findCspHeaderValue(vercelConfig);
    expect(csp).toBeTruthy();
    expect(extractCspHashes(csp)).toHaveLength(1);
  });

  it('the sha256 hash in vercel.json matches a fresh hash of index.html\'s inline script', () => {
    const html = readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
    const [inlineScript] = extractInlineScripts(html);
    const freshHash = computeCspScriptHash(inlineScript);

    const vercelJsonRaw = readFileSync(path.join(REPO_ROOT, 'vercel.json'), 'utf8');
    const vercelConfig = JSON.parse(vercelJsonRaw);
    const csp = findCspHeaderValue(vercelConfig);
    const [shippedHash] = extractCspHashes(csp);

    expect(
      freshHash,
      `CSP hash mismatch: index.html's inline <script> no longer matches the ` +
        `'sha256-...' hash shipped in vercel.json's Content-Security-Policy header. ` +
        `This means the inline theme-bootstrap script was edited without updating ` +
        `the CSP — in production the browser will silently drop the script under ` +
        `script-src and dark mode will break (flash of wrong theme). ` +
        `Recompute it (computeCspScriptHash from src/lib/csp/inlineScriptHash.ts ` +
        `against the current index.html inline script) and paste the new ` +
        `'sha256-...' value into vercel.json's Content-Security-Policy script-src. ` +
        `Fresh hash: '${freshHash}'`,
    ).toBe(shippedHash);
  });
});
