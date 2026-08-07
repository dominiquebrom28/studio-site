import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkReportClaims,
  defaultBaseRefCandidates,
  extractClaims,
  extractPathCandidatesFromText,
  getDiffEntries,
  resolveBaseRef,
  resolveBranchName,
} from './check-report-claims.mjs';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(DIRNAME, '..');

/**
 * Real `git` calls (not the mocked `gitRunner`) against THIS repo's actual
 * history, used only by the "real corpus" describe block at the bottom —
 * everything else in this file uses a fake `gitRunner` (no real repo
 * fixture needed), same split as `scripts/provenance/generate.test.ts`
 * (fake `gitRunner`) vs `scripts/provenance/vercelFullClone.test.ts` (reads
 * this repo's real committed `vercel.json`).
 */
function realGitShow(commit: string, relPath: string): string {
  return execFileSync('git', ['show', `${commit}:${relPath}`], { cwd: REPO_ROOT, encoding: 'utf8' });
}

function realGit(args: string[]): string {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
}

const tempDirs: string[] = [];
afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function makeReportsDir(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'report-claims-fixture-'));
  tempDirs.push(dir);
  const reportsDir = path.join(dir, 'reports');
  mkdirSync(reportsDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(reportsDir, name), content, 'utf8');
  }
  return reportsDir;
}

type GitCall = { cwd: string; args: string[] };

/** Fake `gitRunner` — no real git repository needed. `resolvableRefs` names
 * which base-ref candidates `rev-parse --verify` should accept;
 * `diffOutput` is the raw `git diff --name-status` stdout to return;
 * `headBranch` is what `rev-parse --abbrev-ref HEAD` should answer (use
 * `'HEAD'` to simulate a detached checkout, the real CI default for
 * `pull_request` events). */
function makeGitRunner({
  resolvableRefs = [] as string[],
  diffOutput = '',
  headBranch = 'HEAD',
  throwOnDiff = false,
} = {}) {
  return ({ args }: GitCall): string => {
    if (args[0] === 'rev-parse' && args[1] === '--verify') {
      const ref = args[2].replace(/\^\{commit\}$/, '');
      if (resolvableRefs.includes(ref)) return 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef\n';
      const err = new Error(`fatal: needed a single revision`) as Error & { stderr?: string };
      err.stderr = `fatal: ambiguous argument '${ref}': unknown revision or path not in the working tree.`;
      throw err;
    }
    if (args[0] === 'rev-parse' && args[1] === '--abbrev-ref') {
      return `${headBranch}\n`;
    }
    if (args[0] === 'diff' && args[1] === '--name-status') {
      if (throwOnDiff) throw new Error('simulated diff failure');
      return diffOutput;
    }
    throw new Error(`unexpected git invocation in test double: ${args.join(' ')}`);
  };
}

// ---------------------------------------------------------------------------

describe('extractPathCandidatesFromText — the extension-whitelist filter', () => {
  it('matches real repo-relative paths, bare root filenames, and `path:LINE`/`path:START-END` citations', () => {
    expect(extractPathCandidatesFromText('touched `BACKLOG.md` today')).toEqual(['BACKLOG.md']);
    expect(extractPathCandidatesFromText('see `reports/2026-07-30.md` for context')).toEqual(['reports/2026-07-30.md']);
    expect(extractPathCandidatesFromText('bug is in `src/lib/profile.ts:57-64` per the trace')).toEqual(['src/lib/profile.ts']);
    expect(extractPathCandidatesFromText('the gate (`.github/workflows/ci.yml:52`) started failing')).toEqual(['.github/workflows/ci.yml']);
  });

  it('matches compound-extension paths (`.test.ts`, `.d.mts`, `.generated.json`) — regression for the 2026-08-06 name-part-dot fix', () => {
    expect(extractPathCandidatesFromText('touched `scripts/check-report-claims.test.ts` today')).toEqual(['scripts/check-report-claims.test.ts']);
    expect(extractPathCandidatesFromText('touched `scripts/check-report-claims.d.mts` today')).toEqual(['scripts/check-report-claims.d.mts']);
    expect(extractPathCandidatesFromText('touched `src/content/provenance.generated.json` today')).toEqual(['src/content/provenance.generated.json']);
    expect(extractPathCandidatesFromText('touched `e2e/mobile-drawer.spec.ts` today')).toEqual(['e2e/mobile-drawer.spec.ts']);
  });

  it('never matches a BARE extension fragment used in prose to mean "files of this shape" — regression for the 2026-08-06 review catch', () => {
    // These appear throughout reports/ and BACKLOG.md (11 occurrences when
    // this test was written) as shorthand, never as paths. Widening the name
    // part for compound extensions above made them match until the first
    // character was anchored to a non-dot. They are in no diff, so a single
    // one landing in a branch-adjacent block would have failed this gate on
    // a report that had done nothing wrong.
    expect(extractPathCandidatesFromText('every sibling ships a `.test.ts` and a `.d.mts`')).toEqual([]);
    expect(extractPathCandidatesFromText('a `.spec.ts` in the e2e lane')).toEqual([]);
    expect(extractPathCandidatesFromText('the `.generated.json` drift gate')).toEqual([]);
    // ...while the same extensions on a real name still resolve.
    expect(extractPathCandidatesFromText('but `loader.test.ts` is a real file')).toEqual(['loader.test.ts']);
  });

  it('never matches decimals, timings, semver-ish numbers, or CSS custom properties (the false-positive class this gate must avoid)', () => {
    expect(extractPathCandidatesFromText('AA contrast went 4.45 -> 4.77:1')).toEqual([]);
    expect(extractPathCandidatesFromText('dispatched at t=8580.3ms and returned at t=8581.7ms')).toEqual([]);
    expect(extractPathCandidatesFromText('react-router 7.18.1 is installed and latest')).toEqual([]);
    expect(extractPathCandidatesFromText('fix the token, not the wash: `--warning` `#985f12` -> `#925a11`')).toEqual([]);
    expect(extractPathCandidatesFromText('throttled to 60x via CDP, 12/12 green')).toEqual([]);
  });

  it('never matches an absolute path or anything containing `..`', () => {
    expect(extractPathCandidatesFromText('/etc/passwd.txt was mentioned')).toEqual([]);
    expect(extractPathCandidatesFromText('../../secrets.json leaked')).toEqual([]);
  });

  it('strips surrounding backticks, parens, and sentence punctuation without eating the extension', () => {
    expect(extractPathCandidatesFromText('(BACKLOG.md + this report).')).toEqual(['BACKLOG.md']);
    expect(extractPathCandidatesFromText('touches `README.md`, `package.json`, and `vercel.json`.')).toEqual([
      'README.md',
      'package.json',
      'vercel.json',
    ]);
  });
});

// ---------------------------------------------------------------------------

describe('extractClaims — the claim-vs-citation boundary (the whole point of the narrow scope)', () => {
  const BRANCH = 'team/2026-07-31-backlog-and-report';

  it('the PR #81 shape: a self-referential paragraph naming the branch AND a plain (non-backticked) path is a claim', () => {
    const report = [
      '## For Dom to review',
      '',
      "**This run's own PR is deliberately the only new one:** the branch",
      `\`${BRANCH}\` (BACKLOG.md + this report).`,
      '',
    ].join('\n');

    const claims = extractClaims(report, BRANCH);
    expect([...claims.keys()]).toEqual(['BACKLOG.md']);
  });

  it('a path mentioned in a DIFFERENT paragraph that never names this branch is NOT a claim (citation, not self-reference)', () => {
    const report = [
      '## Learnings',
      '',
      '`Markdown.tsx` mutated a heading-id Map during render, which StrictMode',
      "double-invoke caught — a 2026-07-18 incident, unrelated to this run's",
      'own branch.',
      '',
      '## For Dom to review',
      '',
      `Filed on \`${BRANCH}\`.`,
      '',
    ].join('\n');

    const claims = extractClaims(report, BRANCH);
    expect(claims.size).toBe(0);
  });

  it('a path cited alongside a DIFFERENT branch (another item, another PR) is never treated as a claim about THIS branch', () => {
    const report = [
      '## Item worked on',
      '',
      '| Item | Branch |',
      '|---|---|',
      `| CI audit gate | \`team/2026-07-18-ci-audit-gate\` (touches \`.github/workflows/ci.yml\`) |`,
      `| This report | \`${BRANCH}\` |`,
      '',
    ].join('\n');

    const claims = extractClaims(report, BRANCH);
    expect(claims.size).toBe(0);
  });

  it('the SAME branch name reused for an unrelated repo\'s commit (real shape: reports/maintenance-2026-07-20.md) does not spuriously claim that repo\'s paths', () => {
    const report = [
      '### HIGH — SoulForce-V2: `main` did not build *(fixed)*',
      '',
      `Fixed on \`${BRANCH}\` (commit 301bf1e, local only, not pushed) by adding`,
      'the reader mirroring `loadLocalCharacter`. `npm run build` now passes.',
      '',
    ].join('\n');

    // No path-shaped token appears in this paragraph at all (function names
    // and commit hashes are not paths), so even though the branch string
    // does match, there is nothing to extract — proving the extension
    // whitelist, not just the branch filter, is doing real work here.
    const claims = extractClaims(report, BRANCH);
    expect(claims.size).toBe(0);
  });

  it('a table row naming this branch scopes extraction to THAT row only, not sibling rows', () => {
    const report = [
      '| Work | Branch / target |',
      '|---|---|',
      `| Diagnosed the red check | \`team/2026-07-29-asset-path-gate\` (touches \`e2e/mobile-drawer.spec.ts\`) |`,
      `| This report + backlog | \`${BRANCH}\` (\`BACKLOG.md\`) |`,
      '',
    ].join('\n');

    const claims = extractClaims(report, BRANCH);
    expect([...claims.keys()]).toEqual(['BACKLOG.md']);
  });

  it('THE FILES-PRODUCED-COLUMN EMPIRICAL CHECK (BACKLOG.md MEDIUM): a `| Item | Branch | Files produced/changed | PR |` row extracts every path in the new column, with zero change to the extraction logic itself', () => {
    const report = [
      '| Item | Branch | Files produced/changed | PR |',
      '|---|---|---|---|',
      `| Files-produced column | \`${BRANCH}\` | \`scripts/check-backlog-checkoffs.mjs\`, \`scripts/check-backlog-checkoffs.test.ts\`, \`scripts/check-backlog-checkoffs.d.mts\`, \`BACKLOG.md\` | [#111](https://x/111) |`,
      '',
    ].join('\n');

    const claims = extractClaims(report, BRANCH);
    expect([...claims.keys()]).toEqual([
      'scripts/check-backlog-checkoffs.mjs',
      'scripts/check-backlog-checkoffs.test.ts',
      'scripts/check-backlog-checkoffs.d.mts',
      'BACKLOG.md',
    ]);
  });

  it('a path inside a fenced code block is stripped before scanning, even when the SAME line inside the fence also names this branch (yaml provenance `produced:` is gated elsewhere)', () => {
    // Deliberately no leading `- ` list marker on the produced-path line —
    // a list marker would ALSO isolate it into its own scan block (see
    // `splitIntoScanBlocks`), which would make this test pass for the wrong
    // reason and hide a regression in fence-stripping specifically. Putting
    // the branch name and the path on the SAME unfenced-would-be-one-block
    // line is what actually exercises the fence strip in isolation.
    const report = ['## For Dom to review', '', '```yaml provenance', `branch: ${BRANCH} produced_path: content/posts/2026-07-31-example.md`, '```', ''].join(
      '\n',
    );

    const claims = extractClaims(report, BRANCH);
    expect(claims.size).toBe(0);
  });

  it('returns an empty map (never throws, never wildcard-matches) when branchName is null/undefined', () => {
    const report = '`BACKLOG.md` is mentioned here with no branch context at all.';
    expect(extractClaims(report, null).size).toBe(0);
    expect(extractClaims(report, undefined).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe('resolveBaseRef', () => {
  it('returns the first candidate that `git rev-parse --verify` accepts', () => {
    const gitRunner = makeGitRunner({ resolvableRefs: ['origin/main'] });
    const result = resolveBaseRef(gitRunner, '/repo', ['origin/main', 'main']);
    expect(result).toBe('origin/main');
  });

  it('falls through to a later candidate when an earlier one does not resolve', () => {
    const gitRunner = makeGitRunner({ resolvableRefs: ['main'] });
    const result = resolveBaseRef(gitRunner, '/repo', ['origin/main', 'main']);
    expect(result).toBe('main');
  });

  it('returns null (never throws) when NO candidate resolves — the shallow-clone / missing-history case', () => {
    const gitRunner = makeGitRunner({ resolvableRefs: [] });
    const result = resolveBaseRef(gitRunner, '/repo', ['origin/main', 'main']);
    expect(result).toBeNull();
  });
});

describe('defaultBaseRefCandidates', () => {
  it('prioritizes an explicit override, then GITHUB_BASE_REF (both origin- and bare-prefixed), then origin/main, then main', () => {
    expect(defaultBaseRefCandidates({ CHECK_REPORT_CLAIMS_BASE_REF: 'some-ref', GITHUB_BASE_REF: 'main' })).toEqual([
      'some-ref',
      'origin/main',
      'main',
      'origin/main',
      'main',
    ]);
    expect(defaultBaseRefCandidates({})).toEqual(['origin/main', 'main']);
  });
});

describe('resolveBranchName', () => {
  it('prefers GITHUB_HEAD_REF (the only reliable source in CI, where checkout is detached HEAD on pull_request)', () => {
    const gitRunner = makeGitRunner({ headBranch: 'HEAD' });
    const result = resolveBranchName(gitRunner, '/repo', 'HEAD', { GITHUB_HEAD_REF: 'team/2026-08-02-report-claims-gate' });
    expect(result).toBe('team/2026-08-02-report-claims-gate');
  });

  it('falls back to `git rev-parse --abbrev-ref HEAD` when GITHUB_HEAD_REF is absent', () => {
    const gitRunner = makeGitRunner({ headBranch: 'team/local-branch' });
    const result = resolveBranchName(gitRunner, '/repo', 'HEAD', {});
    expect(result).toBe('team/local-branch');
  });

  it('returns null (never "HEAD" or "") on a detached checkout with no GITHUB_HEAD_REF — the inconclusive trigger', () => {
    const gitRunner = makeGitRunner({ headBranch: 'HEAD' });
    const result = resolveBranchName(gitRunner, '/repo', 'HEAD', {});
    expect(result).toBeNull();
  });
});

describe('getDiffEntries', () => {
  it('parses `git diff --name-status` output, reducing a rename status like `R100` to `R` and keeping only the NEW path', () => {
    const gitRunner = makeGitRunner({ diffOutput: 'A\treports/2026-07-31.md\nM\tBACKLOG.md\nR100\told/name.ts\tnew/name.ts\n' });
    const entries = getDiffEntries(gitRunner, '/repo', 'main', 'HEAD');
    expect(entries).toEqual([
      { status: 'A', path: 'reports/2026-07-31.md' },
      { status: 'M', path: 'BACKLOG.md' },
      { status: 'R', path: 'new/name.ts' },
    ]);
  });
});

// ---------------------------------------------------------------------------

describe('checkReportClaims — end to end, fake gitRunner + fixture reportsDir', () => {
  it('THE PR #81 FALSIFICATION FIXTURE: a report claims BACKLOG.md near its own branch name, but the branch diff does not include it -> violation', () => {
    const branch = 'team/2026-07-31-backlog-and-report';
    const reportsDir = makeReportsDir({
      '2026-07-31.md': [
        '# Run report — 2026-07-31',
        '',
        '## For Dom to review',
        '',
        "**This run's own PR is deliberately the only new one:** the branch",
        `\`${branch}\` (BACKLOG.md + this report).`,
        '',
      ].join('\n'),
    });
    const gitRunner = makeGitRunner({
      resolvableRefs: ['origin/main'],
      diffOutput: 'A\treports/2026-07-31.md\n', // the real PR #81 diff shape: report only, no BACKLOG.md
    });

    const result = checkReportClaims({ repoRoot: '/repo', reportsDir, gitRunner, branchName: branch, baseRefCandidates: ['origin/main'] });

    expect(result.status).toBe('violation');
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatchObject({ report: 'reports/2026-07-31.md', claimedPath: 'BACKLOG.md' });
  });

  it('the same report is CLEAN when the branch diff actually includes the claimed path', () => {
    const branch = 'team/2026-07-31-backlog-and-report';
    const reportsDir = makeReportsDir({
      '2026-07-31.md': `the branch \`${branch}\` (BACKLOG.md + this report).\n`,
    });
    const gitRunner = makeGitRunner({
      resolvableRefs: ['origin/main'],
      diffOutput: 'A\treports/2026-07-31.md\nM\tBACKLOG.md\n',
    });

    const result = checkReportClaims({ repoRoot: '/repo', reportsDir, gitRunner, branchName: branch, baseRefCandidates: ['origin/main'] });

    expect(result.status).toBe('clean');
    expect(result.violations).toEqual([]);
    expect(result.checkedReports).toEqual([{ report: 'reports/2026-07-31.md', claimedPaths: ['BACKLOG.md'] }]);
  });

  it('is clean (and checks nothing) when the branch adds no new reports/*.md at all — the overwhelmingly common case', () => {
    const reportsDir = makeReportsDir({});
    const gitRunner = makeGitRunner({ resolvableRefs: ['origin/main'], diffOutput: 'M\tsrc/App.tsx\n' });

    const result = checkReportClaims({ repoRoot: '/repo', reportsDir, gitRunner, branchName: 'team/some-feature', baseRefCandidates: ['origin/main'] });

    expect(result.status).toBe('clean');
    expect(result.checkedReports).toEqual([]);
  });

  it('is inconclusive (never a false pass) when no base ref candidate resolves', () => {
    const reportsDir = makeReportsDir({});
    const gitRunner = makeGitRunner({ resolvableRefs: [] });

    const result = checkReportClaims({ repoRoot: '/repo', reportsDir, gitRunner, branchName: 'team/x', baseRefCandidates: ['origin/main', 'main'] });

    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/base ref/);
  });

  it('is inconclusive when the branch name cannot be determined (detached HEAD, no GITHUB_HEAD_REF)', () => {
    const reportsDir = makeReportsDir({});
    const gitRunner = makeGitRunner({ resolvableRefs: ['origin/main'], headBranch: 'HEAD' });

    const result = checkReportClaims({ repoRoot: '/repo', reportsDir, gitRunner, baseRefCandidates: ['origin/main'], env: {} });

    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/branch name/);
  });

  it('is inconclusive when `git diff` itself fails', () => {
    const reportsDir = makeReportsDir({});
    const gitRunner = makeGitRunner({ resolvableRefs: ['origin/main'], throwOnDiff: true });

    const result = checkReportClaims({ repoRoot: '/repo', reportsDir, gitRunner, branchName: 'team/x', baseRefCandidates: ['origin/main'] });

    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/git diff/);
  });

  it('is inconclusive (not a crash, not a silent skip) when git reports a new report file that is missing on disk', () => {
    const reportsDir = makeReportsDir({}); // deliberately does NOT contain 2026-07-31.md
    const gitRunner = makeGitRunner({ resolvableRefs: ['origin/main'], diffOutput: 'A\treports/2026-07-31.md\n' });

    const result = checkReportClaims({ repoRoot: '/repo', reportsDir, gitRunner, branchName: 'team/x', baseRefCandidates: ['origin/main'] });

    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/does not exist on disk/);
  });

  it('only checks NEWLY ADDED reports/*.md (status A) — an edited existing report is never treated as a fresh claim to verify', () => {
    const reportsDir = makeReportsDir({
      '2026-07-17.md': `edited later, mentions \`team/2026-07-27-provenance-backfill\` and \`content/posts/x.md\`.\n`,
    });
    const gitRunner = makeGitRunner({
      resolvableRefs: ['origin/main'],
      diffOutput: 'M\treports/2026-07-17.md\n', // MODIFIED, not added
    });

    const result = checkReportClaims({
      repoRoot: '/repo',
      reportsDir,
      gitRunner,
      branchName: 'team/2026-07-27-provenance-backfill',
      baseRefCandidates: ['origin/main'],
    });

    expect(result.status).toBe('clean');
    expect(result.checkedReports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

/**
 * Real corpus regression — REAL `git` (default `gitRunner`, this repo's
 * actual history), not the fake one above. For each PR that added a
 * `reports/*.md` file, replays the check against the two fixed, immutable
 * commits that bound that PR's real diff (its merge commit and that merge
 * commit's first parent — i.e. exactly `main` before/after that PR), using
 * the report's EXACT historical content (`git show <mergeCommit>:<path>`,
 * NOT today's working tree, which several of these files have since been
 * edited by unrelated later PRs — see the provenance-backfill mentions in
 * `reports/2026-07-17.md`/`2026-07-18.md`).
 *
 * `reports/2026-07-31.md` (PR #81) is expected to VIOLATE — that is the
 * real historical incident this whole check exists for (BACKLOG.md MEDIUM,
 * 2026-08-01), reproduced here against the actual PR, not just a synthetic
 * fixture. Every other report checked here is expected to stay clean; if
 * one of them ever doesn't, per this task's own instruction that is either
 * a genuine undiscovered historical finding or a sign the extraction has
 * gotten too loose — not something to quietly exclude.
 */
describe('checkReportClaims — real corpus regression (this repo\'s actual git history)', () => {
  /** Writes EVERY `reports/*.md` file that PR actually added (not just the
   * one under test) into the fixture `reportsDir` — some of these PRs added
   * more than one report (e.g. PR #34 also backfilled
   * `reports/2026-07-19-evening.md`), and `checkReportClaims` correctly
   * refuses to run (inconclusive) if a report `git diff` names as added is
   * missing from disk. */
  function replay(mergeCommit: string, parentCommit: string, branch: string) {
    const diffOutput = realGit(['diff', '--name-status', `${parentCommit}...${mergeCommit}`]);
    const addedReports = diffOutput
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('\t'))
      .filter(([status]) => status[0] === 'A')
      .map(([, p]) => p)
      .filter((p) => /^reports\/[^/]+\.md$/.test(p));

    const files: Record<string, string> = {};
    for (const reportPath of addedReports) {
      files[path.basename(reportPath)] = realGitShow(mergeCommit, reportPath);
    }
    const reportsDir = makeReportsDir(files);
    return checkReportClaims({
      repoRoot: REPO_ROOT,
      reportsDir,
      branchName: branch,
      headRef: mergeCommit,
      baseRefCandidates: [parentCommit],
    });
  }

  it('reports/2026-07-31.md (PR #81, "Backlog + 2026-07-31 run report") — VIOLATES: claims BACKLOG.md, the branch never touched it', () => {
    const result = replay(
      'dce1f7fcda92b97bbc2de80606b0052689c28b57', // Merge pull request #81
      '56e8dfbeb4c2b4c8d911b3c8a5f741f7044d8798', // main tip immediately before that merge
      'team/2026-07-31-backlog-and-report',
    );

    expect(result.status).toBe('violation');
    expect(result.violations).toContainEqual(expect.objectContaining({ report: 'reports/2026-07-31.md', claimedPath: 'BACKLOG.md' }));
  });

  it('reports/2026-07-21.md (PR #34) stays clean — it discusses items #32/#33\'s branches, never makes a path claim about its OWN branch', () => {
    const result = replay(
      'c8ff90ed71b8cf7cd9cec82fb612a6b0e4fa5064', // Merge pull request #34
      '483a6a3164512c51df5838c4eb394d2cc422e1c0',
      'team/2026-07-21-backlog-and-report',
    );
    expect(result.status).toBe('clean');
    expect(result.violations).toEqual([]);
  });

  it('reports/2026-07-18.md (PR #4, a 5-branch batch run) stays clean — its own filing branch is never claimed to carry any OTHER item\'s files', () => {
    const result = replay(
      '1bab69b4f5fe98031d543ba227622b557b95ca5f', // Merge pull request #4
      'ab6595a2a582de0d13bf86f6e3f813d9652ebf72',
      'team/2026-07-18-backlog-and-report',
    );
    expect(result.status).toBe('clean');
    expect(result.violations).toEqual([]);
  });

  it('reports/maintenance-2026-07-20.md stays clean — reuses its own branch STRING for an unrelated repo\'s (SoulForce-V2) commit, with no path-shaped claim nearby', () => {
    const result = replay(
      '861e4bfd6196f19ff149ac795b35155ec59fb70a', // Merge pull request #31
      'a23bee3bd2b20cc0540615b202ed3baa7b8ff979',
      'team/maintenance-2026-07-20',
    );
    expect(result.status).toBe('clean');
    expect(result.violations).toEqual([]);
  });
});
