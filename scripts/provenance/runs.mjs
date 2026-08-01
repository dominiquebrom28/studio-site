#!/usr/bin/env node
/**
 * Builds the ROWS of the runs artifact (`src/content/runs.generated.json`,
 * `docs/reports-surface.md` §3.2) — one row per file in `reports/`, derived
 * MECHANICALLY from the filename and the report's first H1. No new
 * report-authoring obligation (no frontmatter, no second `yaml provenance`
 * -shaped block): everything here is read off what's already on disk.
 *
 * Pure and git-free on purpose, mirroring `parse.mjs`'s split (pure parsing
 * logic here; `fs`, Vite, and `git` orchestration live in `generate.mjs`,
 * which calls this and writes the result). That split is what makes this
 * module trivially unit-testable against fixtures with zero Vite/git in the
 * loop — same reasoning as `parse.mjs`'s own header comment.
 *
 * Fail-loud posture (`docs/reports-surface.md` §3.2, matching
 * `docs/provenance-model.md` §5.2's table this mirrors):
 *
 *   | Condition                                   | Outcome                         |
 *   |----------------------------------------------|----------------------------------|
 *   | Filename has no `YYYY-MM-DD`                  | Build fails, naming the file.   |
 *   | First non-blank line is not an H1             | Build fails, naming the file.   |
 *   | H1 prefix not in the kind allowlist           | `kind` omitted. Build succeeds. |
 *   | Report has no `yaml provenance` block         | Row still emitted (N/A here —   |
 *   |                                                | this module never reads that    |
 *   |                                                | fence at all).                  |
 *
 * Both hard-failure conditions are aggregated across every file into ONE
 * thrown error (same pattern as `ProvenanceValidationError` /
 * `parseAllReports`) so a build failure names every offending file at once,
 * not just the first.
 *
 * `date` is ALWAYS taken from the FILENAME, never the H1: this is the one
 * rule most likely to be "helpfully" gotten wrong later, so it's stated
 * three times in this codebase on purpose (here, `provenance-schema.ts`,
 * `docs/reports-surface.md` §3.2) — `reports/2026-07-19-evening.md`'s H1
 * ends "— BACKFILLED 2026-07-21"; parsing the date from that title would
 * date the run two days late.
 */
import path from 'node:path';

/** Same date shape `RUN_ID_PATTERN` (provenance-schema.ts) embeds, applied
 * to the raw filename (not the file stem) so the "no date at all" failure
 * is checked before any other parsing. Not anchored — matches the date
 * anywhere in the filename, same as `docs/reports-surface.md` §3.2's own
 * regex. */
const FILENAME_DATE_PATTERN = /(\d{4}-\d{2}-\d{2})/;

/** Matches the first non-blank line ONLY if it is a level-1 ATX heading: a
 * single `#` followed by whitespace and the heading text. `## Something`
 * does NOT match — the second character is `#`, not whitespace — so an H2
 * first line is correctly still "not an H1" per the failure table above. */
const H1_LINE_PATTERN = /^#[ \t]+(.+)$/;

export class RunsArtifactValidationError extends Error {
  constructor(issues) {
    super(
      `Runs artifact validation failed (${issues.length} issue${issues.length === 1 ? '' : 's'}):\n${issues.map((issue) => `  - ${issue}`).join('\n')}`,
    );
    this.name = 'RunsArtifactValidationError';
    this.issues = issues;
  }
}

/**
 * @param {object} args
 * @param {Record<string, string>} args.files reportPath ("reports/x.md") -> raw markdown content, as returned by `parse.mjs`'s `readReportFiles`
 * @param {Record<string, string>} args.kindByH1Prefix `RUN_KIND_BY_H1_PREFIX` from `src/content/provenance-schema.ts`
 * @returns {{runId: string, reportPath: string, title: string, date: string, kind?: string}[]} one row per file, sorted by `reportPath`
 */
export function buildRunsRows({ files, kindByH1Prefix }) {
  const issues = [];
  const rows = [];

  for (const reportPath of Object.keys(files).sort()) {
    const filename = path.basename(reportPath);
    const runId = filename.replace(/\.md$/, '');

    const dateMatch = FILENAME_DATE_PATTERN.exec(filename);
    if (!dateMatch) {
      issues.push(
        `${reportPath}: filename contains no YYYY-MM-DD date -- cannot build a runs-artifact row for it. Never silently excluded: a silently-dropped run is a hole in a completeness claim.`,
      );
      continue;
    }

    const raw = files[reportPath];
    const firstNonBlankLine = raw.split(/\r?\n/).find((line) => line.trim() !== '');
    const h1Match = firstNonBlankLine !== undefined ? H1_LINE_PATTERN.exec(firstNonBlankLine.trim()) : null;
    if (!h1Match) {
      issues.push(`${reportPath}: first non-blank line is not an H1 ("# ...") -- cannot build a runs-artifact row for it.`);
      continue;
    }

    const title = h1Match[1].trim();
    const prefix = title.split('—')[0].trim();
    const kind = kindByH1Prefix[prefix];

    rows.push({
      runId,
      reportPath,
      title,
      date: dateMatch[1],
      ...(kind !== undefined ? { kind } : {}),
    });
  }

  if (issues.length > 0) {
    throw new RunsArtifactValidationError(issues);
  }

  return rows;
}
