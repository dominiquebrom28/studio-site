import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkDepsDrift } from './check-deps-drift.mjs';

/**
 * `checkDepsDrift` is exercised against throwaway fixture directories built
 * under `os.tmpdir()`, never against this repo's real `node_modules` — that
 * tree is a symlink to the main checkout and shared with other concurrently
 * running agents/worktrees; mutating it (even temporarily) to manufacture
 * drift would be a real hazard, which is exactly the failure mode the task
 * this script exists for warns against reproducing. Same fixture-directory
 * pattern as `scripts/generate-seo-files.test.ts`.
 */

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function makeFixture(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deps-drift-fixture-'));
  tempDirs.push(dir);
  return dir;
}

function writePackageJson(root: string, contents: Record<string, unknown>): void {
  writeFileSync(path.join(root, 'package.json'), JSON.stringify(contents, null, 2), 'utf8');
}

function installFixturePackage(root: string, name: string, version: string): void {
  const dir = path.join(root, 'node_modules', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, version }), 'utf8');
}

describe('checkDepsDrift — clean tree', () => {
  it('reports status "clean" when every declared dependency is installed and version-matched', () => {
    const root = makeFixture();
    writePackageJson(root, {
      dependencies: { 'left-pad': '^1.3.0' },
      devDependencies: { 'axe-core': '~4.12.1' },
    });
    installFixturePackage(root, 'left-pad', '1.3.2');
    installFixturePackage(root, 'axe-core', '4.12.1');

    const result = checkDepsDrift({ repoRoot: root });

    expect(result.status).toBe('clean');
    expect(result.missing).toEqual([]);
    expect(result.mismatched).toEqual([]);
    expect(result.declaredCount).toBe(2);
  });
});

describe('checkDepsDrift — drift: the exact incident this script exists for', () => {
  it('names a declared-but-never-installed package as missing (the axe-core / PR #43 shape)', () => {
    const root = makeFixture();
    writePackageJson(root, { devDependencies: { 'axe-core': '^4.12.1' } });
    mkdirSync(path.join(root, 'node_modules'), { recursive: true }); // exists, but empty

    const result = checkDepsDrift({ repoRoot: root });

    expect(result.status).toBe('drift');
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].name).toBe('axe-core');
    expect(result.mismatched).toEqual([]);
  });

  it('names an installed-but-wrong-version package as a mismatch, not a false pass', () => {
    const root = makeFixture();
    writePackageJson(root, { dependencies: { 'left-pad': '^1.3.0' } });
    installFixturePackage(root, 'left-pad', '1.2.0'); // below the declared floor

    const result = checkDepsDrift({ repoRoot: root });

    expect(result.status).toBe('drift');
    expect(result.mismatched).toEqual([
      expect.objectContaining({ name: 'left-pad', range: '^1.3.0', installedVersion: '1.2.0' }),
    ]);
  });

  it('reports both missing and mismatched together, not just the first found', () => {
    const root = makeFixture();
    writePackageJson(root, {
      dependencies: { 'left-pad': '^1.3.0' },
      devDependencies: { 'totally-missing-pkg': '^2.0.0' },
    });
    installFixturePackage(root, 'left-pad', '1.2.0');

    const result = checkDepsDrift({ repoRoot: root });

    expect(result.status).toBe('drift');
    expect(result.missing.map((d) => d.name)).toEqual(['totally-missing-pkg']);
    expect(result.mismatched.map((d) => d.name)).toEqual(['left-pad']);
  });
});

describe('checkDepsDrift — cannot silently pass (the SMOKE_URL-shaped failure mode)', () => {
  it('reports "inconclusive", NOT "clean", when node_modules does not exist at all', () => {
    const root = makeFixture();
    writePackageJson(root, { dependencies: { 'left-pad': '^1.3.0' } });
    // Deliberately no node_modules directory created.

    const result = checkDepsDrift({ repoRoot: root });

    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/node_modules/);
  });

  it('reports "inconclusive" when package.json is missing, rather than treating zero declared deps as clean', () => {
    const root = makeFixture();
    mkdirSync(path.join(root, 'node_modules'), { recursive: true });

    const result = checkDepsDrift({ repoRoot: root });

    expect(result.status).toBe('inconclusive');
    expect(result.reason).toMatch(/package\.json/);
  });

  it('reports "inconclusive" when package.json is not valid JSON', () => {
    const root = makeFixture();
    writeFileSync(path.join(root, 'package.json'), '{ not valid json', 'utf8');
    mkdirSync(path.join(root, 'node_modules'), { recursive: true });

    const result = checkDepsDrift({ repoRoot: root });

    expect(result.status).toBe('inconclusive');
  });
});

describe('checkDepsDrift — ranges this script cannot verify are flagged, never silently assumed ok', () => {
  it('marks a git/file/complex-range dependency as unverifiable rather than passing or failing it blind', () => {
    const root = makeFixture();
    writePackageJson(root, { dependencies: { weird: 'git+https://example.test/weird.git#main' } });
    installFixturePackage(root, 'weird', '0.0.0-fromgit');

    const result = checkDepsDrift({ repoRoot: root });

    // Presence is verified (it IS installed), so this alone should not flip
    // the whole tree to "drift" — but it must show up, not vanish.
    expect(result.status).toBe('clean');
    expect(result.unverifiable).toHaveLength(1);
    expect(result.unverifiable[0].name).toBe('weird');
  });
});

describe('checkDepsDrift — worktree-safe: a symlinked node_modules is normal here, not an error', () => {
  it('follows a symlinked node_modules transparently for the presence/version check', () => {
    const targetRoot = makeFixture();
    installFixturePackage(targetRoot, 'left-pad', '1.3.2');

    const worktreeRoot = makeFixture();
    writePackageJson(worktreeRoot, { dependencies: { 'left-pad': '^1.3.0' } });
    symlinkSync(path.join(targetRoot, 'node_modules'), path.join(worktreeRoot, 'node_modules'));

    const result = checkDepsDrift({ repoRoot: worktreeRoot });

    expect(result.status).toBe('clean');
    expect(result.nodeModulesInfo?.isSymlink).toBe(true);
  });

  it('points the fix at the symlink TARGET directory, not the worktree, when drift is found', () => {
    const targetRoot = makeFixture();
    mkdirSync(path.join(targetRoot, 'node_modules'), { recursive: true }); // empty target

    const worktreeRoot = makeFixture();
    writePackageJson(worktreeRoot, { dependencies: { 'totally-missing-pkg': '^1.0.0' } });
    symlinkSync(path.join(targetRoot, 'node_modules'), path.join(worktreeRoot, 'node_modules'));

    const result = checkDepsDrift({ repoRoot: worktreeRoot });

    expect(result.status).toBe('drift');
    expect(result.nodeModulesInfo?.isSymlink).toBe(true);
    // fixDir is the symlink target's PARENT (i.e. where its own package.json
    // / node_modules pair live) — running `npm install` in the worktree
    // itself would fork a private copy instead of fixing the shared one.
    // Compared via realpathSync (not the raw tmpdir path) because on macOS
    // `os.tmpdir()` returns a `/var/...` path that is ITSELF a symlink to
    // `/private/var/...` — the same resolution check-deps-drift.mjs applies
    // internally, applied here too so the assertion isn't fooled by the
    // platform's own extra symlink hop.
    expect(result.nodeModulesInfo?.fixDir).toBe(realpathSync(targetRoot));
  });
});
