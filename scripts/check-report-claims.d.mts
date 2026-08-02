/**
 * Hand-written ambient declarations for `check-report-claims.mjs` — see
 * `scripts/check-deps-drift.d.mts`'s header comment for why this file
 * exists and why it's `.d.mts` (matching TypeScript's `Bundler` resolution
 * for a `.mjs` module's sibling declaration) rather than `allowJs`-based
 * JSDoc inference across the whole implementation file.
 */

export type GitRunnerArgs = { cwd: string; args: string[] };
export type GitRunner = (call: GitRunnerArgs) => string;

export interface DiffEntry {
  status: string;
  path: string;
}

export interface CheckedReport {
  report: string;
  claimedPaths: string[];
}

export interface ReportClaimViolation {
  report: string;
  claimedPath: string;
  excerpts: string[];
}

export interface CheckReportClaimsResult {
  status: 'clean' | 'violation' | 'inconclusive';
  reason?: string;
  baseRef: string | null;
  branchName: string | null;
  checkedReports: CheckedReport[];
  violations: ReportClaimViolation[];
}

export interface CheckReportClaimsOptions {
  repoRoot?: string;
  reportsDir?: string;
  baseRefCandidates?: string[];
  headRef?: string;
  branchName?: string;
  gitRunner?: GitRunner;
  env?: NodeJS.ProcessEnv;
}

export function resolveBaseRef(gitRunner: GitRunner, repoRoot: string, candidates: string[]): string | null;
export function defaultBaseRefCandidates(env?: NodeJS.ProcessEnv): string[];
export function resolveBranchName(gitRunner: GitRunner, repoRoot: string, headRef: string, env?: NodeJS.ProcessEnv): string | null;
export function getDiffEntries(gitRunner: GitRunner, repoRoot: string, baseRef: string, headRef: string): DiffEntry[];
export function extractPathCandidatesFromText(text: string): string[];
export function extractClaims(reportContent: string, branchName: string | null | undefined): Map<string, string[]>;
export function checkReportClaims(options?: CheckReportClaimsOptions): CheckReportClaimsResult;
