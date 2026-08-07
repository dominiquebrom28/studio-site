import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkBacklogCheckoffs } from './check-backlog-checkoffs.mjs';

/**
 * REAL `gh`, REAL network, REAL corpus — deliberately split out of
 * `check-backlog-checkoffs.test.ts` (BACKLOG.md MEDIUM, "the network/`gh`
 * dependency in the default `npm test` gate", 2026-08-06/07).
 *
 * WHY THIS FILE EXISTS AS ITS OWN LANE, NOT INSIDE `npm test`:
 *
 * `check-backlog-checkoffs.mjs`'s ground truth is "does GitHub actually
 * consider this PR merged" — a fake `ghRunner` proves the check's LOGIC is
 * correct (the ~30 tests in `check-backlog-checkoffs.test.ts` do exactly
 * that, completely, with zero network dependency), but it proves nothing
 * about the part most likely to actually break: whether this repo's real
 * `gh pr list` output still shapes the way this script's parsing assumes.
 * That needs a real call.
 *
 * But `gh` refuses to run inside GitHub Actions without `GH_TOKEN`, and the
 * first time THESE PARTICULAR tests shipped bundled into
 * `check-backlog-checkoffs.test.ts` (2026-08-06, PR #110), that difference
 * bit immediately: CI's `build` job failed on `npm test` while the identical
 * command passed on every developer machine with a keyring `gh` login —
 * because CI has no such login by default. That PR fixed the immediate red
 * two ways (a `GH_TOKEN` on the step; skip-only-outside-CI, hard-fail-
 * under-CI so a missing token could never quietly downgrade the tests to
 * no-ops) but left the actual DESIGN question open: should `npm test` —
 * this repo's default, hermetic-by-convention gate — depend on a GitHub
 * session and a live network call AT ALL?
 *
 * CORRECTION, NOT INHERITED: the framing this design question originally
 * shipped under called PR #110 "the first time this repo's default gate
 * depends on the network and on a GitHub session." Checked against this
 * repo's actual history and found FALSE — `check-stranded-branches.test.ts`
 * shipped an identical real-`gh` corpus block inside `npm test` ONE DAY
 * EARLIER (2026-08-05, PR #106; that PR's own header even says "same split
 * as `check-report-claims.test.ts`," i.e. it already knew it wasn't the
 * first). Corrected here rather than repeated, and fixed in the same pass:
 * `check-stranded-branches.real-corpus.test.ts` now exists too, moved out of
 * `npm test` for the identical reason and wired into the identical CI step —
 * see that file's header for the full correction and why leaving one moved
 * and one not would have been worse than either uniform answer.
 *
 * THE DECISION (2026-08-07): no. These three tests move OUT of `npm test`
 * into this file, run via its own `npm run test:real-corpus`
 * (`vitest.real-corpus.config.ts`), so that:
 *   (a) `npm test` is hermetic again — fast, works for a contributor with no
 *       `gh` login at all, matching every other suite in this repo's
 *       default sweep.
 *   (b) the real-corpus assertion still runs, for real, on EVERY PR — wired
 *       as a step in `.github/workflows/ci.yml`'s existing
 *       `backlog-checkoffs` job (see that job's own header comment), which
 *       already sets `GH_TOKEN` and already calls
 *       `scripts/check-backlog-checkoffs.mjs` directly for the same reason.
 *       Placing the real-corpus TEST alongside the real-corpus SCRIPT run,
 *       in the one job that already carries the token and the network
 *       dependency, keeps that dependency contained to a single advisory
 *       lane rather than spreading it into the required `build` job's
 *       default test run.
 *
 * THE CRITICAL CONSTRAINT THIS SPLIT MUST NOT VIOLATE (this repo's own
 * standing rule, hit three separate times already — `SMOKE_URL` sitting
 * unset for weeks, an artifact-upload step firing on unrelated failures, a
 * claims gate that silently read 2 claims across 23 reports): the split
 * must never create a lane that silently checks nothing. So the exact same
 * `GH_PROBE` discipline from PR #110 is preserved here, unchanged in spirit:
 * skip (loudly, with a clear message) ONLY when `CI` is unset; under CI, an
 * unreachable `gh` is a hard `throw`, never a silent skip. See `ci.yml`'s
 * `backlog-checkoffs` job for the step that guarantees `GH_TOKEN` is always
 * present there, on every PR, not just sometimes.
 */

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(DIRNAME, '..');

function realGh(args: string[]): string {
  return execFileSync('gh', args, { cwd: REPO_ROOT, encoding: 'utf8' });
}

/**
 * Is a working, authenticated `gh` reachable from this environment? Probed
 * once — see file header for the two environments this must behave
 * differently in, and why a plain `it.skipIf` is not good enough.
 */
const GH_PROBE: { ok: boolean; reason: string } = (() => {
  try {
    realGh(['auth', 'status']);
    return { ok: true, reason: '' };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
})();

if (!GH_PROBE.ok) {
  if (process.env.CI) {
    throw new Error(
      'check-backlog-checkoffs real-corpus tests cannot reach `gh`, and CI is set — refusing to skip them ' +
        'into a false green. Set `GH_TOKEN` on the workflow step that runs `npm run test:real-corpus` ' +
        '(`.github/workflows/ci.yml`\'s `backlog-checkoffs` job). ' +
        `Underlying error: ${GH_PROBE.reason}`,
    );
  }
  console.warn(
    '[check-backlog-checkoffs.real-corpus.test] SKIPPING 3 real-corpus tests — no authenticated `gh` in this ' +
      'environment. Run `gh auth login`, or `npm run test:real-corpus`, to exercise this path locally. ' +
      '`check-backlog-checkoffs.test.ts` (the default `npm test` suite) still covers all logic via a fake ghRunner.',
  );
}

/** Skips only outside CI — see `GH_PROBE`, which throws rather than skip under CI. */
const itRealCorpus = GH_PROBE.ok ? it : it.skip;

// ---------------------------------------------------------------------------

/**
 * Real corpus regression — REAL `gh` (this repo's actual PR history) against
 * the REAL `reports/*.md` + `BACKLOG.md` as committed on this branch. This is
 * the falsification the task requires: run for real, does the gate find
 * exactly what this task's own investigation found — no more, no less?
 *
 * THE RED->GREEN TRANSCRIPT (not just asserted, reproduced): before this
 * branch's own `BACKLOG.md` edit, `node scripts/check-backlog-checkoffs.mjs`
 * against this exact corpus printed:
 *   `[check-backlog-checkoffs] VIOLATION — 1 merged branch(es) never
 *   referenced in BACKLOG.md ... - ... \`team/2026-08-04-undici-advisories\`
 *   (reports/2026-08-04.md, PR cell: [#101](.../pull/101))`
 * — the exact PR #100-shaped incident this gate exists to catch, found on
 * its own very first real run, not injected. That branch's `BACKLOG.md` edit
 * added the missing `[x]` (see "Added 2026-08-06" there) rather than leaving
 * the gate red on day one; the test below asserts the now-clean result. The
 * violation-detection path itself is separately proven red by the synthetic
 * "THE PR #100 FALSIFICATION FIXTURE" test in `check-backlog-checkoffs
 * .test.ts` (fake `ghRunner`, isolated from this fix), so this fix is not
 * what's "protecting" that coverage.
 */
describe('checkBacklogCheckoffs — real corpus (this repo\'s actual reports/BACKLOG.md + real `gh pr list`)', () => {
  itRealCorpus('is CLEAN as of this branch\'s own BACKLOG.md fix, with one referencedButOpen note for the real `team/2026-08-04-runs-api` multi-PR epic (PR #98)', () => {
    const result = checkBacklogCheckoffs({ repoRoot: REPO_ROOT });

    if (result.status === 'inconclusive') {
      throw new Error(`real-corpus check came back inconclusive (gh unavailable in this environment?): ${result.reason}`);
    }

    expect(result.status).toBe('clean');
    expect(result.unreferenced).toEqual([]);

    expect(result.referencedButOpen).toHaveLength(1);
    expect(result.referencedButOpen[0]).toMatchObject({ report: 'reports/2026-08-04.md', branch: 'team/2026-08-04-runs-api' });
  });

  itRealCorpus('control: a genuinely closed lane from the real corpus (`team/2026-08-05-stranded-branches`, PR #106) is neither unreferenced nor referencedButOpen', () => {
    const result = checkBacklogCheckoffs({ repoRoot: REPO_ROOT });
    if (result.status === 'inconclusive') return; // covered by the test above
    const branches = [...result.unreferenced, ...result.referencedButOpen].map((f) => f.branch);
    expect(branches).not.toContain('team/2026-08-05-stranded-branches');
  });

  itRealCorpus('sanity: `gh pr list` really does see PR #101 as MERGED (the ground truth this whole gate depends on, not assumed)', () => {
    let raw: string;
    try {
      raw = realGh(['pr', 'view', '101', '--json', 'state,headRefName']);
    } catch (error) {
      throw new Error(`could not reach real gh in this environment: ${error instanceof Error ? error.message : String(error)}`);
    }
    const pr = JSON.parse(raw);
    expect(pr.state).toBe('MERGED');
    expect(pr.headRefName).toBe('team/2026-08-04-undici-advisories');
  });
});
