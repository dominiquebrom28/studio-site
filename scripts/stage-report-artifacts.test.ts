import { describe, expect, it, vi } from 'vitest';
import {
  GENERATED_ARTIFACT_PATHS,
  STAGED_PATHS_DIFF_ARGS,
  hasStagedReportMarkdown,
  parseNulSeparatedPaths,
  stageReportArtifacts,
} from './stage-report-artifacts.mjs';

/**
 * Every side effect (staged-paths lookup, the generator, artifact reads,
 * `git add`) is injected — same fixture-free, fake-`gitRunner`-style pattern
 * as `check-deps-drift.test.ts` / `check-report-claims.test.ts` in this
 * directory. Nothing here spawns a real `git` or `node` process; that would
 * mean mutating this repo's own staged index and generated artifacts from
 * inside a test run, which is exactly the kind of real-checkout hazard
 * `check-deps-drift.test.ts`'s header comment already argues against
 * reproducing. The real end-to-end path (actual `git commit`, actual
 * `scripts/provenance/generate.mjs`, actual CI drift gate) is exercised
 * separately via a scratch clone — see this change's PR body for that
 * transcript.
 */

const REPO_ROOT = '/repo';

function makeGeneratorResult(overrides: Partial<{ ok: boolean; stdout: string; stderr: string; error: Error }> = {}) {
  return { ok: true, stdout: '', stderr: '', ...overrides };
}

describe('parseNulSeparatedPaths', () => {
  it('splits NUL-separated output into a path array', () => {
    expect(parseNulSeparatedPaths('a.txt\0b/c.txt\0')).toEqual(['a.txt', 'b/c.txt']);
  });

  it('returns an empty array for empty output (nothing staged)', () => {
    expect(parseNulSeparatedPaths('')).toEqual([]);
  });

  it('does not mis-split on an embedded newline within a single path', () => {
    // Newline-separated parsing would wrongly split this into two entries;
    // NUL-separated parsing must not.
    expect(parseNulSeparatedPaths('weird\npath.md\0other.md\0')).toEqual(['weird\npath.md', 'other.md']);
  });
});

describe('STAGED_PATHS_DIFF_ARGS — deletions must stay included', () => {
  it('includes "D" (Deleted) in the --diff-filter, pinned against a future accidental narrowing', () => {
    // The exact failure mode this pins against: `runs.generated.json` is
    // one row per file CURRENTLY in `reports/` (scripts/provenance/
    // runs.mjs), so a commit that only `git rm`s a report is exactly as
    // artifact-changing as one that adds a report — confirmed by
    // reproduction (see .githooks/pre-commit's comment / this change's PR
    // body for the transcript: with `--diff-filter=ACMR` (no `D`), deleting
    // an existing report and committing left `runs.generated.json` stale
    // and CI's `git diff --exit-code` red on the missing row). If a future
    // edit narrows this filter back to ACMR, this assertion fails loudly
    // instead of silently reopening that half of the trap.
    const filterArg = STAGED_PATHS_DIFF_ARGS.find((arg) => arg.startsWith('--diff-filter='));
    expect(filterArg).toBeDefined();
    expect(filterArg).toContain('D');
    expect(filterArg).toContain('A');
    expect(filterArg).toContain('M');
  });

  it('uses -z (NUL-separated) output, matching parseNulSeparatedPaths', () => {
    expect(STAGED_PATHS_DIFF_ARGS).toContain('-z');
  });
});

describe('hasStagedReportMarkdown', () => {
  it('is true for a top-level reports/*.md path', () => {
    expect(hasStagedReportMarkdown(['reports/2026-08-05.md'])).toBe(true);
  });

  it('is true for a report path staged as a DELETION — the function is status-agnostic by design (status filtering already happened in STAGED_PATHS_DIFF_ARGS)', () => {
    // Simulates what `git diff --cached --name-only --diff-filter=ACMRD -z`
    // returns for a `git rm`'d report: the path is still listed (git diff
    // --name-only lists the path regardless of status), the file just no
    // longer exists on disk. This function must still say "yes, regenerate".
    expect(hasStagedReportMarkdown(['reports/2026-08-04.md'])).toBe(true);
  });

  it('is true when the report is only one of several staged paths', () => {
    expect(hasStagedReportMarkdown(['src/App.tsx', 'BACKLOG.md', 'reports/2026-08-05.md'])).toBe(true);
  });

  it('is false when nothing under reports/ is staged (the common case: ordinary code commits)', () => {
    expect(hasStagedReportMarkdown(['src/App.tsx', 'package.json'])).toBe(false);
  });

  it('is false for a nested reports/ path (only top-level *.md files are run reports)', () => {
    expect(hasStagedReportMarkdown(['reports/sub/2026-08-05.md'])).toBe(false);
  });

  it('is false for a non-.md file directly under reports/', () => {
    expect(hasStagedReportMarkdown(['reports/2026-08-05.json'])).toBe(false);
  });
});

describe('stageReportArtifacts — no reports/*.md staged: no-op, generator never runs', () => {
  it('reports "skipped" and never calls the generator for an ordinary code commit', () => {
    const runGenerator = vi.fn();
    const stagePath = vi.fn();

    const result = stageReportArtifacts({
      repoRoot: REPO_ROOT,
      getStagedPaths: () => ['src/App.tsx', 'package.json'],
      runGenerator,
      stagePath,
    });

    expect(result.status).toBe('skipped');
    expect(runGenerator).not.toHaveBeenCalled();
    expect(stagePath).not.toHaveBeenCalled();
  });
});

describe('stageReportArtifacts — the PR #87 shape: a report staged, artifact stale, generator fixes it', () => {
  it('regenerates and stages runs.generated.json when its content changed, and reports which artifact it refreshed', () => {
    const staleRunsRow = '{\n  "rows": []\n}\n';
    const freshRunsRow = '{\n  "rows": [{ "date": "2026-08-01" }]\n}\n';
    const provenanceContent = '{}\n'; // unchanged by this report

    const contentByPath: Record<string, string> = {
      '/repo/src/content/provenance.generated.json': provenanceContent,
      '/repo/src/content/runs.generated.json': staleRunsRow,
    };

    const stagePath = vi.fn();
    let generatorRan = false;

    const result = stageReportArtifacts({
      repoRoot: REPO_ROOT,
      getStagedPaths: () => ['reports/2026-08-01.md'],
      runGenerator: () => {
        // Simulates `generate.mjs` overwriting the runs artifact on disk —
        // the same effect a real subprocess run would have.
        generatorRan = true;
        contentByPath['/repo/src/content/runs.generated.json'] = freshRunsRow;
        return makeGeneratorResult();
      },
      readArtifactContent: (absolutePath) => contentByPath[absolutePath] ?? null,
      stagePath,
    });

    expect(generatorRan).toBe(true);
    expect(result.status).toBe('staged');
    if (result.status === 'staged' || result.status === 'clean') {
      expect(result.refreshed).toEqual(['src/content/runs.generated.json']);
      expect(result.unchanged).toEqual(['src/content/provenance.generated.json']);
    }
    expect(stagePath).toHaveBeenCalledTimes(1);
    expect(stagePath).toHaveBeenCalledWith({ repoRoot: REPO_ROOT, relPath: 'src/content/runs.generated.json' });
  });

  it('stages both artifacts when both changed', () => {
    const contentByPath: Record<string, string> = {
      '/repo/src/content/provenance.generated.json': '{}\n',
      '/repo/src/content/runs.generated.json': '{}\n',
    };
    const stagePath = vi.fn();

    const result = stageReportArtifacts({
      repoRoot: REPO_ROOT,
      getStagedPaths: () => ['reports/2026-08-05.md'],
      runGenerator: () => {
        contentByPath['/repo/src/content/provenance.generated.json'] = '{"a":1}\n';
        contentByPath['/repo/src/content/runs.generated.json'] = '{"b":2}\n';
        return makeGeneratorResult();
      },
      readArtifactContent: (absolutePath) => contentByPath[absolutePath] ?? null,
      stagePath,
    });

    expect(result.status).toBe('staged');
    if (result.status === 'staged') {
      expect(result.refreshed.sort()).toEqual([...GENERATED_ARTIFACT_PATHS].sort());
    }
    expect(stagePath).toHaveBeenCalledTimes(2);
  });
});

describe('stageReportArtifacts — the deletion shape: a report REMOVED, not added, still drifts and gets fixed', () => {
  it('regenerates and stages runs.generated.json when a staged deletion changes it, exactly like an addition would', () => {
    // Mirrors the real failure reproduced against a scratch clone: `git rm
    // reports/2026-08-04.md` + commit (filter without `D`) left
    // runs.generated.json stale; regenerating removes that report's row.
    const runsRowStillPresent = '{\n  "rows": [{ "runId": "2026-08-04" }]\n}\n';
    const runsRowRemoved = '{\n  "rows": []\n}\n';
    const contentByPath: Record<string, string> = {
      '/repo/src/content/provenance.generated.json': '{}\n',
      '/repo/src/content/runs.generated.json': runsRowStillPresent,
    };
    const stagePath = vi.fn();

    const result = stageReportArtifacts({
      repoRoot: REPO_ROOT,
      // What `--diff-filter=ACMRD` (STAGED_PATHS_DIFF_ARGS) returns for a
      // `git rm`'d report: the path is still listed by `git diff
      // --name-only` even though the file no longer exists on disk.
      getStagedPaths: () => ['reports/2026-08-04.md'],
      runGenerator: () => {
        // The report is gone from disk, so regenerating drops its row —
        // the same effect a real `node scripts/provenance/generate.mjs` run
        // has once the file has actually been `git rm`'d.
        contentByPath['/repo/src/content/runs.generated.json'] = runsRowRemoved;
        return makeGeneratorResult();
      },
      readArtifactContent: (absolutePath) => contentByPath[absolutePath] ?? null,
      stagePath,
    });

    expect(result.status).toBe('staged');
    if (result.status === 'staged') {
      expect(result.refreshed).toEqual(['src/content/runs.generated.json']);
    }
    expect(stagePath).toHaveBeenCalledWith({ repoRoot: REPO_ROOT, relPath: 'src/content/runs.generated.json' });
  });
});

describe('stageReportArtifacts — generator produces no change: a legitimate clean no-op', () => {
  it('reports "clean" and stages nothing when the generator runs but content is identical', () => {
    const content = '{}\n';
    const contentByPath: Record<string, string> = {
      '/repo/src/content/provenance.generated.json': content,
      '/repo/src/content/runs.generated.json': content,
    };
    const stagePath = vi.fn();

    const result = stageReportArtifacts({
      repoRoot: REPO_ROOT,
      getStagedPaths: () => ['reports/2026-08-05.md'],
      // Generator "runs" but rewrites identical bytes — the same file,
      // same content (e.g. a report with no `yaml provenance` block).
      runGenerator: () => makeGeneratorResult(),
      readArtifactContent: (absolutePath) => contentByPath[absolutePath] ?? null,
      stagePath,
    });

    expect(result.status).toBe('clean');
    expect(stagePath).not.toHaveBeenCalled();
  });
});

describe('stageReportArtifacts — generator failure: BLOCKS, never stages a stale artifact', () => {
  it('reports "generator-failed" and never calls stagePath, even if content technically differs on disk', () => {
    const stagePath = vi.fn();

    const result = stageReportArtifacts({
      repoRoot: REPO_ROOT,
      getStagedPaths: () => ['reports/2026-08-05.md'],
      runGenerator: () => makeGeneratorResult({ ok: false, stderr: '[provenance] generation failed:\nsome content defect' }),
      readArtifactContent: () => '{}\n',
      stagePath,
    });

    expect(result.status).toBe('generator-failed');
    expect(stagePath).not.toHaveBeenCalled();
    if (result.status === 'generator-failed') {
      expect(result.stderr).toMatch(/generation failed/);
    }
  });

  it('surfaces a spawn-level error (e.g. node missing) as the failure reason, not a thrown exception', () => {
    const result = stageReportArtifacts({
      repoRoot: REPO_ROOT,
      getStagedPaths: () => ['reports/2026-08-05.md'],
      runGenerator: () => makeGeneratorResult({ ok: false, error: new Error('spawn node ENOENT') }),
      readArtifactContent: () => '{}\n',
      stagePath: vi.fn(),
    });

    expect(result.status).toBe('generator-failed');
    if (result.status === 'generator-failed') {
      expect(result.reason).toMatch(/ENOENT/);
    }
  });
});

describe('stageReportArtifacts — merge commits are not skipped', () => {
  it('regenerates and stages exactly as normal when isMergeCommit is true, and passes the flag through for logging', () => {
    const contentByPath: Record<string, string> = {
      '/repo/src/content/provenance.generated.json': '{}\n',
      '/repo/src/content/runs.generated.json': '{"stale":true}\n',
    };
    const stagePath = vi.fn();

    const result = stageReportArtifacts({
      repoRoot: REPO_ROOT,
      isMergeCommit: true,
      getStagedPaths: () => ['reports/2026-08-04.md'],
      runGenerator: () => {
        contentByPath['/repo/src/content/runs.generated.json'] = '{"stale":false}\n';
        return makeGeneratorResult();
      },
      readArtifactContent: (absolutePath) => contentByPath[absolutePath] ?? null,
      stagePath,
    });

    expect(result.status).toBe('staged');
    if (result.status === 'staged') {
      expect(result.isMergeCommit).toBe(true);
      expect(result.refreshed).toEqual(['src/content/runs.generated.json']);
    }
    expect(stagePath).toHaveBeenCalledTimes(1);
  });
});

describe('stageReportArtifacts — an artifact that does not exist yet on disk', () => {
  it('treats a missing-before / present-after artifact as changed (refreshed), not a crash', () => {
    const contentByPath: Record<string, string> = {
      '/repo/src/content/provenance.generated.json': '{}\n',
      // runs.generated.json intentionally absent from contentByPath (no key
      // -> readArtifactContent returns null) until the generator "creates"
      // it below.
    };
    const stagePath = vi.fn();

    const result = stageReportArtifacts({
      repoRoot: REPO_ROOT,
      getStagedPaths: () => ['reports/2026-08-05.md'],
      runGenerator: () => {
        contentByPath['/repo/src/content/runs.generated.json'] = '{"rows":[]}\n';
        return makeGeneratorResult();
      },
      readArtifactContent: (absolutePath) => contentByPath[absolutePath] ?? null,
      stagePath,
    });

    expect(result.status).toBe('staged');
    if (result.status === 'staged') {
      expect(result.refreshed).toEqual(['src/content/runs.generated.json']);
    }
  });
});
