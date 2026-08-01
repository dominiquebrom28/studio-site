#!/usr/bin/env node
/**
 * Wires this repo's committed `.githooks/` directory in as the active git
 * hooks path (`git config core.hooksPath .githooks`), so the
 * post-checkout/post-merge dependency-drift check
 * (scripts/check-deps-drift.mjs) actually fires without anyone running a
 * manual setup step.
 *
 * WHY THIS EXISTS INSTEAD OF JUST DOCUMENTING "run `git config
 * core.hooksPath .githooks` once": reports/2026-07-31.md's own "Learnings"
 * section, verbatim: "Automation that requires a habit will lose the habit
 * ... Anything that depends on an agent remembering to do something every
 * run should either be in the playbook as a numbered step or be automatic."
 * A one-time manual command is exactly the shape that has already bitten
 * this repo three times (SMOKE_URL, branch protection, the safe-auto
 * label). Running this from `npm run prepare` — which npm invokes
 * automatically on a plain local `npm install` AND on `npm ci` — means the
 * hook wiring happens as an unavoidable side effect of the very command
 * that fixes/creates node_modules in the first place.
 *
 * WHY THIS PROPAGATES TO WORKTREES WITHOUT RE-RUNNING: `core.hooksPath` is
 * stored in the repo's config, which for a `git worktree` lives in the
 * shared common `.git` dir (`git rev-parse --git-common-dir`), not a
 * per-worktree file. Sibling worktrees created via `git worktree add`
 * inherit it immediately, with zero extra setup — the exact requirement
 * ("propagates ... to a git worktree") a bare `.git/hooks/` entry cannot
 * meet.
 *
 * DELIBERATELY NEVER FAILS `npm install`: a `prepare` script that throws
 * aborts the whole install. Hook wiring is a nice-to-have, not something
 * that should ever block getting dependencies installed — including in
 * contexts with no `.git` at all (e.g. this package tarballed/installed as
 * a dependency elsewhere) or without `git` on PATH.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const HOOKS_DIR = path.join(REPO_ROOT, '.githooks');

function main() {
  if (!existsSync(path.join(REPO_ROOT, '.git')) && !existsSync(HOOKS_DIR)) {
    // Not a git checkout at all (e.g. installed as a plain dependency
    // elsewhere) — nothing to wire, nothing to warn about.
    return;
  }
  try {
    execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: REPO_ROOT, stdio: 'pipe' });
    console.log('[setup-git-hooks] core.hooksPath -> .githooks (dependency-drift check active on checkout/merge)');
  } catch (error) {
    // Never fail the install over this — see file header. `git` missing,
    // not a repo, read-only .git config, etc. are all fine to just note.
    console.warn(`[setup-git-hooks] could not set core.hooksPath (${error.message.split('\n')[0]}) — skipping, non-fatal.`);
  }
}

main();
