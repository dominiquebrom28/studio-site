/**
 * Hand-written ambient declarations for `stage-report-artifacts.mjs` — see
 * `scripts/check-deps-drift.d.mts`'s header comment for why this file
 * exists and why it's `.d.mts` (matching TypeScript's `Bundler` resolution
 * for a `.mjs` module's sibling declaration) rather than `allowJs`-based
 * JSDoc inference across the whole implementation file.
 */

export type GeneratorRunnerArgs = { repoRoot: string; generatorPath: string };
export type GeneratorRunnerResult = { ok: boolean; stdout: string; stderr: string; error?: Error };
export type GeneratorRunner = (args: GeneratorRunnerArgs) => GeneratorRunnerResult;

export type StagePathArgs = { repoRoot: string; relPath: string };
export type StagePath = (args: StagePathArgs) => void;

export type ReadArtifactContent = (absolutePath: string) => string | null;

export const GENERATED_ARTIFACT_PATHS: string[];
export const STAGED_PATHS_DIFF_ARGS: string[];

export function parseNulSeparatedPaths(output: string): string[];
export function hasStagedReportMarkdown(stagedPaths: string[]): boolean;

export interface StageReportArtifactsOptions {
  repoRoot?: string;
  generatorPath?: string;
  artifactPaths?: string[];
  isMergeCommit?: boolean;
  getStagedPaths: () => string[];
  runGenerator?: GeneratorRunner;
  readArtifactContent?: ReadArtifactContent;
  stagePath?: StagePath;
}

export interface StageReportArtifactsSkippedResult {
  status: 'skipped';
  reason: string;
  refreshed: string[];
  unchanged: string[];
}

export interface StageReportArtifactsGeneratorFailedResult {
  status: 'generator-failed';
  reason: string;
  stdout: string;
  stderr: string;
  refreshed: string[];
  unchanged: string[];
}

export interface StageReportArtifactsOkResult {
  status: 'clean' | 'staged';
  isMergeCommit: boolean;
  refreshed: string[];
  unchanged: string[];
  stdout: string;
  stderr: string;
}

export type StageReportArtifactsResult =
  | StageReportArtifactsSkippedResult
  | StageReportArtifactsGeneratorFailedResult
  | StageReportArtifactsOkResult;

export function stageReportArtifacts(options: StageReportArtifactsOptions): StageReportArtifactsResult;
