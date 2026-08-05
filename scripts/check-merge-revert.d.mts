/**
 * Hand-written ambient declarations for `check-merge-revert.mjs` — see
 * `scripts/check-deps-drift.d.mts`'s header comment for why this file
 * exists and why it's `.d.mts` (matching TypeScript's `Bundler` resolution
 * for a `.mjs` module's sibling declaration) rather than `allowJs`-based
 * JSDoc inference across the whole implementation file.
 */

export type GitRunnerArgs = { cwd: string; args: string[] };
export type GitRunner = (call: GitRunnerArgs) => string;

export interface FirstParentCommit {
  sha: string;
  parents: string[];
  subject: string;
  isMerge: boolean;
}

export interface NameStatusEntry {
  status: string;
  path: string;
  renamedFrom: string | null;
}

export interface HeadRefResolved {
  headRef: string;
  source: string;
}

export interface HeadRefUnresolved {
  headRef: null;
  reason: string;
}

export type HeadRefResolution = HeadRefResolved | HeadRefUnresolved;

export interface OwnCommitTouch {
  sha: string;
  subject: string;
  status: string;
}

export interface MergeRevertViolation {
  path: string;
  mergeCommit: { sha: string; subject: string };
  ownCommitsTouching: OwnCommitTouch[];
}

export interface ExplainedDrop {
  path: string;
  lastOwnCommit: { sha: string; subject: string };
}

export interface CheckMergeRevertResult {
  status: 'clean' | 'violation' | 'inconclusive';
  reason?: string;
  baseRef: string | null;
  headRef: string | null;
  mergeBase: string | null;
  chainLength: number;
  touchedByOwnCount: number;
  violations: MergeRevertViolation[];
  explained: ExplainedDrop[];
  notes: string[];
}

export interface CheckMergeRevertOptions {
  repoRoot?: string;
  baseRefCandidates?: string[];
  headRefResolution?: HeadRefResolution;
  gitRunner?: GitRunner;
  env?: NodeJS.ProcessEnv;
}

export function defaultBaseRefCandidates(env?: NodeJS.ProcessEnv): string[];
export function resolveBaseRef(gitRunner: GitRunner, repoRoot: string, candidates: string[]): string | null;
export function resolveHeadRef(env?: NodeJS.ProcessEnv): HeadRefResolution;
export function isShallowRepository(gitRunner: GitRunner, repoRoot: string): boolean;
export function resolveMergeBase(gitRunner: GitRunner, repoRoot: string, baseRef: string, headRef: string): string | null;
export function getFirstParentChain(gitRunner: GitRunner, repoRoot: string, mergeBase: string, headRef: string): FirstParentCommit[];
export function getNameStatusDiff(gitRunner: GitRunner, repoRoot: string, fromRef: string, toRef: string): NameStatusEntry[];
export function checkMergeRevert(options?: CheckMergeRevertOptions): CheckMergeRevertResult;
