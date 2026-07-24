import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
// This file lives at scripts/provenance/ — two levels below the repo root.
const REPO_ROOT = path.resolve(DIRNAME, '../..');

/**
 * Regression guard for the "Vercel deploy must full-clone" backlog item
 * (BACKLOG.md, `docs/provenance-model.md` §5.2).
 *
 * WHY THIS EXISTS: `generate.mjs`'s `assertGitAvailable` (see that file)
 * hard-fails the build the moment `git rev-parse --is-shallow-repository`
 * reports `true` — by design, per §5.2's failure table, because a silent
 * `commit: null` on a truncated `git log` would be indistinguishable from
 * the legitimate "this file has no commit yet" case. CI is fixed
 * (`.github/workflows/ci.yml` sets `fetch-depth: 0`), but Vercel's Git
 * integration shallow-clones the build container by default. `vercel.json`'s
 * `buildCommand` compensates by un-shallowing the checkout (which Vercel
 * does perform via real `git`, just truncated — `.git` is present, only
 * history is missing) before `npm run build` ever runs, so
 * `assertGitAvailable`'s check passes on a real, non-truncated repo instead
 * of tripping the hard-fail on every production/preview deploy.
 *
 * `git fetch --unshallow` is piped through `|| true` because it errors on
 * an ALREADY-full repository ("--unshallow on a complete repository does
 * not make sense") — a legitimate case (e.g. if Vercel's default clone
 * behavior ever changes, or a preview environment happens to be full
 * already). That `|| true` does NOT reintroduce the silent-failure risk
 * §5.2 warns against: if the fetch genuinely fails to produce full history
 * (network issue, no `.git` at all, etc.), the repo is STILL shallow (or
 * not a repo) when `npm run build` -> `prebuild` -> `generate.mjs` runs
 * moments later, and `assertGitAvailable` hard-fails the build exactly as
 * designed. The `|| true` only swallows the ONE case where un-shallowing
 * was unnecessary because history was already complete — it never swallows
 * a case where history is still missing. This test only guards the wiring;
 * `scripts/provenance/generate.test.ts` covers the hard-fail behavior
 * itself via an injected `gitRunner`.
 *
 * If this test goes red, someone edited `vercel.json`'s `buildCommand` (or
 * removed it) without re-solving the shallow-clone problem — the fix
 * belongs back in before merging, not a deleted test.
 */
describe('vercel.json buildCommand un-shallows before building (regression guard)', () => {
  function readVercelConfig(): Record<string, unknown> {
    const raw = readFileSync(path.join(REPO_ROOT, 'vercel.json'), 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  }

  it('vercel.json is valid JSON and defines a buildCommand', () => {
    const config = readVercelConfig();
    expect(typeof config.buildCommand).toBe('string');
  });

  it('buildCommand runs `git fetch --unshallow` before `npm run build`', () => {
    const config = readVercelConfig();
    const buildCommand = config.buildCommand as string;

    // Must attempt to un-shallow at all.
    expect(buildCommand).toMatch(/git fetch --unshallow/);
    // The unshallow attempt is allowed to fail (see file header for why
    // that's safe) — but it must fail SOFT, never abort the whole
    // buildCommand before `npm run build` gets a chance to run (and, with
    // it, `assertGitAvailable`'s own hard-fail as the real backstop).
    expect(buildCommand).toMatch(/git fetch --unshallow[^;&]*\|\|\s*true/);
    // Must still actually build.
    expect(buildCommand).toMatch(/npm run build/);

    // The unshallow attempt must be sequenced BEFORE the build, not after —
    // un-shallowing after the provenance generator already ran (inside
    // `npm run build`'s `prebuild` hook) would be too late.
    const unshallowIndex = buildCommand.indexOf('git fetch --unshallow');
    const buildIndex = buildCommand.indexOf('npm run build');
    expect(unshallowIndex).toBeGreaterThanOrEqual(0);
    expect(buildIndex).toBeGreaterThan(unshallowIndex);
  });

  it('vercel.json still ships the PR #42 security headers (not disturbed by this change)', () => {
    const config = readVercelConfig();
    const headerRules = config.headers as Array<{ headers?: Array<{ key: string }> }> | undefined;
    expect(Array.isArray(headerRules)).toBe(true);
    const keys = (headerRules ?? []).flatMap((rule) => (rule.headers ?? []).map((h) => h.key));
    for (const required of [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Strict-Transport-Security',
      'Permissions-Policy',
    ]) {
      expect(keys, `missing security header: ${required}`).toContain(required);
    }
  });
});
