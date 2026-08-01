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

/**
 * `runId` / `reportPath` pin (`docs/reports-surface.md` §4.1, §6 PR 0):
 * both were bare `z.string()` until now — safe in practice only because
 * `generate.mjs` writes them from the filesystem rather than from block
 * content, an invariant enforced nowhere in the schema. `reportPath` is
 * already interpolated into an `href` in `ProvenanceStrip.tsx` (`runField`),
 * so an unconstrained string here is a latent injection surface on the one
 * device whose entire purpose is verification. Validated against every real
 * value in `src/content/provenance.generated.json` and every filename in
 * `reports/` before landing (see `provenance-schema.test.ts`).
 *
 * `runId` = a report filename stem: an optional `maintenance-` prefix, a
 * `YYYY-MM-DD` date, and an optional `-kebab-suffix` (`2026-07-18`,
 * `2026-07-21-review`, `maintenance-2026-07-20`).
 */
export const RUN_ID_PATTERN = /^(maintenance-)?\d{4}-\d{2}-\d{2}(-[a-z0-9-]+)?$/;

/** `reportPath` = `reports/<filename>.md`, repo-relative, no `..`, no
 * absolute URL, no path outside `reports/`. */
export const REPORT_PATH_PATTERN = /^reports\/[A-Za-z0-9._-]+\.md$/;

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
  runId: z.string().regex(RUN_ID_PATTERN, 'must be a report filename stem, e.g. "2026-07-18" or "maintenance-2026-07-20"'), // report file stem
  reportPath: z.string().regex(REPORT_PATH_PATTERN, 'must be "reports/<filename>.md" — repo-relative, no ".." '), // "reports/2026-07-18.md"
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

/**
 * The runs artifact (`src/content/runs.generated.json`, `docs/reports-surface.md`
 * §3.2) — one row per file in `reports/`. No consumer exists yet (PR 1 of
 * that spec's §6 decomposition: schema + generator only, nothing visible).
 *
 * Every field is derived MECHANICALLY, never authored:
 * - `runId` / `reportPath`: same shape and same regex as
 *   `ProvenanceRecordSchema` above (this row's `reportPath` and a
 *   provenance record's `reportPath` are the same string space).
 * - `date`: from the FILENAME (`RUN_ID_PATTERN`'s embedded `YYYY-MM-DD`),
 *   never the H1 — `2026-07-19-evening.md`'s H1 ends "— BACKFILLED
 *   2026-07-21" and would date that run two days late if parsed from title.
 * - `title`: the report's first H1, verbatim — never rewritten or truncated.
 * - `kind`: an allowlist on the H1 prefix before the first em dash ("—").
 *   Unrecognised prefixes omit the key entirely (cosmetic field, honest
 *   degrade) rather than failing the build — see `RUN_KIND_BY_H1_PREFIX`.
 */
const RUN_KINDS = ['run-report', 'critical-review', 'maintenance-sweep', 'hire-report'] as const;
export type RunKind = (typeof RUN_KINDS)[number];

/**
 * Maps a report's H1 prefix (the text before the first em dash "—") to its
 * `kind` value. Exactly four prefixes occur in `reports/` today (verified
 * against every file on disk, `docs/reports-surface.md` §3): `Run report`,
 * `Critical review`, `Maintenance sweep`, `Hire report`. A prefix not in
 * this map is a soft degrade (§3.2's failure table): the row is still
 * emitted, just without a `kind`.
 *
 * Single source of truth: `scripts/provenance/runs.mjs` loads this object
 * (via the same Vite `ssrLoadModule` boot `generate.mjs` already uses to
 * reach this file) rather than duplicating the four strings in a plain
 * `.mjs` file, so the allowlist and the schema's enum can never drift apart.
 */
export const RUN_KIND_BY_H1_PREFIX: Record<string, RunKind> = {
  'Run report': 'run-report',
  'Critical review': 'critical-review',
  'Maintenance sweep': 'maintenance-sweep',
  'Hire report': 'hire-report',
};

export const RunsArtifactRowSchema = z.object({
  runId: z.string().regex(RUN_ID_PATTERN),
  reportPath: z.string().regex(REPORT_PATH_PATTERN),
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD'),
  kind: z.enum(RUN_KINDS).optional(),
});
export type RunsArtifactRow = z.infer<typeof RunsArtifactRowSchema>;

/** The generated artifact's shape (`src/content/runs.generated.json`): an
 * array of rows, one per report file, in the order `scripts/provenance/
 * runs.mjs` writes them (sorted by `reportPath`, matching the sort applied
 * to `provenance.generated.json`'s keys). */
export const RunsArtifactSchema = z.array(RunsArtifactRowSchema);
export type RunsArtifact = z.infer<typeof RunsArtifactSchema>;
