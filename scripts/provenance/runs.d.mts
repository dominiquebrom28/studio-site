/**
 * Hand-written ambient declarations for `runs.mjs` — see `parse.d.mts`'s
 * header comment for why this file exists and why it's `.d.mts`.
 */
import type { RunKind } from '../../src/content/provenance-schema';

export interface RunsArtifactRowInput {
  runId: string;
  reportPath: string;
  title: string;
  date: string;
  kind?: RunKind;
}

export class RunsArtifactValidationError extends Error {
  issues: string[];
  constructor(issues: string[]);
}

export function buildRunsRows(args: {
  files: Record<string, string>;
  kindByH1Prefix: Record<string, RunKind>;
}): RunsArtifactRowInput[];
