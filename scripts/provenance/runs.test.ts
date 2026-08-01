import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRunsRows, RunsArtifactValidationError } from './runs.mjs';
import { readReportFiles } from './parse.mjs';
import { RUN_KIND_BY_H1_PREFIX, RunsArtifactSchema } from '../../src/content/provenance-schema';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
// `__fixtures__/runs-repo/<scenario>/` — each scenario is its OWN isolated
// mini repo root with a FLAT `reports/` directory directly underneath (no
// extra nesting), matching the real `reports/` directory's actual shape
// (every real report sits directly in `reports/`, never in a subfolder).
// This is deliberately a SEPARATE tree from `scripts/provenance/
// __fixtures__/repo/reports/<scenario>/` (used by `parse.test.ts` /
// `generate.test.ts`'s provenance-BLOCK tests): those nest one level deeper
// so `readReportFiles` can scope a test to one scenario at a time without
// caring about `reportPath`'s exact shape (`ProvenanceBlockSchema`, the
// schema those tests exercise, has no `reportPath` field at all). This
// module's rows DO carry a schema-validated `reportPath`
// (`RunsArtifactRowSchema`, `REPORT_PATH_PATTERN` — docs/reports-surface.md
// §6 PR 0), which requires exactly `reports/<file>.md` — one path segment —
// so the fixture tree has to match that shape for real, not just for the
// scenario it's isolating.
const RUNS_FIXTURES_ROOT = path.join(DIRNAME, '__fixtures__', 'runs-repo');

function scenarioRoot(scenario: string): string {
  return path.join(RUNS_FIXTURES_ROOT, scenario);
}

function reportsDir(scenario: string): string {
  return path.join(scenarioRoot(scenario), 'reports');
}

function buildScenario(scenario: string) {
  const files = readReportFiles(reportsDir(scenario), scenarioRoot(scenario));
  return buildRunsRows({ files, kindByH1Prefix: RUN_KIND_BY_H1_PREFIX });
}

describe('buildRunsRows — the three real filename shapes (docs/reports-surface.md §3.2)', () => {
  it('plain YYYY-MM-DD.md', () => {
    const rows = buildScenario('valid-shapes');
    const row = rows.find((r) => r.reportPath === 'reports/2026-07-29.md');
    expect(row).toEqual({
      runId: '2026-07-29',
      reportPath: 'reports/2026-07-29.md',
      title: 'Run report — 2026-07-29',
      date: '2026-07-29',
      kind: 'run-report',
    });
  });

  it('YYYY-MM-DD-suffix.md, and a title whose OWN em dashes come after the date', () => {
    const rows = buildScenario('valid-shapes');
    const row = rows.find((r) => r.reportPath === 'reports/2026-07-21-review.md');
    expect(row).toEqual({
      runId: '2026-07-21-review',
      reportPath: 'reports/2026-07-21-review.md',
      title: 'Critical review — the whole team + the Judge — 2026-07-21',
      date: '2026-07-21',
      kind: 'critical-review',
    });
  });

  it('maintenance-YYYY-MM-DD.md', () => {
    const rows = buildScenario('valid-shapes');
    const row = rows.find((r) => r.reportPath === 'reports/maintenance-2026-07-20.md');
    expect(row).toEqual({
      runId: 'maintenance-2026-07-20',
      reportPath: 'reports/maintenance-2026-07-20.md',
      title: 'Maintenance sweep — 2026-07-20',
      date: '2026-07-20',
      kind: 'maintenance-sweep',
    });
  });

  it('produces one row per file, sorted by reportPath, and every row satisfies RunsArtifactSchema', () => {
    const rows = buildScenario('valid-shapes');
    expect(rows.map((r) => r.reportPath)).toEqual([
      'reports/2026-07-21-review.md',
      'reports/2026-07-29.md',
      'reports/maintenance-2026-07-20.md',
    ]);
    expect(() => RunsArtifactSchema.parse(rows)).not.toThrow();
  });
});

describe('buildRunsRows — date is ALWAYS from the filename, never the H1', () => {
  it('date comes from the FILENAME regex, not parsed out of title text', () => {
    // 2026-07-21-review.md's H1 ends "...the Judge — 2026-07-21" too, but
    // that's a coincidence of this fixture, not the mechanism: `date` must
    // equal the filename's embedded date even when the title also happens
    // to end with a date-shaped string.
    const rows = buildScenario('valid-shapes');
    const row = rows.find((r) => r.reportPath === 'reports/2026-07-21-review.md');
    expect(row?.date).toBe('2026-07-21');
  });
});

describe('buildRunsRows — fail-loud: filename has no YYYY-MM-DD (§3.2 failure table)', () => {
  it('throws RunsArtifactValidationError naming the offending file, and never silently drops it', () => {
    const files = readReportFiles(reportsDir('no-date'), scenarioRoot('no-date'));
    expect(() => buildRunsRows({ files, kindByH1Prefix: RUN_KIND_BY_H1_PREFIX })).toThrow(RunsArtifactValidationError);
    try {
      buildRunsRows({ files, kindByH1Prefix: RUN_KIND_BY_H1_PREFIX });
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof RunsArtifactValidationError>;
      expect(err.issues).toHaveLength(1);
      expect(err.issues[0]).toContain('reports/notes.md');
      expect(err.issues[0]).toContain('no YYYY-MM-DD date');
    }
  });
});

describe('buildRunsRows — fail-loud: first non-blank line is not an H1 (§3.2 failure table)', () => {
  it('throws RunsArtifactValidationError naming the offending file (plain prose first line)', () => {
    const files = readReportFiles(reportsDir('no-h1'), scenarioRoot('no-h1'));
    try {
      buildRunsRows({ files, kindByH1Prefix: RUN_KIND_BY_H1_PREFIX });
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof RunsArtifactValidationError>;
      expect(err.issues).toHaveLength(1);
      expect(err.issues[0]).toContain('reports/2026-01-01-no-h1.md');
      expect(err.issues[0]).toContain('not an H1');
    }
  });

  it('rejects an H2 first line too — a level-1 heading requires exactly one "#"', () => {
    const files = readReportFiles(reportsDir('h2-heading'), scenarioRoot('h2-heading'));
    try {
      buildRunsRows({ files, kindByH1Prefix: RUN_KIND_BY_H1_PREFIX });
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof RunsArtifactValidationError>;
      expect(err.issues).toHaveLength(1);
      expect(err.issues[0]).toContain('reports/2026-01-01-h2-heading.md');
      expect(err.issues[0]).toContain('not an H1');
    }
  });
});

describe('buildRunsRows — aggregates ALL issues across a directory into ONE thrown error', () => {
  it('names both the undated file and the no-H1 file, and still not build a row for the valid third file', () => {
    const files = readReportFiles(reportsDir('mixed-failures'), scenarioRoot('mixed-failures'));
    try {
      buildRunsRows({ files, kindByH1Prefix: RUN_KIND_BY_H1_PREFIX });
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof RunsArtifactValidationError>;
      expect(err.issues).toHaveLength(2);
      const joined = err.issues.join('\n');
      expect(joined).toContain('reports/undated-notes.md');
      expect(joined).toContain('reports/2026-02-02-blank-first.md');
    }
  });
});

describe('buildRunsRows — unknown kind is a SOFT degrade, never a build failure (§3.2 failure table)', () => {
  it('emits the row with `kind` omitted when the H1 prefix is not in the allowlist', () => {
    const rows = buildScenario('unknown-kind');
    expect(rows).toEqual([
      {
        runId: '2026-01-01-unknown-kind',
        reportPath: 'reports/2026-01-01-unknown-kind.md',
        title: 'Something else entirely — 2026-01-01',
        date: '2026-01-01',
        // no `kind` key at all
      },
    ]);
    expect('kind' in rows[0]).toBe(false);
    expect(() => RunsArtifactSchema.parse(rows)).not.toThrow();
  });

  it('also degrades softly when the title has no em dash to split on at all', () => {
    const rows = buildScenario('no-dash-title');
    expect(rows[0].title).toBe('A title with no em dash at all');
    expect('kind' in rows[0]).toBe(false);
  });
});
