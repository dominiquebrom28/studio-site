import { z } from 'zod';

/**
 * Zod schemas for the provenance content model (`docs/provenance-model.md`
 * §4.2, binding). Two schemas live here, deliberately distinct:
 *
 * - `ProvenanceBlockSchema` — the RAW shape of a single `yaml provenance`
 *   fenced block as it appears in `reports/*.md` (§4.1). Consumed by
 *   `scripts/provenance/parse.mjs`. Carries `item`/`title`/`branch`/
 *   `produced` — authoring/join fields that never reach the final record.
 * - `ProvenanceRecordSchema` — the PER-FILE record `scripts/provenance/
 *   generate.mjs` writes into `src/content/provenance.generated.json`,
 *   after joining a block's `produced` paths against `git log`. This is
 *   copied verbatim from §4.2 — do not drift the shape without updating the
 *   spec first.
 *
 * `ProvenanceBlockSchema` intentionally does NOT check that `authors` /
 * `reviewers[].by` resolve to a real cast member or `"Dom"` — that
 * cross-check needs `src/content/cast.ts`, which this module (kept
 * dependency-free, mirroring `schemas.ts`) does not import. It lives in
 * `scripts/provenance/parse.mjs`, the same house pattern
 * `validate-content.test.ts` already uses for the identical check against
 * post `author`/`authors`.
 */

/** Kebab-case slug — same pattern `schemas.ts` uses for content slugs. */
const itemSlugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const CommitSchema = z.object({
  hash: z.string().regex(/^[0-9a-f]{40}$/, 'must be a full 40-char lowercase hex commit hash'),
  short: z.string().regex(/^[0-9a-f]{7,12}$/, 'must be a 7-12 char lowercase hex short hash'),
  date: z.string(), // ISO 8601, from `git log --format=%cI` — no further format constraint (source is git, not content).
});
export type Commit = z.infer<typeof CommitSchema>;

export const JudgeSchema = z.object({
  verdict: z.enum(['PASS', 'REVISE', 'FAIL']),
  round: z.number().int().min(1).max(3),
  score: z.number().int().min(0).max(100),
  outOf: z.literal(100).default(100),
});
export type Judge = z.infer<typeof JudgeSchema>;

const TOKEN_SCOPES = ['run', 'agent'] as const;

export const TokensSchema = z
  .object({
    approx: z.number().int().positive(),
    scope: z.enum(TOKEN_SCOPES),
    agent: z.string().min(1).optional(),
  })
  .refine((tokens) => tokens.scope !== 'agent' || !!tokens.agent, {
    message: '`tokens.agent` is required when `tokens.scope` is "agent"',
    path: ['agent'],
  });
export type Tokens = z.infer<typeof TokensSchema>;

/** §4.2's five reviewer kinds — closed enum, no free-text review types. */
const REVIEWER_KINDS = ['fact-check', 'qa', 'browser-verify', 'lead-review', 'security'] as const;

export const ReviewerSchema = z.object({
  by: z.string().min(1),
  kind: z.enum(REVIEWER_KINDS),
});
export type Reviewer = z.infer<typeof ReviewerSchema>;

/**
 * The raw `yaml provenance` fenced-block shape (§4.1). `produced` lists
 * repo-relative paths this run CREATED (never edited) — enforced to be
 * non-empty here; `generate.mjs` additionally enforces path safety
 * (repo-relative, no `..`), on-disk existence, and cross-report uniqueness,
 * none of which a content-agnostic Zod schema can express. `title` is a
 * human-skimming convenience field (shown nowhere in `ProvenanceRecordSchema`
 * below) and is dropped once `generate.mjs` builds the per-file record.
 */
export const ProvenanceBlockSchema = z.object({
  item: z.string().regex(itemSlugPattern, 'item must be lowercase kebab-case'),
  title: z.string().min(1).optional(),
  branch: z.string().min(1).optional(),
  produced: z.array(z.string().min(1)).min(1, '`produced` must list at least one repo-relative path'),
  authors: z.array(z.string().min(1)).min(1),
  reviewers: z.array(ReviewerSchema).default([]),
  // `judge: null` is a positive claim ("explicitly not Judge-reviewed"),
  // distinct from the key being absent ("unknown / not recorded") — §3.1.
  // `.nullable().optional()` is what makes both states representable:
  // `undefined` (key absent) vs `null` (key present, value null).
  judge: JudgeSchema.nullable().optional(),
  tokens: TokensSchema.nullable().optional(),
});
export type ProvenanceBlock = z.infer<typeof ProvenanceBlockSchema>;

/**
 * The per-file provenance record (§4.2), copied verbatim from the spec.
 * `commit` is `nullable()` but deliberately NOT `optional()` — the
 * generator must always make a positive statement about the commit, either
 * a real one or an explicit "none yet" (`null`). A missing key would be
 * ambiguous between "not resolved" and "resolution failed", which is
 * exactly the ambiguity §5.2's failure table exists to remove.
 */
export const ProvenanceRecordSchema = z.object({
  runId: z.string(), // report file stem, e.g. "2026-07-18"
  reportPath: z.string(), // "reports/2026-07-18.md"
  item: z.string().regex(itemSlugPattern),
  branch: z.string().optional(),
  authors: z.array(z.string().min(1)).min(1),
  reviewers: z.array(ReviewerSchema).default([]),
  judge: JudgeSchema.nullable().optional(), // null = explicitly not judged
  tokens: TokensSchema.nullable().optional(),
  commit: CommitSchema.nullable(), // null = file not yet committed
});

export type ProvenanceRecord = z.infer<typeof ProvenanceRecordSchema>;

/**
 * The generated artifact's shape (`src/content/provenance.generated.json`):
 * a map from repo-relative produced path (exactly as it appears in a
 * report's `produced:` list, e.g. `"content/posts/2026-07-18-foo.md"`) to
 * its resolved record. `loader.ts` (PR 4, not this PR) will look records up
 * by a `Post`/`Project`'s own file path.
 */
export const ProvenanceArtifactSchema = z.record(z.string(), ProvenanceRecordSchema);
export type ProvenanceArtifact = z.infer<typeof ProvenanceArtifactSchema>;
