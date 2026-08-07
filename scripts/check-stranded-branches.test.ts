import { describe, expect, it } from 'vitest';
import {
  checkStrandedBranches,
  classifyBranch,
  countCommitsAhead,
  defaultBaseRefCandidates,
  fetchPullRequests,
  groupPrsByHeadRef,
  isAncestor,
  listCandidateBranches,
  listFilesTouched,
  parseForEachRefOutput,
  prCoversTip,
  resolveBaseRef,
} from './check-stranded-branches.mjs';

// NOTE: the real-corpus, network-and-`gh`-dependent falsification block that
// USED to live at the bottom of this file now lives in
// `check-stranded-branches.real-corpus.test.ts`, run via `npm run
// test:real-corpus` rather than the default `npm test` sweep — see that
// file's header comment for the full rationale (BACKLOG.md MEDIUM,
// 2026-08-07, "make the real-`gh` split uniform across both scripts that
// have one"). Every test in THIS file uses fake `git`/`gh` runners — no
// network, no `gh` session — so `npm test` stays hermetic.

type Call = { cwd: string; args: string[] };

/**
 * Fake `gitRunner` keyed on a tiny in-memory ancestry graph:
 * `ancestors: { child: [ancestor, ancestor, ...] }` — `isAncestor(a, b)` is
 * true iff `a === b` or `a` appears in `ancestors[b]` (transitively). This
 * is enough to exercise `classifyBranch`/`prCoversTip` without a real repo.
 */
function makeGitRunner({
  ancestry = {} as Record<string, string[]>,
  revListCounts = {} as Record<string, number>,
  diffFiles = {} as Record<string, string[]>,
  resolvableRefs = [] as string[],
  forEachRefOutput = '',
} = {}) {
  function isAncestorOf(a: string, b: string, seen = new Set<string>()): boolean {
    if (a === b) return true;
    if (seen.has(b)) return false;
    seen.add(b);
    const parents = ancestry[b] ?? [];
    return parents.some((p) => isAncestorOf(a, p, seen));
  }

  return ({ args }: Call): string => {
    if (args[0] === 'merge-base' && args[1] === '--is-ancestor') {
      const [, , a, b] = args;
      if (isAncestorOf(a, b)) return '';
      const err = new Error('not an ancestor') as Error & { status?: number };
      err.status = 1;
      throw err;
    }
    if (args[0] === 'rev-parse' && args[1] === '--verify') {
      const ref = args[2].replace(/\^\{commit\}$/, '');
      if (resolvableRefs.includes(ref)) return 'deadbeef\n';
      const err = new Error('fatal: bad revision') as Error & { stderr?: string };
      err.stderr = `fatal: ambiguous argument '${ref}'`;
      throw err;
    }
    if (args[0] === 'for-each-ref') {
      return forEachRefOutput;
    }
    if (args[0] === 'rev-list' && args[1] === '--count') {
      const range = args[2];
      return `${revListCounts[range] ?? 0}\n`;
    }
    if (args[0] === 'diff' && args[1] === '--name-only') {
      const range = args[2];
      return `${(diffFiles[range] ?? []).join('\n')}\n`;
    }
    throw new Error(`unexpected git invocation in test double: ${args.join(' ')}`);
  };
}

function makeGhRunner({ prListOutput = '[]', throwError }: { prListOutput?: string; throwError?: Error & { code?: string; stderr?: string } } = {}) {
  return ({ args }: Call): string => {
    if (args[0] === 'pr' && args[1] === 'list') {
      if (throwError) throw throwError;
      return prListOutput;
    }
    throw new Error(`unexpected gh invocation in test double: ${args.join(' ')}`);
  };
}

// ---------------------------------------------------------------------------

describe('parseForEachRefOutput', () => {
  it('strips the "<remote>/" prefix from refname:short, keeping the branch name a PR headRefName would use', () => {
    const output = [
      'origin/team/2026-08-04-logbook|abc123|2026-08-04T20:00:00+02:00',
      'origin/claude/first-backlog-item-agvn1h|def456|2026-07-14T22:01:41Z',
      '',
    ].join('\n');
    expect(parseForEachRefOutput(output, 'origin')).toEqual([
      { name: 'team/2026-08-04-logbook', sha: 'abc123', committerDate: '2026-08-04T20:00:00+02:00' },
      { name: 'claude/first-backlog-item-agvn1h', sha: 'def456', committerDate: '2026-07-14T22:01:41Z' },
    ]);
  });

  it('returns an empty array for empty output (no matching branches — a real, valid outcome, not an error)', () => {
    expect(parseForEachRefOutput('', 'origin')).toEqual([]);
    expect(parseForEachRefOutput('\n\n', 'origin')).toEqual([]);
  });
});

describe('isAncestor', () => {
  it('returns true when the fake ancestry graph says so (exit 0)', () => {
    const gitRunner = makeGitRunner({ ancestry: { main: ['old-tip'] } });
    expect(isAncestor(gitRunner, '/repo', 'old-tip', 'main')).toBe(true);
  });

  it('returns false (not a thrown error) on the normal "not an ancestor" exit code 1', () => {
    const gitRunner = makeGitRunner({ ancestry: {} });
    expect(isAncestor(gitRunner, '/repo', 'unrelated-sha', 'main')).toBe(false);
  });

  it('throws (does not silently return false) on a real git error such as an unknown revision (exit 128)', () => {
    const gitRunner = ({ args }: Call): string => {
      if (args[0] === 'merge-base') {
        const err = new Error('fatal: Not a valid object name') as Error & { status?: number; stderr?: string };
        err.status = 128;
        err.stderr = 'fatal: Not a valid object name bogus-sha';
        throw err;
      }
      throw new Error('unexpected');
    };
    expect(() => isAncestor(gitRunner, '/repo', 'bogus-sha', 'main')).toThrow(/exit 128/);
  });
});

describe('listCandidateBranches', () => {
  it('runs `for-each-ref` against both team/* and claude/* remote patterns and parses the result', () => {
    const forEachRefOutput = ['origin/team/2026-08-04-logbook|abc|2026-08-04T20:00:00+02:00', 'origin/claude/foo-bar|def|2026-07-14T22:01:41Z', ''].join(
      '\n',
    );
    const gitRunner = makeGitRunner({ forEachRefOutput });
    const branches = listCandidateBranches(gitRunner, '/repo', 'origin');
    expect(branches).toEqual([
      { name: 'team/2026-08-04-logbook', sha: 'abc', committerDate: '2026-08-04T20:00:00+02:00' },
      { name: 'claude/foo-bar', sha: 'def', committerDate: '2026-07-14T22:01:41Z' },
    ]);
  });

  it('throws a StrandedBranchesGitError when the underlying git invocation fails, rather than returning an empty (falsely clean) list', () => {
    const gitRunner = (): string => {
      const err = new Error('fatal: not a git repository') as Error & { stderr?: string };
      err.stderr = 'fatal: not a git repository';
      throw err;
    };
    expect(() => listCandidateBranches(gitRunner, '/repo', 'origin')).toThrow(/not a git repository/);
  });
});

describe('countCommitsAhead / listFilesTouched', () => {
  it('countCommitsAhead parses `git rev-list --count` output as an integer', () => {
    const gitRunner = makeGitRunner({ revListCounts: { 'origin/main..sha-x': 4 } });
    expect(countCommitsAhead(gitRunner, '/repo', 'origin/main', 'sha-x')).toBe(4);
  });

  it('countCommitsAhead returns null (never throws, never a false 0) if git prints something unparseable', () => {
    const gitRunner = (): string => 'not-a-number\n';
    expect(countCommitsAhead(gitRunner, '/repo', 'origin/main', 'sha-x')).toBeNull();
  });

  it('listFilesTouched parses `git diff --name-only` output into a clean array, dropping blank lines', () => {
    const gitRunner = makeGitRunner({ diffFiles: { 'origin/main...sha-x': ['BACKLOG.md', 'reports/2026-08-03.md'] } });
    expect(listFilesTouched(gitRunner, '/repo', 'origin/main', 'sha-x')).toEqual(['BACKLOG.md', 'reports/2026-08-03.md']);
  });

  it('listFilesTouched returns [] (not [""]) when nothing changed', () => {
    const gitRunner = makeGitRunner({ diffFiles: {} });
    expect(listFilesTouched(gitRunner, '/repo', 'origin/main', 'sha-empty')).toEqual([]);
  });
});

describe('resolveBaseRef / defaultBaseRefCandidates', () => {
  it('prefers an explicit override, falls through to "<remote>/main", then bare "main"', () => {
    expect(defaultBaseRefCandidates('origin', { CHECK_STRANDED_BRANCHES_BASE_REF: 'some-ref' })).toEqual(['some-ref', 'origin/main', 'main']);
    expect(defaultBaseRefCandidates('origin', {})).toEqual(['origin/main', 'main']);
  });

  it('returns the first candidate `rev-parse --verify` accepts', () => {
    const gitRunner = makeGitRunner({ resolvableRefs: ['main'] });
    expect(resolveBaseRef(gitRunner, '/repo', ['origin/main', 'main'])).toBe('main');
  });

  it('returns null (never throws) when no candidate resolves', () => {
    const gitRunner = makeGitRunner({ resolvableRefs: [] });
    expect(resolveBaseRef(gitRunner, '/repo', ['origin/main', 'main'])).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe('prCoversTip — the coverage rule that distinguishes both stranding shapes', () => {
  it('an OPEN PR whose headRefOid is (an ancestor of, or equal to) the current tip covers it', () => {
    const gitRunner = makeGitRunner({ ancestry: { 'head-oid': ['tip-sha'] } }); // tip-sha ancestor of head-oid
    const pr = { number: 1, state: 'OPEN' as const, url: 'x', headRefName: 'team/x', headRefOid: 'head-oid', mergeCommitOid: null, title: 't' };
    expect(prCoversTip(gitRunner, '/repo', pr, 'tip-sha')).toBe(true);
  });

  it('a MERGED PR whose mergeCommit only captured an OLDER tip does NOT cover a tip that has since moved (the project-page-v2 shape)', () => {
    // mergeCommitOid's ancestry does NOT include the new tip — new commits
    // were pushed to the branch AFTER the merge, so they are descendants of
    // mergeCommitOid's parent, not ancestors of mergeCommitOid itself.
    const gitRunner = makeGitRunner({ ancestry: {} });
    const pr = { number: 25, state: 'MERGED' as const, url: 'x', headRefName: 'team/x', headRefOid: 'old-head-oid', mergeCommitOid: 'merge-oid', title: 't' };
    expect(prCoversTip(gitRunner, '/repo', pr, 'new-tip-sha')).toBe(false);
  });

  it('a MERGED PR whose mergeCommit DOES capture the current tip covers it', () => {
    const gitRunner = makeGitRunner({ ancestry: { 'merge-oid': ['tip-sha'] } });
    const pr = { number: 2, state: 'MERGED' as const, url: 'x', headRefName: 'team/x', headRefOid: 'tip-sha', mergeCommitOid: 'merge-oid', title: 't' };
    expect(prCoversTip(gitRunner, '/repo', pr, 'tip-sha')).toBe(true);
  });

  it('a CLOSED (unmerged) PR NEVER counts as coverage, even if its headRefOid exactly equals the current tip', () => {
    const gitRunner = makeGitRunner({ ancestry: {} });
    const pr = { number: 3, state: 'CLOSED' as const, url: 'x', headRefName: 'team/x', headRefOid: 'tip-sha', mergeCommitOid: null, title: 't' };
    expect(prCoversTip(gitRunner, '/repo', pr, 'tip-sha')).toBe(false);
  });
});

describe('classifyBranch', () => {
  it('"merged" when the tip is an ancestor of the base ref, regardless of any PR data (a merged ref just never got deleted)', () => {
    const gitRunner = makeGitRunner({ ancestry: { main: ['tip-sha'] } });
    expect(classifyBranch(gitRunner, '/repo', { sha: 'tip-sha' }, 'main', [])).toBe('merged');
  });

  it('"strandedNoPr" when not merged and zero PRs exist for the branch name', () => {
    const gitRunner = makeGitRunner({ ancestry: {} });
    expect(classifyBranch(gitRunner, '/repo', { sha: 'tip-sha' }, 'main', [])).toBe('strandedNoPr');
  });

  it('"covered" when not merged but an OPEN PR tracks the current tip (normal in-review branch — never flagged as a problem)', () => {
    const gitRunner = makeGitRunner({ ancestry: {} });
    const pr = { number: 5, state: 'OPEN' as const, url: 'x', headRefName: 'team/x', headRefOid: 'tip-sha', mergeCommitOid: null, title: 't' };
    expect(classifyBranch(gitRunner, '/repo', { sha: 'tip-sha' }, 'main', [pr])).toBe('covered');
  });

  it('"strandedStalePr" when a PR exists for the name but none of them cover the current tip', () => {
    const gitRunner = makeGitRunner({ ancestry: {} });
    const pr = { number: 25, state: 'MERGED' as const, url: 'x', headRefName: 'team/x', headRefOid: 'old-oid', mergeCommitOid: 'merge-oid', title: 't' };
    expect(classifyBranch(gitRunner, '/repo', { sha: 'new-tip-sha' }, 'main', [pr])).toBe('strandedStalePr');
  });
});

// ---------------------------------------------------------------------------

describe('fetchPullRequests', () => {
  it('parses gh JSON output into normalized PR records', () => {
    const ghRunner = makeGhRunner({
      prListOutput: JSON.stringify([
        { number: 25, state: 'MERGED', url: 'https://x/25', headRefName: 'team/a', headRefOid: 'aaa', mergeCommit: { oid: 'bbb' }, title: 'A' },
        { number: 26, state: 'OPEN', url: 'https://x/26', headRefName: 'team/b', headRefOid: 'ccc', mergeCommit: null, title: 'B' },
      ]),
    });
    const result = fetchPullRequests(ghRunner, '/repo');
    expect(result).toEqual([
      { number: 25, state: 'MERGED', url: 'https://x/25', headRefName: 'team/a', headRefOid: 'aaa', mergeCommitOid: 'bbb', title: 'A' },
      { number: 26, state: 'OPEN', url: 'https://x/26', headRefName: 'team/b', headRefOid: 'ccc', mergeCommitOid: null, title: 'B' },
    ]);
  });

  it('throws a StrandedBranchesGhError (never silently returns []) when gh itself fails — e.g. not authenticated', () => {
    const err = new Error('gh: not authenticated') as Error & { stderr?: string };
    err.stderr = 'To authenticate, please run `gh auth login`.';
    const ghRunner = makeGhRunner({ throwError: err });
    expect(() => fetchPullRequests(ghRunner, '/repo')).toThrow(/authenticate/);
  });

  it('throws with a clear message when gh is not installed at all (ENOENT)', () => {
    const err = new Error('spawn gh ENOENT') as Error & { code?: string };
    err.code = 'ENOENT';
    const ghRunner = makeGhRunner({ throwError: err });
    expect(() => fetchPullRequests(ghRunner, '/repo')).toThrow(/not installed/);
  });

  it('throws when gh returns output that is not valid JSON, rather than crashing on .map of undefined', () => {
    const ghRunner = makeGhRunner({ prListOutput: 'not json' });
    expect(() => fetchPullRequests(ghRunner, '/repo')).toThrow(/JSON/);
  });
});

describe('groupPrsByHeadRef', () => {
  it('groups multiple PRs under the same branch name together (a branch can be reopened / re-PR\'d)', () => {
    const prs = [
      { number: 1, state: 'CLOSED' as const, url: 'x', headRefName: 'team/x', headRefOid: 'a', mergeCommitOid: null, title: 't1' },
      { number: 2, state: 'MERGED' as const, url: 'y', headRefName: 'team/x', headRefOid: 'b', mergeCommitOid: 'c', title: 't2' },
      { number: 3, state: 'OPEN' as const, url: 'z', headRefName: 'team/other', headRefOid: 'd', mergeCommitOid: null, title: 't3' },
    ];
    const grouped = groupPrsByHeadRef(prs);
    expect(grouped.get('team/x')?.map((p) => p.number)).toEqual([1, 2]);
    expect(grouped.get('team/other')?.map((p) => p.number)).toEqual([3]);
    expect(grouped.get('team/nonexistent')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------

describe('checkStrandedBranches — end to end, fake gitRunner + ghRunner', () => {
  it('is CLEAN when every branch is either merged into main or covered by an open/merged PR', () => {
    const forEachRefOutput = ['origin/team/merged-one|sha-merged|2026-08-01T00:00:00Z', 'origin/team/open-pr-one|sha-open|2026-08-02T00:00:00Z', ''].join(
      '\n',
    );
    const gitRunner = makeGitRunner({
      resolvableRefs: ['origin/main'],
      forEachRefOutput,
      ancestry: { 'origin/main': ['sha-merged'] }, // sha-merged is an ancestor of main
    });
    const ghRunner = makeGhRunner({
      prListOutput: JSON.stringify([
        { number: 1, state: 'OPEN', url: 'https://x/1', headRefName: 'team/open-pr-one', headRefOid: 'sha-open', mergeCommit: null, title: 't' },
      ]),
    });

    const result = checkStrandedBranches({ repoRoot: '/repo', gitRunner, ghRunner, baseRefCandidates: ['origin/main'] });

    expect(result.status).toBe('clean');
    expect(result.strandedNoPr).toEqual([]);
    expect(result.strandedStalePr).toEqual([]);
    expect(result.totalBranchesScanned).toBe(2);
  });

  it('FOUND: a branch with zero PRs is reported under strandedNoPr with actionable detail (the 2026-08-03 shape)', () => {
    const forEachRefOutput = ['origin/team/2026-08-03-backlog-and-report|sha-orphan|2026-08-03T11:06:57+02:00', ''].join('\n');
    const gitRunner = makeGitRunner({
      resolvableRefs: ['origin/main'],
      forEachRefOutput,
      ancestry: {},
      revListCounts: { 'origin/main..sha-orphan': 3 },
      diffFiles: { 'origin/main...sha-orphan': ['BACKLOG.md', 'reports/2026-08-03.md'] },
    });
    const ghRunner = makeGhRunner({ prListOutput: '[]' });

    const result = checkStrandedBranches({ repoRoot: '/repo', gitRunner, ghRunner, baseRefCandidates: ['origin/main'], now: Date.parse('2026-08-05T00:00:00Z') });

    expect(result.status).toBe('found');
    expect(result.strandedNoPr).toHaveLength(1);
    expect(result.strandedStalePr).toEqual([]);
    const finding = result.strandedNoPr[0];
    expect(finding.branch).toBe('team/2026-08-03-backlog-and-report');
    expect(finding.commitsAhead).toBe(3);
    expect(finding.filesTouched).toEqual(['BACKLOG.md', 'reports/2026-08-03.md']);
    expect(finding.pullRequests).toEqual([]);
    expect(finding.ageDays).toBeGreaterThanOrEqual(1);
  });

  it('FOUND: a branch with a merged-but-stale PR is reported under strandedStalePr, citing the PR that does NOT cover it (the project-page-v2 shape)', () => {
    const forEachRefOutput = ['origin/team/2026-07-19-project-page-v2|new-tip|2026-07-19T15:36:34+02:00', ''].join('\n');
    const gitRunner = makeGitRunner({
      resolvableRefs: ['origin/main'],
      forEachRefOutput,
      ancestry: {}, // new-tip is not an ancestor of main, and merge-oid's ancestry does not include new-tip
      revListCounts: { 'origin/main..new-tip': 6 },
      diffFiles: { 'origin/main...new-tip': ['src/content/buildMode.ts', 'src/components/BuildTimeline.tsx'] },
    });
    const ghRunner = makeGhRunner({
      prListOutput: JSON.stringify([
        {
          number: 25,
          state: 'MERGED',
          url: 'https://github.com/dominiquebrom28/studio-site/pull/25',
          headRefName: 'team/2026-07-19-project-page-v2',
          headRefOid: 'old-head-oid',
          mergeCommit: { oid: 'merge-oid' },
          title: 'Project pages v2',
        },
      ]),
    });

    const result = checkStrandedBranches({ repoRoot: '/repo', gitRunner, ghRunner, baseRefCandidates: ['origin/main'] });

    expect(result.status).toBe('found');
    expect(result.strandedStalePr).toHaveLength(1);
    expect(result.strandedNoPr).toEqual([]);
    expect(result.strandedStalePr[0].pullRequests).toEqual([{ number: 25, state: 'MERGED', url: 'https://github.com/dominiquebrom28/studio-site/pull/25' }]);
  });

  it('CONTROL: a branch that IS merged (ancestor of main) stays quiet even though its ref was never deleted', () => {
    const forEachRefOutput = ['origin/team/old-and-merged|sha-old|2026-01-01T00:00:00Z', ''].join('\n');
    const gitRunner = makeGitRunner({ resolvableRefs: ['origin/main'], forEachRefOutput, ancestry: { 'origin/main': ['sha-old'] } });
    const ghRunner = makeGhRunner({ prListOutput: '[]' }); // ref outlived its PR record entirely — still must not be flagged

    const result = checkStrandedBranches({ repoRoot: '/repo', gitRunner, ghRunner, baseRefCandidates: ['origin/main'] });

    expect(result.status).toBe('clean');
  });

  it('CONTROL: a branch that DOES have a covering open PR stays quiet (the normal "mid-review" state, not a problem)', () => {
    const forEachRefOutput = ['origin/team/in-review|sha-review|2026-08-05T00:00:00Z', ''].join('\n');
    const gitRunner = makeGitRunner({ resolvableRefs: ['origin/main'], forEachRefOutput, ancestry: {} });
    const ghRunner = makeGhRunner({
      prListOutput: JSON.stringify([
        { number: 99, state: 'OPEN', url: 'https://x/99', headRefName: 'team/in-review', headRefOid: 'sha-review', mergeCommit: null, title: 't' },
      ]),
    });

    const result = checkStrandedBranches({ repoRoot: '/repo', gitRunner, ghRunner, baseRefCandidates: ['origin/main'] });

    expect(result.status).toBe('clean');
  });

  it('INCONCLUSIVE (never a false "clean") when gh fails', () => {
    const gitRunner = makeGitRunner({ resolvableRefs: ['origin/main'] });
    const err = new Error('gh: not authenticated') as Error & { stderr?: string };
    err.stderr = 'To authenticate, please run `gh auth login`.';
    const ghRunner = makeGhRunner({ throwError: err });

    const result = checkStrandedBranches({ repoRoot: '/repo', gitRunner, ghRunner, baseRefCandidates: ['origin/main'] });

    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/authenticate/);
  });

  it('INCONCLUSIVE when no base ref candidate resolves', () => {
    const gitRunner = makeGitRunner({ resolvableRefs: [] });
    const ghRunner = makeGhRunner({ prListOutput: '[]' });

    const result = checkStrandedBranches({ repoRoot: '/repo', gitRunner, ghRunner, baseRefCandidates: ['origin/main', 'main'] });

    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/base ref/);
  });
});
