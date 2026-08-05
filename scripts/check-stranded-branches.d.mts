/**
 * Hand-written ambient declarations for `check-stranded-branches.mjs` — see
 * `scripts/check-deps-drift.d.mts`'s header comment for why this file
 * exists and why it's `.d.mts` (matching TypeScript's `Bundler` resolution
 * for a `.mjs` module's sibling declaration) rather than `allowJs`-based
 * JSDoc inference across the whole implementation file.
 */

export type GitRunnerArgs = { cwd: string; args: string[] };
export type GitRunner = (call: GitRunnerArgs) => string;
export type GhRunnerArgs = { cwd: string; args: string[] };
export type GhRunner = (call: GhRunnerArgs) => string;

export type PullRequestState = 'OPEN' | 'CLOSED' | 'MERGED';

export interface PullRequestRecord {
  number: number;
  state: PullRequestState;
  url: string;
  headRefName: string;
  headRefOid: string | null;
  mergeCommitOid: string | null;
  title: string;
}

export interface PullRequestSummary {
  number: number;
  state: PullRequestState;
  url: string;
}

export interface CandidateBranch {
  name: string;
  sha: string;
  committerDate: string;
}

export interface StrandedBranchFinding {
  branch: string;
  sha: string;
  lastCommitDate: string;
  ageDays: number | null;
  commitsAhead: number | null;
  fileCount: number;
  filesTouched: string[];
  pullRequests: PullRequestSummary[];
}

export type BranchClassification = 'merged' | 'covered' | 'strandedNoPr' | 'strandedStalePr';

export interface CheckStrandedBranchesResult {
  status: 'clean' | 'found' | 'inconclusive';
  reason?: string;
  baseRef: string | null;
  strandedNoPr: StrandedBranchFinding[];
  strandedStalePr: StrandedBranchFinding[];
  totalBranchesScanned: number;
  totalPrsFetched: number;
}

export interface CheckStrandedBranchesOptions {
  repoRoot?: string;
  remoteName?: string;
  baseRefCandidates?: string[];
  now?: number;
  gitRunner?: GitRunner;
  ghRunner?: GhRunner;
  env?: NodeJS.ProcessEnv;
}

export function isAncestor(gitRunner: GitRunner, cwd: string, ancestorRef: string, descendantRef: string): boolean;
export function defaultBaseRefCandidates(remoteName: string, env?: NodeJS.ProcessEnv): string[];
export function resolveBaseRef(gitRunner: GitRunner, cwd: string, candidates: string[]): string | null;
export function parseForEachRefOutput(output: string, remoteName: string): CandidateBranch[];
export function listCandidateBranches(gitRunner: GitRunner, cwd: string, remoteName: string): CandidateBranch[];
export function fetchPullRequests(ghRunner: GhRunner, cwd: string, options?: { limit?: number }): PullRequestRecord[];
export function groupPrsByHeadRef(prs: PullRequestRecord[]): Map<string, PullRequestRecord[]>;
export function prCoversTip(gitRunner: GitRunner, cwd: string, pr: PullRequestRecord, tipSha: string): boolean;
export function classifyBranch(
  gitRunner: GitRunner,
  cwd: string,
  branch: Pick<CandidateBranch, 'sha'>,
  baseRef: string,
  prsForBranch: PullRequestRecord[],
): BranchClassification;
export function countCommitsAhead(gitRunner: GitRunner, cwd: string, baseRef: string, sha: string): number | null;
export function listFilesTouched(gitRunner: GitRunner, cwd: string, baseRef: string, sha: string): string[];
export function checkStrandedBranches(options?: CheckStrandedBranchesOptions): CheckStrandedBranchesResult;
