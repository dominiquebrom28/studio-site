#!/usr/bin/env node
/**
 * Lists `team/*` / `claude/*` remote branches that are NOT merged into
 * `main` and have NO pull request that actually accounts for their current
 * tip — i.e. the branches a future run can't discover by reading `reports/`
 * or the PR list, because nothing points at them.
 *
 * Exists because of a real incident (BACKLOG.md HIGH, 2026-08-04): the
 * 2026-08-03 daily run correctly declined to open an 8th PR against a
 * stated 4-6 review throttle (7 were already open), then pushed
 * `team/2026-08-03-backlog-and-report` and stopped — no PR, no draft, no
 * report entry. For a full day the only record that the work existed was a
 * branch name; it was recovered only because the lead diffed `git branch
 * -a` against `reports/` on a hunch. Option (a) for the backlog item (open
 * a DRAFT PR the moment a throttled run would otherwise strand a branch —
 * see the new README section this PR also adds) fixes the moment of
 * stranding going forward. THIS script is the backstop for everything that
 * strands anyway (a run that dies before pushing, a branch predating the
 * convention, a human `git push` with no PR) and for the debt that already
 * exists.
 *
 * TWO DISTINCT STRANDING SHAPES, both reported here — do not narrow this to
 * just "no PR at all":
 *   1. `strandedNoPr` — no pull request, in any state, was ever opened for
 *      this branch name. The 2026-08-03 shape above.
 *   2. `strandedStalePr` — a pull request DOES exist for this branch name,
 *      but none of them accounts for the branch's CURRENT tip. This is the
 *      OTHER open stranding in this repo as of 2026-08-05:
 *      `team/2026-07-19-project-page-v2` has a MERGED pull request (#25),
 *      but 6 more commits (the `buildMode` tail — `src/content/buildMode.ts`
 *      and friends) were pushed to that branch AFTER #25 merged and were
 *      never covered by a new PR. A naive "does a PR exist for this branch
 *      name" check would call that branch clean; it is not — its current
 *      tip is unmerged, unreviewed, and untracked. A CLOSED-without-merging
 *      PR is treated the same way (never "clean") regardless of whether its
 *      `headRefOid` happens to match the current tip: a human or run
 *      explicitly decided not to merge that work, so it still deserves a
 *      human look, not silence (see the design note on `classifyBranch`
 *      below).
 *
 * "Coverage" is computed with `git merge-base --is-ancestor <tip>
 * <referenceCommit>` — is the branch's current tip reachable from the
 * commit a PR actually recorded (its merge commit if merged, its
 * `headRefOid` if open)? This is what makes the `project-page-v2` case
 * detectable at all: `isAncestor(tip, mergeCommit)` is FALSE there, because
 * `mergeCommit` only incorporated the OLD tip (at merge time), and new
 * commits were added on top of it afterward — the new commits are not its
 * ancestors, they're its descendants.
 *
 * REPORTING TOOL, NOT A MERGE GATE — deliberately not wired into
 * `.github/workflows/ci.yml`'s required `build` job. In a repo that
 * routinely has several `team/*` branches mid-review at once (this very
 * change was built in one of three CONCURRENT sibling worktrees), "an
 * unmerged sibling branch exists" is the normal state of the world, not a
 * defect in the PR under review — wiring this into every PR's required
 * check would make `build` red for reasons that have nothing to do with the
 * change being reviewed, exactly the shape of false-blocking gate this
 * repo's other checks (see `check-report-claims.mjs`'s header) go out of
 * their way to avoid. It belongs as a `npm run` step a run executes at
 * run-start (see the README section this PR adds) — cheap enough to run
 * every time, human/agent-readable, and it never blocks anyone's merge.
 *
 * THREE EXIT CODES, same convention as `check-deps-drift.mjs` / `check-
 * report-claims.mjs` — a check that cannot determine an answer must say so
 * loudly, never report a clean bill of health it didn't earn:
 *   0 = clean — every `team/*`/`claude/*` branch is either merged into
 *       `main` or has a pull request that accounts for its current tip.
 *   1 = FOUND — one or more stranded branches, named with enough to act on
 *       (commits ahead, files touched, last commit date/age, any PR that
 *       exists for the name and why it doesn't count as coverage).
 *   2 = INCONCLUSIVE — `gh` is missing, not authenticated, or errored; no
 *       base ref (`origin/main`/`main`) resolved; or a `git` invocation
 *       failed unexpectedly. This check's entire value proposition is
 *       "no PR anywhere" — that can only be answered via `gh`, so if `gh`
 *       can't answer, this refuses to guess from git state alone (the
 *       `SMOKE_URL` lesson, BACKLOG.md 2026-07-20: a check that silently
 *       skips its own precondition and reports green is worse than no
 *       check at all).
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const BRANCH_PREFIXES = ['team', 'claude'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Default `gitRunner` — real `git` via `execFileSync` (array args, no
 * shell), injectable so tests never need a real git repository fixture on
 * disk. Same shape as `check-report-claims.mjs`'s `defaultGitRunner`. */
function defaultGitRunner({ cwd, args }) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

/** Default `ghRunner` — real `gh` CLI, same injectable shape as
 * `defaultGitRunner`. `gh` auto-detects the repo from `cwd`'s git remotes,
 * same as a human running it by hand from the checkout. */
function defaultGhRunner({ cwd, args }) {
  return execFileSync('gh', args, { cwd, encoding: 'utf8' });
}

class StrandedBranchesGitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StrandedBranchesGitError';
  }
}

class StrandedBranchesGhError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StrandedBranchesGhError';
  }
}

function runGit(gitRunner, cwd, args, context) {
  try {
    return gitRunner({ cwd, args });
  } catch (error) {
    const detail = error && typeof error.stderr === 'string' && error.stderr.trim() !== '' ? error.stderr.trim() : (error?.message ?? String(error));
    throw new StrandedBranchesGitError(`\`git ${args.join(' ')}\` failed${context ? ` (${context})` : ''}: ${detail}`);
  }
}

/**
 * `git merge-base --is-ancestor A B` communicates its answer via exit code,
 * not stdout: exit 0 = true, exit 1 = false (a completely normal, expected
 * outcome — NOT an error), anything else (128 = unknown revision, etc) is a
 * real failure this check must not swallow. See file header for why this
 * distinction is load-bearing (`project-page-v2`'s exit-1 IS the finding).
 */
export function isAncestor(gitRunner, cwd, ancestorRef, descendantRef) {
  try {
    gitRunner({ cwd, args: ['merge-base', '--is-ancestor', ancestorRef, descendantRef] });
    return true;
  } catch (error) {
    const status = error && typeof error.status === 'number' ? error.status : undefined;
    if (status === 1) return false;
    const detail = error && typeof error.stderr === 'string' && error.stderr.trim() !== '' ? error.stderr.trim() : (error?.message ?? String(error));
    throw new StrandedBranchesGitError(
      `\`git merge-base --is-ancestor ${ancestorRef} ${descendantRef}\` failed unexpectedly (exit ${status ?? 'unknown'}): ${detail}`,
    );
  }
}

/** Base ref candidates, in priority order — an explicit override, then
 * `<remoteName>/main`, then bare `main` (a local checkout with no remote
 * tracking branch fetched yet). No `GITHUB_BASE_REF` handling here (unlike
 * `check-report-claims.mjs`): this check is a repo-wide sweep run at
 * run-start, not a PR-diff check, so there is no PR base ref to prefer. */
export function defaultBaseRefCandidates(remoteName, env = process.env) {
  const candidates = [];
  if (env.CHECK_STRANDED_BRANCHES_BASE_REF) candidates.push(env.CHECK_STRANDED_BRANCHES_BASE_REF);
  candidates.push(`${remoteName}/main`, 'main');
  return candidates;
}

/** Tries each candidate in order, returns the first `git rev-parse
 * --verify` accepts, or `null` if none resolve. Never throws. */
export function resolveBaseRef(gitRunner, cwd, candidates) {
  for (const ref of candidates) {
    if (!ref) continue;
    try {
      gitRunner({ cwd, args: ['rev-parse', '--verify', `${ref}^{commit}`] });
      return ref;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Parses `git for-each-ref --format='%(refname:short)|%(objectname)|
 * %(committerdate:iso-strict)'` output for one `refs/remotes/<remote>/...`
 * pattern into `{ name, sha, committerDate }`, where `name` has the
 * `<remote>/` prefix stripped (so `origin/team/2026-08-04-logbook` becomes
 * `team/2026-08-04-logbook` — the name a PR's `headRefName` actually uses).
 * Pure/exported so it's testable against captured `git` output with no real
 * repo needed.
 */
export function parseForEachRefOutput(output, remoteName) {
  const prefix = `${remoteName}/`;
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      const [refShort, sha, committerDate] = line.split('|');
      const name = refShort.startsWith(prefix) ? refShort.slice(prefix.length) : refShort;
      return { name, sha, committerDate };
    });
}

/**
 * Lists every `refs/remotes/<remoteName>/<prefix>/...` branch for each
 * prefix in `BRANCH_PREFIXES`, deduplicated (a branch cannot match two
 * prefixes, but for-each-ref is called once per prefix defensively rather
 * than one combined pattern — matching `for-each-ref`'s documented
 * multi-pattern-argument form exactly, one call, still just a single
 * process spawn).
 */
export function listCandidateBranches(gitRunner, cwd, remoteName) {
  const patterns = BRANCH_PREFIXES.map((p) => `refs/remotes/${remoteName}/${p}`);
  const output = runGit(
    gitRunner,
    cwd,
    ['for-each-ref', "--format=%(refname:short)|%(objectname)|%(committerdate:iso-strict)", ...patterns],
    'listing candidate branches',
  );
  return parseForEachRefOutput(output, remoteName);
}

/**
 * One `gh pr list --state all --json ...` call fetches every PR ever opened
 * against this repo (a single process spawn, not one per branch — this
 * repo already has 100+ PRs and will only grow). `--limit` is set well
 * above the current count as a defensive ceiling, not tuned to today's
 * size — see `printReport`'s note if this count is ever reached, which
 * would mean the ceiling itself needs raising.
 */
const PR_FETCH_LIMIT = 2000;
const PR_JSON_FIELDS = 'number,state,url,headRefName,headRefOid,mergeCommit,title';

export function fetchPullRequests(ghRunner, cwd, { limit = PR_FETCH_LIMIT } = {}) {
  let raw;
  try {
    raw = ghRunner({ cwd, args: ['pr', 'list', '--state', 'all', '--limit', String(limit), '--json', PR_JSON_FIELDS] });
  } catch (error) {
    const code = error && error.code;
    if (code === 'ENOENT') {
      throw new StrandedBranchesGhError('the `gh` CLI is not installed / not on PATH — cannot determine which branches have pull requests.');
    }
    const detail = error && typeof error.stderr === 'string' && error.stderr.trim() !== '' ? error.stderr.trim() : (error?.message ?? String(error));
    throw new StrandedBranchesGhError(`\`gh pr list\` failed: ${detail}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new StrandedBranchesGhError(`\`gh pr list\` returned output this check could not parse as JSON: ${error.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new StrandedBranchesGhError('`gh pr list --json ...` did not return a JSON array as expected.');
  }

  return parsed.map((pr) => ({
    number: pr.number,
    state: pr.state,
    url: pr.url,
    headRefName: pr.headRefName,
    headRefOid: pr.headRefOid ?? null,
    mergeCommitOid: pr.mergeCommit && pr.mergeCommit.oid ? pr.mergeCommit.oid : null,
    title: pr.title,
  }));
}

/** Groups PRs by `headRefName` — a branch can have more than one PR across
 * its history (reopened, or a second PR filed against the same name after
 * the first closed unmerged). */
export function groupPrsByHeadRef(prs) {
  const map = new Map();
  for (const pr of prs) {
    if (!map.has(pr.headRefName)) map.set(pr.headRefName, []);
    map.get(pr.headRefName).push(pr);
  }
  return map;
}

/**
 * Does this ONE pull request account for the branch's current tip?
 *
 * A `CLOSED` (unmerged) PR NEVER counts as coverage, regardless of whether
 * its `headRefOid` matches the current tip exactly — see file header:
 * closing a PR without merging is a decision someone made, but the code is
 * still sitting on a branch nobody is reviewing, and this check's whole
 * point is not to go quiet just because *something* GitHub-shaped once
 * existed for the name.
 *
 * `OPEN`/`MERGED` PRs count as coverage when the branch's current tip is
 * reachable from the PR's reference commit (`headRefOid` for `OPEN`,
 * `mergeCommit.oid` for `MERGED`) — i.e. every commit on the branch today
 * was already part of what that PR captured. See file header for why this
 * is exactly the check that catches `project-page-v2`: its merged PR's
 * `mergeCommit` captured the OLD tip; 6 later commits are its descendants,
 * not its ancestors, so they are NOT reachable from it.
 */
export function prCoversTip(gitRunner, cwd, pr, tipSha) {
  if (pr.state === 'CLOSED') return false;
  const referenceCommit = pr.state === 'MERGED' ? pr.mergeCommitOid : pr.headRefOid;
  if (!referenceCommit) return false;
  if (referenceCommit === tipSha) return true;
  return isAncestor(gitRunner, cwd, tipSha, referenceCommit);
}

/**
 * Classifies one branch as `'merged'` (into `main` — quiet, not reported),
 * `'covered'` (an OPEN or MERGED PR accounts for its tip — quiet), or one
 * of the two stranded shapes described in the file header. Throws (never
 * silently guesses) if an `isAncestor` call hits a real git error.
 *
 * @returns {'merged' | 'covered' | 'strandedNoPr' | 'strandedStalePr'}
 */
export function classifyBranch(gitRunner, cwd, { sha }, baseRef, prsForBranch) {
  if (isAncestor(gitRunner, cwd, sha, baseRef)) return 'merged';
  if (prsForBranch.length === 0) return 'strandedNoPr';
  const covered = prsForBranch.some((pr) => prCoversTip(gitRunner, cwd, pr, sha));
  return covered ? 'covered' : 'strandedStalePr';
}

/** `git rev-list --count <baseRef>..<sha>` — commits on the branch not on
 * `main`. Only called for branches that turn out stranded (see
 * `checkStrandedBranches`) — no point paying for it on the common case. */
export function countCommitsAhead(gitRunner, cwd, baseRef, sha) {
  const output = runGit(gitRunner, cwd, ['rev-list', '--count', `${baseRef}..${sha}`], `counting commits ahead for ${sha}`);
  const n = Number.parseInt(output.trim(), 10);
  return Number.isNaN(n) ? null : n;
}

/** `git diff --name-only <baseRef>...<sha>` (three-dot, from the
 * merge-base) — the files this branch actually touches relative to `main`. */
export function listFilesTouched(gitRunner, cwd, baseRef, sha) {
  const output = runGit(gitRunner, cwd, ['diff', '--name-only', `${baseRef}...${sha}`], `listing files touched for ${sha}`);
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

function ageDays(committerDate, now) {
  const then = Date.parse(committerDate);
  if (Number.isNaN(then)) return null;
  return Math.floor((now - then) / DAY_MS);
}

/**
 * Core check, exported so `check-stranded-branches.test.ts` can inject fake
 * `gitRunner`/`ghRunner` (no real git repo or `gh` auth needed — same
 * pattern as `check-report-claims.mjs`) and a fixed `now` for deterministic
 * age assertions.
 *
 * @param {object} [options]
 * @param {string} [options.repoRoot]
 * @param {string} [options.remoteName]
 * @param {string[]} [options.baseRefCandidates]
 * @param {number} [options.now] epoch ms, defaults to `Date.now()`
 * @param {(args: {cwd: string, args: string[]}) => string} [options.gitRunner]
 * @param {(args: {cwd: string, args: string[]}) => string} [options.ghRunner]
 * @param {NodeJS.ProcessEnv} [options.env]
 */
export function checkStrandedBranches({
  repoRoot = DEFAULT_REPO_ROOT,
  remoteName = 'origin',
  baseRefCandidates,
  now = Date.now(),
  gitRunner = defaultGitRunner,
  ghRunner = defaultGhRunner,
  env = process.env,
} = {}) {
  const candidates = baseRefCandidates ?? defaultBaseRefCandidates(remoteName, env);
  const baseRef = resolveBaseRef(gitRunner, repoRoot, candidates);
  if (!baseRef) {
    return {
      status: 'inconclusive',
      reason: `could not resolve a base ref to compare against — tried: ${candidates.filter(Boolean).join(', ') || '(no candidates)'}. Fetch \`main\` (\`git fetch ${remoteName} main\`) and re-run.`,
      baseRef: null,
      strandedNoPr: [],
      strandedStalePr: [],
      totalBranchesScanned: 0,
      totalPrsFetched: 0,
    };
  }

  let prs;
  try {
    prs = fetchPullRequests(ghRunner, repoRoot);
  } catch (error) {
    return {
      status: 'inconclusive',
      reason: error instanceof Error ? error.message : String(error),
      baseRef,
      strandedNoPr: [],
      strandedStalePr: [],
      totalBranchesScanned: 0,
      totalPrsFetched: 0,
    };
  }
  const prsByHeadRef = groupPrsByHeadRef(prs);

  let branches;
  try {
    branches = listCandidateBranches(gitRunner, repoRoot, remoteName);
  } catch (error) {
    return {
      status: 'inconclusive',
      reason: error instanceof Error ? error.message : String(error),
      baseRef,
      strandedNoPr: [],
      strandedStalePr: [],
      totalBranchesScanned: 0,
      totalPrsFetched: prs.length,
    };
  }

  const strandedNoPr = [];
  const strandedStalePr = [];

  for (const branch of branches) {
    const prsForBranch = prsByHeadRef.get(branch.name) ?? [];
    let category;
    try {
      category = classifyBranch(gitRunner, repoRoot, branch, baseRef, prsForBranch);
    } catch (error) {
      return {
        status: 'inconclusive',
        reason: error instanceof Error ? error.message : String(error),
        baseRef,
        strandedNoPr: [],
        strandedStalePr: [],
        totalBranchesScanned: branches.length,
        totalPrsFetched: prs.length,
      };
    }

    if (category === 'merged' || category === 'covered') continue;

    let commitsAhead;
    let filesTouched;
    try {
      commitsAhead = countCommitsAhead(gitRunner, repoRoot, baseRef, branch.sha);
      filesTouched = listFilesTouched(gitRunner, repoRoot, baseRef, branch.sha);
    } catch (error) {
      return {
        status: 'inconclusive',
        reason: error instanceof Error ? error.message : String(error),
        baseRef,
        strandedNoPr: [],
        strandedStalePr: [],
        totalBranchesScanned: branches.length,
        totalPrsFetched: prs.length,
      };
    }

    const finding = {
      branch: branch.name,
      sha: branch.sha,
      lastCommitDate: branch.committerDate,
      ageDays: ageDays(branch.committerDate, now),
      commitsAhead,
      fileCount: filesTouched.length,
      filesTouched,
      pullRequests: prsForBranch.map((pr) => ({ number: pr.number, state: pr.state, url: pr.url })),
    };

    if (category === 'strandedNoPr') strandedNoPr.push(finding);
    else strandedStalePr.push(finding);
  }

  const byAgeDesc = (a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0);
  strandedNoPr.sort(byAgeDesc);
  strandedStalePr.sort(byAgeDesc);

  const status = strandedNoPr.length > 0 || strandedStalePr.length > 0 ? 'found' : 'clean';
  return { status, baseRef, strandedNoPr, strandedStalePr, totalBranchesScanned: branches.length, totalPrsFetched: prs.length };
}

function formatFinding(f) {
  const lines = [];
  lines.push(`  - ${f.branch}`);
  lines.push(`      last commit: ${f.lastCommitDate} (${f.ageDays === null ? 'age unknown' : `${f.ageDays}d ago`}), ${f.commitsAhead ?? '?'} commit(s) ahead of main, ${f.fileCount} file(s) touched`);
  const shown = f.filesTouched.slice(0, 8);
  const more = f.filesTouched.length - shown.length;
  if (shown.length > 0) {
    lines.push(`      files: ${shown.join(', ')}${more > 0 ? `, +${more} more` : ''}`);
  }
  if (f.pullRequests.length > 0) {
    lines.push(`      PR(s) that exist but do not cover the current tip: ${f.pullRequests.map((p) => `#${p.number} (${p.state}) ${p.url}`).join(', ')}`);
  }
  return lines.join('\n');
}

function printReport(result) {
  if (result.status === 'inconclusive') {
    console.error(`[check-stranded-branches] INCONCLUSIVE — ${result.reason}`);
    console.error('[check-stranded-branches] This check could not determine anything and is refusing to report a false pass.');
    return;
  }

  if (result.status === 'clean') {
    console.log(
      `[check-stranded-branches] OK — scanned ${result.totalBranchesScanned} team/*+claude/* branch(es) against \`${result.baseRef}\` and ${result.totalPrsFetched} pull request(s); 0 stranded.`,
    );
    return;
  }

  const total = result.strandedNoPr.length + result.strandedStalePr.length;
  console.error(
    `[check-stranded-branches] FOUND ${total} stranded branch(es) — scanned ${result.totalBranchesScanned} against \`${result.baseRef}\` and ${result.totalPrsFetched} pull request(s):`,
  );
  if (result.strandedNoPr.length > 0) {
    console.error('');
    console.error(`  No pull request ever opened for this branch name (${result.strandedNoPr.length}):`);
    for (const f of result.strandedNoPr) console.error(formatFinding(f));
  }
  if (result.strandedStalePr.length > 0) {
    console.error('');
    console.error(`  A pull request exists but does not cover the current tip (${result.strandedStalePr.length}):`);
    for (const f of result.strandedStalePr) console.error(formatFinding(f));
  }
  console.error('');
  console.error('  This is a REPORTING check, not a merge gate — nothing here is expected to be auto-fixed.');
  console.error('  Fix: open a (draft, if still under the review throttle) PR for each branch above, or delete the');
  console.error('  ref if the work is genuinely abandoned.');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const result = checkStrandedBranches();
  printReport(result);
  if (result.status === 'inconclusive') {
    process.exitCode = 2;
  } else if (result.status === 'found') {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}
