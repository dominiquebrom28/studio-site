import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkMergeRevert,
  defaultBaseRefCandidates,
  getFirstParentChain,
  getNameStatusDiff,
  isShallowRepository,
  resolveBaseRef,
  resolveHeadRef,
  resolveMergeBase,
} from './check-merge-revert.mjs';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(DIRNAME, '..');

/**
 * Real `git` calls (not the mocked `gitRunner`) against THIS repo's actual
 * history, used only by the "real-history verification" describe block at
 * the bottom — everything else in this file uses a fake, fully scripted
 * `gitRunner` (no real repo needed), same split as
 * `check-report-claims.test.ts`.
 */
function realGitRunner({ cwd, args }: { cwd: string; args: string[] }): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

type GitCall = { cwd: string; args: string[] };

/**
 * Fake `gitRunner` for a fabricated, tiny commit graph — no real git
 * repository fixture needed. `commits` is keyed by SHA; each entry declares
 * its parent SHAs and the `{status, path}` diff it produces against
 * `parents[0]` (exactly what `getNameStatusDiff` would return for that pair
 * — the fake owns both sides of that contract so the test controls the
 * scenario precisely instead of depending on real git's merge resolution).
 * `firstParentChain` is the pre-computed `git log --first-parent --reverse`
 * result for the (mergeBase, headRef) pair under test. `netDiff` is the
 * `git diff --name-status <mergeBase> <headRef>` result — the fake commit
 * graph's "final answer", set explicitly per scenario rather than derived,
 * since deriving a real merge's net result from fabricated per-commit diffs
 * would just be reimplementing git.
 */
function makeGitRunner({
  isShallow = false,
  mergeBase = 'BASE',
  firstParentChain,
  diffsByPair = {},
  netDiff = '',
  resolvableBase = ['origin/main'],
}: {
  isShallow?: boolean;
  mergeBase?: string | null;
  firstParentChain?: string;
  diffsByPair?: Record<string, string>;
  netDiff?: string;
  resolvableBase?: string[];
}) {
  return ({ args }: GitCall): string => {
    if (args[0] === 'rev-parse' && args[1] === '--is-shallow-repository') {
      return isShallow ? 'true\n' : 'false\n';
    }
    if (args[0] === 'rev-parse' && args[1] === '--verify') {
      const ref = args[2].replace(/\^\{commit\}$/, '');
      if (resolvableBase.includes(ref)) return 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef\n';
      const err = new Error('fatal: needed a single revision') as Error & { stderr?: string };
      err.stderr = `fatal: ambiguous argument '${ref}': unknown revision or path not in the working tree.`;
      throw err;
    }
    if (args[0] === 'merge-base') {
      if (!mergeBase) {
        const err = new Error('fatal: no merge base') as Error & { stderr?: string };
        err.stderr = 'fatal: no merge base found';
        throw err;
      }
      return `${mergeBase}\n`;
    }
    if (args[0] === 'log' && args[1] === '--first-parent') {
      return firstParentChain ?? '';
    }
    if (args[0] === 'diff' && args[1] === '--name-status') {
      const [, , fromRef, toRef] = args;
      const key = `${fromRef}..${toRef}`;
      if (fromRef === mergeBase && toRef === (args[3] as string)) {
        // net-diff call always passes (mergeBase, headRef) — matched below
      }
      if (key in diffsByPair) return diffsByPair[key];
      // The net-diff call is (mergeBase, headRef); everything else is a
      // per-commit call keyed the same `${parent}..${commit}` way.
      if (fromRef === mergeBase) return netDiff;
      return '';
    }
    throw new Error(`unexpected git invocation in test double: ${args.join(' ')}`);
  };
}

const SEP = '\x1f';
function chainLine(sha: string, parents: string[], subject: string): string {
  return `${sha}${SEP}${parents.join(' ')}${SEP}${subject}`;
}

// ---------------------------------------------------------------------------

describe('resolveHeadRef — the synthetic-merge-commit trap', () => {
  it('prefers the explicit CHECK_MERGE_REVERT_HEAD_REF override over everything', () => {
    const result = resolveHeadRef({ CHECK_MERGE_REVERT_HEAD_REF: 'deadbeef', MERGE_REVERT_HEAD_SHA: 'other', GITHUB_EVENT_NAME: 'pull_request' });
    expect(result).toEqual({ headRef: 'deadbeef', source: 'CHECK_MERGE_REVERT_HEAD_REF override' });
  });

  it('uses MERGE_REVERT_HEAD_SHA (github.event.pull_request.head.sha) when set', () => {
    const result = resolveHeadRef({ MERGE_REVERT_HEAD_SHA: 'cafef00d', GITHUB_EVENT_NAME: 'pull_request' });
    expect(result.headRef).toBe('cafef00d');
  });

  it('falls back to bare HEAD when NOT a pull_request event (local run, workflow_dispatch, direct push)', () => {
    expect(resolveHeadRef({}).headRef).toBe('HEAD');
    expect(resolveHeadRef({ GITHUB_EVENT_NAME: 'push' }).headRef).toBe('HEAD');
    expect(resolveHeadRef({ GITHUB_EVENT_NAME: 'workflow_dispatch' }).headRef).toBe('HEAD');
  });

  it('REFUSES bare HEAD on a pull_request event with no override — this is the false-clean trap, not a normal fallback', () => {
    const result = resolveHeadRef({ GITHUB_EVENT_NAME: 'pull_request' });
    expect(result.headRef).toBeNull();
    expect((result as { reason: string }).reason).toMatch(/synthetic test-merge commit/);
  });
});

describe('isShallowRepository', () => {
  it('parses `true`/`false` from `git rev-parse --is-shallow-repository`', () => {
    expect(isShallowRepository(makeGitRunner({ isShallow: true }), '/repo')).toBe(true);
    expect(isShallowRepository(makeGitRunner({ isShallow: false }), '/repo')).toBe(false);
  });
});

describe('resolveBaseRef / defaultBaseRefCandidates', () => {
  it('returns the first candidate `rev-parse --verify` accepts', () => {
    const gitRunner = makeGitRunner({ resolvableBase: ['origin/main'] });
    expect(resolveBaseRef(gitRunner, '/repo', ['origin/main', 'main'])).toBe('origin/main');
  });

  it('returns null when no candidate resolves', () => {
    const gitRunner = makeGitRunner({ resolvableBase: [] });
    expect(resolveBaseRef(gitRunner, '/repo', ['origin/main', 'main'])).toBeNull();
  });

  it('same candidate priority/shape as check-report-claims.mjs (explicit override, GITHUB_BASE_REF both forms, then origin/main, main)', () => {
    expect(defaultBaseRefCandidates({ CHECK_MERGE_REVERT_BASE_REF: 'x', GITHUB_BASE_REF: 'main' })).toEqual([
      'x',
      'origin/main',
      'main',
      'origin/main',
      'main',
    ]);
    expect(defaultBaseRefCandidates({})).toEqual(['origin/main', 'main']);
  });
});

describe('resolveMergeBase', () => {
  it('returns the merge-base sha', () => {
    const gitRunner = makeGitRunner({ mergeBase: 'BASE123' });
    expect(resolveMergeBase(gitRunner, '/repo', 'main', 'HEAD')).toBe('BASE123');
  });

  it('returns null (never throws) when git merge-base fails', () => {
    const gitRunner = makeGitRunner({ mergeBase: null });
    expect(resolveMergeBase(gitRunner, '/repo', 'main', 'HEAD')).toBeNull();
  });
});

describe('getFirstParentChain / getNameStatusDiff — parsing', () => {
  it('parses the first-parent log format, flagging isMerge on 2+ parents', () => {
    const gitRunner = makeGitRunner({
      firstParentChain: [chainLine('c1', ['BASE'], 'own commit'), chainLine('c2', ['c1', 'MAIN2'], "Merge branch 'main' into feature")].join('\n') + '\n',
    });
    const chain = getFirstParentChain(gitRunner, '/repo', 'BASE', 'HEAD');
    expect(chain).toEqual([
      { sha: 'c1', parents: ['BASE'], subject: 'own commit', isMerge: false },
      { sha: 'c2', parents: ['c1', 'MAIN2'], subject: "Merge branch 'main' into feature", isMerge: true },
    ]);
  });

  it('parses name-status diff, reducing a rename to its new path (same convention as check-report-claims.mjs)', () => {
    const gitRunner = makeGitRunner({ diffsByPair: { 'p1..c1': 'M\tBACKLOG.md\nR100\told.ts\tnew.ts\n' } });
    const entries = getNameStatusDiff(gitRunner, '/repo', 'p1', 'c1');
    expect(entries).toEqual([
      { status: 'M', path: 'BACKLOG.md', renamedFrom: null },
      { status: 'R', path: 'new.ts', renamedFrom: 'old.ts' },
    ]);
  });
});

// ---------------------------------------------------------------------------

describe('checkMergeRevert — inconclusive, never a false pass', () => {
  it('is inconclusive on a shallow clone, before even attempting a merge-base', () => {
    const gitRunner = makeGitRunner({ isShallow: true });
    const result = checkMergeRevert({ repoRoot: '/repo', gitRunner, headRefResolution: { headRef: 'HEAD', source: 'test' } });
    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/shallow clone/);
  });

  it('is inconclusive when no base ref candidate resolves', () => {
    const gitRunner = makeGitRunner({ resolvableBase: [] });
    const result = checkMergeRevert({ repoRoot: '/repo', gitRunner, baseRefCandidates: ['origin/main'], headRefResolution: { headRef: 'HEAD', source: 'test' } });
    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/base ref/);
  });

  it('is inconclusive (never silently trusts HEAD) when headRefResolution reports the pull_request trap', () => {
    const gitRunner = makeGitRunner({});
    const result = checkMergeRevert({
      repoRoot: '/repo',
      gitRunner,
      baseRefCandidates: ['origin/main'],
      headRefResolution: { headRef: null, reason: 'synthetic test-merge commit trap' },
    });
    expect(result.status).toBe('inconclusive');
    expect(result.reason).toBe('synthetic test-merge commit trap');
  });

  it('is inconclusive when merge-base cannot be resolved', () => {
    const gitRunner = makeGitRunner({ mergeBase: null });
    const result = checkMergeRevert({ repoRoot: '/repo', gitRunner, baseRefCandidates: ['origin/main'], headRefResolution: { headRef: 'HEAD', source: 'test' } });
    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/merge-base/);
  });
});

describe('checkMergeRevert — clean', () => {
  it('is clean with zero own commits (e.g. running directly on main)', () => {
    const gitRunner = makeGitRunner({ mergeBase: 'BASE', firstParentChain: '' });
    const result = checkMergeRevert({ repoRoot: '/repo', gitRunner, baseRefCandidates: ['origin/main'], headRefResolution: { headRef: 'HEAD', source: 'test' } });
    expect(result.status).toBe('clean');
    expect(result.chainLength).toBe(0);
  });

  it('is clean when a touched path survives an in-branch merge (main and branch touched different regions — the common shape)', () => {
    const gitRunner = makeGitRunner({
      mergeBase: 'BASE',
      firstParentChain: [chainLine('own1', ['BASE'], 'own edit'), chainLine('merge1', ['own1', 'MAIN2'], "Merge branch 'main'")].join('\n') + '\n',
      diffsByPair: {
        'BASE..own1': 'M\tBACKLOG.md\n',
        // The merge changes BACKLOG.md too (main's own concurrent edit,
        // auto-merged in) — but the branch's own line survives, so the net
        // diff still lists it.
        'own1..merge1': 'M\tBACKLOG.md\n',
      },
      netDiff: 'M\tBACKLOG.md\n',
    });
    const result = checkMergeRevert({ repoRoot: '/repo', gitRunner, baseRefCandidates: ['origin/main'], headRefResolution: { headRef: 'merge1', source: 'test' } });
    expect(result.status).toBe('clean');
    expect(result.touchedByOwnCount).toBe(1);
  });

  it('case (1): branch adds a file, then its OWN later commit deletes it again — not a violation, "last touch" is its own', () => {
    const gitRunner = makeGitRunner({
      mergeBase: 'BASE',
      firstParentChain: [chainLine('add', ['BASE'], 'add scratch file'), chainLine('del', ['add'], 'remove scratch file, not needed after all')].join('\n') + '\n',
      diffsByPair: {
        'BASE..add': 'A\tscratch.md\n',
        'add..del': 'D\tscratch.md\n',
      },
      netDiff: '', // net: file never existed at either end
    });
    const result = checkMergeRevert({ repoRoot: '/repo', gitRunner, baseRefCandidates: ['origin/main'], headRefResolution: { headRef: 'del', source: 'test' } });
    expect(result.status).toBe('clean');
    expect(result.violations).toEqual([]);
    expect(result.explained).toEqual([{ path: 'scratch.md', lastOwnCommit: { sha: 'del', subject: 'remove scratch file, not needed after all' } }]);
  });

  it('case (2): branch edits a file, then its OWN later commit reverts that exact edit — not a violation', () => {
    const gitRunner = makeGitRunner({
      mergeBase: 'BASE',
      firstParentChain: [chainLine('edit', ['BASE'], 'try an approach'), chainLine('revert', ['edit'], 'actually, revert that')].join('\n') + '\n',
      diffsByPair: {
        'BASE..edit': 'M\tREADME.md\n',
        'edit..revert': 'M\tREADME.md\n',
      },
      netDiff: '', // net: back to base content
    });
    const result = checkMergeRevert({ repoRoot: '/repo', gitRunner, baseRefCandidates: ['origin/main'], headRefResolution: { headRef: 'revert', source: 'test' } });
    expect(result.status).toBe('clean');
    expect(result.violations).toEqual([]);
    expect(result.explained).toHaveLength(1);
  });

  it('case (2), with a merge in between that does NOT touch the path — own revert (before the merge) is still correctly attributed, not the merge', () => {
    const gitRunner = makeGitRunner({
      mergeBase: 'BASE',
      firstParentChain: [
        chainLine('edit', ['BASE'], 'try an approach'),
        chainLine('revert', ['edit'], 'actually, revert that'),
        chainLine('merge1', ['revert', 'MAIN2'], "Merge branch 'main' (unrelated changes only)"),
      ].join('\n') + '\n',
      diffsByPair: {
        'BASE..edit': 'M\tREADME.md\n',
        'edit..revert': 'M\tREADME.md\n',
        'revert..merge1': 'M\tsomething-else.md\n', // merge does NOT touch README.md
      },
      netDiff: 'M\tsomething-else.md\n',
    });
    const result = checkMergeRevert({ repoRoot: '/repo', gitRunner, baseRefCandidates: ['origin/main'], headRefResolution: { headRef: 'merge1', source: 'test' } });
    expect(result.status).toBe('clean');
    expect(result.explained).toEqual([{ path: 'README.md', lastOwnCommit: { sha: 'revert', subject: 'actually, revert that' } }]);
  });
});

describe('checkMergeRevert — VIOLATION: the PR #81 shape, reproduced with a fake gitRunner', () => {
  it('flags a path touched by own commits, then wiped by a later in-branch merge, absent from the net diff', () => {
    const gitRunner = makeGitRunner({
      mergeBase: 'BASE',
      firstParentChain: [
        chainLine('own1', ['BASE'], 'Backlog + report: item A'),
        chainLine('own2', ['own1'], 'Backlog: item B'),
        chainLine('merge1', ['own2', 'MAIN2'], "Merge branch 'main' into team/x"),
      ].join('\n') + '\n',
      diffsByPair: {
        'BASE..own1': 'M\tBACKLOG.md\nA\treports/2026-99-99.md\n',
        'own1..own2': 'M\tBACKLOG.md\n',
        // The merge resolves BACKLOG.md entirely in main's favour: its
        // content relative to own2 (parent[0]) changes, reverting to base.
        'own2..merge1': 'M\tBACKLOG.md\n',
      },
      // Net diff: only the report survives; BACKLOG.md is gone, exactly the
      // PR #81 shape.
      netDiff: 'A\treports/2026-99-99.md\n',
    });

    const result = checkMergeRevert({ repoRoot: '/repo', gitRunner, baseRefCandidates: ['origin/main'], headRefResolution: { headRef: 'merge1', source: 'test' } });

    expect(result.status).toBe('violation');
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].path).toBe('BACKLOG.md');
    expect(result.violations[0].mergeCommit.sha).toBe('merge1');
    expect(result.violations[0].ownCommitsTouching.map((c) => c.sha)).toEqual(['own1', 'own2']);
  });

  it('a SECOND own commit AFTER the merge that re-touches the path (but does not fully restore it) still shows up in the net diff, so it never reaches the drop-analysis at all', () => {
    const gitRunner = makeGitRunner({
      mergeBase: 'BASE',
      firstParentChain: [
        chainLine('own1', ['BASE'], 'edit'),
        chainLine('merge1', ['own1', 'MAIN2'], "Merge branch 'main'"),
        chainLine('own2', ['merge1'], 'partial re-edit after noticing the merge'),
      ].join('\n') + '\n',
      diffsByPair: {
        'BASE..own1': 'M\tBACKLOG.md\n',
        'own1..merge1': 'M\tBACKLOG.md\n',
        'merge1..own2': 'M\tBACKLOG.md\n',
      },
      netDiff: 'M\tBACKLOG.md\n', // still present overall — own2 left SOME trace
    });
    const result = checkMergeRevert({ repoRoot: '/repo', gitRunner, baseRefCandidates: ['origin/main'], headRefResolution: { headRef: 'own2', source: 'test' } });
    expect(result.status).toBe('clean');
  });
});

// ---------------------------------------------------------------------------

/**
 * KNOWN GAP — path granularity, not hunk granularity (BACKLOG.md
 * "check-merge-revert is path-granular, so an intra-file merge revert walks
 * past it", added 2026-08-13). See `check-merge-revert.mjs`'s own "KNOWN
 * GAP" header section for the full false-positive-cost reasoning for why
 * this is documented rather than fixed with content-level diffing.
 *
 * This fixture models the REAL incident's shape (not a hypothetical): the
 * branch touches path X more than once (`own1`, `own2` — standing in for
 * `team/2026-08-07-backlog-and-report`'s `db25190`/`dd6c2ff`/`30e19f6`, all
 * of which touched `scripts/check-backlog-checkoffs.test.ts`), then an
 * in-branch merge (`merge1` — standing in for the real `1fcab9e`) ALSO
 * touches X. Because `own2`'s edit (or, in the real incident, any of the
 * branch's several other edits to the same file) keeps X's final content
 * different from `mergeBase`'s, X is present in `netDiff` and the
 * `if (netDiffPaths.has(ownPath)) continue` short-circuit in
 * `checkMergeRevert` exempts it from the "last touch wins" analysis
 * entirely — the merge is never inspected, whether or not it silently
 * discarded something.
 *
 * Deliberately: this fixture's `diffsByPair`/`netDiff` shape is
 * indistinguishable, to this check, from the "healthy" `is clean when a
 * touched path survives an in-branch merge (main and branch touched
 * different regions — the common shape)` test above — same inputs, opposite
 * real-world story (one is a clean auto-merge of disjoint regions, the
 * other is exactly PR #117's silent, no-conflict-markers revert). That
 * indistinguishability, at path-level granularity, IS the gap. Real,
 * reproduced command + output (captured verbatim in this task's own
 * report):
 *
 *   CHECK_MERGE_REVERT_BASE_REF=f6e9f68a77d5df0a5f1994e7ec89e1dee100b74b \
 *   CHECK_MERGE_REVERT_HEAD_REF=1fcab9e5ad5623983cbab87a5f635eca4ae3fdbc \
 *   node scripts/check-merge-revert.mjs
 *   [check-merge-revert] OK — walked 19 own-first-parent commit(s) from
 *   f6e9f68a77d5df0a5f1994e7ec89e1dee100b74b to 1fcab9e, 10 path(s) touched
 *   by the branch's own commits, all still present in `git diff --name-only
 *   f6e9f68a77d5df0a5f1994e7ec89e1dee100b74b...1fcab9e` (or explained by
 *   the branch's own later commit — 0 such case(s)).
 *
 * This test asserts the CURRENT behavior (`clean`, i.e. NOT flagged) as a
 * pin, not an endorsement: if this ever starts reporting `violation`,
 * that's a sign hunk-level (or otherwise content-aware) detection has been
 * added to `checkMergeRevert` — update this test's expectation and
 * `check-merge-revert.mjs`'s "KNOWN GAP" header note together, deliberately,
 * rather than letting a behavior change go unnoticed. Uses the fake
 * `gitRunner` (not a reference to the real, still-open, unmerged
 * `team/2026-08-07-backlog-and-report` branch) so this test stays hermetic
 * and does not depend on that branch continuing to exist in every future
 * checkout — the real command/output above is this gap's falsification
 * evidence, not this test's mechanism.
 */
describe('checkMergeRevert — KNOWN GAP: path presence masks a within-file content revert', () => {
  it('does NOT flag a merge that alters a path the branch touched multiple times, as long as SOME own edit keeps the path present in the net diff', () => {
    const gitRunner = makeGitRunner({
      mergeBase: 'BASE',
      firstParentChain: [
        chainLine('own1', ['BASE'], "delete the real-corpus describe block (branch's own work, later silently undone)"),
        chainLine('own2', ['own1'], 'an unrelated later edit to the same file'),
        chainLine('merge1', ['own2', 'MAIN2'], "Merge branch 'main' into team/x (no conflict markers reported)"),
      ].join('\n') + '\n',
      diffsByPair: {
        'BASE..own1': 'M\tscripts/check-backlog-checkoffs.test.ts\n',
        'own1..own2': 'M\tscripts/check-backlog-checkoffs.test.ts\n',
        // The merge's resolution changes the path relative to own2 (parent[0])
        // — in the real incident this is where the deleted block came back —
        // but the path was ALREADY going to be in netDiff because of own1/own2,
        // so nothing distinguishes "auto-merged cleanly" from "silently reverted
        // part of what own1/own2 did" at this granularity.
        'own2..merge1': 'M\tscripts/check-backlog-checkoffs.test.ts\n',
      },
      netDiff: 'M\tscripts/check-backlog-checkoffs.test.ts\n',
    });

    const result = checkMergeRevert({ repoRoot: '/repo', gitRunner, baseRefCandidates: ['origin/main'], headRefResolution: { headRef: 'merge1', source: 'test' } });

    // Pinned, not endorsed — see this block's own header comment.
    expect(result.status).toBe('clean');
    expect(result.violations).toEqual([]);
    expect(result.touchedByOwnCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------

/**
 * Real-history verification — REAL `git` against this repo's actual
 * history, not the fake gitRunner above. Reproduces the exact incident this
 * check exists for, plus a sample of the healthy corpus. `resolveMergeBase`
 * is called for real too (rather than hardcoding the merge-base), matching
 * how `checkMergeRevert` behaves in production against a moving `main`.
 *
 * Every PR merge commit on `main` is a "Merge pull request #N ..." commit
 * whose two parents are [main's tip immediately before, the PR branch's own
 * real tip] — see PR #81's `dce1f7f` (parents `56e8dfb`, `1e5e5e8`) as the
 * concrete example this repo's own commit history documents.
 */
describe('checkMergeRevert — real-history verification (this repo\'s actual git history)', () => {
  function replayBranch(mainParentBeforeMerge: string, branchTip: string) {
    return checkMergeRevert({
      repoRoot: REPO_ROOT,
      gitRunner: realGitRunner,
      baseRefCandidates: [mainParentBeforeMerge],
      headRefResolution: { headRef: branchTip, source: 'real-history test' },
    });
  }

  /**
   * Resolves this checkout's actual `main` ref for the ONE real `git`
   * invocation in this block that needs a branch name rather than an
   * explicit SHA (`git log --merges ... <mainRef>` in the corpus sweep
   * below) — using the SAME candidate list and resolution order as the
   * script itself (`defaultBaseRefCandidates` + `resolveBaseRef`), not a
   * second, ad-hoc candidate list. A local checkout has a local `main`
   * branch; a CI `pull_request` checkout (`fetch-depth: 0`) fetches the
   * objects and the remote-tracking `origin/main`, but never creates a
   * local `main` branch — hardcoding either name breaks the other
   * environment (this is exactly what broke PR #103's CI run: hardcoded
   * `'main'`, which only ever existed locally).
   *
   * Throws — failing this test loudly — rather than returning a fallback
   * or letting the corpus sweep silently run over zero commits if NO
   * candidate resolves. A corpus sweep that quietly covers nothing while
   * printing green is exactly the `SMOKE_URL` shape
   * `scripts/check-merge-revert.mjs`'s own header comment (and this
   * script's PR body) argues against; a real, named failure here is the
   * only acceptable outcome if this checkout's `main` is ever
   * unresolvable.
   */
  function resolveRealMainRef(): string {
    const ref = resolveBaseRef(realGitRunner, REPO_ROOT, defaultBaseRefCandidates(process.env));
    if (!ref) {
      throw new Error(
        'resolveRealMainRef: could not resolve a `main` ref in this checkout via any of the standard candidates ' +
          '(CHECK_MERGE_REVERT_BASE_REF, origin/$GITHUB_BASE_REF, $GITHUB_BASE_REF, origin/main, main). The real-history ' +
          'corpus sweep below cannot run without one — this is a test-environment problem (missing fetch, missing ref, ' +
          'or a checkout with neither a local `main` nor a remote-tracking `origin/main`), not something to silently skip past.',
      );
    }
    return ref;
  }

  it('THE REAL INCIDENT — PR #81 (team/2026-07-31-backlog-and-report): fires, naming BACKLOG.md, the exact merge commit, and both own commits', () => {
    const result = replayBranch(
      '56e8dfbeb4c2b4c8d911b3c8a5f741f7044d8798', // main tip immediately before PR #81's merge
      '1e5e5e8243a5540c1351bb3a18666af12ef6145e', // team/2026-07-31-backlog-and-report's real tip (post in-branch merge, pre-PR-merge)
    );

    expect(result.status).toBe('violation');
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].path).toBe('BACKLOG.md');
    expect(result.violations[0].mergeCommit.sha).toBe('1e5e5e8243a5540c1351bb3a18666af12ef6145e');
    expect(result.violations[0].ownCommitsTouching.map((c) => c.sha)).toEqual([
      'b16e7bca0b33311f8affd926aa2de586d07fa4a3',
      '755bf7cb69a1b3d81df60b4a3dffdfa6eabe6bb6',
    ]);
  });

  it('THE HEALTHY LOOK-ALIKE — PR #87 (team/2026-08-01-backlog-and-report): identical shape (BACKLOG edits + an in-branch merge from main), stays clean', () => {
    const result = replayBranch(
      'f0c1b933110b5109213e566859982fb32faeffff', // main tip immediately before PR #87's merge
      'af4864e25d8b1686a7032afdd5363ddc1582155b', // the branch's real tip
    );

    expect(result.status).toBe('clean');
    expect(result.violations).toEqual([]);
    // Sanity: this branch really did merge main in-branch and really did
    // touch BACKLOG.md itself — a trivial/no-op replay would prove nothing.
    expect(result.chainLength).toBeGreaterThan(1);
    expect(result.touchedByOwnCount).toBeGreaterThan(0);
  });

  it('a THIRD healthy branch with an in-branch merge (PR #92, team/2026-08-02-backlog-and-report — another backlog/report branch, the exact "standing victim" shape) also stays clean', () => {
    const result = replayBranch(
      'a5293ef826f1c95beca1f50464ff782ab549d46e', // main tip immediately before PR #92's merge
      '72678a06aec8417c9f35064627368f69cb879be6', // the branch's real tip
    );

    expect(result.status).toBe('clean');
    expect(result.violations).toEqual([]);
    expect(result.chainLength).toBeGreaterThan(1);
    expect(result.touchedByOwnCount).toBeGreaterThan(0);
  });

  it(
    'THE FULL CORPUS — every "Merge pull request #N" commit on main with a two-parent shape: exactly one violation (PR #81), zero false positives',
    () => {
    const mainRef = resolveRealMainRef();
    const mergeLog = execFileSync('git', ['log', '--merges', '--format=%H|%P|%s', mainRef], { cwd: REPO_ROOT, encoding: 'utf8' });
    const merges = mergeLog
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha, parentsRaw, ...rest] = line.split('|');
        return { sha, parents: parentsRaw.trim().split(/\s+/), subject: rest.join('|') };
      })
      .filter((m) => /^Merge pull request #\d+/.test(m.subject) && m.parents.length === 2);

    expect(merges.length).toBeGreaterThan(50); // sanity: this really swept the real corpus, not an empty list

    const violations: string[] = [];
    const inconclusiveOnes: string[] = [];
    for (const m of merges) {
      const [mainParent, branchTip] = m.parents;
      const result = replayBranch(mainParent, branchTip);
      if (result.status === 'violation') violations.push(`${m.sha.slice(0, 10)} ${m.subject}`);
      if (result.status === 'inconclusive') inconclusiveOnes.push(`${m.sha.slice(0, 10)} ${m.subject}: ${result.reason}`);
    }

    expect(inconclusiveOnes).toEqual([]);
    expect(violations).toEqual([expect.stringContaining('Merge pull request #81')]);
    },
    30000, // ~97 branches x several real `git` subprocess calls each — slow but a direct, permanent regression guard for the exact false-positive-rate claim this check's own header comment makes.
  );
});
