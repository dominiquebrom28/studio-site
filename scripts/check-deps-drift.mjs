#!/usr/bin/env node
/**
 * Preflight: does the installed `node_modules` actually match
 * `package.json`? Exists because of a real incident (BACKLOG.md, LOW,
 * 2026-07-24): PR #43 added `axe-core` to devDependencies and merged, but
 * nobody ran `npm install` in the main checkout, so `npm run build` /
 * `npm run typecheck` failed repo-wide with `Cannot find module 'axe-core'`
 * for a full day before anyone connected the failure to its cause. CI never
 * saw this (`npm ci` in `.github/workflows/ci.yml` always installs exactly
 * what the lockfile says) — this is structurally a LOCAL-ONLY trap, which is
 * exactly why it went unnoticed.
 *
 * THIS SCRIPT ONLY REPORTS. It never runs `npm install`/`npm ci` itself and
 * never touches `node_modules` — silently "fixing" someone's tree out from
 * under them is worse than the drift (see BACKLOG.md worktree items: an
 * `npm install` run inside a worktree whose `node_modules` is a symlink to
 * the main checkout forks off a real local copy and silently stops sharing
 * the cache with every other lane). It prints the exact command, aimed at
 * the right directory, and lets a human or agent run it.
 *
 * THREE EXIT CODES ON PURPOSE (not just pass/fail) — this repo has three
 * separate incidents on record (reports/2026-07-31.md, "Learnings") of a
 * check that silently reports green while actually checking nothing
 * (`SMOKE_URL` unset, absent branch protection, a non-blocking content
 * gate). A check that can't determine an answer must say so LOUDLY, not
 * exit 0:
 *   0 = verified clean: every declared dependency is installed and its
 *       version satisfies package.json.
 *   1 = drift found: something is missing or version-mismatched. Named,
 *       with the fix command.
 *   2 = INCONCLUSIVE: the check itself could not run (no node_modules at
 *       all, unreadable/unparseable package.json, etc). Never conflated
 *       with 0 — "we don't know" must never look like "it's fine".
 */
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

/**
 * Dependency kinds checked, in the order they're reported. `overrides` is
 * deliberately NOT included: npm overrides pin versions of *transitive*
 * deps and resolving what that implies for a given top-level install
 * correctly needs real npm resolution logic, not a from-scratch
 * reimplementation here — out of scope for a presence/range check. Same for
 * `peerDependencies`: this repo has none today, and whether a peer dep
 * should be present at the top level is a `peerDependenciesMeta.optional`
 * question, not a plain "missing" one.
 */
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'];

/**
 * Minimal semver comparator — Node has no built-in semver and this script
 * is dependency-free on purpose (constraint: no new package to solve this).
 * Only handles what this repo's own package.json actually uses (`^x.y.z`,
 * `~x.y.z`, an exact pin, or `*`). Anything else (git/file/workspace
 * specifiers, `>=`, `||`, ranges with a space) is reported as
 * "unverifiable" rather than guessed at — see the loud-not-silent exit-code
 * comment above; a wrong "matches" would be worse than an honest "can't
 * tell".
 */
function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v.trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function cmp(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/** @returns {'ok' | 'mismatch' | 'unverifiable'} */
function satisfies(range, installedVersion) {
  const trimmed = range.trim();
  const installed = parseVersion(installedVersion);
  if (!installed) return 'unverifiable';

  if (trimmed === '*' || trimmed === 'latest') return 'ok';

  if (trimmed.startsWith('^')) {
    const base = parseVersion(trimmed.slice(1));
    if (!base) return 'unverifiable';
    if (base.major > 0) {
      return installed.major === base.major && cmp(installed, base) >= 0 ? 'ok' : 'mismatch';
    }
    if (base.minor > 0) {
      return installed.major === 0 && installed.minor === base.minor && installed.patch >= base.patch
        ? 'ok'
        : 'mismatch';
    }
    // ^0.0.x is exact-only per semver's caret rule.
    return installed.major === 0 && installed.minor === 0 && installed.patch === base.patch ? 'ok' : 'mismatch';
  }

  if (trimmed.startsWith('~')) {
    const base = parseVersion(trimmed.slice(1));
    if (!base) return 'unverifiable';
    return installed.major === base.major && installed.minor === base.minor && installed.patch >= base.patch
      ? 'ok'
      : 'mismatch';
  }

  if (/^\d/.test(trimmed)) {
    const base = parseVersion(trimmed);
    if (!base) return 'unverifiable';
    return cmp(installed, base) === 0 ? 'ok' : 'mismatch';
  }

  // git+, file:, workspace:, >=, <, ||, space-separated ranges, npm: aliases…
  return 'unverifiable';
}

/**
 * Detects a symlinked node_modules (this repo's normal worktree setup —
 * `git worktree` lanes share the main checkout's node_modules via a
 * symlink) and resolves where the FIX should actually be applied. This
 * matters because it's not merely "don't error on a symlink" — running
 * `npm install` inside a worktree whose node_modules is a symlink makes npm
 * replace that symlink with a real local copy for that worktree only
 * (BACKLOG.md, "silently stops sharing the cache"), which fixes nothing for
 * every other lane still pointed at the original. The fix belongs in the
 * symlink's target, not in cwd.
 */
function resolveNodeModulesInfo(repoRoot) {
  const nodeModulesPath = path.join(repoRoot, 'node_modules');
  if (!existsSync(nodeModulesPath)) {
    return { exists: false, nodeModulesPath, isSymlink: false, fixDir: repoRoot };
  }
  const stat = lstatSync(nodeModulesPath);
  const isSymlink = stat.isSymbolicLink();
  if (!isSymlink) {
    return { exists: true, nodeModulesPath, isSymlink: false, fixDir: repoRoot };
  }
  const real = realpathSync(nodeModulesPath);
  return { exists: true, nodeModulesPath, isSymlink: true, realTarget: real, fixDir: path.dirname(real) };
}

/**
 * Core check, exported so `scripts/check-deps-drift.test.ts` can point it at
 * a throwaway fixture directory instead of this repo's real (shared,
 * symlinked) node_modules — see that file's header comment and the task's
 * falsification requirement for why a fixture, not a mutated real tree.
 *
 * @param {{ repoRoot?: string }} [options]
 */
export function checkDepsDrift({ repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return {
      status: 'inconclusive',
      reason: `no package.json found at "${packageJsonPath}"`,
      missing: [],
      mismatched: [],
      unverifiable: [],
      nodeModulesInfo: null,
    };
  }

  let pkg;
  try {
    pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  } catch (error) {
    return {
      status: 'inconclusive',
      reason: `package.json at "${packageJsonPath}" is not valid JSON (${error.message})`,
      missing: [],
      mismatched: [],
      unverifiable: [],
      nodeModulesInfo: null,
    };
  }

  const nodeModulesInfo = resolveNodeModulesInfo(repoRoot);
  if (!nodeModulesInfo.exists) {
    return {
      status: 'inconclusive',
      reason: `no node_modules at "${nodeModulesInfo.nodeModulesPath}" — nothing is installed yet`,
      missing: [],
      mismatched: [],
      unverifiable: [],
      nodeModulesInfo,
    };
  }

  /** @type {{name: string, range: string, kind: string}[]} */
  const declared = [];
  for (const field of DEPENDENCY_FIELDS) {
    const entries = pkg[field];
    if (!entries) continue;
    for (const [name, range] of Object.entries(entries)) {
      declared.push({ name, range, kind: field });
    }
  }

  const missing = [];
  const mismatched = [];
  const unverifiable = [];

  for (const dep of declared) {
    const installedPkgJsonPath = path.join(nodeModulesInfo.nodeModulesPath, dep.name, 'package.json');
    if (!existsSync(installedPkgJsonPath)) {
      missing.push(dep);
      continue;
    }

    let installedVersion;
    try {
      installedVersion = JSON.parse(readFileSync(installedPkgJsonPath, 'utf8')).version;
    } catch {
      // Installed package's own package.json is unreadable/corrupt — that's
      // a real problem, but a different one than "not installed". Surface
      // it as unverifiable rather than claiming either ok or missing.
      unverifiable.push({ ...dep, note: 'installed package.json unreadable' });
      continue;
    }
    if (typeof installedVersion !== 'string') {
      unverifiable.push({ ...dep, note: 'installed package.json has no version field' });
      continue;
    }

    const result = satisfies(dep.range, installedVersion);
    if (result === 'mismatch') {
      mismatched.push({ ...dep, installedVersion });
    } else if (result === 'unverifiable') {
      unverifiable.push({ ...dep, installedVersion, note: 'range not parseable by this check' });
    }
  }

  const status = missing.length > 0 || mismatched.length > 0 ? 'drift' : 'clean';
  return { status, missing, mismatched, unverifiable, nodeModulesInfo, declaredCount: declared.length };
}

function fixCommand(nodeModulesInfo) {
  if (nodeModulesInfo && nodeModulesInfo.isSymlink) {
    return (
      `  cd "${nodeModulesInfo.fixDir}" && npm install\n` +
      `  (node_modules here is a symlink -> "${nodeModulesInfo.realTarget}". Run the install AT THE TARGET,\n` +
      `   not in this worktree — installing here would fork a private copy for this worktree only and\n` +
      `   leave every other lane sharing the symlink still out of date.)`
    );
  }
  return '  npm install';
}

function formatDep(d) {
  return `${d.name}@${d.range}`;
}

function printReport(result) {
  if (result.status === 'inconclusive') {
    console.error(`[check-deps-drift] INCONCLUSIVE — ${result.reason}`);
    console.error('[check-deps-drift] This check could not determine anything and is refusing to report a false pass.');
    console.error('[check-deps-drift] Run `npm install` (or `npm ci`) and re-run this check.');
    return;
  }

  if (result.status === 'clean') {
    console.log(`[check-deps-drift] OK — ${result.declaredCount} declared dependencies all installed and version-matched.`);
  } else {
    console.error('[check-deps-drift] DRIFT DETECTED — package.json and node_modules disagree:');
    if (result.missing.length > 0) {
      console.error(`  Missing (${result.missing.length}):`);
      for (const d of result.missing) console.error(`    - ${formatDep(d)} (${d.kind}) — not installed`);
    }
    if (result.mismatched.length > 0) {
      console.error(`  Version mismatch (${result.mismatched.length}):`);
      for (const d of result.mismatched) {
        console.error(`    - ${d.name}: package.json wants ${d.range}, node_modules has ${d.installedVersion}`);
      }
    }
    console.error('');
    console.error('  Fix:');
    console.error(fixCommand(result.nodeModulesInfo));
  }

  if (result.unverifiable.length > 0) {
    console.warn(
      `[check-deps-drift] NOTE — could not verify ${result.unverifiable.length} ` +
        `dependency range(s) with this script's minimal semver support (complex specifier or unreadable ` +
        `installed metadata); spot-check by hand: ${result.unverifiable.map(formatDep).join(', ')}`,
    );
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const repoRootArg = process.argv[2];
  const result = checkDepsDrift(repoRootArg ? { repoRoot: path.resolve(repoRootArg) } : {});
  printReport(result);
  if (result.status === 'inconclusive') {
    process.exitCode = 2;
  } else if (result.status === 'drift') {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}
