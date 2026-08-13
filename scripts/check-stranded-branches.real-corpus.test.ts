import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkStrandedBranches } from './check-stranded-branches.mjs';

/**
 * REAL `git`/`gh`, REAL network, REAL corpus — split out of
 * `check-stranded-branches.test.ts` (BACKLOG.md MEDIUM, 2026-08-07:
 * "make the real-`gh`-in-`npm test` split uniform across both scripts that
 * have one").
 *
 * THIS SPLIT IS NOT THE FIRST TIME THIS PATTERN SHIPPED — CORRECTING A CLAIM
 * RATHER THAN INHERITING IT: `check-backlog-checkoffs.real-corpus.test.ts`'s
 * own header, written earlier the same day, claimed this was "the first time
 * this repo's default gate depends on the network and on a GitHub session."
 * That claim was checked against this file's actual history and found
 * false: THIS describe block shipped in `check-stranded-branches.test.ts` on
 * 2026-08-05 (PR #106) — one day before `check-backlog-checkoffs.test.ts`'s
 * own real-corpus block (PR #110, 2026-08-06) — and that PR's own header
 * comment even said "same split as `check-report-claims.test.ts`," i.e. it
 * already knew it wasn't the first. `check-backlog-checkoffs.real-corpus
 * .test.ts`'s header has been corrected to say so explicitly rather than
 * silently left wrong — this repo's own practice (see `check-backlog
 * -checkoffs.mjs`'s "FALSIFIED AGAINST THE REAL CORPUS, NOT ASSUMED CLEAN"
 * for the identical instinct: report what's actually true, don't launder a
 * convenient prior claim).
 *
 * WHY THIS ONE MOVES TOO, NOT JUST THE OTHER ONE: leaving one real-`gh`
 * corpus block in `npm test` while its sibling moved to an opt-in lane would
 * make the split ITSELF misleading — a future run reading
 * `vitest.config.ts`'s exclude list would see one file excluded, reasonably
 * infer the other (not excluded) is hermetic, and be wrong. Uniformity here
 * isn't cosmetic; it's what keeps the exclude list trustworthy as a map of
 * "what actually touches the network."
 *
 * `check-merge-revert.test.ts` ALSO has a real-corpus describe block and
 * DELIBERATELY STAYS IN `npm test`, unmoved — checked directly (by
 * inspection: `checkMergeRevert` takes only a `gitRunner`, never a
 * `ghRunner`) and confirmed: it walks real LOCAL git history
 * (`git log`/`git merge-base` against this checkout's own object graph), no
 * network call and no `gh`/GitHub auth anywhere in it. That's a different
 * class entirely — local-only, deterministic, no external dependency — and
 * moving it here would be applying this task's fix to a script that was
 * never the problem. Left alone on purpose; do not "fix" it in a future
 * pass without re-checking this reasoning first.
 *
 * GH_PROBE semantics preserved EXACTLY from the pre-move version (this is a
 * relocation, not a rewrite): skips (does not fail) only when `gh`/network
 * is unavailable AND `CI` is unset; a real environment with no `gh` under
 * `CI` must still be treated as a real problem, not silently downgraded —
 * mirrors `check-backlog-checkoffs.real-corpus.test.ts`'s identical guard,
 * which in turn mirrors this file's own PR #106 precedent.
 */

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(DIRNAME, '..');

function realGit(args: string[]): string {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
}
function realGh(args: string[]): string {
  return execFileSync('gh', args, { cwd: REPO_ROOT, encoding: 'utf8' });
}

/**
 * Real corpus falsification — REAL `git` + REAL `gh` (default runners)
 * against this repo's actual remote state as of 2026-08-05, per the task's
 * explicit falsification requirement: prove the script detects
 * `team/2026-07-19-project-page-v2` as stranded, VERIFIED against `gh pr
 * list --state all`, not assumed; and stays quiet on a genuine positive
 * control (a merged branch) and negative control (a branch with a covering
 * PR).
 *
 * Skips (does not fail) in any environment without a working, authenticated
 * `gh` and network access to the real `origin` remote AND `CI` unset — see
 * file header, "GH_PROBE semantics preserved exactly" — this describe block
 * is evidence for the PR body, not a silently-optional regression suite (no
 * fake runner can prove "the real repo's real branches produce this real
 * result"; that is the whole point of including it).
 *
 * The real scan (~100 branches, each a `git merge-base` spawn, plus one
 * `gh pr list` call) runs ONCE in `beforeAll` and every `it` below asserts
 * against the same shared `result` — running it fresh per-`it` (the first
 * draft of this file did exactly that) multiplied the cost by the number of
 * assertions for no benefit and was the direct cause of an intermittent
 * `Test timed out in 5000ms` under load; a single run also matches how the
 * real `npm run check:stranded-branches` invocation actually executes.
 */
describe("checkStrandedBranches — real corpus falsification (this repo's actual git + gh state)", () => {
  let ghAvailable = true;
  try {
    realGh(['auth', 'status']);
  } catch {
    ghAvailable = false;
  }

  if (!ghAvailable && process.env.CI) {
    throw new Error(
      'check-stranded-branches real-corpus tests cannot reach `gh`, and CI is set — refusing to skip them into ' +
        'a false green. Set `GH_TOKEN` on the workflow step that runs `npm run test:real-corpus` ' +
        "(`.github/workflows/ci.yml`'s `backlog-checkoffs` job).",
    );
  }
  if (!ghAvailable) {
    console.warn(
      '[check-stranded-branches.real-corpus.test] SKIPPING 5 real-corpus tests — no authenticated `gh` in this ' +
        'environment. Run `gh auth login`, or `npm run test:real-corpus`, to exercise this path locally.',
    );
  }

  let result: ReturnType<typeof checkStrandedBranches>;
  beforeAll(() => {
    if (!ghAvailable) return;
    result = checkStrandedBranches({ repoRoot: REPO_ROOT });
  }, 30_000);

  const maybeIt = ghAvailable ? it : it.skip;

  maybeIt('flags team/2026-07-19-project-page-v2 as strandedStalePr — its merged PR #25 does not cover the buildMode tail pushed after it merged', () => {
    expect(result.status).not.toBe('inconclusive');
    const names = [...result.strandedNoPr, ...result.strandedStalePr].map((f) => f.branch);
    expect(names).toContain('team/2026-07-19-project-page-v2');

    const finding = result.strandedStalePr.find((f) => f.branch === 'team/2026-07-19-project-page-v2');
    expect(finding).toBeDefined();
    expect(finding?.pullRequests.some((p) => p.number === 25 && p.state === 'MERGED')).toBe(true);
    expect(finding?.filesTouched).toContain('src/content/buildMode.ts');
  });

  maybeIt('CONTROL: does not flag a genuinely merged branch (team/2026-08-04-logbook, ancestor of main) as stranded', () => {
    expect(result.status).not.toBe('inconclusive');
    const names = [...result.strandedNoPr, ...result.strandedStalePr].map((f) => f.branch);
    expect(names).not.toContain('team/2026-08-04-logbook');
  });

  maybeIt('CONTROL: `main` itself never appears in the branch list (not a team/* or claude/* ref)', () => {
    expect(result.status).not.toBe('inconclusive');
    const names = [...result.strandedNoPr, ...result.strandedStalePr].map((f) => f.branch);
    expect(names).not.toContain('main');
  });

  /**
   * Independently cross-checks the `project-page-v2` finding above using
   * REAL `git` directly (not through `checkStrandedBranches` at all) —
   * proof that the finding is a fact about this repo's actual object graph,
   * not an artifact of this script's own logic. This is exactly the
   * `merge-base --is-ancestor <currentTip> <PR's mergeCommit>` call
   * `prCoversTip` makes internally; running it here by hand, against a
   * merge commit oid fetched live via `gh`, is the falsification the task
   * asked for ("verify against `gh pr list --state all` rather than
   * assuming").
   */
  maybeIt('independently verifies via raw `git merge-base --is-ancestor` that PR #25 does not cover the current tip', () => {
    const mergeCommitOid = realGh(['pr', 'view', '25', '--json', 'mergeCommit', '-q', '.mergeCommit.oid']).trim();
    expect(mergeCommitOid).toMatch(/^[0-9a-f]{40}$/);
    expect(() => realGit(['merge-base', '--is-ancestor', 'origin/team/2026-07-19-project-page-v2', mergeCommitOid])).toThrow();
  });

  maybeIt('also flags team/2026-07-20-backlog-and-report (PR #30 merged, then a post-merge report-update commit was pushed and never re-PR\'d)', () => {
    expect(result.status).not.toBe('inconclusive');
    const finding = result.strandedStalePr.find((f) => f.branch === 'team/2026-07-20-backlog-and-report');
    expect(finding).toBeDefined();
    expect(finding?.pullRequests.some((p) => p.number === 30 && p.state === 'MERGED')).toBe(true);
  });
});
