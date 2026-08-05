#!/usr/bin/env node
/**
 * Does an in-branch `git merge main` silently revert the branch's OWN edits?
 *
 * Exists because of a real incident (BACKLOG.md HIGH, 2026-08-02 — the true
 * root cause of the 2026-07-31 loss, misdiagnosed for two days as "a report
 * claimed a change it never made"). PR #81's branch
 * (`team/2026-07-31-backlog-and-report`) added 88 lines to `BACKLOG.md`
 * across two of its own commits (`b16e7bc`, `755bf7c`). It then ran
 * `git merge main` in-branch (`1e5e5e8`, merge-base `56e8dfb`) to pick up
 * unrelated work that had landed on `main` while it was open. `BACKLOG.md`
 * conflicted, and the conflict was resolved entirely in `main`'s favour —
 * reverting the branch's own additions to EXACT zero net diff. After that,
 * GitHub, CI, and the PR's file list all agreed the branch never touched
 * `BACKLOG.md`, because by then it genuinely didn't:
 * `git diff --name-only 56e8dfb...1e5e5e8` shows only `reports/2026-07-31.md`.
 * There was no red anything — `scripts/check-report-claims.mjs` (the OTHER
 * gate this incident produced) can only catch a report that lies about its
 * own branch; it cannot catch a branch that genuinely, silently, no longer
 * contains work it once had. This check is strictly stronger: it needs no
 * report and no prose, and would have caught this the moment `1e5e5e8` was
 * created, on the branch, before the PR ever opened.
 *
 * CORE ALGORITHM (see `checkMergeRevert` below for the full implementation):
 *   1. Resolve `mergeBase` = the merge-base of this branch's head against
 *      `main`.
 *   2. Walk the branch's own FIRST-PARENT commit chain from `mergeBase` to
 *      `head` (`git log --first-parent`) — this is precisely the commit
 *      sequence a branch that does `git merge main` produces: the branch's
 *      own commits, interleaved with merge commits whose first parent is
 *      the branch's own preceding tip and whose second (and any further)
 *      parent is whatever was merged in.
 *   3. For each commit in that chain, diff it against `parents[0]` (its own
 *      first parent) — for a normal commit this is "what did this commit
 *      change"; for a merge commit this is "what did the MERGE RESOLUTION
 *      change relative to what the branch already had going into it" —
 *      the exact fingerprint of a merge silently altering the branch's own
 *      content. Union across every NON-merge commit gives `touchedByOwn`:
 *      every path the branch's own work ever touched.
 *   4. `netDiff` = `git diff --name-only mergeBase...head` — what the
 *      branch's PR actually shows today.
 *   5. Any path in `touchedByOwn` that is NOT in `netDiff` has "dropped
 *      out" — assert (a) from the backlog item. For each dropped path, find
 *      the LAST commit in the chain (own or merge) that changed it. If that
 *      last commit is a MERGE, the merge is what erased it: VIOLATION. If
 *      it's one of the branch's own commits, the branch itself is
 *      responsible for the path's absence (it added-then-deleted it itself,
 *      or deliberately reverted its own edit) — never a violation.
 *
 * THE FALSE-POSITIVE ANALYSIS (why this is "last touch wins", not the naive
 * "any dropped path is a violation" reading of the backlog item's own
 * wording) — every case found by inspection, and the ruling for each:
 *
 *   (1) Branch adds a file, then its OWN later commit deletes it again. The
 *       file is genuinely gone by the branch's own choice; nothing about a
 *       merge is involved. RULING: not a violation — "last touch" is the
 *       branch's own delete commit, never a merge.
 *
 *   (2) Branch edits a file, then its OWN later commit reverts that exact
 *       edit (a deliberate "actually, no" commit, unrelated to any merge).
 *       RULING: not a violation, same reasoning — the branch's own commit is
 *       the last thing to touch the path, whatever it did with it is the
 *       branch's own final word.
 *
 *   (3) `main` independently changes a file to content IDENTICAL to what the
 *       branch also independently arrived at. Two sub-shapes exist, and they
 *       resolve differently under this algorithm — not because of a special
 *       case, but as a structural consequence of how a non-conflicting 3-way
 *       merge works:
 *         (3a) main's independent edit and the branch's edit are on
 *              DIFFERENT, non-overlapping regions of the file (the common,
 *              boring case for a shared file like BACKLOG.md — two
 *              unrelated sections both edited). Git auto-merges cleanly,
 *              and the result is base-PLUS-both-diffs — it can only equal
 *              the merge-base again if BOTH diffs were empty, which
 *              contradicts the premise that both sides changed the file.
 *              This case therefore can never land in `touchedByOwn minus
 *              netDiff` in the first place: the branch's contribution
 *              survives the merge, `netDiff` still shows it, nothing to
 *              flag. Verified, not just asserted — see the real-history
 *              sweep below, which is full of exactly this shape
 *              (`BACKLOG.md` touched by concurrent branches) and never
 *              false-positives on it.
 *         (3b) main's edit and the branch's edit touch the SAME region —
 *              this is, by definition, a git merge CONFLICT (not a clean
 *              auto-merge). Someone (or something) resolved it, and if they
 *              resolved it by taking main's side wholesale, the merge
 *              commit's content for that path differs from parent1 (the
 *              branch's own pre-merge content) and can legitimately land
 *              back on the merge-base's original text. RULING: this is
 *              exactly the incident shape, and this check calls it a
 *              violation on purpose — "the coincidence was independent
 *              origin, not independent survival" is not a defense; the
 *              branch's own edit is still gone, and it still requires
 *              nobody to have noticed, which is the entire problem.
 *
 *   (4) A path renamed by one of the branch's own commits. Renames are
 *       normalized to the NEW path (same convention as
 *       `scripts/check-report-claims.mjs`'s `getDiffEntries`) for the
 *       purpose of membership in `touchedByOwn` / `netDiff`. This is an
 *       approximation — path IDENTITY across a rename is inherently fuzzy —
 *       so a rename inside the touched set is surfaced as a `note` in the
 *       result (visible in output, never silently dropped) rather than
 *       silently trusted, even though it does not change the pass/fail
 *       verdict.
 *
 *   (5) Octopus merges (3+ parents). Not found anywhere in this repo's real
 *       history at the time this was written (`git log --all --format=%P`,
 *       zero merge commits with more than two parents) — this repo is a
 *       single-developer, single-branch-at-a-time workflow. The algorithm
 *       does not special-case them: `parents[0]` is still "the branch's own
 *       side" by git's own first-parent convention regardless of how many
 *       other parents a merge has, so the same "diff against parents[0]"
 *       logic applies unchanged. Flagged here rather than silently assumed
 *       fine, per this file's own "don't paper over it" standard.
 *
 * Nothing here was found that required a genuine "cannot cleanly separate
 * this" warning tier distinct from clean/violation/inconclusive — every real
 * case above resolves to a defensible ruling from git structure alone, not a
 * guess. If a future case is found that this reasoning does not cover, the
 * right fix is to extend this analysis (and its test), not to loosen the
 * "last touch wins" rule.
 *
 * THE SYNTHETIC-MERGE-COMMIT TRAP (why `headRef` is NOT simply `HEAD` in
 * CI) — `scripts/check-report-claims.mjs`'s header already established that
 * `actions/checkout` on a `pull_request` event leaves the checkout in
 * DETACHED HEAD at the PR's synthetic test-merge commit
 * (`refs/pull/<N>/merge`), not the branch's real tip. That script doesn't
 * care (it only diffs two trees, order-agnostic). THIS script cares a great
 * deal: that synthetic commit's parents are [base-branch tip, PR head tip]
 * — the OPPOSITE of what this algorithm needs (it needs parent[0] to be the
 * BRANCH's own preceding commit). Walking `--first-parent` from the
 * synthetic commit would walk `main`'s own history, not the branch's, and
 * would silently find nothing wrong on every single PR — a false "clean" on
 * every run, indistinguishable from a working gate until the day it matters.
 * That is exactly the `SMOKE_URL` failure shape (PR #91's precedent: a gate
 * that silently skips is worse than no gate). So `resolveHeadRef` below
 * REFUSES to fall back to bare `HEAD` when `GITHUB_EVENT_NAME=pull_request`
 * and the real head SHA has not been supplied explicitly — see its own
 * comment, and the matching `env:` wiring in `.github/workflows/ci.yml`.
 *
 * THREE EXIT CODES, same convention as `check-deps-drift.mjs` /
 * `check-report-claims.mjs`:
 *   0 = clean (includes "this branch has no in-range commits at all", e.g.
 *       running on `main` itself — nothing to check is a real pass).
 *   1 = VIOLATION — an in-branch merge silently reverted the branch's own
 *       edit to a path. Named, with the merge commit and the branch's own
 *       commits that touched it.
 *   2 = INCONCLUSIVE — could not resolve a base ref, could not resolve a
 *       trustworthy head ref, the checkout is shallow, or a `git`
 *       invocation failed. Never conflated with 0.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const UNIT_SEP = '\x1f';

/** Default `gitRunner` — real `git` via `execFileSync` (array args, no
 * shell), same shape as `scripts/check-report-claims.mjs`'s
 * `defaultGitRunner`, injectable so tests never need a real git repository
 * fixture on disk. */
function defaultGitRunner({ cwd, args }) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

class MergeRevertGitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MergeRevertGitError';
  }
}

function runGit(gitRunner, cwd, args, context) {
  try {
    return gitRunner({ cwd, args });
  } catch (error) {
    const detail = error && typeof error.stderr === 'string' ? error.stderr.trim() : (error?.message ?? String(error));
    throw new MergeRevertGitError(`\`git ${args.join(' ')}\` failed${context ? ` (${context})` : ''}: ${detail}`);
  }
}

/** Same shape/priority as `check-report-claims.mjs`'s
 * `defaultBaseRefCandidates` — deliberately duplicated rather than imported
 * (each check script in this repo is self-contained; see
 * `check-deps-drift.mjs` and `check-report-claims.mjs`, which share no code
 * either). `CHECK_MERGE_REVERT_BASE_REF` is the explicit escape hatch. */
export function defaultBaseRefCandidates(env = process.env) {
  const candidates = [];
  if (env.CHECK_MERGE_REVERT_BASE_REF) candidates.push(env.CHECK_MERGE_REVERT_BASE_REF);
  if (env.GITHUB_BASE_REF) {
    candidates.push(`origin/${env.GITHUB_BASE_REF}`);
    candidates.push(env.GITHUB_BASE_REF);
  }
  candidates.push('origin/main', 'main');
  return candidates;
}

/** Tries each candidate ref in order, returns the first `git rev-parse
 * --verify` accepts, or `null` if none resolve. Never throws. */
export function resolveBaseRef(gitRunner, repoRoot, candidates) {
  for (const ref of candidates) {
    if (!ref) continue;
    try {
      gitRunner({ cwd: repoRoot, args: ['rev-parse', '--verify', `${ref}^{commit}`] });
      return ref;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Resolves the ref/SHA to treat as "this branch's real head" — see the file
 * header's "SYNTHETIC-MERGE-COMMIT TRAP" section for why this cannot simply
 * be `'HEAD'` in CI.
 *
 * Priority:
 *   1. `CHECK_MERGE_REVERT_HEAD_REF` — explicit escape hatch (local
 *      debugging, or a repo layout this hasn't seen).
 *   2. `MERGE_REVERT_HEAD_SHA` — set by `.github/workflows/ci.yml` from
 *      `github.event.pull_request.head.sha`, the PR branch's REAL tip
 *      commit (not the synthetic merge GitHub checks out by default).
 *   3. Bare `'HEAD'` — safe ONLY when `GITHUB_EVENT_NAME` is not
 *      `pull_request` (i.e. a normal, non-detached checkout: local runs,
 *      `workflow_dispatch`, a direct push). If `GITHUB_EVENT_NAME` IS
 *      `pull_request` and neither override above was supplied, this
 *      refuses to guess and returns `null` (the caller reports
 *      INCONCLUSIVE) rather than silently walking `main`'s own history
 *      under `HEAD`'s misleading name.
 *
 * @returns {{ headRef: string, source: string } | { headRef: null, reason: string }}
 */
export function resolveHeadRef(env = process.env) {
  if (env.CHECK_MERGE_REVERT_HEAD_REF) {
    return { headRef: env.CHECK_MERGE_REVERT_HEAD_REF, source: 'CHECK_MERGE_REVERT_HEAD_REF override' };
  }
  if (env.MERGE_REVERT_HEAD_SHA) {
    return { headRef: env.MERGE_REVERT_HEAD_SHA, source: 'MERGE_REVERT_HEAD_SHA (github.event.pull_request.head.sha)' };
  }
  if (env.GITHUB_EVENT_NAME === 'pull_request') {
    return {
      headRef: null,
      reason:
        "running under a GitHub Actions `pull_request` event but `MERGE_REVERT_HEAD_SHA` is not set. `HEAD` in this context is GitHub's " +
        'synthetic test-merge commit (`refs/pull/<N>/merge`), whose first parent is the BASE branch, not this PR branch — walking ' +
        "`--first-parent` from it would silently check `main`'s own history instead of the branch's, and would falsely report clean on " +
        'every PR. Refusing to guess (see this file\'s header, "THE SYNTHETIC-MERGE-COMMIT TRAP"). Fix: wire `env: MERGE_REVERT_HEAD_SHA: ' +
        "${{ github.event.pull_request.head.sha }}` on this step in .github/workflows/ci.yml, or set CHECK_MERGE_REVERT_HEAD_REF by hand.",
    };
  }
  return { headRef: 'HEAD', source: 'HEAD (not a pull_request event)' };
}

/** `git rev-parse --is-shallow-repository` — `true`/`false`. A shallow
 * clone doesn't reliably ERROR on `git merge-base`; it can silently resolve
 * to the wrong (too-recent) common ancestor instead, because the algorithm
 * only sees what history was actually fetched. Checked explicitly, up
 * front, rather than trusted to surface as a merge-base failure — the
 * fetch-depth note in `.github/workflows/ci.yml`'s `Checkout` step exists
 * for exactly this reason (`fetch-depth: 0`, required by the provenance
 * generator too). */
export function isShallowRepository(gitRunner, repoRoot) {
  const output = runGit(gitRunner, repoRoot, ['rev-parse', '--is-shallow-repository'], 'checking for a shallow clone').trim();
  return output === 'true';
}

/** `git merge-base <baseRef> <headRef>`, or `null` if it fails (unrelated
 * histories, unresolvable ref, etc — never throws). */
export function resolveMergeBase(gitRunner, repoRoot, baseRef, headRef) {
  try {
    return runGit(gitRunner, repoRoot, ['merge-base', baseRef, headRef], `merge-base of ${baseRef} and ${headRef}`).trim();
  } catch {
    return null;
  }
}

/**
 * The branch's own commit spine: `git log --first-parent --reverse
 * <mergeBase>..<headRef>`, oldest first. This walks EXACTLY the sequence an
 * in-branch `git merge main` produces — the branch's own commits, plus each
 * merge commit it made along the way (first parent = the branch's own prior
 * tip, other parent(s) = whatever was merged in). Commits reachable ONLY
 * via a merge's non-first parent (i.e. commits that came FROM `main`) are
 * deliberately never visited — they are not "the branch's own", so
 * `--first-parent` is load-bearing here, not an optimization.
 *
 * @returns {{sha: string, parents: string[], subject: string, isMerge: boolean}[]}
 */
export function getFirstParentChain(gitRunner, repoRoot, mergeBase, headRef) {
  const output = runGit(
    gitRunner,
    repoRoot,
    ['log', '--first-parent', '--reverse', `--format=%H${UNIT_SEP}%P${UNIT_SEP}%s`, `${mergeBase}..${headRef}`],
    `walking first-parent chain from ${mergeBase} to ${headRef}`,
  );
  return output
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [sha, parentsRaw, subject] = line.split(UNIT_SEP);
      const parents = parentsRaw.trim().split(/\s+/).filter(Boolean);
      return { sha, parents, subject: subject ?? '', isMerge: parents.length > 1 };
    });
}

/**
 * `git diff --name-status <fromRef> <toRef>` between two EXPLICIT commits
 * (never range/`...` syntax — that's only meaningful for two-ref shorthands,
 * and every caller here already has both concrete SHAs in hand). Parsed
 * into `{status, path}`, same convention as
 * `check-report-claims.mjs`'s `getDiffEntries`: a rename/copy status
 * (`R100`, `C75`, ...) is reduced to its first letter and only the NEW path
 * is kept.
 */
export function getNameStatusDiff(gitRunner, repoRoot, fromRef, toRef) {
  const output = runGit(gitRunner, repoRoot, ['diff', '--name-status', fromRef, toRef], `diffing ${fromRef} ${toRef}`);
  return output
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const parts = line.split('\t');
      const status = parts[0][0];
      const filePath = parts[parts.length - 1];
      const wasRenameOrCopy = parts[0][0] === 'R' || parts[0][0] === 'C';
      return { status, path: filePath, renamedFrom: wasRenameOrCopy ? parts[1] : null };
    });
}

/**
 * Core check. Exported so `check-merge-revert.test.ts` can inject a fake
 * `gitRunner` (no real git repository needed) for unit tests, and the real
 * one for the real-history regression corpus — same split as
 * `check-report-claims.test.ts`.
 *
 * @param {object} [options]
 * @param {string} [options.repoRoot]
 * @param {string[]} [options.baseRefCandidates]
 * @param {{headRef: string, source: string} | {headRef: null, reason: string}} [options.headRefResolution]
 *   Override — skips `resolveHeadRef` entirely when supplied (tests only;
 *   the CLI always resolves for real).
 * @param {(args: {cwd: string, args: string[]}) => string} [options.gitRunner]
 * @param {NodeJS.ProcessEnv} [options.env]
 */
export function checkMergeRevert({
  repoRoot = DEFAULT_REPO_ROOT,
  baseRefCandidates,
  headRefResolution,
  gitRunner = defaultGitRunner,
  env = process.env,
} = {}) {
  let shallow;
  try {
    shallow = isShallowRepository(gitRunner, repoRoot);
  } catch (error) {
    return inconclusive(error instanceof Error ? error.message : String(error));
  }
  if (shallow) {
    return inconclusive(
      'this checkout is a shallow clone (`git rev-parse --is-shallow-repository` = true). A shallow clone can silently resolve ' +
        '`git merge-base` to the wrong (too-recent) common ancestor instead of erroring, so this check refuses to run against one. ' +
        'Fix: `fetch-depth: 0` on the `actions/checkout` step (already set on the `build` job for the provenance generator\'s own ' +
        'sake — if this fires in CI, something removed it or a new job runs this check without it).',
    );
  }

  const candidates = baseRefCandidates ?? defaultBaseRefCandidates(env);
  const baseRef = resolveBaseRef(gitRunner, repoRoot, candidates);
  if (!baseRef) {
    return inconclusive(
      `could not resolve a base ref to diff against — tried: ${candidates.filter(Boolean).join(', ') || '(no candidates)'}. ` +
        'Usually a shallow/missing-history checkout, or run outside CI without `main`/`origin/main` available locally.',
    );
  }

  const headResolution = headRefResolution ?? resolveHeadRef(env);
  if (!headResolution.headRef) {
    return inconclusive(headResolution.reason, { baseRef });
  }
  const headRef = headResolution.headRef;

  const mergeBase = resolveMergeBase(gitRunner, repoRoot, baseRef, headRef);
  if (!mergeBase) {
    return inconclusive(`\`git merge-base ${baseRef} ${headRef}\` did not resolve — unrelated histories, or an invalid ref.`, {
      baseRef,
      headRef,
    });
  }

  let chain;
  let netDiff;
  try {
    chain = getFirstParentChain(gitRunner, repoRoot, mergeBase, headRef);
    netDiff = getNameStatusDiff(gitRunner, repoRoot, mergeBase, headRef);
  } catch (error) {
    return inconclusive(error instanceof Error ? error.message : String(error), { baseRef, headRef, mergeBase });
  }

  if (chain.length === 0) {
    return { status: 'clean', baseRef, headRef, mergeBase, chainLength: 0, touchedByOwnCount: 0, violations: [], explained: [], notes: [] };
  }

  // Per-commit diff against parents[0] — for a non-merge commit this is
  // "what this commit changed"; for a merge commit this is "what the merge
  // RESOLUTION changed relative to what the branch already had". Cached per
  // commit since the same commit's diff is consulted both when building
  // `touchedByOwn` (non-merge commits only) and later when walking
  // backwards to find each dropped path's last-touching commit (any
  // commit).
  const diffByCommit = new Map();
  const notes = [];
  for (const commit of chain) {
    if (commit.parents.length === 0) {
      // A commit in the chain with no parent at all (the branch's history
      // is the repo's very first commit) — diff against the empty tree.
      diffByCommit.set(commit.sha, getNameStatusDiff(gitRunner, repoRoot, '4b825dc642cb6eb9a060e54bf8d69288fbee4904', commit.sha));
      continue;
    }
    const entries = getNameStatusDiff(gitRunner, repoRoot, commit.parents[0], commit.sha);
    diffByCommit.set(commit.sha, entries);
    for (const entry of entries) {
      if (entry.renamedFrom) {
        notes.push(
          `${commit.sha.slice(0, 12)} renamed \`${entry.renamedFrom}\` -> \`${entry.path}\` — path identity across the rename is ` +
            'approximated as the new path (same convention as check-report-claims.mjs); noted, not treated as a failure.',
        );
      }
    }
  }

  const touchedByOwn = new Map(); // path -> [{sha, subject, status}] (non-merge commits only)
  for (const commit of chain) {
    if (commit.isMerge) continue;
    for (const entry of diffByCommit.get(commit.sha)) {
      if (!touchedByOwn.has(entry.path)) touchedByOwn.set(entry.path, []);
      touchedByOwn.get(entry.path).push({ sha: commit.sha, subject: commit.subject, status: entry.status });
    }
  }

  const netDiffPaths = new Set(netDiff.map((entry) => entry.path));

  const violations = [];
  const explained = [];
  for (const [ownPath, ownTouches] of touchedByOwn) {
    if (netDiffPaths.has(ownPath)) continue; // present in the net diff — nothing dropped, nothing to explain

    // Walk the chain newest-first; the first commit (own or merge) whose
    // own diff touches this path is the LAST thing, chronologically, that
    // changed it.
    let lastTouch = null;
    for (let i = chain.length - 1; i >= 0; i -= 1) {
      const commit = chain[i];
      const touchesPath = diffByCommit.get(commit.sha).some((entry) => entry.path === ownPath);
      if (touchesPath) {
        lastTouch = commit;
        break;
      }
    }

    if (!lastTouch) {
      // Defensive only — `ownPath` is in `touchedByOwn`, so at minimum the
      // own commit(s) that put it there must show up in their own diff.
      // Structurally unreachable; kept as a loud INCONCLUSIVE rather than a
      // silent skip if it ever somehow happens.
      return inconclusive(`internal inconsistency: "${ownPath}" is recorded as touched by the branch's own commits but no commit in the ` +
        'first-parent chain shows a diff for it. Refusing to guess at a verdict.', { baseRef, headRef, mergeBase });
    }

    if (lastTouch.isMerge) {
      violations.push({
        path: ownPath,
        mergeCommit: { sha: lastTouch.sha, subject: lastTouch.subject },
        ownCommitsTouching: ownTouches,
      });
    } else {
      explained.push({ path: ownPath, lastOwnCommit: { sha: lastTouch.sha, subject: lastTouch.subject } });
    }
  }

  const status = violations.length > 0 ? 'violation' : 'clean';
  return {
    status,
    baseRef,
    headRef,
    mergeBase,
    chainLength: chain.length,
    touchedByOwnCount: touchedByOwn.size,
    violations,
    explained,
    notes,
  };
}

function inconclusive(reason, extra = {}) {
  return {
    status: 'inconclusive',
    reason,
    baseRef: extra.baseRef ?? null,
    headRef: extra.headRef ?? null,
    mergeBase: extra.mergeBase ?? null,
    chainLength: 0,
    touchedByOwnCount: 0,
    violations: [],
    explained: [],
    notes: [],
  };
}

function printReport(result) {
  if (result.status === 'inconclusive') {
    console.error(`[check-merge-revert] INCONCLUSIVE — ${result.reason}`);
    console.error('[check-merge-revert] This check could not determine anything and is refusing to report a false pass.');
    return;
  }

  if (result.status === 'clean') {
    console.log(
      `[check-merge-revert] OK — walked ${result.chainLength} own-first-parent commit(s) from ${result.mergeBase ?? '(none)'} to ` +
        `${result.headRef}, ${result.touchedByOwnCount} path(s) touched by the branch's own commits, all still present in ` +
        `\`git diff --name-only ${result.mergeBase}...${result.headRef}\` (or explained by the branch's own later commit — ` +
        `${result.explained.length} such case(s)).`,
    );
    if (result.notes.length > 0) {
      for (const note of result.notes) console.log(`[check-merge-revert] NOTE — ${note}`);
    }
    return;
  }

  console.error('[check-merge-revert] VIOLATION — an in-branch merge silently reverted this branch\'s own edit:');
  for (const v of result.violations) {
    console.error(`  - "${v.path}" was touched by this branch's own commit(s):`);
    for (const c of v.ownCommitsTouching) {
      console.error(`      ${c.sha.slice(0, 12)} (${c.status}) ${c.subject}`);
    }
    console.error(`    ...then merge commit ${v.mergeCommit.sha.slice(0, 12)} ("${v.mergeCommit.subject}") changed it away from what the`);
    console.error('    branch already had, and nothing after that merge restored it — it is absent from the net diff against merge-base.');
  }
  console.error('');
  console.error('  Fix: re-resolve the conflict in the branch\'s own favour for these paths (or re-apply the lost edit), then re-run this check.');
  console.error('  Prefer `git rebase main` over `git merge main` on report/backlog branches going forward — a rebase replays the branch\'s');
  console.error('  own commits on top of main and cannot silently drop them the way a merge conflict resolution can.');
  if (result.notes.length > 0) {
    for (const note of result.notes) console.error(`  NOTE — ${note}`);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const result = checkMergeRevert();
  printReport(result);
  if (result.status === 'inconclusive') {
    process.exitCode = 2;
  } else if (result.status === 'violation') {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}
