/**
 * Hand-written ambient declarations for `check-backlog-checkoffs.mjs` — see
 * `scripts/check-deps-drift.d.mts`'s header comment for why this file
 * exists and why it's `.d.mts` (matching TypeScript's `Bundler` resolution
 * for a `.mjs` module's sibling declaration) rather than `allowJs`-based
 * JSDoc inference across the whole implementation file.
 */

export type GhRunnerArgs = { cwd: string; args: string[] };
export type GhRunner = (call: GhRunnerArgs) => string;

export type PullRequestState = 'OPEN' | 'CLOSED' | 'MERGED';

export interface PullRequestRecord {
  number: number;
  state: PullRequestState;
  headRefName: string;
  url: string;
  title: string;
}

export interface ItemRow {
  item: string;
  branch: string;
  prCell: string;
}

export type BranchBacklogClassification = 'checked' | 'referencedButOpen' | 'unreferenced';

export interface BacklogBlock {
  checked: boolean;
  text: string;
}

export interface CheckoffFinding {
  report: string;
  item: string;
  branch: string;
  prCell: string;
}

export interface CheckBacklogCheckoffsResult {
  status: 'clean' | 'violation' | 'inconclusive';
  reason?: string;
  totalReportsScanned: number;
  totalItemRowsScanned: number;
  totalPrsFetched: number;
  unreferenced: CheckoffFinding[];
  referencedButOpen: CheckoffFinding[];
}

export interface CheckBacklogCheckoffsOptions {
  repoRoot?: string;
  reportsDir?: string;
  backlogPath?: string;
  ghRunner?: GhRunner;
  fetchOptions?: { limit?: number };
}

export function fetchPullRequests(ghRunner: GhRunner, cwd: string, options?: { limit?: number }): PullRequestRecord[];
export function groupPrsByHeadRef(prs: PullRequestRecord[]): Map<string, PullRequestRecord[]>;
export function hasMergedPr(prsForBranch: PullRequestRecord[]): boolean;
export function extractItemRows(reportContent: string): ItemRow[];
export function isSelfReportingRow(row: { branch: string; prCell: string }): boolean;
export function parseBacklogBlocks(backlogContent: string): BacklogBlock[];
export function classifyBranchAgainstBacklog(branch: string, blocks: BacklogBlock[]): BranchBacklogClassification;
export function checkBacklogCheckoffs(options?: CheckBacklogCheckoffsOptions): CheckBacklogCheckoffsResult;
