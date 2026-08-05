import { describe, expect, it, vi } from 'vitest';
import { GENERATED_ARTIFACT_PATHS, hasStagedReportMarkdown, parseNulSeparatedPaths, stageReportArtifacts } from './stage-report-artifacts.mjs';

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

describe('hasStagedReportMarkdown', () => {
  it('is true for a top-level reports/*.md path', () => {
    expect(hasStagedReportMarkdown(['reports/2026-08-05.md'])).toBe(true);
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
