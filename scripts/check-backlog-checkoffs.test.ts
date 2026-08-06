import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkBacklogCheckoffs,
  classifyBranchAgainstBacklog,
  extractItemRows,
  fetchPullRequests,
  groupPrsByHeadRef,
  hasMergedPr,
  isSelfReportingRow,
  parseBacklogBlocks,
} from './check-backlog-checkoffs.mjs';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(DIRNAME, '..');

/** Real `gh`/filesystem, used only by the "real corpus" describe block at
 * the bottom — the falsification evidence this task requires. Everything
 * else in this file uses a fake `ghRunner` and throwaway fixture files, same
 * split as `check-report-claims.test.ts` / `check-stranded-branches.test.ts`. */
function realGh(args: string[]): string {
  return execFileSync('gh', args, { cwd: REPO_ROOT, encoding: 'utf8' });
}

const tempDirs: string[] = [];
afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function makeFixture({ reports = {} as Record<string, string>, backlog = '' } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'backlog-checkoffs-fixture-'));
  tempDirs.push(dir);
  const reportsDir = path.join(dir, 'reports');
  mkdirSync(reportsDir, { recursive: true });
  for (const [name, content] of Object.entries(reports)) {
    writeFileSync(path.join(reportsDir, name), content, 'utf8');
  }
  const backlogPath = path.join(dir, 'BACKLOG.md');
  writeFileSync(backlogPath, backlog, 'utf8');
  return { dir, reportsDir, backlogPath };
}

type GhCall = { cwd: string; args: string[] };

function makeGhRunner({ prListOutput = '[]', throwError }: { prListOutput?: string; throwError?: Error & { code?: string; stderr?: string } } = {}) {
  return ({ args }: GhCall): string => {
    if (args[0] === 'pr' && args[1] === 'list') {
      if (throwError) throw throwError;
      return prListOutput;
    }
    throw new Error(`unexpected gh invocation in test double: ${args.join(' ')}`);
  };
}

type PrState = 'OPEN' | 'CLOSED' | 'MERGED';

function prRecord(overrides: Partial<{ number: number; state: PrState; headRefName: string; url: string; title: string }> = {}) {
  return {
    number: overrides.number ?? 1,
    state: overrides.state ?? ('MERGED' as PrState),
    headRefName: overrides.headRefName ?? 'team/x',
    url: overrides.url ?? 'https://x/1',
    title: overrides.title ?? 'title',
  };
}

// ---------------------------------------------------------------------------

describe('extractItemRows — the "Branch AND PR column both present" scope narrowing', () => {
  it('extracts item/branch/PR-cell from a canonical `| Item | Branch | PR |` table', () => {
    const report = [
      '## Items worked on',
      '',
      '| Item | Branch | PR |',
      '|---|---|---|',
      '| Runs API | `team/2026-08-04-runs-api` | [#98](https://x/98) |',
      '| Backlog + this report | `team/2026-08-04-backlog-and-report` | this PR |',
      '',
    ].join('\n');
    expect(extractItemRows(report)).toEqual([
      { item: 'Runs API', branch: 'team/2026-08-04-runs-api', prCell: '[#98](https://x/98)' },
      { item: 'Backlog + this report', branch: 'team/2026-08-04-backlog-and-report', prCell: 'this PR' },
    ]);
  });

  it('handles a `| # | Item | Branch | PR |` table (extra leading column) the same way', () => {
    const report = ['| # | Item | Branch | PR |', '|---|---|---|---|', '| 1 | Thing | `team/2026-08-01-thing` | [#84](https://x/84) |', ''].join('\n');
    expect(extractItemRows(report)).toEqual([{ item: 'Thing', branch: 'team/2026-08-01-thing', prCell: '[#84](https://x/84)' }]);
  });

  it('does NOT scan a "Branch"-only table with no "PR" column (the real `reports/2026-07-31.md` / `2026-08-03.md` "Work | Branch / target" shape)', () => {
    const report = [
      '## Item worked on',
      '',
      'None from the build backlog, on purpose.',
      '',
      '| Work | Branch / target |',
      '|---|---|',
      '| Diagnosed a prior red check | `team/2026-07-29-asset-path-gate` (existing PR, no new PR) |',
      '| This report + backlog | `team/2026-07-31-backlog-and-report` |',
      '',
    ].join('\n');
    expect(extractItemRows(report)).toEqual([]);
  });

  it('does NOT scan a "Branch"+"Pipeline" table (a "PR" column, exactly, is required — `reports/2026-07-18.md`\'s real shape)', () => {
    const report = ['| # | Item | Branch | Pipeline |', '|---|---|---|---|', '| 1 | CI gate | `team/2026-07-18-ci-audit-gate` | devops -> lead verify |', ''].join(
      '\n',
    );
    expect(extractItemRows(report)).toEqual([]);
  });

  it('skips a row whose branch cell has no backtick-quoted team/claude token, without guessing', () => {
    const report = ['| Item | Branch | PR |', '|---|---|---|', '| Investigation only | no code change | — |', ''].join('\n');
    expect(extractItemRows(report)).toEqual([]);
  });

  it('a table inside a fenced code block is never scanned, even if it names a branch+PR shape', () => {
    const report = ['## Items worked on', '', '```', '| Item | Branch | PR |', '|---|---|---|', '| Fake | `team/should-not-count` | [#1](x) |', '```', ''].join(
      '\n',
    );
    expect(extractItemRows(report)).toEqual([]);
  });

  it('returns [] for a report with no tables at all (the prose-only single-item report shape)', () => {
    const report = ['## Item worked on', '', '**Projects pages** — branch `team/2026-07-17-projects-pages`.', ''].join('\n');
    expect(extractItemRows(report)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('isSelfReportingRow — the two independent self-reference signals', () => {
  it('excludes a row whose PR cell is literally "this PR" (case-insensitive)', () => {
    expect(isSelfReportingRow({ branch: 'team/2026-08-02-backlog-and-report', prCell: 'this PR' })).toBe(true);
    expect(isSelfReportingRow({ branch: 'team/2026-08-02-backlog-and-report', prCell: 'This PR' })).toBe(true);
  });

  it('excludes a row whose branch ends in "-backlog-and-report", even with no "this PR" text (the pre-convention `2026-07-18`/`2026-07-31` shape)', () => {
    expect(isSelfReportingRow({ branch: 'team/2026-07-18-backlog-and-report', prCell: '' })).toBe(true);
    expect(isSelfReportingRow({ branch: 'team/2026-07-31-backlog-and-report', prCell: '' })).toBe(true);
  });

  it('does NOT exclude a genuine shipped-lane row', () => {
    expect(isSelfReportingRow({ branch: 'team/2026-08-04-undici-advisories', prCell: '[#101](https://x/101)' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe('parseBacklogBlocks / classifyBranchAgainstBacklog', () => {
  it('splits on top-level `- [ ]`/`- [x]` lines, including indented continuation lines, terminating at the next bullet or a heading', () => {
    const backlog = [
      '## Items',
      '',
      '- [x] **First.** Body text.',
      '      _(2026-08-01, team/a, PR #1.)_',
      '- [ ] **Second.** Body text mentioning team/b.',
      '',
      '### A subsection',
      '',
      '- [x] **Third.** team/c shipped here.',
      '',
    ].join('\n');
    const blocks = parseBacklogBlocks(backlog);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].checked).toBe(true);
    expect(blocks[0].text).toContain('team/a');
    expect(blocks[1].checked).toBe(false);
    expect(blocks[1].text).toContain('team/b');
    expect(blocks[2].checked).toBe(true);
    expect(blocks[2].text).toContain('team/c');
  });

  it('classifies "checked" when the branch is cited inside an `[x]` block', () => {
    const blocks = parseBacklogBlocks('- [x] **Item.** team/2026-08-01-thing shipped.\n');
    expect(classifyBranchAgainstBacklog('team/2026-08-01-thing', blocks)).toBe('checked');
  });

  it('classifies "referencedButOpen" when the branch is cited ONLY inside `[ ]` block(s) — the real `team/2026-08-04-runs-api` shape (multi-PR epic, honestly still open)', () => {
    const blocks = parseBacklogBlocks('- [ ] **Runs API (epic).** team/2026-08-04-runs-api shipped PR 2 of several; item still open.\n');
    expect(classifyBranchAgainstBacklog('team/2026-08-04-runs-api', blocks)).toBe('referencedButOpen');
  });

  it('classifies "unreferenced" when the branch appears in no block at all — the PR #100 incident shape', () => {
    const blocks = parseBacklogBlocks('- [x] **Unrelated item.** Nothing to do with this branch.\n');
    expect(classifyBranchAgainstBacklog('team/2026-08-04-undici-advisories', blocks)).toBe('unreferenced');
  });

  it('classifies "checked" if the branch is checked ANYWHERE, even if also cited in an unrelated open block elsewhere', () => {
    const blocks = parseBacklogBlocks(['- [ ] **Open item.** Mentions team/x in passing.', '- [x] **Real closer.** team/x actually shipped this.', ''].join('\n'));
    expect(classifyBranchAgainstBacklog('team/x', blocks)).toBe('checked');
  });
});

// ---------------------------------------------------------------------------

describe('fetchPullRequests / groupPrsByHeadRef / hasMergedPr', () => {
  it('parses gh JSON into normalized records', () => {
    const ghRunner = makeGhRunner({
      prListOutput: JSON.stringify([{ number: 98, state: 'MERGED', headRefName: 'team/x', url: 'https://x/98', title: 'X' }]),
    });
    expect(fetchPullRequests(ghRunner, '/repo')).toEqual([{ number: 98, state: 'MERGED', headRefName: 'team/x', url: 'https://x/98', title: 'X' }]);
  });

  it('throws (never silently returns []) when gh is not installed', () => {
    const err = new Error('spawn gh ENOENT') as Error & { code?: string };
    err.code = 'ENOENT';
    expect(() => fetchPullRequests(makeGhRunner({ throwError: err }), '/repo')).toThrow(/not installed/);
  });

  it('throws when gh output is not valid JSON', () => {
    expect(() => fetchPullRequests(makeGhRunner({ prListOutput: 'not json' }), '/repo')).toThrow(/JSON/);
  });

  it('groupPrsByHeadRef groups multiple PRs under the same branch', () => {
    const prs = [prRecord({ number: 1, state: 'CLOSED', headRefName: 'team/x' }), prRecord({ number: 2, state: 'MERGED', headRefName: 'team/x' })];
    expect(groupPrsByHeadRef(prs).get('team/x')?.map((p) => p.number)).toEqual([1, 2]);
  });

  it('hasMergedPr is true iff at least one PR for the branch reached MERGED', () => {
    expect(hasMergedPr([prRecord({ state: 'OPEN' }), prRecord({ state: 'MERGED' })])).toBe(true);
    expect(hasMergedPr([prRecord({ state: 'OPEN' }), prRecord({ state: 'CLOSED' })])).toBe(false);
    expect(hasMergedPr([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe('checkBacklogCheckoffs — end to end, fake ghRunner + fixture files', () => {
  it('THE PR #100 FALSIFICATION FIXTURE: a merged branch never referenced in BACKLOG.md -> violation', () => {
    const { reportsDir, backlogPath } = makeFixture({
      reports: {
        '2026-08-04.md': ['| Item | Branch | PR |', '|---|---|---|', '| `undici` advisories | `team/2026-08-04-undici-advisories` | [#101](https://x/101) |', ''].join(
          '\n',
        ),
      },
      backlog: '- [x] **Unrelated item.** Nothing to do with this branch.\n',
    });
    const ghRunner = makeGhRunner({
      prListOutput: JSON.stringify([prRecord({ number: 101, state: 'MERGED', headRefName: 'team/2026-08-04-undici-advisories' })]),
    });

    const result = checkBacklogCheckoffs({ repoRoot: '/repo', reportsDir, backlogPath, ghRunner });

    expect(result.status).toBe('violation');
    expect(result.unreferenced).toEqual([
      { report: 'reports/2026-08-04.md', item: '`undici` advisories', branch: 'team/2026-08-04-undici-advisories', prCell: '[#101](https://x/101)' },
    ]);
    expect(result.referencedButOpen).toEqual([]);
  });

  it('is CLEAN (with a referencedButOpen note, not a failure) for the real `team/2026-08-04-runs-api` multi-PR-epic shape', () => {
    const { reportsDir, backlogPath } = makeFixture({
      reports: {
        '2026-08-04.md': ['| Item | Branch | PR |', '|---|---|---|', '| Runs API | `team/2026-08-04-runs-api` | [#98](https://x/98) |', ''].join('\n'),
      },
      backlog: '- [ ] **Runs API (epic, §6 PR 2 of several).** team/2026-08-04-runs-api shipped one PR; item still open.\n',
    });
    const ghRunner = makeGhRunner({ prListOutput: JSON.stringify([prRecord({ number: 98, state: 'MERGED', headRefName: 'team/2026-08-04-runs-api' })]) });

    const result = checkBacklogCheckoffs({ repoRoot: '/repo', reportsDir, backlogPath, ghRunner });

    expect(result.status).toBe('clean');
    expect(result.unreferenced).toEqual([]);
    expect(result.referencedButOpen).toHaveLength(1);
    expect(result.referencedButOpen[0].branch).toBe('team/2026-08-04-runs-api');
  });

  it('is CLEAN when the branch is properly checked off', () => {
    const { reportsDir, backlogPath } = makeFixture({
      reports: {
        '2026-08-05.md': ['| Item | Branch | PR |', '|---|---|---|', '| Stranded-branch gate | `team/2026-08-05-stranded-branches` | [#106](https://x/106) |', ''].join(
          '\n',
        ),
      },
      backlog: '- [x] **Stranded-branch gate.** _(2026-08-05, team/2026-08-05-stranded-branches, PR #106.)_\n',
    });
    const ghRunner = makeGhRunner({
      prListOutput: JSON.stringify([prRecord({ number: 106, state: 'MERGED', headRefName: 'team/2026-08-05-stranded-branches' })]),
    });

    const result = checkBacklogCheckoffs({ repoRoot: '/repo', reportsDir, backlogPath, ghRunner });
    expect(result.status).toBe('clean');
    expect(result.unreferenced).toEqual([]);
    expect(result.referencedButOpen).toEqual([]);
  });

  it('MUST NOT FIRE for an unmerged branch (OPEN PR — work still in review, the explicit "gate born failing" guard)', () => {
    const { reportsDir, backlogPath } = makeFixture({
      reports: {
        '2026-08-06.md': ['| Item | Branch | PR |', '|---|---|---|', '| In review | `team/2026-08-06-in-review` | [#200](https://x/200) |', ''].join('\n'),
      },
      backlog: '- [x] **Unrelated.** Nothing here.\n',
    });
    const ghRunner = makeGhRunner({ prListOutput: JSON.stringify([prRecord({ number: 200, state: 'OPEN', headRefName: 'team/2026-08-06-in-review' })]) });

    const result = checkBacklogCheckoffs({ repoRoot: '/repo', reportsDir, backlogPath, ghRunner });
    expect(result.status).toBe('clean');
    expect(result.unreferenced).toEqual([]);
    expect(result.referencedButOpen).toEqual([]);
  });

  it('MUST NOT FIRE for a branch with NO pull request at all (report written before the PR exists)', () => {
    const { reportsDir, backlogPath } = makeFixture({
      reports: {
        '2026-08-06.md': ['| Item | Branch | PR |', '|---|---|---|', '| Just pushed | `team/2026-08-06-just-pushed` | (pending) |', ''].join('\n'),
      },
      backlog: '',
    });
    const ghRunner = makeGhRunner({ prListOutput: '[]' });

    const result = checkBacklogCheckoffs({ repoRoot: '/repo', reportsDir, backlogPath, ghRunner });
    expect(result.status).toBe('clean');
    expect(result.unreferenced).toEqual([]);
  });

  it('excludes the self-reporting bookkeeping row even when merged and never itself cited in BACKLOG.md', () => {
    const { reportsDir, backlogPath } = makeFixture({
      reports: {
        '2026-08-04.md': ['| Item | Branch | PR |', '|---|---|---|', '| Backlog + this report | `team/2026-08-04-backlog-and-report` | this PR |', ''].join(
          '\n',
        ),
      },
      backlog: '',
    });
    const ghRunner = makeGhRunner({ prListOutput: JSON.stringify([prRecord({ number: 100, state: 'MERGED', headRefName: 'team/2026-08-04-backlog-and-report' })]) });

    const result = checkBacklogCheckoffs({ repoRoot: '/repo', reportsDir, backlogPath, ghRunner });
    expect(result.status).toBe('clean');
    expect(result.totalItemRowsScanned).toBe(0);
  });

  it('is CLEAN and scans 0 rows when the reports directory is empty (the overwhelmingly common local case)', () => {
    const { reportsDir, backlogPath } = makeFixture({ reports: {}, backlog: '' });
    const ghRunner = makeGhRunner({ prListOutput: '[]' });
    const result = checkBacklogCheckoffs({ repoRoot: '/repo', reportsDir, backlogPath, ghRunner });
    expect(result.status).toBe('clean');
    expect(result.totalReportsScanned).toBe(0);
    expect(result.totalItemRowsScanned).toBe(0);
  });

  it('is INCONCLUSIVE (never a false pass) when the reports directory does not exist at all', () => {
    const result = checkBacklogCheckoffs({ repoRoot: '/repo', reportsDir: '/does/not/exist/reports', backlogPath: '/does/not/exist/BACKLOG.md', ghRunner: makeGhRunner() });
    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/does not exist/);
  });

  it('is INCONCLUSIVE when BACKLOG.md cannot be read', () => {
    const { reportsDir } = makeFixture({ reports: {}, backlog: '' });
    const result = checkBacklogCheckoffs({ repoRoot: '/repo', reportsDir, backlogPath: '/does/not/exist/BACKLOG.md', ghRunner: makeGhRunner() });
    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/could not read/);
  });

  it('is INCONCLUSIVE when gh itself fails (not authenticated)', () => {
    const { reportsDir, backlogPath } = makeFixture({ reports: {}, backlog: '' });
    const err = new Error('gh: not authenticated') as Error & { stderr?: string };
    err.stderr = 'To authenticate, please run `gh auth login`.';
    const result = checkBacklogCheckoffs({ repoRoot: '/repo', reportsDir, backlogPath, ghRunner: makeGhRunner({ throwError: err }) });
    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/authenticate/);
  });
});

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
 * its own very first real run, not injected. This branch's `BACKLOG.md` adds
 * the missing `[x]` (see "Added 2026-08-06" there) rather than leaving the
 * gate red on day one; the test below asserts the now-clean result. The
 * violation-detection path itself is separately proven red by the synthetic
 * "THE PR #100 FALSIFICATION FIXTURE" test above (fake `ghRunner`, isolated
 * from this fix), so this fix is not what's "protecting" that coverage.
 */
describe('checkBacklogCheckoffs — real corpus (this repo\'s actual reports/BACKLOG.md + real `gh pr list`)', () => {
  it('is CLEAN as of this branch\'s own BACKLOG.md fix, with one referencedButOpen note for the real `team/2026-08-04-runs-api` multi-PR epic (PR #98)', () => {
    const result = checkBacklogCheckoffs({ repoRoot: REPO_ROOT });

    if (result.status === 'inconclusive') {
      throw new Error(`real-corpus check came back inconclusive (gh unavailable in this environment?): ${result.reason}`);
    }

    expect(result.status).toBe('clean');
    expect(result.unreferenced).toEqual([]);

    expect(result.referencedButOpen).toHaveLength(1);
    expect(result.referencedButOpen[0]).toMatchObject({ report: 'reports/2026-08-04.md', branch: 'team/2026-08-04-runs-api' });
  });

  it('control: a genuinely closed lane from the real corpus (`team/2026-08-05-stranded-branches`, PR #106) is neither unreferenced nor referencedButOpen', () => {
    const result = checkBacklogCheckoffs({ repoRoot: REPO_ROOT });
    if (result.status === 'inconclusive') return; // covered by the test above
    const branches = [...result.unreferenced, ...result.referencedButOpen].map((f) => f.branch);
    expect(branches).not.toContain('team/2026-08-05-stranded-branches');
  });

  it('sanity: `gh pr list` really does see PR #101 as MERGED (the ground truth this whole gate depends on, not assumed)', () => {
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
