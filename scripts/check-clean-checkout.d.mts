/**
 * Hand-written ambient declarations for `check-clean-checkout.mjs` — see
 * `scripts/check-deps-drift.d.mts`'s header comment for why this file
 * exists and why it's `.d.mts` (matching TypeScript's `Bundler` resolution
 * for a `.mjs` module's sibling declaration) rather than `allowJs`-based
 * JSDoc inference across the whole implementation file.
 */

export type GitRunnerArgs = { cwd: string; args: string[] };
export type GitRunner = (call: GitRunnerArgs) => string;

export interface PorcelainEntry {
  code: string;
  path: string;
  renamedFrom: string | null;
}

export type EntryClassification = 'escalated' | 'other';

export interface CheckCleanCheckoutResult {
  status: 'clean' | 'found' | 'inconclusive';
  reason?: string;
  repoRoot: string | null;
  escalated: PorcelainEntry[];
  other: PorcelainEntry[];
  totalEntries: number;
}

export interface CheckCleanCheckoutOptions {
  repoRoot?: string;
  gitRunner?: GitRunner;
  env?: NodeJS.ProcessEnv;
}

export function resolveMainRepoRoot(gitRunner: GitRunner, cwd: string): string;
export function parsePorcelainStatus(output: string): PorcelainEntry[];
export function classifyEntry(entry: PorcelainEntry): EntryClassification;
export function checkCleanCheckout(options?: CheckCleanCheckoutOptions): CheckCleanCheckoutResult;
