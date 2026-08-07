#!/usr/bin/env node
/**
 * Does a NEW run report's own branch actually touch the files it claims to?
 *
 * Exists because of a real incident (BACKLOG.md MEDIUM, 2026-08-01): PR #81
 * ("Backlog + 2026-07-31 run report") told Dom, in its own "For Dom to
 * review" section, that its branch was "`team/2026-07-31-backlog-and-report`
 * (BACKLOG.md + this report)" — but the PR's actual diff was ONE file,
 * `reports/2026-07-31.md`. `BACKLOG.md` was never touched. Four backlog
 * findings existed only in the Notion mirror for a day because of it. Every
 * other artifact in this repo is gated (content is Zod-validated, routes are
 * smoke-tested, both generated artifacts are drift-checked) — a run report
 * asserting things about its own branch was the last unaudited one.
 *
 * SCOPE — READ THIS BEFORE EXTENDING THE REGEXES BELOW. This check does NOT
 * grade a report's prose, tone, or completeness, and it does NOT try to
 * decide "is this backtick-quoted path a claim or a citation" from free
 * text in general — that turned out to be unreliable by inspection of the
 * real corpus (~22 files in `reports/` at the time this was written): the
 * SAME report routinely cites paths belonging to OTHER branches (a
 * different PR under review, a previous day's incident, a different repo's
 * fix commit, a path inside another item's own branch in a multi-item batch
 * run) right next to paths that genuinely describe its own branch. Grading
 * which is which from prose is exactly the kind of thing this file must not
 * attempt (a gate people learn to re-run until it's green stops being a
 * gate — BACKLOG.md 2026-07-19, 2026-07-29 — and a false positive here
 * teaches people to ignore report-writing gates specifically).
 *
 * So the extraction is narrowed to ONE mechanical, structural signal: a text
 * block (one prose paragraph, or one markdown table row) that contains the
 * EXACT branch string of the diff being checked. A path token found in such
 * a block is treated as a claim about THIS branch; a path token anywhere
 * else in the report — including under an "Item(s) worked on" / "Items
 * built" heading describing OTHER items' branches, which is where most of
 * this repo's real reports put their file-touching prose (see e.g.
 * `reports/2026-07-18.md`, a 5-branch batch run whose OWN filing branch,
 * `team/2026-07-18-backlog-and-report`, touches only BACKLOG.md + the
 * report itself, while every path lives under a DIFFERENT item's branch
 * name) — is never inspected. This is deliberately narrower than "scan the
 * whole 'Item worked on' section": that heading's exact wording varies
 * across the corpus ("Item worked on", "Item(s) worked on", "Items worked
 * on", "Items built", or no such heading at all — several reports use
 * per-item `## Item N — Title → PR #NN` headings instead), and the PR #81
 * incident itself did not happen under that heading at all — it happened in
 * "For Dom to review". Anchoring on "does this text say MY OWN branch name"
 * instead of "is this text under a specific heading" is both more precise
 * (structurally cannot fire on a citation of another branch, another PR, or
 * another repo's branch of the same name — see `reports/maintenance-2026-07
 * -20.md`, which reuses the literal string `team/maintenance-2026-07-20` for
 * an unrelated SoulForce-V2 repo commit) and heading-format-agnostic.
 *
 * This intentionally means: a false claim NOT adjacent to a self-reference
 * to this run's own branch will NOT be caught. That is the accepted
 * trade — see the file's task/spec history: "prefer under-reporting to
 * over-reporting" is explicit, and a narrow check that is always right
 * beats a broad one that is sometimes wrong.
 *
 * FENCED CODE BLOCKS (```...```) are stripped before any scanning happens,
 * for two reasons: (1) `yaml provenance` blocks' `produced:` paths are
 * ALREADY gated by `scripts/provenance/` + the `provenance.generated.json`
 * / `runs.generated.json` drift gates in `.github/workflows/ci.yml` —
 * duplicating that here would be redundant, and BACKLOG.md's "Ordering
 * constraint" documents a real, sanctioned case (2026-08-01) of a
 * provenance block's exact content being preserved in prose while its
 * branch's OTHER PRs are still unmerged, which this check must not
 * misread as a claim about the report-filing branch. (2) shell transcripts
 * and error-output blocks quoted verbatim (e.g. a `tsc` error naming
 * `src/lib/profile.ts`) are illustrative evidence, not claims about this
 * branch, and are almost never markdown prose paragraphs to begin with.
 *
 * PATH-LIKE TOKEN MATCHING requires an extension from `ALLOWED_EXTENSIONS`
 * below — grounded in the real extension set this repo's tracked files
 * actually use (`git ls-files`), plus a small number of obvious siblings
 * (`.jpeg`/`.webp`/`.ico` next to the already-present `.jpg`/`.gif`/`.svg`,
 * `.yaml` next to `.yml`). This is what keeps contrast ratios ("4.45 ->
 * 4.77:1"), timings ("8580.3ms"), semver-ish mentions ("7.18.1"), and CSS
 * custom properties ("--warning") from ever being mis-read as file paths —
 * none of their trailing segments match a real extension in this repo.
 *
 * COMPOUND EXTENSIONS (`.test.ts`, `.d.mts`, `.generated.json`, `.spec.ts`,
 * …) — fixed 2026-08-06, found by the falsification pass for the
 * files-produced-column backlog item (BACKLOG.md MEDIUM, "Give the 'Items
 * worked on' table a files-produced column"). `PATH_TOKEN_RE`'s final path
 * segment used to forbid a dot in the NAME part (`[A-Za-z0-9_-]+\.EXT`,
 * matching `check-report-claims.mjs` but NOT `check-report-claims.test.ts`
 * or `check-report-claims.d.mts`) — an oversight, not a deliberate
 * false-positive guard: the ALLOWED_EXTENSIONS whitelist above is what does
 * the real work of excluding contrast ratios/timings/semver, so relaxing the
 * name part to allow interior dots (`[A-Za-z0-9_.-]+\.EXT`) adds no new
 * false-positive surface against this file's own test suite (verified: every
 * existing "must never match" case in `check-report-claims.test.ts` still
 * fails on the EXTENSION check, not the dot restriction) while fixing a
 * silent false NEGATIVE on exactly the file shapes this repo's own
 * deliverables constantly are — every sibling check script in this directory
 * ships a `.test.ts` and a `.d.mts`, and this bug meant NEITHER was ever
 * extractable as a claim, in any report, ever. Load-bearing for the
 * files-produced-column feature: a "Files produced/changed" cell listing
 * `scripts/x.mjs`, `scripts/x.test.ts`, `scripts/x.d.mts` would silently
 * drop 2 of those 3 paths without this fix — see that backlog item's own
 * empirical verification note.
 *
 * THE NAME PART STILL MAY NOT START WITH A DOT — `[A-Za-z0-9_-]` for the
 * first character, interior dots allowed only after it. Found by the lead's
 * review, measuring the widened regex against the REAL corpus rather than
 * only against this file's existing "must never match" cases (which it
 * passed — which is how this was nearly missed). Relaxing the name part
 * wholesale to `[A-Za-z0-9_.-]+` also made BARE EXTENSION FRAGMENTS match:
 * `.test.ts`, `.d.mts`, `.spec.ts` and `.generated.json` are written in
 * prose throughout `reports/` and `BACKLOG.md` (11 occurrences when this was
 * written) to mean "files of this shape", not a path. They are not files,
 * appear in no diff, and would have failed this gate the first time one
 * landed in a block beside its own branch name — a false positive on the one
 * gate whose header spends forty lines arguing that a false positive HERE
 * teaches people to ignore report-writing gates specifically. Anchoring the
 * first character costs none of the compound-extension coverage above:
 * verified that all 50 distinct newly-extractable tokens across the real
 * corpus are genuine paths, and that every bare fragment is rejected.
 *
 * THREE EXIT CODES, same convention as `scripts/check-deps-drift.mjs` (see
 * that file's header for the fuller rationale) — this repo has a standing
 * rule that a check which cannot determine an answer must say so loudly,
 * never silently report green:
 *   0 = no violation found (includes the very common case of "this branch
 *       has no new reports/*.md file at all" — nothing to check is a real
 *       pass, not a skip).
 *   1 = a claimed path is not in this branch's diff. Named, with the
 *       report and the text it was claimed in.
 *   2 = INCONCLUSIVE — the base ref could not be resolved (this repo's
 *       cautionary tale for a designed skip path silently becoming
 *       permanent behaviour is the `SMOKE_URL` item, BACKLOG.md,
 *       2026-07-20 — this check refuses to repeat that shape), the current
 *       branch name could not be determined, or a `git` invocation failed.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

/** Grounded in `git ls-files | sed -n 's/.*\.\([A-Za-z0-9]*\)$/\1/p' | sort -u`
 * against this repo (2026-08-02), plus the obvious image/config siblings of
 * extensions already present (`.jpg`→`.jpeg`, `.svg`/`.gif`→`.webp`/`.ico`,
 * `.yml`→`.yaml`). Deliberately NOT "any 1-6 char alnum suffix" — that would
 * match version numbers, contrast ratios, and timings (see file header). */
const ALLOWED_EXTENSIONS = [
  'md',
  'ts',
  'tsx',
  'mjs',
  'mts',
  'cjs',
  'js',
  'json',
  'jsonc',
  'yml',
  'yaml',
  'css',
  'html',
  'txt',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'webp',
  'ico',
];

const PATH_TOKEN_RE = new RegExp(
  `^(?:[A-Za-z0-9_.-]+/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*\\.(?:${ALLOWED_EXTENSIONS.join('|')})$`,
  'i',
);

/** Default `gitRunner` — real `git` via `execFileSync` (array args, no
 * shell), injectable so tests never need a real git repository fixture on
 * disk. Same shape as `scripts/provenance/generate.mjs`'s `defaultGitRunner`
 * on purpose. */
function defaultGitRunner({ cwd, args }) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

class ReportClaimsGitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReportClaimsGitError';
  }
}

function runGit(gitRunner, cwd, args, context) {
  try {
    return gitRunner({ cwd, args });
  } catch (error) {
    const detail = error && typeof error.stderr === 'string' ? error.stderr.trim() : (error?.message ?? String(error));
    throw new ReportClaimsGitError(`\`git ${args.join(' ')}\` failed${context ? ` (${context})` : ''}: ${detail}`);
  }
}

/**
 * Tries each candidate ref in order, returns the first one `git rev-parse
 * --verify` accepts, or `null` if none resolve. Never throws — an
 * unresolvable ref is an expected, reportable outcome (inconclusive), not a
 * crash.
 */
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

/** Base ref candidates, in priority order. `CHECK_REPORT_CLAIMS_BASE_REF` is
 * an explicit escape hatch (local debugging / a repo layout this hasn't
 * seen). `GITHUB_BASE_REF` is set by GitHub Actions on `pull_request` events
 * to the PR's target branch NAME (not a full ref) — tried both as
 * `origin/<name>` (the normal case after `actions/checkout`) and bare
 * `<name>` (a local branch of that name). `origin/main`/`main` are the
 * fallback for local/manual runs. */
export function defaultBaseRefCandidates(env = process.env) {
  const candidates = [];
  if (env.CHECK_REPORT_CLAIMS_BASE_REF) candidates.push(env.CHECK_REPORT_CLAIMS_BASE_REF);
  if (env.GITHUB_BASE_REF) {
    candidates.push(`origin/${env.GITHUB_BASE_REF}`);
    candidates.push(env.GITHUB_BASE_REF);
  }
  candidates.push('origin/main', 'main');
  return candidates;
}

/**
 * The current branch's name — used ONLY as the self-reference string the
 * extraction anchors on (see file header). `GITHUB_HEAD_REF` (set by GitHub
 * Actions on `pull_request` events) is checked first because
 * `actions/checkout`'s default behaviour for that event leaves the
 * checkout in DETACHED HEAD at the PR's merge commit — `git rev-parse
 * --abbrev-ref HEAD` would return the literal string `"HEAD"`, not the
 * branch name, in exactly the CI context this check most needs to work in.
 * Returns `null` (never `""`) when unknown — an empty string would make
 * every text block match via `.includes('')`, silently turning the whole
 * report into a claim about itself, which is worse than refusing to run.
 */
export function resolveBranchName(gitRunner, repoRoot, headRef, env = process.env) {
  if (env.GITHUB_HEAD_REF && env.GITHUB_HEAD_REF.trim() !== '') {
    return env.GITHUB_HEAD_REF.trim();
  }
  let output;
  try {
    output = runGit(gitRunner, repoRoot, ['rev-parse', '--abbrev-ref', headRef], 'resolving current branch name').trim();
  } catch {
    return null;
  }
  if (!output || output === 'HEAD') return null;
  return output;
}

/** `git diff --name-status <baseRef>...<headRef>`, parsed into `{status,
 * path}` entries. Rename/copy statuses (`R100`, `C75`, ...) carry TWO paths
 * (old, new) — only the new path is kept, since that's the one that exists
 * on this branch. Status is reduced to its first letter (`R100` -> `R`). */
export function getDiffEntries(gitRunner, repoRoot, baseRef, headRef) {
  const output = runGit(gitRunner, repoRoot, ['diff', '--name-status', `${baseRef}...${headRef}`], `diffing ${baseRef}...${headRef}`);
  return output
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const parts = line.split('\t');
      const status = parts[0][0];
      const filePath = parts[parts.length - 1];
      return { status, path: filePath };
    });
}

const REPORT_FILE_RE = /^reports\/[^/]+\.md$/;

/** Strips every ```` ``` ````-fenced block (see file header for why). */
function stripFencedCodeBlocks(text) {
  return text.replace(/^```.*$[\s\S]*?^```\s*$/gm, '');
}

/**
 * Splits stripped report text into scan units: each markdown table row
 * (`| ... |`) is its own unit; each list item (`- `, `* `, `+ `, `1. `,
 * possibly wrapped onto indented continuation lines) is its own unit; runs
 * of consecutive non-table, non-list-start, non-blank lines are joined into
 * one prose-paragraph unit. This is what makes the "same text block as the
 * branch self-reference" rule concrete — see file header.
 *
 * The list-item case is load-bearing, not cosmetic: this repo's reports
 * routinely put multiple UNRELATED bullets back-to-back with no blank line
 * between them (e.g. `reports/maintenance-2026-07-20.md`'s "Sweep notes"
 * list — one bullet names this run's own branch, a LATER, different bullet
 * in the same list cites an unrelated `mensapp.md`/`BuildTimeline.tsx:293`
 * pair). Without a per-list-item boundary, blank-line-only splitting would
 * merge the whole list into one block and misread the unrelated bullet's
 * path as a claim about the branch named three bullets earlier — caught by
 * this file's own regression test against that exact report.
 */
function splitIntoScanBlocks(text) {
  const blocks = [];
  let buffer = [];
  const flush = () => {
    if (buffer.length > 0) {
      blocks.push(buffer.join('\n'));
      buffer = [];
    }
  };
  for (const line of text.split('\n')) {
    const isTableRow = /^\s*\|/.test(line);
    const isListItemStart = /^\s*(?:[-*+]|\d+\.)\s+/.test(line);
    if (isTableRow) {
      flush();
      blocks.push(line);
      continue;
    }
    if (line.trim() === '') {
      flush();
      continue;
    }
    if (isListItemStart) {
      flush();
      buffer.push(line);
      continue;
    }
    buffer.push(line);
  }
  flush();
  return blocks;
}

/**
 * Pulls path-looking tokens out of a block of text. Tokenizes on
 * whitespace, trims surrounding markdown/prose punctuation (backticks,
 * quotes, brackets, sentence-ending punctuation) and a trailing `:LINE` or
 * `:START-END` locator (e.g. `profile.ts:57-64`, a citation style this
 * repo's reports use constantly) from each token, then requires the
 * remainder to match `PATH_TOKEN_RE` (a repo-relative-looking path ending
 * in a real extension — see `ALLOWED_EXTENSIONS`).
 */
export function extractPathCandidatesFromText(text) {
  const found = [];
  for (const rawToken of text.split(/\s+/)) {
    let token = rawToken;
    token = token.replace(/^[`'"([{]+/, '');
    // Trailing punctuation, THEN the `:LINE`/`:START-END` locator suffix,
    // THEN trailing punctuation again — in that order, because the locator
    // sits BEFORE any closing backtick/paren/sentence punctuation (e.g.
    // "`profile.ts:57-64`," -> strip trailing "`," -> strip ":57-64" ->
    // strip nothing more -> "profile.ts"). Stripping the locator first (the
    // original bug here, caught by this file's own test) would silently
    // leave the trailing backtick/comma in place and never match.
    token = token.replace(/[`'"),.\]}:;!?]+$/, '');
    token = token.replace(/:\d[\d-]*$/, '');
    token = token.replace(/[`'"),.\]}:;!?]+$/, '');
    if (token === '') continue;
    if (token.includes('..')) continue; // never a legitimate repo-relative claim
    if (path.posix.isAbsolute(token)) continue;
    if (PATH_TOKEN_RE.test(token)) found.push(token);
  }
  return found;
}

/**
 * The core extraction: for each scan block (see `splitIntoScanBlocks`) that
 * contains the literal `branchName` string, collect every path-like token in
 * that block. Returns a `Map<claimedPath, string[]>` (path -> the block
 * text(s) it was found in, for error messages) — never a plain array, so a
 * path claimed in two different self-referencing blocks is reported once
 * with both citations rather than duplicated.
 */
export function extractClaims(reportContent, branchName) {
  const claims = new Map();
  if (!branchName) return claims;
  const stripped = stripFencedCodeBlocks(reportContent);
  for (const block of splitIntoScanBlocks(stripped)) {
    if (!block.includes(branchName)) continue;
    for (const candidate of extractPathCandidatesFromText(block)) {
      const excerpt = block.trim();
      if (!claims.has(candidate)) claims.set(candidate, []);
      const excerpts = claims.get(candidate);
      if (!excerpts.includes(excerpt)) excerpts.push(excerpt);
    }
  }
  return claims;
}

/**
 * Core check, exported so `check-report-claims.test.ts` can inject a fake
 * `gitRunner` (no real git repo needed — same pattern as
 * `scripts/provenance/generate.test.ts`) and point `repoRoot`/`reportsDir`
 * at throwaway fixture directories (same pattern as
 * `scripts/check-deps-drift.test.ts`) instead of touching the real,
 * shared, worktree-symlinked checkout.
 *
 * @param {object} [options]
 * @param {string} [options.repoRoot]
 * @param {string} [options.reportsDir]
 * @param {string[]} [options.baseRefCandidates]
 * @param {string} [options.headRef]
 * @param {string} [options.branchName] override — skips `resolveBranchName`
 *   entirely when supplied (tests only; the CLI always resolves for real).
 * @param {(args: {cwd: string, args: string[]}) => string} [options.gitRunner]
 * @param {NodeJS.ProcessEnv} [options.env]
 */
export function checkReportClaims({
  repoRoot = DEFAULT_REPO_ROOT,
  reportsDir,
  baseRefCandidates,
  headRef = 'HEAD',
  branchName,
  gitRunner = defaultGitRunner,
  env = process.env,
} = {}) {
  const resolvedReportsDir = reportsDir ?? path.join(repoRoot, 'reports');
  const candidates = baseRefCandidates ?? defaultBaseRefCandidates(env);

  const baseRef = resolveBaseRef(gitRunner, repoRoot, candidates);
  if (!baseRef) {
    return {
      status: 'inconclusive',
      reason:
        `could not resolve a base ref to diff against — tried: ${candidates.filter(Boolean).join(', ') || '(no candidates)'}. ` +
        'This usually means the checkout is shallow/missing history for `main`, or ran outside CI\'s pull_request context ' +
        'without `main`/`origin/main` available locally.',
      baseRef: null,
      branchName: null,
      checkedReports: [],
      violations: [],
    };
  }

  const resolvedBranchName = branchName ?? resolveBranchName(gitRunner, repoRoot, headRef, env);
  if (!resolvedBranchName) {
    return {
      status: 'inconclusive',
      reason:
        'could not determine the current branch name (checked `GITHUB_HEAD_REF`, then `git rev-parse --abbrev-ref HEAD`, ' +
        'which returned a detached-HEAD state). Without it this check cannot tell a self-reference to this branch from a ' +
        'citation of any other branch, and refuses to guess.',
      baseRef,
      branchName: null,
      checkedReports: [],
      violations: [],
    };
  }

  let diffEntries;
  try {
    diffEntries = getDiffEntries(gitRunner, repoRoot, baseRef, headRef);
  } catch (error) {
    return {
      status: 'inconclusive',
      reason: error instanceof Error ? error.message : String(error),
      baseRef,
      branchName: resolvedBranchName,
      checkedReports: [],
      violations: [],
    };
  }

  const diffPaths = new Set(diffEntries.map((entry) => entry.path));
  const newReportFiles = diffEntries.filter((entry) => entry.status === 'A' && REPORT_FILE_RE.test(entry.path)).map((entry) => entry.path);

  if (newReportFiles.length === 0) {
    return { status: 'clean', baseRef, branchName: resolvedBranchName, checkedReports: [], violations: [] };
  }

  const checkedReports = [];
  const violations = [];

  for (const reportPath of newReportFiles) {
    const absolutePath = path.join(resolvedReportsDir, path.basename(reportPath));
    if (!existsSync(absolutePath)) {
      return {
        status: 'inconclusive',
        reason: `"${reportPath}" is a newly-added file per \`git diff\` but does not exist on disk at "${absolutePath}" — cannot read its claims.`,
        baseRef,
        branchName: resolvedBranchName,
        checkedReports,
        violations: [],
      };
    }

    const content = readFileSync(absolutePath, 'utf8');
    const claims = extractClaims(content, resolvedBranchName);
    checkedReports.push({ report: reportPath, claimedPaths: [...claims.keys()] });

    for (const [claimedPath, excerpts] of claims) {
      if (!diffPaths.has(claimedPath)) {
        violations.push({ report: reportPath, claimedPath, excerpts });
      }
    }
  }

  const status = violations.length > 0 ? 'violation' : 'clean';
  return { status, baseRef, branchName: resolvedBranchName, checkedReports, violations };
}

function printReport(result) {
  if (result.status === 'inconclusive') {
    console.error(`[check-report-claims] INCONCLUSIVE — ${result.reason}`);
    console.error('[check-report-claims] This check could not determine anything and is refusing to report a false pass.');
    return;
  }

  if (result.status === 'clean') {
    if (result.checkedReports.length === 0) {
      console.log('[check-report-claims] OK — no new reports/*.md on this branch; nothing to check.');
    } else {
      const claimCount = result.checkedReports.reduce((sum, r) => sum + r.claimedPaths.length, 0);
      console.log(
        `[check-report-claims] OK — checked ${result.checkedReports.length} new report(s) against ` +
          `\`git diff --name-only ${result.baseRef}...${result.branchName}\`, ${claimCount} self-referential path claim(s), 0 violations.`,
      );
    }
    return;
  }

  console.error('[check-report-claims] VIOLATION — a new report claims a path its own branch does not touch:');
  for (const v of result.violations) {
    console.error(`  - ${v.report} claims "${v.claimedPath}", which is not in \`git diff --name-only ${result.baseRef}...${result.branchName}\``);
    for (const excerpt of v.excerpts) {
      console.error(`      near: ${excerpt.replace(/\n/g, ' ').slice(0, 200)}`);
    }
  }
  console.error('');
  console.error('  Fix: either the report is wrong about what this branch touched (correct the prose/table), or the');
  console.error('  intended file change is genuinely missing from this branch (add it, or commit it).');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const result = checkReportClaims();
  printReport(result);
  if (result.status === 'inconclusive') {
    process.exitCode = 2;
  } else if (result.status === 'violation') {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}
