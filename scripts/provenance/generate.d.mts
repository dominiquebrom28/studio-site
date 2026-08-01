/**
 * Hand-written ambient declarations for `generate.mjs` — see `parse.d.mts`'s
 * header comment for why this file exists and why it's `.d.mts` (matching
 * TypeScript's `Bundler` resolution for a `.mjs` module's sibling
 * declaration) rather than `allowJs`-based JSDoc inference across the whole
 * implementation file.
 */
import type { z } from 'zod';
import type { ProvenanceBlock, ProvenanceRecord, RunKind, RunsArtifactRow } from '../../src/content/provenance-schema';

export const OUTPUT_PATH: string;
export const RUNS_OUTPUT_PATH: string;

export class ProvenanceGitError extends Error {}

export interface GitRunnerArgs {
  cwd: string;
  args: string[];
}

export type GitRunner = (args: GitRunnerArgs) => string;

// The REAL `loadContentModules` (generate.mjs) returns an object satisfying
// BOTH of the interfaces below at once (it loads all five members from a
// single Vite `ssrLoadModule` boot) — but `generateProvenance` and
// `generateRunsArtifact` each only destructure the subset they need, so
// their injectable `loadModules` options are typed against the narrower
// interface each actually requires. A single combined interface would force
// every provenance-only test double (there are many, in `generate.test.ts`)
// to also fabricate `RunsArtifactSchema`/`RUN_KIND_BY_H1_PREFIX` for no
// reason.
export interface LoadedContentModules {
  ProvenanceBlockSchema: z.ZodType<ProvenanceBlock>;
  ProvenanceRecordSchema: z.ZodType<ProvenanceRecord>;
  castNames: string[];
}

export interface LoadedRunsModules {
  RunsArtifactSchema: z.ZodType<RunsArtifactRow[]>;
  RUN_KIND_BY_H1_PREFIX: Record<string, RunKind>;
}

export interface GenerateProvenanceOptions {
  repoRoot?: string;
  reportsDir?: string;
  loadModules?: (repoRoot: string) => Promise<LoadedContentModules>;
  gitRunner?: GitRunner;
}

export function generateProvenance(options?: GenerateProvenanceOptions): Promise<Record<string, ProvenanceRecord>>;

export interface GenerateRunsArtifactOptions {
  repoRoot?: string;
  reportsDir?: string;
  loadModules?: (repoRoot: string) => Promise<LoadedRunsModules>;
}

export function generateRunsArtifact(options?: GenerateRunsArtifactOptions): Promise<RunsArtifactRow[]>;
