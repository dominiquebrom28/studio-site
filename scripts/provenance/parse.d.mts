/**
 * Hand-written ambient declarations for `parse.mjs`, so `tsc -b --noEmit`
 * can type-check `parse.test.ts` / `generate.test.ts` against real, precise
 * types instead of `any`. `parse.mjs` itself stays plain `.mjs` (it runs
 * under a bare `node` process — see `generate.mjs`'s header comment for
 * why) — this file is TypeScript-only "documentation with teeth", never
 * imported at runtime. `.d.mts` (not `.d.ts`) is the extension TypeScript's
 * `Bundler` module resolution expects for a sibling declaration of a
 * `.mjs` module.
 */
import type { z } from 'zod';
import type { ProvenanceBlock } from '../../src/content/provenance-schema';

export interface ParsedProvenanceItem {
  runId: string;
  reportPath: string;
  block: ProvenanceBlock;
}

export class ProvenanceValidationError extends Error {
  issues: string[];
  constructor(issues: string[]);
}

export function extractProvenanceBlocks(markdown: string): string[];

export function parseReportBlocks(args: {
  reportPath: string;
  raw: string;
  schema: z.ZodType<ProvenanceBlock>;
  castNames: string[];
}): { items: ParsedProvenanceItem[]; issues: string[] };

export function readReportFiles(reportsDir: string, repoRoot: string): Record<string, string>;

export function parseAllReports(args: {
  files: Record<string, string>;
  schema: z.ZodType<ProvenanceBlock>;
  castNames: string[];
}): ParsedProvenanceItem[];
