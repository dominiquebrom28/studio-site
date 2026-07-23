/**
 * Hand-written ambient declarations for `generate.mjs` — see `parse.d.mts`'s
 * header comment for why this file exists and why it's `.d.mts` (matching
 * TypeScript's `Bundler` resolution for a `.mjs` module's sibling
 * declaration) rather than `allowJs`-based JSDoc inference across the whole
 * implementation file.
 */
import type { z } from 'zod';
import type { ProvenanceBlock, ProvenanceRecord } from '../../src/content/provenance-schema';

export const OUTPUT_PATH: string;

export class ProvenanceGitError extends Error {}

export interface GitRunnerArgs {
  cwd: string;
  args: string[];
}

export type GitRunner = (args: GitRunnerArgs) => string;

export interface LoadedContentModules {
  ProvenanceBlockSchema: z.ZodType<ProvenanceBlock>;
  ProvenanceRecordSchema: z.ZodType<ProvenanceRecord>;
  castNames: string[];
}

export interface GenerateProvenanceOptions {
  repoRoot?: string;
  reportsDir?: string;
  loadModules?: (repoRoot: string) => Promise<LoadedContentModules>;
  gitRunner?: GitRunner;
}

export function generateProvenance(options?: GenerateProvenanceOptions): Promise<Record<string, ProvenanceRecord>>;
