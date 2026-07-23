#!/usr/bin/env node
/**
 * Extracts and validates `yaml provenance` fenced blocks from report
 * markdown (`docs/provenance-model.md` §4.1). Pure and git-free on purpose:
 * this module never touches `git` or writes anything — that's
 * `generate.mjs`'s job (§12 PR 3). Keeping this file to "read reports,
 * validate blocks, name every problem precisely" makes it independently
 * unit-testable and matches the PR-sized split in the spec's implementation
 * plan (PR 2: schema + parser, no consumers).
 *
 * WHY NOT IMPORT `src/content/provenance-schema.ts` / `src/content/cast.ts`
 * DIRECTLY: this is a plain `.mjs` file run by a bare `node` process
 * (`predev`/`prebuild`/`pretest`), which cannot import a `.ts` module
 * without a loader. This repo's established, zero-new-dependency answer to
 * that (see `scripts/generate-seo-files.mjs`'s header comment) is Vite's
 * programmatic `createServer` + `ssrLoadModule` — but that's a build-time
 * concern, not a parsing concern, so it lives in `generate.mjs`, which
 * loads the schema + cast module once and passes them into the functions
 * here as plain arguments. This also means these functions take a Zod
 * schema and a `castNames` list as parameters rather than importing them,
 * which is what makes them trivially unit-testable from Vitest (which CAN
 * import `.ts` directly) with zero Vite-server bootstrapping in the test
 * run itself.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';

/** Matches a fenced code block whose info string is exactly `yaml provenance`
 * (`docs/provenance-model.md` §4.1). Report prose is never parsed — only
 * this exact, deliberately-narrow fence is ever read. */
const PROVENANCE_FENCE_PATTERN = /```yaml provenance\r?\n([\s\S]*?)\r?\n```/g;

/**
 * Aggregates every problem found across however many reports/blocks were
 * checked into ONE thrown error, so a build failure names every issue at
 * once (not just the first) — precise, and cheaper to fix in one pass.
 * `issues` is a flat array of human-readable, report/item/field-qualified
 * strings (§5.2: "Build fails, naming report, item, and field").
 */
export class ProvenanceValidationError extends Error {
  constructor(issues) {
    super(`Provenance validation failed (${issues.length} issue${issues.length === 1 ? '' : 's'}):\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'ProvenanceValidationError';
    this.issues = issues;
  }
}

/** Formats a Zod issue path (`['reviewers', 0, 'by']`) as `reviewers[0].by`
 * instead of the raw array — the "naming ... field" half of §5.2's
 * requirement. */
function formatIssuePath(pathSegments) {
  if (pathSegments.length === 0) return '(root)';
  return pathSegments.reduce((acc, segment) => {
    if (typeof segment === 'number') return `${acc}[${segment}]`;
    return acc.length > 0 ? `${acc}.${segment}` : String(segment);
  }, '');
}

/** Extracts the raw YAML body of every `yaml provenance` fenced block in a
 * report's markdown, in document order. Returns an empty array for a report
 * with none — that's the expected, non-error common case today (§5.2: "A
 * content file appears in no report's `produced` list" / no block at all is
 * legal and never an error on its own). */
export function extractProvenanceBlocks(markdown) {
  const blocks = [];
  PROVENANCE_FENCE_PATTERN.lastIndex = 0;
  let match;
  while ((match = PROVENANCE_FENCE_PATTERN.exec(markdown)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

/** Cross-checks `authors` and `reviewers[].by` against the cast roster
 * (`src/content/cast.ts` `name`s) plus the literal `"Dom"` — §4.1's binding
 * rule, and the same posture `validate-content.test.ts` already applies to
 * post `author`/`authors`. Returns a list of issue strings (empty = clean)
 * rather than throwing, so the caller can aggregate across every block. */
function crossCheckNames({ reportPath, block, castNames }) {
  const valid = new Set([...castNames, 'Dom']);
  const issues = [];
  block.authors.forEach((author, index) => {
    if (!valid.has(author)) {
      issues.push(
        `${reportPath} item "${block.item}": authors[${index}]: "${author}" does not resolve to a cast member's name or "Dom"`,
      );
    }
  });
  block.reviewers.forEach((reviewer, index) => {
    if (!valid.has(reviewer.by)) {
      issues.push(
        `${reportPath} item "${block.item}": reviewers[${index}].by: "${reviewer.by}" does not resolve to a cast member's name or "Dom"`,
      );
    }
  });
  return issues;
}

/**
 * Parses and validates every `yaml provenance` block in one report file.
 * Never throws on its own — returns `{ items, issues }` so
 * `parseAllReports` can aggregate issues across every report before
 * deciding whether to throw once, in full, at the end.
 *
 * @param {object} args
 * @param {string} args.reportPath repo-relative path, e.g. "reports/2026-07-18.md"
 * @param {string} args.raw raw markdown content of the report
 * @param {import('zod').ZodType} args.schema `ProvenanceBlockSchema`
 * @param {string[]} args.castNames cast member `name`s (from `cast.ts`)
 */
export function parseReportBlocks({ reportPath, raw, schema, castNames }) {
  const runId = path.basename(reportPath).replace(/\.md$/, '');
  const rawBlocks = extractProvenanceBlocks(raw);
  const items = [];
  const issues = [];

  rawBlocks.forEach((rawBlock, index) => {
    const positionLabel = `${reportPath} (block ${index + 1})`;

    let yamlValue;
    try {
      yamlValue = loadYaml(rawBlock);
    } catch (error) {
      issues.push(`${positionLabel}: invalid YAML — ${error.message}`);
      return;
    }

    const result = schema.safeParse(yamlValue);
    if (!result.success) {
      const itemLabel =
        yamlValue && typeof yamlValue === 'object' && typeof yamlValue.item === 'string' ? yamlValue.item : `block ${index + 1}`;
      for (const issue of result.error.issues) {
        issues.push(`${reportPath} item "${itemLabel}": ${formatIssuePath(issue.path)}: ${issue.message}`);
      }
      return;
    }

    const block = result.data;
    issues.push(...crossCheckNames({ reportPath, block, castNames }));
    items.push({ runId, reportPath, block });
  });

  return { items, issues };
}

/**
 * Reads every `*.md` file directly under `reportsDir` off disk into a
 * `{ [repoRelativePath]: rawContent }` map, keyed relative to `repoRoot`
 * with forward slashes (matches the `reportPath` shape §4.2 documents,
 * e.g. `"reports/2026-07-18.md"`). Returns `{}` for a missing directory —
 * deliberately not an error: a fixture/test reports dir that doesn't exist
 * yet, or (impossible in practice, but handled) a repo with no `reports/`
 * at all, both degrade to "no blocks found," not a crash.
 */
export function readReportFiles(reportsDir, repoRoot) {
  if (!existsSync(reportsDir)) return {};
  const entries = readdirSync(reportsDir, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.md'));
  const files = {};
  for (const entry of entries) {
    const absolute = path.join(reportsDir, entry.name);
    const relative = path.relative(repoRoot, absolute).split(path.sep).join('/');
    files[relative] = readFileSync(absolute, 'utf8');
  }
  return files;
}

/**
 * Parses + validates every report in `files`, aggregating ALL issues across
 * every report/block before throwing once (§5.2: "yaml provenance block
 * fails Zod -> Build fails, naming report, item, and field" — a single
 * loud, complete failure, not a whack-a-mole one-error-per-run loop).
 *
 * @param {object} args
 * @param {Record<string, string>} args.files reportPath -> raw content
 * @param {import('zod').ZodType} args.schema `ProvenanceBlockSchema`
 * @param {string[]} args.castNames cast member `name`s
 * @returns {{ runId: string, reportPath: string, block: object }[]}
 */
export function parseAllReports({ files, schema, castNames }) {
  const allItems = [];
  const allIssues = [];

  // Sorted so error output (and downstream duplicate-path messages) is
  // deterministic regardless of directory-read order.
  for (const reportPath of Object.keys(files).sort()) {
    const { items, issues } = parseReportBlocks({ reportPath, raw: files[reportPath], schema, castNames });
    allItems.push(...items);
    allIssues.push(...issues);
  }

  if (allIssues.length > 0) {
    throw new ProvenanceValidationError(allIssues);
  }

  return allItems;
}
