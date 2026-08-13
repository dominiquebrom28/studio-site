#!/usr/bin/env node
/**
 * Run-start preflight: is the SHARED checkout actually clean, right now?
 *
 * Exists because of a real incident (2026-08-05): a complete, `draft: false`,
 * publish-ready 28-line post
 * (`content/posts/2026-08-05-the-post-said-it-was-fixed.md`) sat UNTRACKED in
 * the shared checkout at the studio-site project root, written by the
 * 2026-08-05 daily-logbook run on `team/2026-08-05-logbook` — a branch that
 * ended up with ZERO commits. That session wrote the post and ended before
 * committing it. It survived only because nobody happened to run `git
 * clean`; it was eventually discovered and landed in PR #108, but purely by
 * luck, not by any check. Two scheduled tasks share this one checkout, so the
 * file was found by a run entirely different from the one that left it.
 *
 * THIS IS A SIXTH DISTINCT WORK-GOES-MISSING MECHANISM, and the first that is
 * not a branch at all — every other check in this directory is structurally
 * blind to it:
 *   - `check-stranded-branches.mjs` enumerates BRANCHES (`git for-each-ref`
 *     against `refs/remotes/...`) — a file that was never `git add`ed, never
 *     mind pushed, has no ref at all and cannot appear in that output.
 *   - `check-merge-revert.mjs` / `check-report-claims.mjs` compare COMMITS —
 *     an uncommitted file has no commit to compare.
 *   - CI (`.github/workflows/ci.yml`) NEVER sees an uncommitted file BY
 *     CONSTRUCTION: every job starts with `actions/checkout@v4` against a
 *     specific ref, which by definition has nothing uncommitted in it. This
 *     is the same class of blindness as `check-deps-drift.mjs`'s
 *     `node_modules` drift (`npm ci` in CI always installs exactly what the
 *     lockfile says, so a local-only `node_modules` problem can never surface
 *     there either) — a LOCAL-ONLY trap, cheap to catch locally, structurally
 *     invisible to any check that only ever runs against a pushed ref. The
 *     fix belongs in the run playbook (a step a session runs at its own
 *     start), not in CI, for the identical reason.
 *
 * WHAT THIS CHECKS: `git status --porcelain=v1 --untracked-files=all` in the
 * SHARED/MAIN checkout — deliberately NOT "whatever checkout this script
 * instance happens to be running from". See `resolveMainRepoRoot` below for
 * why those are not the same thing and why the distinction is load-bearing:
 * an agent session in this repo normally runs from an isolated `git
 * worktree` (`.claude/worktrees/<name>/`), each with its OWN working tree —
 * a stray untracked scratch file in ONE worktree is not the incident this
 * check exists to catch (that worktree is disposable and nobody else shares
 * it). The 2026-08-05 loss happened in the ONE checkout that multiple
 * scheduled tasks actually share — the main working copy at the repo's
 * canonical location, not a linked worktree. A naive "the checkout this
 * script's own `SCRIPT_DIR` lives in" default would silently check the WRONG
 * tree the moment this script itself runs from inside a worktree (which,
 * empirically, is normal for this repo's agent sessions) and report a false
 * "clean" while the shared checkout sat dirty. `resolveMainRepoRoot` uses
 * `git rev-parse --git-common-dir` — which resolves to the MAIN checkout's
 * `.git` directory regardless of which worktree the command is run from
 * (verified: from `.claude/worktrees/gate-truth`, it returns
 * `/…/studio-site/.git`, not the worktree's own `.git` file) — so the
 * default is correct from any worktree without needing to special-case
 * worktrees at all. `CHECK_CLEAN_CHECKOUT_REPO_ROOT` (env) or the
 * `repoRoot` option override this when a caller genuinely wants a different
 * tree (tests; a deliberate one-off check of a worktree itself).
 *
 * ESCALATION, NOT A SEPARATE PASS/FAIL AXIS: every non-empty `git status
 * --porcelain` line is a "found" result (exit 1) — the whole point is
 * asserting the checkout is empty, and any dirt at all means a run should
 * stop and look before doing anything else, not just the shape that
 * happened to bite in 2026-08-05. But an untracked or modified file under
 * `content/` or `reports/` is reported LOUDEST and first, labelled "possible
 * stranded work — triage before proceeding": those two directories are
 * exactly where a run's actual deliverables live (a post, a report), so dirt
 * there is the shape most likely to be a near-miss of real, valuable,
 * about-to-be-lost work — a publish-ready `draft: false` post is precisely
 * this shape. Everything else (an editor swapfile, a stray build artifact
 * that slipped past `.gitignore`, a half-edited doc) is still reported, just
 * without the same urgency.
 *
 * A RUN-PLAYBOOK TOOL, NOT A CI GATE — same reasoning as
 * `check-stranded-branches.mjs`'s own header: CI structurally cannot see an
 * uncommitted file (see above), so wiring this into `.github/workflows/
 * ci.yml`'s required `build` job would be pure theater — it would run
 * against a freshly `actions/checkout`'d tree that is clean by construction
 * every single time, and "always passes, always vacuous" is worse than not
 * having the check at all (this repo's own `SMOKE_URL` lesson). This is a
 * `npm run` step a session runs BY HAND at its own start — see the README
 * section this ships alongside.
 *
 * THREE EXIT CODES, same convention as every sibling check in this
 * directory — a check that cannot determine an answer must say so loudly,
 * never quietly report a clean bill of health it didn't earn:
 *   0 = clean — `git status --porcelain` in the shared checkout is empty.
 *   1 = FOUND — one or more untracked/modified/staged paths exist, named and
 *       split into `escalated` (content/ or reports/ — triage before
 *       proceeding) and `other` (everything else, lower urgency but still
 *       reported).
 *   2 = INCONCLUSIVE — the shared checkout's root could not be resolved (not
 *       a git repo, `git` not on PATH), or `git status` itself failed. This
 *       check's entire value proposition is "the shared tree is empty" —
 *       if it can't even ask the question, it refuses to guess.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
// The checkout THIS script instance lives in — could be the shared main
// checkout, or could be a worktree. Only used as the `cwd` to ask git "where
// is the shared checkout", never as the answer itself. See file header.
const RUNNING_FROM = path.resolve(SCRIPT_DIR, '..');

/** Default `gitRunner` — real `git` via `execFileSync` (array args, no
 * shell), injectable so tests never need a real git repository fixture on
 * disk for the unit-level cases. Same shape as every sibling check. */
function defaultGitRunner({ cwd, args }) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

class CleanCheckoutGitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CleanCheckoutGitError';
  }
}

function runGit(gitRunner, cwd, args, context) {
  try {
    return gitRunner({ cwd, args });
  } catch (error) {
    const detail =
      error && typeof error.stderr === 'string' && error.stderr.trim() !== '' ? error.stderr.trim() : (error?.message ?? String(error));
    throw new CleanCheckoutGitError(`\`git ${args.join(' ')}\` failed${context ? ` (${context})` : ''}: ${detail}`);
  }
}

/**
 * Resolves the SHARED/MAIN checkout's root directory, from a `cwd` that may
 * itself be inside a linked `git worktree` — see file header, "WHAT THIS
 * CHECKS", for why this distinction matters and why it's safe to always
 * prefer this over `cwd` itself.
 *
 * `git rev-parse --git-common-dir` returns the path to the `.git` directory
 * shared by every worktree of a repo — for the MAIN checkout that's simply
 * `<root>/.git`; for a LINKED worktree, git resolves it (following that
 * worktree's own `.git` file) all the way back to the same shared directory.
 * Either way, its parent directory is the main checkout's root — a plain,
 * non-bare repo always keeps its common `.git` directory directly inside the
 * worktree that owns it (git's own layout guarantee, not an assumption this
 * script is making up).
 *
 * `--path-format=absolute` (git >= 2.31) guarantees an absolute path
 * regardless of `cwd`; older git's `--git-common-dir` can return a path
 * relative to `cwd` instead, so that's resolved by hand as a fallback.
 */
export function resolveMainRepoRoot(gitRunner, cwd) {
  let raw;
  try {
    raw = runGit(gitRunner, cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir'], 'resolving the shared checkout root');
  } catch {
    // Older git without `--path-format` support — retry the plain form and
    // resolve it against `cwd` by hand.
    const plain = runGit(gitRunner, cwd, ['rev-parse', '--git-common-dir'], 'resolving the shared checkout root (legacy git)').trim();
    const absolute = path.isAbsolute(plain) ? plain : path.resolve(cwd, plain);
    return path.dirname(absolute);
  }
  return path.dirname(raw.trim());
}

/**
 * Parses one `git status --porcelain=v1` line into `{ code, path,
 * renamedFrom }`. Handles the rename/copy `old -> new` shape (uses the
 * destination path — the file that will actually remain on disk — for
 * classification, but keeps `renamedFrom` for display) and C-style quoted
 * paths (a path containing a space, tab, or non-ASCII byte that git quotes
 * in double quotes with backslash escapes — `JSON.parse` handles that
 * escaping closely enough since both use backslash-escaped double-quoted
 * strings).
 */
export function parsePorcelainStatus(output) {
  return output
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const code = line.slice(0, 2);
      let rest = line.slice(3);
      let renamedFrom = null;
      const arrowIdx = rest.indexOf(' -> ');
      if (arrowIdx !== -1) {
        renamedFrom = unquotePath(rest.slice(0, arrowIdx));
        rest = rest.slice(arrowIdx + 4);
      }
      return { code, path: unquotePath(rest), renamedFrom };
    });
}

function unquotePath(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

/** Directories whose dirt is escalated — see file header, "ESCALATION". */
const ESCALATED_DIRS = ['content', 'reports'];

/** @returns {'escalated' | 'other'} */
export function classifyEntry(entry) {
  const p = entry.path;
  const isEscalated = ESCALATED_DIRS.some((dir) => p === dir || p.startsWith(`${dir}/`));
  return isEscalated ? 'escalated' : 'other';
}

function inconclusive(reason) {
  return { status: 'inconclusive', reason, repoRoot: null, escalated: [], other: [], totalEntries: 0 };
}

/**
 * Core check, exported so `check-clean-checkout.test.ts` can inject a fake
 * `gitRunner` for the unit-level cases and point `repoRoot` at a throwaway
 * fixture directory (with a REAL git repo underneath) for the falsification
 * suite — same split as every sibling check in this directory.
 *
 * @param {object} [options]
 * @param {string} [options.repoRoot] explicit override — skips
 *   `resolveMainRepoRoot` entirely. Falls back to
 *   `CHECK_CLEAN_CHECKOUT_REPO_ROOT` (env), then auto-detection.
 * @param {(args: {cwd: string, args: string[]}) => string} [options.gitRunner]
 * @param {NodeJS.ProcessEnv} [options.env]
 */
export function checkCleanCheckout({ repoRoot, gitRunner = defaultGitRunner, env = process.env } = {}) {
  let root = repoRoot ?? env.CHECK_CLEAN_CHECKOUT_REPO_ROOT;
  if (!root) {
    try {
      root = resolveMainRepoRoot(gitRunner, RUNNING_FROM);
    } catch (error) {
      return inconclusive(error instanceof Error ? error.message : String(error));
    }
  }

  let output;
  try {
    output = runGit(gitRunner, root, ['status', '--porcelain=v1', '--untracked-files=all'], `checking cleanliness of "${root}"`);
  } catch (error) {
    return inconclusive(error instanceof Error ? error.message : String(error));
  }

  const entries = parsePorcelainStatus(output);
  const escalated = [];
  const other = [];
  for (const entry of entries) {
    (classifyEntry(entry) === 'escalated' ? escalated : other).push(entry);
  }

  const status = entries.length > 0 ? 'found' : 'clean';
  return { status, repoRoot: root, escalated, other, totalEntries: entries.length };
}

function formatEntry(e) {
  const rename = e.renamedFrom ? `${e.renamedFrom} -> ` : '';
  return `    ${e.code} ${rename}${e.path}`;
}

function printReport(result) {
  if (result.status === 'inconclusive') {
    console.error(`[check-clean-checkout] INCONCLUSIVE — ${result.reason}`);
    console.error('[check-clean-checkout] This check could not determine anything and is refusing to report a false pass.');
    return;
  }

  if (result.status === 'clean') {
    console.log(`[check-clean-checkout] OK — "${result.repoRoot}" is clean (\`git status --porcelain\` is empty).`);
    return;
  }

  console.error(`[check-clean-checkout] FOUND ${result.totalEntries} dirty path(s) in "${result.repoRoot}":`);
  if (result.escalated.length > 0) {
    console.error('');
    console.error(`  possible stranded work — triage before proceeding (${result.escalated.length}, under content/ or reports/):`);
    for (const e of result.escalated) console.error(formatEntry(e));
  }
  if (result.other.length > 0) {
    console.error('');
    console.error(`  other dirt, lower severity but still not clean (${result.other.length}):`);
    for (const e of result.other) console.error(formatEntry(e));
  }
  console.error('');
  console.error('  This is a run-START step, not a merge gate. Before doing anything else:');
  console.error('    - `git diff` / `git status` by hand to see what these actually are;');
  console.error('    - if any of it is real, finished, wanted work (the 2026-08-05 shape — a');
  console.error('      complete, publish-ready file left uncommitted by a prior session): commit');
  console.error('      it, or stage it into that session\'s own branch, before it can be lost;');
  console.error('    - only then continue with the run this checkout is for.');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const result = checkCleanCheckout();
  printReport(result);
  if (result.status === 'inconclusive') {
    process.exitCode = 2;
  } else if (result.status === 'found') {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}
