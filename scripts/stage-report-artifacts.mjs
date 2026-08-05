#!/usr/bin/env node
/**
 * Pre-commit companion to `scripts/provenance/generate.mjs` — regenerates
 * and (only when content actually changed) restages
 * `src/content/provenance.generated.json` and `src/content/runs.generated
 * .json` whenever a commit has a `reports/*.md` file staged.
 *
 * WHY THIS EXISTS (BACKLOG.md HIGH, 2026-08-05, "Writing the report last
 * structurally guarantees a stale runs.generated.json, and only CI ever
 * says so"): the run report describing a branch's work is, structurally,
 * always the LAST thing written on that branch — but `predev`/`prebuild`/
 * `pretest` only regenerate the two `*.generated.json` artifacts, they
 * don't (and can't) write the report itself. So the artifact is stale by
 * construction on every report-bearing branch the moment the report is
 * added, and the first thing that ever notices is a red `git diff
 * --exit-code` check on a pushed PR — PR #87 sat red for two days on
 * exactly this and nothing else. Confirmed a second way, 2026-08-04: a
 * bookkeeping branch that merged two report-bearing branches hit the same
 * trap as a `runs.generated.json` merge *conflict* instead of a red check,
 * resolved by hand-regenerating.
 *
 * FIRES ONLY when `reports/*.md` is staged. The EXPENSIVE part of that
 * check (starting a node process at all) is skipped for the hundreds of
 * ordinary code commits that never touch `reports/` by `.githooks/
 * pre-commit`'s own shell-level short-circuit — this script re-checks the
 * same condition itself too (`hasStagedReportMarkdown`, below) so it stays
 * correct and meaningful when run directly (`npm run
 * stage-report-artifacts`) or under test, not only via the hook.
 *
 * DELETIONS COUNT AS STAGED TOO — both this script's own `getStagedPaths`
 * wiring below and `.githooks/pre-commit`'s shell-level short-circuit use
 * `--diff-filter=ACMRD`, not the more obvious-looking `ACMR`. Confirmed by
 * reproduction, not assumed: `runs.generated.json` is one row per file
 * CURRENTLY in `reports/` (`scripts/provenance/runs.mjs`'s `buildRunsRows`
 * iterates whatever `readReportFiles` finds on disk, nothing more), so
 * deleting a report is exactly as artifact-changing as adding one — a
 * commit that only `git rm`s a report is the same trap approached from the
 * other direction, and `ACMR` alone let it straight through uncaught (see
 * `.githooks/pre-commit`'s comment for the falsification transcript
 * reference in this change's PR body).
 *
 * BLOCK VS AMEND — the two outcomes are handled differently on purpose,
 * unlike `post-checkout`/`post-merge` (`check-deps-drift.mjs`), which are
 * non-blocking by GIT MECHANICS, not by choice (their exit code cannot
 * abort an already-completed checkout/merge — see that file's header).
 * `pre-commit` runs BEFORE the commit exists, so blocking is a real,
 * available choice here, and the two failure directions are NOT treated the
 * same:
 *
 *   - Generator SUCCEEDS, content changed -> AMEND, never block. The
 *     regenerated artifact is provably correct (the exact generator CI
 *     trusts, run unmodified), so there is nothing left for a human to
 *     decide — refusing to just fix it and continue would recreate the
 *     "requires a habit" failure mode reports/2026-07-31.md's own
 *     "Learnings" section warns against. Never staged SILENTLY, though: a
 *     hook that mutates a commit without saying so is worse than the trap
 *     it fixes (this task's own constraint) — every refreshed artifact is
 *     printed by name, every time (see `printReport`).
 *   - Generator SUCCEEDS, no content changed -> no-op, logged, commit
 *     proceeds untouched. A legitimate, common outcome (e.g. a report with
 *     no `yaml provenance` block, or one whose `produced` files were
 *     already accounted for) — never treated as evidence something is
 *     wrong.
 *   - Generator FAILS -> BLOCK the commit (non-zero exit), loudly, with the
 *     generator's own stdout/stderr. This is the one place this hook
 *     deliberately diverges from `scripts/setup-git-hooks.mjs`'s "never
 *     fail an automatic git action" posture: that script runs on EVERY
 *     `npm install`, a high-frequency command a developer doesn't choose to
 *     run for THIS purpose, so it can never justify blocking it. This hook
 *     fires only on a rare, deliberate act (staging a report), and a
 *     generator failure at that exact moment means one of two things, both
 *     worth stopping for: (1) the report/content genuinely is broken (a bad
 *     `yaml provenance` block, a dangling `produced` path) — the same
 *     defect `npm run build`/`npm test` would refuse to pass on moments
 *     later anyway, so blocking now surfaces it at the moment of authorship
 *     instead of at the next local build or two days downstream in CI,
 *     which is this whole task's stated goal; or (2) a real infrastructure
 *     problem (e.g. a shallow local clone — `generate.mjs`'s own
 *     `assertGitAvailable`) that would make ANY regenerated content
 *     unreliable — silently skipping and committing the OLD artifact
 *     unchanged would be indistinguishable from "verified fresh" and is
 *     strictly worse than refusing to commit. NOT wedged shut either way:
 *     `git commit --no-verify` is the standard, always-available escape
 *     hatch this repo's other hooks already rely on implicitly, and CI's
 *     `git diff --exit-code src/content/*.generated.json` gate
 *     (`.github/workflows/ci.yml`) is the unconditional backstop regardless
 *     of which path a local commit took.
 *
 * MERGE COMMITS: NOT skipped, deliberately. `pre-commit` only ever runs for
 * a merge commit AFTER every conflict has already been resolved and
 * staged — `git commit` refuses outright, before invoking any hook, while
 * unmerged paths remain (verified by reproduction against a real add/add
 * conflict; see this change's PR body for the transcript). So by the time
 * this hook runs mid-merge, the staged tree is already final, and
 * regenerating against it is exactly the fix for the 2026-08-04 incident
 * (a `runs.generated.json` merge *conflict*, resolved by hand-
 * regenerating) — skipping here would silently leave that incident's shape
 * open instead of closing it. `isMergeCommit` (detected via the presence of
 * `MERGE_HEAD` in this worktree's own git dir) only changes the LOG line
 * ("(merge commit)"); the staging behavior itself is identical either way.
 *
 * `--no-verify`: this hook simply never runs when that flag is used —
 * nothing to detect, nothing to special-case here. CI's drift gate is what
 * catches that branch instead, same as it always has for every other
 * bypassed local hook in this repo.
 *
 * NEVER hand-edits the artifacts — the only thing this script writes to
 * disk is what `scripts/provenance/generate.mjs` itself already wrote; this
 * script's own job is strictly "decide whether to `git add` it, and say so".
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_GENERATOR_PATH = path.join(SCRIPT_DIR, 'provenance', 'generate.mjs');

/** The two artifacts CI's own drift gates check (`.github/workflows/ci.yml`,
 * "Provenance artifact is up to date" / "Runs artifact is up to date") —
 * both are written by the SAME `generate.mjs` invocation (its `main()` has
 * one try/catch per artifact, deliberately independent — see that file's
 * header), so a report that changes either, or both, is caught in a single
 * pass here too. */
export const GENERATED_ARTIFACT_PATHS = ['src/content/provenance.generated.json', 'src/content/runs.generated.json'];

/** `git diff --cached` args used to discover staged paths for the real CLI
 * run. Exported (not inlined into the `isMain` block below) specifically so
 * `scripts/stage-report-artifacts.test.ts` can pin `--diff-filter=ACMRD`
 * (in particular, the `D`) as an assertion against ACCIDENTAL removal in a
 * future edit, rather than that guarantee living only in a comment. `D` —
 * Deleted — is load-bearing, not defensive padding: confirmed by
 * reproduction that a commit which only `git rm`s a `reports/*.md` file
 * changes `runs.generated.json` (one row per file CURRENTLY in `reports/`
 * — `scripts/provenance/runs.mjs`) exactly as surely as adding one does;
 * without `D` this hook would silently miss that direction of the same
 * trap it exists to close (see this file's header, "DELETIONS COUNT AS
 * STAGED TOO", and `.githooks/pre-commit`'s matching comment — that file's
 * own filter MUST stay identical to this one, since its shell-level check
 * decides whether this script even runs). */
export const STAGED_PATHS_DIFF_ARGS = ['diff', '--cached', '--name-only', '--diff-filter=ACMRD', '-z'];

const REPORT_FILE_RE = /^reports\/[^/]+\.md$/;

/** Parses NUL-separated `git diff --cached ... -z` output into a plain path
 * array. NUL-separated, not newline-split — a newline-separated parse would
 * silently mis-split a (rare but legal) path containing a literal newline;
 * `-z` is the mechanical fix, same reasoning this repo already applies
 * elsewhere to path-bearing git output. */
export function parseNulSeparatedPaths(output) {
  return output.split('\0').filter((entry) => entry !== '');
}

/** True when at least one staged path is a top-level `reports/*.md` file.
 * Deliberately its own regex/constant rather than importing
 * `check-report-claims.mjs`'s `REPORT_FILE_RE`: that check asks "is this a
 * NEW file added on this branch's diff against main" (drives a completely
 * different git comparison, `baseRef...headRef`); this asks "is this file
 * staged for the NEXT commit, added, edited, OR deleted" — which must also
 * fire when a report is only being amended in a later commit on the same
 * branch (not just its first commit), and when a report is being REMOVED
 * (see the file header's "DELETIONS COUNT AS STAGED TOO" for why a
 * deletion is just as artifact-changing as an addition). This function
 * itself stays status-agnostic — it only asks "is a path shaped like
 * reports/*.md present in the staged-paths list at all" — because the
 * status filtering (which statuses even make it into that list) already
 * happened one layer up, in the `--diff-filter=ACMRD` git invocation that
 * produced it. */
export function hasStagedReportMarkdown(stagedPaths) {
  return stagedPaths.some((p) => REPORT_FILE_RE.test(p));
}

function defaultGitRunner({ cwd, args }) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

/** Default generator runner: spawns the repo's REAL generator
 * (`scripts/provenance/generate.mjs`, the same script `predev`/`prebuild`/
 * `pretest` already run) as its own node process — never reimplemented or
 * hand-edited here, per this task's non-negotiable constraint. `spawnSync`
 * (not `execFileSync`) on purpose: a non-zero exit here is DATA this caller
 * needs to act on (block the commit, show the generator's own output), not
 * an exception to propagate. */
function defaultGeneratorRunner({ repoRoot, generatorPath }) {
  const result = spawnSync(process.execPath, [generatorPath], { cwd: repoRoot, encoding: 'utf8' });
  return {
    ok: result.status === 0 && !result.error,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error,
  };
}

function defaultReadArtifactContent(absolutePath) {
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, 'utf8');
}

function defaultStagePath({ repoRoot, relPath }) {
  execFileSync('git', ['add', '--', relPath], { cwd: repoRoot });
}

/**
 * Core orchestration, exported so `scripts/stage-report-artifacts.test.ts`
 * can inject fakes for every side effect (staged-paths lookup, the
 * generator itself, artifact reads, `git add`) — same pattern as
 * `checkDepsDrift`/`checkReportClaims` in this directory. Never shells out
 * for real inside a unit test.
 *
 * @param {object} [options]
 * @param {string} [options.repoRoot]
 * @param {string} [options.generatorPath]
 * @param {string[]} [options.artifactPaths]
 * @param {boolean} [options.isMergeCommit]
 * @param {() => string[]} options.getStagedPaths
 * @param {(args: {repoRoot: string, generatorPath: string}) => {ok: boolean, stdout: string, stderr: string, error?: Error}} [options.runGenerator]
 * @param {(absolutePath: string) => string | null} [options.readArtifactContent]
 * @param {(args: {repoRoot: string, relPath: string}) => void} [options.stagePath]
 */
export function stageReportArtifacts({
  repoRoot = DEFAULT_REPO_ROOT,
  generatorPath = DEFAULT_GENERATOR_PATH,
  artifactPaths = GENERATED_ARTIFACT_PATHS,
  isMergeCommit = false,
  getStagedPaths,
  runGenerator = defaultGeneratorRunner,
  readArtifactContent = defaultReadArtifactContent,
  stagePath = defaultStagePath,
} = {}) {
  const stagedPaths = getStagedPaths();

  if (!hasStagedReportMarkdown(stagedPaths)) {
    return { status: 'skipped', reason: 'no reports/*.md staged for this commit', refreshed: [], unchanged: [] };
  }

  // Snapshot BEFORE regenerating — the only reliable way to know whether the
  // generator's output actually changed, independent of whatever else might
  // already be staged/unstaged for these paths.
  const before = new Map(artifactPaths.map((relPath) => [relPath, readArtifactContent(path.join(repoRoot, relPath))]));

  const generatorResult = runGenerator({ repoRoot, generatorPath });

  if (!generatorResult.ok) {
    return {
      status: 'generator-failed',
      reason: generatorResult.error ? generatorResult.error.message : 'generator exited non-zero',
      stdout: generatorResult.stdout,
      stderr: generatorResult.stderr,
      refreshed: [],
      unchanged: [],
    };
  }

  const refreshed = [];
  const unchanged = [];
  for (const relPath of artifactPaths) {
    const after = readArtifactContent(path.join(repoRoot, relPath));
    if (after !== before.get(relPath)) {
      stagePath({ repoRoot, relPath });
      refreshed.push(relPath);
    } else {
      unchanged.push(relPath);
    }
  }

  return {
    status: refreshed.length > 0 ? 'staged' : 'clean',
    isMergeCommit,
    refreshed,
    unchanged,
    stdout: generatorResult.stdout,
    stderr: generatorResult.stderr,
  };
}

function printReport(result) {
  const prefix = '[stage-report-artifacts]';
  if (result.status === 'skipped') {
    // Only reached when this script is invoked directly (`npm run
    // stage-report-artifacts`, by hand, or under test) — a real commit
    // never gets this far, since `.githooks/pre-commit`'s own shell-level
    // check already short-circuits before node ever starts.
    console.log(`${prefix} no-op — ${result.reason}.`);
    return;
  }
  if (result.status === 'clean') {
    console.log(`${prefix} OK — reports/*.md staged, ran \`node scripts/provenance/generate.mjs\`, no artifact content changed (already up to date).`);
    return;
  }
  if (result.status === 'staged') {
    const merge = result.isMergeCommit ? ' (merge commit)' : '';
    console.log(`${prefix} refreshed and staged ${result.refreshed.length} artifact${result.refreshed.length === 1 ? '' : 's'}${merge}:`);
    for (const p of result.refreshed) console.log(`  - ${p}`);
    if (result.unchanged.length > 0) {
      console.log(`${prefix} unchanged (already up to date): ${result.unchanged.join(', ')}`);
    }
    return;
  }
  // generator-failed
  console.error(`${prefix} BLOCKED — reports/*.md is staged but \`node scripts/provenance/generate.mjs\` failed:`);
  if (result.stdout) console.error(result.stdout);
  if (result.stderr) console.error(result.stderr);
  console.error(`${prefix} ${result.reason}`);
  console.error(`${prefix} Fix the content and retry the commit, or \`git commit --no-verify\` to bypass (CI's drift gate still applies to the pushed branch).`);
}

/** Detects a merge-in-progress via the presence of `MERGE_HEAD` in THIS
 * worktree's own private git dir (`--absolute-git-dir`, never the shared
 * common dir — merge state is per-worktree). Only ever used for the log
 * line; see the file header for why this hook does not special-case merge
 * commits beyond that. */
function detectMergeCommit(gitRunner, repoRoot) {
  let gitDir;
  try {
    gitDir = gitRunner({ cwd: repoRoot, args: ['rev-parse', '--absolute-git-dir'] }).trim();
  } catch {
    return false;
  }
  return existsSync(path.join(gitDir, 'MERGE_HEAD'));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const repoRoot = DEFAULT_REPO_ROOT;
  // See `STAGED_PATHS_DIFF_ARGS`'s own header comment for why `D` is in
  // this filter and why it MUST match `.githooks/pre-commit`'s filter
  // exactly (that file's shell-level short-circuit decides whether this
  // script even runs).
  const getStagedPaths = () => parseNulSeparatedPaths(defaultGitRunner({ cwd: repoRoot, args: STAGED_PATHS_DIFF_ARGS }));
  const isMergeCommit = detectMergeCommit(defaultGitRunner, repoRoot);

  const result = stageReportArtifacts({ repoRoot, isMergeCommit, getStagedPaths });
  printReport(result);
  process.exitCode = result.status === 'generator-failed' ? 1 : 0;
}
