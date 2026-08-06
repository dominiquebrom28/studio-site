#!/usr/bin/env node
/**
 * Does every branch a MERGED run report says shipped actually get checked
 * off (`- [x]`) somewhere in `BACKLOG.md`?
 *
 * Exists because of a real incident (BACKLOG.md MEDIUM, 2026-08-05, "Nothing
 * checks that a run's shipped lanes get checked off in BACKLOG.md, and it
 * just failed for the fifth time"): PR #100 (2026-08-04) added five new
 * backlog items and closed one, but never checked off the three lanes that
 * same run shipped — PRs #97, #98 and #99 all merged, and `BACKLOG.md` on
 * `main` contained **zero** references to any `team/2026-08-04-*` branch
 * until the 2026-08-05 run healed it by hand. This is a DISTINCT mechanism
 * from BACKLOG.md's other four recorded misreporting incidents (DOM-1/DOM-5
 * stale-after-shipping, PR #81 a merge silently dropping work, PR #87 a
 * phantom duplicate heading): the check-off text was simply never written,
 * while new items in the very same commit were. Every other artifact this
 * repo produces is gated (content is Zod-validated, a report's own path
 * claims are checked by `check-report-claims.mjs`, `runs.generated.json`
 * drift is checked) — the backlog's record of its OWN state was the one
 * thing nothing verified.
 *
 * THE RULE, PRECISELY: for every "Items worked on"-shaped table row across
 * `reports/*.md` whose branch has at least one MERGED pull request (per
 * `gh pr list`, not per the report's own prose — see "WHY `gh`, NOT THE
 * REPORT'S OWN PR TEXT" below), that branch's exact string must appear
 * SOMEWHERE inside a `BACKLOG.md` bullet whose checkbox is `[x]`. Note the
 * word MERGED: a branch with no PR yet, or an OPEN/CLOSED-unmerged one,
 * describes work still in review (or abandoned) and must NEVER fire — a
 * report written the moment a branch is pushed, before its PR even exists,
 * is completely normal, and gating on it would be a gate born failing on
 * every single run (the standing rule this repo enforces after BACKLOG.md's
 * own `SMOKE_URL` and non-required-content-gate lessons: "a budget/gate born
 * failing gets disabled").
 *
 * SCOPE — WHICH TABLE ROWS COUNT AS A CLAIM (read this before touching the
 * regexes below). Only a table whose HEADER ROW contains a column starting
 * with "branch" (case-insensitive; matches "Branch" and "Branch / target")
 * **and** a column literally "PR" (case-insensitive) is scanned. Both are
 * required, deliberately:
 *   - A "branch"-only column with no "PR" column shows up in this repo's
 *     real corpus for RETROSPECTIVE/DIAGNOSTIC tables, not shipped-lane
 *     ledgers — `reports/2026-07-31.md` and `reports/2026-08-03.md` both use
 *     a `| Work | Branch / target |` table under their own "Item worked on"
 *     heading to record what was INVESTIGATED that run, explicitly including
 *     rows like `` `team/2026-07-29-asset-path-gate` (existing PR, no new
 *     PR) `` — a citation of a PRIOR day's already-settled work, not a new
 *     lane this run is claiming credit for. Scanning that table would flag
 *     an already-closed branch from a different day as "never checked off"
 *     for a reason that has nothing to do with this incident's mechanism.
 *     Requiring a "PR" column is structural (a table's shape, not its
 *     prose): a row that never claims to carry a reviewable PR of its own
 *     is not claiming to be a shippable, closable lane in the first place.
 *   - Every real "Items worked on" table in the current corpus that DOES use
 *     the `Item | Branch | PR` shape (2026-08-01 through 2026-08-05, 7 tables
 *     total) satisfies both columns; this scoping does not lose any of the
 *     incident's own evidence (PRs #97/#98/#99 are all `Item | Branch | PR`
 *     rows). Older single-item reports (`reports/2026-07-15.md`,
 *     `reports/2026-07-17.md`, …) use prose ("Branch: `team/…`") with no
 *     table at all and are out of scope for the same reason
 *     `check-report-claims.mjs` does not try to parse prose narratively —
 *     see this file's own falsification suite for what that costs, measured,
 *     not assumed.
 *
 * WHY `gh`, NOT THE REPORT'S OWN "PR" CELL TEXT — a report's PR column is
 * itself unverified prose (the exact class of self-claim
 * `check-report-claims.mjs` exists because this repo has been burned by
 * trusting). This check never parses a PR number out of that cell; it asks
 * GitHub directly, by BRANCH NAME, via `gh pr list --state all`, the same
 * mechanism and the same `fetchPullRequests`/`groupPrsByHeadRef` shape as
 * `scripts/check-stranded-branches.mjs` (duplicated rather than imported —
 * every check script in this repo is self-contained, see that file's own
 * precedent).
 *
 * THE SELF-REPORTING ROW EXCLUSION — every report's OWN filing/bookkeeping
 * branch (the one that adds the report and closes/adds backlog items) is
 * excluded from the "must be checked off" rule, on two independent
 * structural signals (either is sufficient):
 *   (a) the row's PR cell is literally "this PR" (case-insensitive) — the
 *       convention this repo has used since 2026-08-01 for exactly this row
 *       (`reports/2026-08-01.md`, `2026-08-02.md`, `2026-08-04.md`,
 *       `2026-08-05.md` all use it);
 *   (b) the branch name ends in `-backlog-and-report` — checked against
 *       EVERY branch name in the real corpus (23 reports, 2026-07-15 through
 *       2026-08-05): every single report's own filing branch matches this
 *       suffix, with zero exceptions, and it is the only place the suffix is
 *       ever used. This is what catches the two reports that predate
 *       convention (a) — `reports/2026-07-18.md` and `reports/2026-07-31.md`
 *       — whose bookkeeping rows have no "this PR" text at all.
 * A bookkeeping branch never gets its own backlog checkbox anywhere in this
 * repo's real history (verified: `grep -n "backlog-and-report" BACKLOG.md`
 * finds it only inside OTHER items' explanatory prose, never as the subject
 * of a checked bullet) — it is not a "lane" that closes a tracked item, it
 * IS the mechanism that closes other items, so requiring it to close itself
 * would be structurally wrong, not merely uncovered.
 *
 * TWO DISTINCT OUTCOMES FOR A "MISSING" BRANCH, both reported, only ONE of
 * which fails the check — found by running this exact rule against the real
 * corpus, not assumed up front:
 *   - `unreferenced` — the branch string appears NOWHERE in `BACKLOG.md`.
 *     This is the incident's own shape, precisely: PRs #97/#98/#99 were
 *     zero-reference for a day. FAILS the check.
 *   - `referencedButOpen` — the branch string DOES appear in `BACKLOG.md`,
 *     but only inside a bullet whose checkbox is still `[ ]`. Found for real
 *     on the current corpus: `team/2026-08-04-runs-api` (PR #98, merged) is
 *     cited by name inside the still-open "Runs API" backlog item, which
 *     legitimately stays `[ ]` because it is a multi-PR epic (`docs/
 *     reports-surface.md` §6 PR 2 of several) — PR #98 shipped one PR of a
 *     larger item, and the item is honestly not done. A script cannot tell
 *     "an open multi-PR epic honestly citing a shipped sub-PR" apart from
 *     "someone forgot to check the box" from text alone — that is exactly
 *     the kind of prose-grading judgment `check-report-claims.mjs`'s own
 *     header argues a structural gate must not attempt. So this shape is
 *     surfaced (loudly, every run) but never fails the check on its own —
 *     turning it into a hard failure would make this gate permanently red on
 *     any repo that runs multi-PR epics, which this one does routinely (§6,
 *     §12, the provenance-model PRs 0-4).
 *
 * FALSIFIED AGAINST THE REAL CORPUS, NOT ASSUMED CLEAN — and it found a real,
 * live, unresolved gap on its very first run: `team/2026-08-04-undici-
 * advisories` (PR #101, merged, an unplanned same-day dependency-security
 * fix) was `unreferenced` on `main` — never got a branch-name citation
 * anywhere in `BACKLOG.md`, the exact incident shape. Per this task's own
 * standing rule ("report exactly which lanes are unchecked-off rather than
 * loosening the rule to hide them" — see BACKLOG.md's PR #73 precedent),
 * this was NOT special-cased away in the CHECK. It WAS fixed in the data:
 * this same branch's `BACKLOG.md` edit adds the missing `[x]` (see
 * "Added 2026-08-06" there), so the corpus this check ships alongside is
 * genuinely clean, not just declared clean — `check-backlog-checkoffs.test.ts`
 * reproduces both the pre-fix red result (as a synthetic fixture, isolated
 * from any BACKLOG.md edit) and the real post-fix green one. Because a
 * gate's FIRST real run finding a violation is exactly the "born failing"
 * shape this repo's standing rule warns about, this script is wired into CI
 * as a REPORTING step, not a required one, regardless — see `.github/
 * workflows/ci.yml`'s comment on the job this runs in, and
 * `scripts/check-stranded-branches.mjs`'s own header for the identical
 * "a check with no track record yet must not be wired required" reasoning.
 *
 * FETCH-DEPTH — DELIBERATELY NOT NEEDED. Unlike `check-report-claims.mjs` /
 * `check-merge-revert.mjs`, this check does no `git log`/`git diff` at all:
 * it reads `reports/*.md` and `BACKLOG.md` as plain files from whatever is
 * currently checked out (a shallow clone's WORKING TREE is complete — only
 * its history is truncated), and asks GitHub, not local git history, which
 * branches merged. So `.github/workflows/ci.yml`'s `fetch-depth: 0` on the
 * `build` job is irrelevant to this script's correctness; verified by
 * inspection of every git call this file makes (there are none — only
 * `readFileSync`/`readdirSync` and `gh`).
 *
 * THREE EXIT CODES, same convention as this repo's other check scripts — a
 * check that cannot determine an answer must say so loudly, never silently
 * report green:
 *   0 = clean — no `unreferenced` branch found (there may still be
 *       `referencedButOpen` findings; see above for why those don't fail).
 *   1 = VIOLATION — at least one merged branch is cited nowhere in
 *       `BACKLOG.md`. Named, with the report and item it came from.
 *   2 = INCONCLUSIVE — `gh` is missing, unauthenticated, or errored (this
 *       check's whole "was this branch's PR actually merged" answer can only
 *       come from `gh` — see `check-stranded-branches.mjs`'s identical
 *       reasoning), `BACKLOG.md` could not be read, or the reports directory
 *       does not exist at all (an empty reports directory is a legitimate
 *       clean 0-scanned outcome; a MISSING one is a configuration error this
 *       check refuses to read as "nothing to check").
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

/** Default `ghRunner` — real `gh` CLI, same injectable shape as
 * `scripts/check-stranded-branches.mjs`'s `defaultGhRunner`. `gh` auto-
 * detects the repo from `cwd`'s git remotes. */
function defaultGhRunner({ cwd, args }) {
  return execFileSync('gh', args, { cwd, encoding: 'utf8' });
}

class BacklogCheckoffsGhError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BacklogCheckoffsGhError';
  }
}

/** One `gh pr list --state all --json ...` call fetches every PR ever
 * opened against this repo — same shape, same defensive `--limit` ceiling,
 * as `scripts/check-stranded-branches.mjs`'s `fetchPullRequests` (duplicated
 * on purpose, not imported — see that file's header). Only the fields this
 * check actually uses are kept. */
const PR_FETCH_LIMIT = 2000;
const PR_JSON_FIELDS = 'number,state,headRefName,url,title';

export function fetchPullRequests(ghRunner, cwd, { limit = PR_FETCH_LIMIT } = {}) {
  let raw;
  try {
    raw = ghRunner({ cwd, args: ['pr', 'list', '--state', 'all', '--limit', String(limit), '--json', PR_JSON_FIELDS] });
  } catch (error) {
    const code = error && error.code;
    if (code === 'ENOENT') {
      throw new BacklogCheckoffsGhError('the `gh` CLI is not installed / not on PATH — cannot determine which branches have a merged pull request.');
    }
    const detail = error && typeof error.stderr === 'string' && error.stderr.trim() !== '' ? error.stderr.trim() : (error?.message ?? String(error));
    throw new BacklogCheckoffsGhError(`\`gh pr list\` failed: ${detail}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new BacklogCheckoffsGhError(`\`gh pr list\` returned output this check could not parse as JSON: ${error.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new BacklogCheckoffsGhError('`gh pr list --json ...` did not return a JSON array as expected.');
  }

  return parsed.map((pr) => ({ number: pr.number, state: pr.state, headRefName: pr.headRefName, url: pr.url, title: pr.title }));
}

/** Groups PRs by `headRefName` — a branch can have more than one PR across
 * its history. Same shape as `check-stranded-branches.mjs`'s
 * `groupPrsByHeadRef`. */
export function groupPrsByHeadRef(prs) {
  const map = new Map();
  for (const pr of prs) {
    if (!map.has(pr.headRefName)) map.set(pr.headRefName, []);
    map.get(pr.headRefName).push(pr);
  }
  return map;
}

/** True iff at least one PR for this branch name ever reached `MERGED`. */
export function hasMergedPr(prsForBranch) {
  return prsForBranch.some((pr) => pr.state === 'MERGED');
}

/** Strips every ```` ``` ````-fenced block before any scanning — same
 * mechanism and rationale as `check-report-claims.mjs`'s
 * `stripFencedCodeBlocks` (a `yaml provenance` block's own `branch:`/
 * `produced:` lines are gated elsewhere and must never be misread as an
 * "Items worked on" table row). Duplicated, not imported — self-contained
 * scripts, see this file's header. */
function stripFencedCodeBlocks(text) {
  return text.replace(/^```.*$[\s\S]*?^```\s*$/gm, '');
}

const BRANCH_TOKEN_RE = /`((?:team|claude)\/[^`\s]+)`/;

function splitTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((cell) => cell.trim());
}

const SEPARATOR_CELL_RE = /^:?-+:?$/;

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => SEPARATOR_CELL_RE.test(cell));
}

/**
 * Pulls `{item, branch, prCell}` rows out of every table in a (fence-
 * stripped) report whose HEADER contains a "branch"-prefixed column AND a
 * literal "PR" column — see file header, "SCOPE", for why both are
 * required. A row whose branch cell has no backtick-quoted `team/…`/
 * `claude/…` token is skipped (nothing to extract, never guessed at).
 */
export function extractItemRows(reportContent) {
  const stripped = stripFencedCodeBlocks(reportContent);
  const lines = stripped.split('\n');
  const rows = [];

  let block = [];
  const flush = () => {
    if (block.length >= 2 && isSeparatorRow(splitTableRow(block[1]))) {
      const headerCells = splitTableRow(block[0]).map((c) => c.toLowerCase());
      const branchIdx = headerCells.findIndex((c) => c.startsWith('branch'));
      const prIdx = headerCells.findIndex((c) => c === 'pr');
      const itemIdx = headerCells.findIndex((c) => c === 'item');
      if (branchIdx !== -1 && prIdx !== -1) {
        for (const rowLine of block.slice(2)) {
          const cells = splitTableRow(rowLine);
          const branchCell = cells[branchIdx] ?? '';
          const m = BRANCH_TOKEN_RE.exec(branchCell);
          if (!m) continue;
          rows.push({
            item: itemIdx !== -1 ? (cells[itemIdx] ?? '') : '',
            branch: m[1],
            prCell: cells[prIdx] ?? '',
          });
        }
      }
    }
    block = [];
  };

  for (const line of lines) {
    if (/^\s*\|/.test(line)) {
      block.push(line);
    } else {
      flush();
    }
  }
  flush();

  return rows;
}

/** True for a report's own filing/bookkeeping row — see file header, "THE
 * SELF-REPORTING ROW EXCLUSION", for both signals and why either is
 * sufficient. */
export function isSelfReportingRow({ branch, prCell }) {
  return /this pr/i.test(prCell) || /-backlog-and-report$/.test(branch);
}

/**
 * Splits `BACKLOG.md` into per-bullet blocks: a new block starts at any
 * top-level `- [ ]` / `- [x]` line and runs (including every indented
 * continuation line, e.g. the italic `_(2026-…, team/…, PR #… — …)_` notes
 * this repo appends under a bullet) until the next such line or the next
 * heading (`#…`). Verified against the real file: 91 top-level bullets,
 * matching `grep -c '^- \['` exactly, with zero indented/nested checkbox
 * bullets found anywhere in the corpus.
 */
export function parseBacklogBlocks(backlogContent) {
  const blocks = [];
  let current = null;
  const flush = () => {
    if (current) blocks.push({ checked: current.checked, text: current.lines.join('\n') });
    current = null;
  };
  for (const line of backlogContent.split('\n')) {
    const m = /^- \[( |x)\]/.exec(line);
    if (m) {
      flush();
      current = { checked: m[1] === 'x', lines: [line] };
      continue;
    }
    if (/^#/.test(line)) {
      flush();
      continue;
    }
    if (current) current.lines.push(line);
  }
  flush();
  return blocks;
}

/**
 * Classifies one branch against the parsed `BACKLOG.md` blocks:
 *   - `'checked'` — cited inside at least one `[x]` block. Clean.
 *   - `'referencedButOpen'` — cited, but only inside `[ ]` block(s). Surfaced,
 *     never a hard failure — see file header.
 *   - `'unreferenced'` — cited nowhere at all. The incident's own shape;
 *     fails the check.
 */
export function classifyBranchAgainstBacklog(branch, blocks) {
  let seenUnchecked = false;
  for (const block of blocks) {
    if (!block.text.includes(branch)) continue;
    if (block.checked) return 'checked';
    seenUnchecked = true;
  }
  return seenUnchecked ? 'referencedButOpen' : 'unreferenced';
}

function listReportFiles(reportsDir) {
  return readdirSync(reportsDir)
    .filter((name) => name.endsWith('.md'))
    .sort();
}

/**
 * Core check, exported so `check-backlog-checkoffs.test.ts` can inject a
 * fake `ghRunner` and point `reportsDir`/`backlogPath` at throwaway fixture
 * files — same pattern as every sibling check in this directory.
 *
 * @param {object} [options]
 * @param {string} [options.repoRoot]
 * @param {string} [options.reportsDir]
 * @param {string} [options.backlogPath]
 * @param {(args: {cwd: string, args: string[]}) => string} [options.ghRunner]
 * @param {{limit?: number}} [options.fetchOptions]
 */
export function checkBacklogCheckoffs({
  repoRoot = DEFAULT_REPO_ROOT,
  reportsDir,
  backlogPath,
  ghRunner = defaultGhRunner,
  fetchOptions,
} = {}) {
  const resolvedReportsDir = reportsDir ?? path.join(repoRoot, 'reports');
  const resolvedBacklogPath = backlogPath ?? path.join(repoRoot, 'BACKLOG.md');

  if (!existsSync(resolvedReportsDir)) {
    return inconclusive(`reports directory "${resolvedReportsDir}" does not exist — refusing to read a missing path as "nothing to check".`);
  }

  let backlogContent;
  try {
    backlogContent = readFileSync(resolvedBacklogPath, 'utf8');
  } catch (error) {
    return inconclusive(`could not read "${resolvedBacklogPath}": ${error instanceof Error ? error.message : String(error)}`);
  }
  const blocks = parseBacklogBlocks(backlogContent);

  let prs;
  try {
    prs = fetchPullRequests(ghRunner, repoRoot, fetchOptions);
  } catch (error) {
    return inconclusive(error instanceof Error ? error.message : String(error));
  }
  const prsByHeadRef = groupPrsByHeadRef(prs);

  const reportFiles = listReportFiles(resolvedReportsDir);
  const unreferenced = [];
  const referencedButOpen = [];
  let totalItemRowsScanned = 0;

  for (const reportFile of reportFiles) {
    const content = readFileSync(path.join(resolvedReportsDir, reportFile), 'utf8');
    const rows = extractItemRows(content);
    for (const row of rows) {
      if (isSelfReportingRow(row)) continue;
      totalItemRowsScanned += 1;
      const prsForBranch = prsByHeadRef.get(row.branch) ?? [];
      if (!hasMergedPr(prsForBranch)) continue; // not merged — must never fire, see file header

      const classification = classifyBranchAgainstBacklog(row.branch, blocks);
      const finding = { report: `reports/${reportFile}`, item: row.item, branch: row.branch, prCell: row.prCell };
      if (classification === 'unreferenced') unreferenced.push(finding);
      else if (classification === 'referencedButOpen') referencedButOpen.push(finding);
    }
  }

  const status = unreferenced.length > 0 ? 'violation' : 'clean';
  return {
    status,
    totalReportsScanned: reportFiles.length,
    totalItemRowsScanned,
    totalPrsFetched: prs.length,
    unreferenced,
    referencedButOpen,
  };
}

function inconclusive(reason) {
  return {
    status: 'inconclusive',
    reason,
    totalReportsScanned: 0,
    totalItemRowsScanned: 0,
    totalPrsFetched: 0,
    unreferenced: [],
    referencedButOpen: [],
  };
}

function formatFinding(f) {
  const label = f.item ? `${f.item} — ` : '';
  return `  - ${label}\`${f.branch}\` (${f.report}, PR cell: ${f.prCell || '(empty)'})`;
}

function printReport(result) {
  if (result.status === 'inconclusive') {
    console.error(`[check-backlog-checkoffs] INCONCLUSIVE — ${result.reason}`);
    console.error('[check-backlog-checkoffs] This check could not determine anything and is refusing to report a false pass.');
    return;
  }

  if (result.status === 'clean') {
    console.log(
      `[check-backlog-checkoffs] OK — scanned ${result.totalReportsScanned} report(s), ${result.totalItemRowsScanned} item row(s), ` +
        `${result.totalPrsFetched} pull request(s); 0 merged branch(es) unreferenced in BACKLOG.md.`,
    );
  } else {
    console.error(
      `[check-backlog-checkoffs] VIOLATION — ${result.unreferenced.length} merged branch(es) never referenced in BACKLOG.md ` +
        `(scanned ${result.totalReportsScanned} report(s), ${result.totalItemRowsScanned} item row(s), ${result.totalPrsFetched} pull request(s)):`,
    );
    for (const f of result.unreferenced) console.error(formatFinding(f));
    console.error('');
    console.error('  Fix: add a `[x]`-checked reference to each branch above under the backlog item its work closes (or a new item, if none exists).');
  }

  if (result.referencedButOpen.length > 0) {
    console.log('');
    console.log(
      `[check-backlog-checkoffs] NOTE — ${result.referencedButOpen.length} merged branch(es) are cited in BACKLOG.md but only inside ` +
        'a still-open `[ ]` item (often a legitimate multi-PR epic — never auto-failed, see this file\'s header):',
    );
    for (const f of result.referencedButOpen) console.log(formatFinding(f));
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const result = checkBacklogCheckoffs();
  printReport(result);
  if (result.status === 'inconclusive') {
    process.exitCode = 2;
  } else if (result.status === 'violation') {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}
