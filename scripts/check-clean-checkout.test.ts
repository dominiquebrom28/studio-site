import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkCleanCheckout, classifyEntry, parsePorcelainStatus, resolveMainRepoRoot } from './check-clean-checkout.mjs';

/**
 * `checkCleanCheckout` is exercised two ways, matching this directory's
 * existing split (`check-stranded-branches.test.ts`,
 * `check-backlog-checkoffs.test.ts`):
 *
 *  - Pure-function unit tests (`parsePorcelainStatus` / `classifyEntry`) and
 *    error-path tests (`checkCleanCheckout` with a FAKE `gitRunner`) — no
 *    real git repo needed, deterministic, fast.
 *  - THE FALSIFICATION SUITE (bottom of this file): a REAL, throwaway git
 *    repo built under `os.tmpdir()` via real `git` (`execFileSync`),
 *    reproducing the actual 2026-08-05 shape (an untracked, publish-ready
 *    `content/posts/*.md` file) and proving the check goes RED, then GREEN
 *    once committed — the task's own falsification requirement, run for
 *    real, not asserted from a mocked runner. Never touches this repo's own
 *    working tree (a real hazard here specifically, since this script's
 *    whole point is "shared checkouts get dirtied by concurrent work" —
 *    manufacturing that on the real shared tree to test the check that
 *    guards against it would be exactly backwards).
 */

const tempDirs: string[] = [];
afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function realGit(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

/** Inits a real repo with a real committed initial state (git refuses to
 * run several commands, e.g. `worktree add -b`, against a repo with zero
 * commits) and a local, throwaway identity (never the developer's real git
 * config). */
function initRealRepo(dir: string): void {
  realGit(dir, ['init', '--quiet', '-b', 'main']);
  realGit(dir, ['config', 'user.email', 'fixture@example.test']);
  realGit(dir, ['config', 'user.name', 'Fixture']);
  mkdirSync(path.join(dir, 'content', 'posts'), { recursive: true });
  writeFileSync(path.join(dir, 'content', 'posts', '2026-01-01-older-post.md'), '---\ndraft: false\n---\nOlder post.\n', 'utf8');
  writeFileSync(path.join(dir, 'README.md'), '# fixture\n', 'utf8');
  realGit(dir, ['add', '-A']);
  realGit(dir, ['commit', '--quiet', '-m', 'initial commit']);
}

type Call = { cwd: string; args: string[] };

function makeFakeGitRunner({
  commonDir,
  statusOutput,
  throwOnCommonDir,
  throwOnStatus,
}: {
  commonDir?: string;
  statusOutput?: string;
  throwOnCommonDir?: Error;
  throwOnStatus?: Error;
} = {}) {
  return ({ cwd, args }: Call): string => {
    if (args[0] === 'rev-parse' && args.includes('--git-common-dir')) {
      if (throwOnCommonDir) throw throwOnCommonDir;
      return `${commonDir ?? path.join(cwd, '.git')}\n`;
    }
    if (args[0] === 'status') {
      if (throwOnStatus) throw throwOnStatus;
      return statusOutput ?? '';
    }
    throw new Error(`unexpected git invocation in test double: ${args.join(' ')}`);
  };
}

// ---------------------------------------------------------------------------

describe('parsePorcelainStatus', () => {
  it('parses a plain untracked entry', () => {
    expect(parsePorcelainStatus('?? content/posts/new-post.md\n')).toEqual([
      { code: '??', path: 'content/posts/new-post.md', renamedFrom: null },
    ]);
  });

  it('parses a working-tree-modified entry', () => {
    expect(parsePorcelainStatus(' M src/App.tsx\n')).toEqual([{ code: ' M', path: 'src/App.tsx', renamedFrom: null }]);
  });

  it('parses a staged addition', () => {
    expect(parsePorcelainStatus('A  reports/2026-08-06.md\n')).toEqual([{ code: 'A ', path: 'reports/2026-08-06.md', renamedFrom: null }]);
  });

  it('parses a rename, using the destination path and keeping the source in renamedFrom', () => {
    expect(parsePorcelainStatus('R  old-name.md -> new-name.md\n')).toEqual([
      { code: 'R ', path: 'new-name.md', renamedFrom: 'old-name.md' },
    ]);
  });

  it('un-quotes a C-style quoted path (space in filename)', () => {
    expect(parsePorcelainStatus('?? "content/posts/a file with spaces.md"\n')).toEqual([
      { code: '??', path: 'content/posts/a file with spaces.md', renamedFrom: null },
    ]);
  });

  it('parses multiple lines and ignores a trailing blank line', () => {
    const output = '?? content/posts/a.md\n M README.md\n';
    expect(parsePorcelainStatus(output)).toHaveLength(2);
  });

  it('returns [] for empty output', () => {
    expect(parsePorcelainStatus('')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('classifyEntry — the content/ + reports/ escalation boundary', () => {
  it('escalates a file directly under content/', () => {
    expect(classifyEntry({ code: '??', path: 'content/posts/x.md', renamedFrom: null })).toBe('escalated');
  });

  it('escalates a file directly under reports/', () => {
    expect(classifyEntry({ code: '??', path: 'reports/2026-08-06.md', renamedFrom: null })).toBe('escalated');
  });

  it('does NOT escalate a path that merely starts with the same letters (no false prefix match)', () => {
    expect(classifyEntry({ code: '??', path: 'content-backup/x.md', renamedFrom: null })).toBe('other');
    expect(classifyEntry({ code: '??', path: 'reports-archive/x.md', renamedFrom: null })).toBe('other');
  });

  it('does not escalate an unrelated path', () => {
    expect(classifyEntry({ code: ' M', path: 'src/App.tsx', renamedFrom: null })).toBe('other');
  });
});

// ---------------------------------------------------------------------------

describe('checkCleanCheckout — error paths (fake gitRunner, no real repo)', () => {
  it('is INCONCLUSIVE, not clean, when the shared checkout root cannot be resolved (not a git repo)', () => {
    const err = new Error('fatal: not a git repository') as Error & { stderr?: string };
    err.stderr = 'fatal: not a git repository (or any of the parent directories): .git';
    const result = checkCleanCheckout({ gitRunner: makeFakeGitRunner({ throwOnCommonDir: err }), env: {} });

    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/not a git repository/);
  });

  it('is INCONCLUSIVE when `git status` itself fails after the root resolves', () => {
    const err = new Error('git status exploded') as Error & { stderr?: string };
    err.stderr = 'fatal: something went wrong';
    const result = checkCleanCheckout({
      gitRunner: makeFakeGitRunner({ commonDir: '/repo/.git', throwOnStatus: err }),
      env: {},
    });

    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/something went wrong/);
  });

  it('respects an explicit repoRoot option, skipping auto-detection entirely', () => {
    const runner = makeFakeGitRunner({ statusOutput: '' });
    const result = checkCleanCheckout({ repoRoot: '/explicit/root', gitRunner: runner, env: {} });
    expect(result.status).toBe('clean');
    expect(result.repoRoot).toBe('/explicit/root');
  });

  it('respects CHECK_CLEAN_CHECKOUT_REPO_ROOT env override when no explicit option is given', () => {
    const runner = makeFakeGitRunner({ statusOutput: '' });
    const result = checkCleanCheckout({ gitRunner: runner, env: { CHECK_CLEAN_CHECKOUT_REPO_ROOT: '/env/root' } });
    expect(result.status).toBe('clean');
    expect(result.repoRoot).toBe('/env/root');
  });
});

// ---------------------------------------------------------------------------

describe('checkCleanCheckout — dirt classification (fake gitRunner)', () => {
  it('splits findings into escalated (content/, reports/) and other', () => {
    const statusOutput = ['?? content/posts/x.md', 'A  reports/2026-08-06.md', ' M src/App.tsx', '?? .DS_Store', ''].join('\n');
    const result = checkCleanCheckout({ gitRunner: makeFakeGitRunner({ statusOutput }), env: { CHECK_CLEAN_CHECKOUT_REPO_ROOT: '/x' } });

    expect(result.status).toBe('found');
    expect(result.totalEntries).toBe(4);
    expect(result.escalated.map((e) => e.path)).toEqual(['content/posts/x.md', 'reports/2026-08-06.md']);
    expect(result.other.map((e) => e.path)).toEqual(['src/App.tsx', '.DS_Store']);
  });

  it('is clean when git status is empty', () => {
    const result = checkCleanCheckout({ gitRunner: makeFakeGitRunner({ statusOutput: '' }), env: { CHECK_CLEAN_CHECKOUT_REPO_ROOT: '/x' } });
    expect(result.status).toBe('clean');
    expect(result.escalated).toEqual([]);
    expect(result.other).toEqual([]);
  });

  it('is FOUND (exit-1-shaped) even when ALL dirt is low-severity "other" — the assertion is "porcelain is empty", not just "no content/reports dirt"', () => {
    const result = checkCleanCheckout({
      gitRunner: makeFakeGitRunner({ statusOutput: '?? .DS_Store\n' }),
      env: { CHECK_CLEAN_CHECKOUT_REPO_ROOT: '/x' },
    });
    expect(result.status).toBe('found');
    expect(result.escalated).toEqual([]);
    expect(result.other).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// THE FALSIFICATION SUITE — real git, real throwaway repos, real red -> green.
// ---------------------------------------------------------------------------

describe('checkCleanCheckout — FALSIFICATION: the actual 2026-08-05 shape, reproduced with real git', () => {
  it('is RED: an untracked, publish-ready content/posts/*.md file is caught and escalated', () => {
    const repo = makeTempDir('clean-checkout-falsify-red-');
    initRealRepo(repo);

    // The exact incident shape: a complete, `draft: false` post, written but
    // never `git add`ed.
    const postPath = path.join(repo, 'content', 'posts', '2026-08-05-the-post-said-it-was-fixed.md');
    writeFileSync(
      postPath,
      ['---', 'title: The post said it was fixed', 'date: 2026-08-05', 'draft: false', '---', '', 'Body text.', ''].join('\n'),
      'utf8',
    );

    const result = checkCleanCheckout({ repoRoot: repo });

    expect(result.status).toBe('found');
    expect(result.escalated).toEqual([{ code: '??', path: 'content/posts/2026-08-05-the-post-said-it-was-fixed.md', renamedFrom: null }]);
    expect(result.other).toEqual([]);
  });

  it('is GREEN once that exact file is committed — same repo, no other change', () => {
    const repo = makeTempDir('clean-checkout-falsify-green-');
    initRealRepo(repo);

    const postPath = path.join(repo, 'content', 'posts', '2026-08-05-the-post-said-it-was-fixed.md');
    writeFileSync(postPath, '---\ndraft: false\n---\nBody text.\n', 'utf8');

    // Still dirty before committing (regression guard for the RED half above).
    expect(checkCleanCheckout({ repoRoot: repo }).status).toBe('found');

    realGit(repo, ['add', '-A']);
    realGit(repo, ['commit', '--quiet', '-m', 'land the 2026-08-05 post']);

    const result = checkCleanCheckout({ repoRoot: repo });
    expect(result.status).toBe('clean');
    expect(result.escalated).toEqual([]);
    expect(result.other).toEqual([]);
  });

  it('a plain clean checkout with zero changes reports clean from the start', () => {
    const repo = makeTempDir('clean-checkout-falsify-clean-');
    initRealRepo(repo);
    const result = checkCleanCheckout({ repoRoot: repo });
    expect(result.status).toBe('clean');
    expect(result.totalEntries).toBe(0);
  });

  it('a MODIFIED (already-tracked) file under reports/ is also escalated, not just a brand-new untracked one', () => {
    const repo = makeTempDir('clean-checkout-falsify-modified-');
    initRealRepo(repo);
    mkdirSync(path.join(repo, 'reports'), { recursive: true });
    writeFileSync(path.join(repo, 'reports', '2026-08-06.md'), 'original\n', 'utf8');
    realGit(repo, ['add', '-A']);
    realGit(repo, ['commit', '--quiet', '-m', 'add report']);

    writeFileSync(path.join(repo, 'reports', '2026-08-06.md'), 'edited but never committed\n', 'utf8');

    const result = checkCleanCheckout({ repoRoot: repo });
    expect(result.status).toBe('found');
    expect(result.escalated).toEqual([{ code: ' M', path: 'reports/2026-08-06.md', renamedFrom: null }]);
  });

  it('is INCONCLUSIVE (never a false "clean") against a directory that is not a git repo at all', () => {
    const notARepo = makeTempDir('clean-checkout-not-a-repo-');
    const result = checkCleanCheckout({ repoRoot: notARepo });
    expect(result.status).toBe('inconclusive');
  });
});

// ---------------------------------------------------------------------------

describe('resolveMainRepoRoot — real git worktree, proving it resolves the SHARED root, not the worktree', () => {
  it('returns the MAIN checkout root when invoked from a linked worktree, and flags dirt left in the main checkout even though the worktree itself is spotless', () => {
    const main = makeTempDir('clean-checkout-worktree-main-');
    initRealRepo(main);

    const worktree = makeTempDir('clean-checkout-worktree-linked-');
    rmSync(worktree, { recursive: true, force: true }); // `git worktree add` must create this path itself
    realGit(main, ['worktree', 'add', '--quiet', '-b', 'team/linked', worktree]);

    // resolveMainRepoRoot, invoked with cwd = the LINKED worktree, must still
    // resolve to the MAIN checkout's root — the exact property this script
    // exists to get right (file header, "WHAT THIS CHECKS").
    // Compared via realpathSync, not the raw tmpdir path — same macOS
    // `/var` -> `/private/var` extra-symlink-hop caveat as
    // `check-deps-drift.test.ts`'s own worktree-safety suite: `git`
    // resolves and returns the fully-resolved path, `os.tmpdir()` doesn't.
    const root = resolveMainRepoRoot((call) => realGit(call.cwd, call.args), worktree);
    expect(root).toBe(realpathSync(main));

    // The worktree's own tree is clean...
    expect(checkCleanCheckout({ repoRoot: worktree }).status).toBe('clean');

    // ...but the MAIN checkout has real, un-committed, stranded-shaped work —
    // exactly the 2026-08-05 scenario (a run leaves a file in the SHARED
    // checkout; a DIFFERENT session, working from a worktree, is the one
    // that needs to be told about it).
    writeFileSync(path.join(main, 'content', 'posts', '2026-08-05-the-post-said-it-was-fixed.md'), 'draft: false\n', 'utf8');
    const result = checkCleanCheckout({ repoRoot: resolveMainRepoRoot((call) => realGit(call.cwd, call.args), worktree) });
    expect(result.status).toBe('found');
    expect(result.escalated[0].path).toBe('content/posts/2026-08-05-the-post-said-it-was-fixed.md');
  });
});
