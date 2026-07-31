import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateProvenance, ProvenanceGitError } from './generate.mjs';
import { ProvenanceValidationError } from './parse.mjs';
import { ProvenanceBlockSchema, ProvenanceRecordSchema } from '../../src/content/provenance-schema';
import { cast } from '../../src/content/cast';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = path.join(DIRNAME, '__fixtures__', 'repo');

function reportsDir(scenario: string): string {
  return path.join(FIXTURES_ROOT, 'reports', scenario);
}

/**
 * Test double for the Vite `ssrLoadModule` boot in `generate.mjs`'s real
 * `loadContentModules`: returns the REAL schemas/cast (imported directly by
 * Vitest, which — unlike a bare `node` process — can import `.ts` with no
 * loader) rather than a duplicated/mocked shape, so this suite fails the
 * moment the real schema and the generator's expectations of it drift.
 */
async function fakeLoadModules() {
  return {
    ProvenanceBlockSchema,
    ProvenanceRecordSchema,
    castNames: cast.map((member) => member.name),
  };
}

type GitRunnerArgs = { cwd: string; args: string[] };

/** Builds an injectable `gitRunner` for `generateProvenance`. `logOutputs`
 * maps a produced path to the `git log --diff-filter=A ...` stdout that
 * should be "returned" for it (default: empty = no commit yet). */
function makeGitRunner({
  isShallow = 'false',
  logOutputs = {},
  failOn,
}: {
  isShallow?: string;
  logOutputs?: Record<string, string>;
  failOn?: (args: string[]) => boolean;
} = {}) {
  return vi.fn(({ args }: GitRunnerArgs): string => {
    if (failOn?.(args)) {
      throw new Error('simulated git failure');
    }
    if (args[0] === 'rev-parse') return `${isShallow}\n`;
    if (args[0] === 'log') {
      const producedPath = args[args.length - 1];
      return logOutputs[producedPath] ?? '';
    }
    throw new Error(`unexpected git invocation in test double: ${args.join(' ')}`);
  });
}

const REAL_COMMIT_LINE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\x002026-07-21T14:29:06+02:00\n';

describe('generateProvenance — zero-blocks case (§9 / caution: must be fast and error-free)', () => {
  it('returns {} for a reports dir with no yaml provenance blocks, WITHOUT ever calling git', async () => {
    const gitRunner = makeGitRunner();
    const records = await generateProvenance({
      repoRoot: FIXTURES_ROOT,
      reportsDir: reportsDir('no-block'),
      loadModules: fakeLoadModules,
      gitRunner,
    });
    expect(records).toEqual({});
    expect(gitRunner).not.toHaveBeenCalled();
  });

  it('returns {} for a reports dir that does not exist on disk', async () => {
    const gitRunner = makeGitRunner();
    const records = await generateProvenance({
      repoRoot: FIXTURES_ROOT,
      reportsDir: reportsDir('does-not-exist'),
      loadModules: fakeLoadModules,
      gitRunner,
    });
    expect(records).toEqual({});
    expect(gitRunner).not.toHaveBeenCalled();
  });
});

describe('generateProvenance — happy path / commit resolution', () => {
  it('resolves a real commit for a produced path git has history for', async () => {
    const records = await generateProvenance({
      repoRoot: FIXTURES_ROOT,
      reportsDir: reportsDir('happy'),
      loadModules: fakeLoadModules,
      gitRunner: makeGitRunner({ logOutputs: { 'content/happy-item.md': REAL_COMMIT_LINE } }),
    });
    expect(Object.keys(records)).toEqual(['content/happy-item.md']);
    const record = records['content/happy-item.md'];
    expect(record.commit).toEqual({
      hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      short: 'aaaaaaaaaaaa',
      date: '2026-07-21T14:29:06+02:00',
    });
    expect(record.runId).toBe('2026-01-01-happy');
    expect(record.reportPath).toBe('reports/happy/2026-01-01-happy.md');
    expect(record.item).toBe('happy-item');
    expect(record.branch).toBe('team/2026-01-01-happy');
    expect(record.judge).toBeNull();
    expect(record.tokens).toBeNull();
    // Every record is re-validated against the real ProvenanceRecordSchema
    // before being returned — assert that holds, not just that it "looks
    // right".
    expect(() => ProvenanceRecordSchema.parse(record)).not.toThrow();
  });

  it('§5.2: file exists but has no commit yet -> commit: null, build succeeds (distinct from a git failure)', async () => {
    const records = await generateProvenance({
      repoRoot: FIXTURES_ROOT,
      reportsDir: reportsDir('happy'),
      loadModules: fakeLoadModules,
      gitRunner: makeGitRunner({ logOutputs: {} }), // empty stdout for every `git log` call
    });
    expect(records['content/happy-item.md'].commit).toBeNull();
  });

  it('carries judge/tokens objects and branch-omission through multi-item reports untouched', async () => {
    const records = await generateProvenance({
      repoRoot: FIXTURES_ROOT,
      reportsDir: reportsDir('multi-item'),
      loadModules: fakeLoadModules,
      gitRunner: makeGitRunner({
        logOutputs: {
          'content/multi-item-a.md': REAL_COMMIT_LINE,
          'content/multi-item-b.md': REAL_COMMIT_LINE,
        },
      }),
    });
    expect(Object.keys(records).sort()).toEqual(['content/multi-item-a.md', 'content/multi-item-b.md']);
    expect(records['content/multi-item-a.md'].judge).toBeNull();
    expect(records['content/multi-item-a.md']).not.toHaveProperty('branch');
    expect(records['content/multi-item-b.md'].judge).toEqual({ verdict: 'PASS', round: 1, score: 91, outOf: 100 });
    expect(records['content/multi-item-b.md'].tokens).toEqual({ approx: 12000, scope: 'run' });
  });

  it('the judge/tokens key being entirely absent in the block stays entirely absent in the record (the third, "unrecorded" state)', async () => {
    const records = await generateProvenance({
      repoRoot: FIXTURES_ROOT,
      reportsDir: reportsDir('no-judge-key'),
      loadModules: fakeLoadModules,
      gitRunner: makeGitRunner({ logOutputs: { 'content/no-judge-item.md': REAL_COMMIT_LINE } }),
    });
    const record = records['content/no-judge-item.md'];
    expect('judge' in record).toBe(false);
    expect('tokens' in record).toBe(false);
  });

  it('picks the OLDEST add-commit when git log --diff-filter=A returns multiple hits (added, deleted, re-added)', async () => {
    const olderLine = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\x002020-01-01T00:00:00+00:00';
    const newerLine = 'cccccccccccccccccccccccccccccccccccccccc'.slice(0, 40) + '\x002025-01-01T00:00:00+00:00';
    // git log's default order is newest-first, so the OLDER commit is the
    // LAST line — the test double mirrors that ordering exactly.
    const multiHit = `${newerLine}\n${olderLine}\n`;
    const records = await generateProvenance({
      repoRoot: FIXTURES_ROOT,
      reportsDir: reportsDir('happy'),
      loadModules: fakeLoadModules,
      gitRunner: makeGitRunner({ logOutputs: { 'content/happy-item.md': multiHit } }),
    });
    expect(records['content/happy-item.md'].commit?.date).toBe('2020-01-01T00:00:00+00:00');
  });
});

describe('generateProvenance — failure table (§5.2)', () => {
  it('duplicate `produced` path across two reports -> build fails, naming both reports, and git is never touched', async () => {
    const gitRunner = makeGitRunner();
    await expect(
      generateProvenance({
        repoRoot: FIXTURES_ROOT,
        reportsDir: reportsDir('duplicate'),
        loadModules: fakeLoadModules,
        gitRunner,
      }),
    ).rejects.toThrow(ProvenanceValidationError);
    expect(gitRunner).not.toHaveBeenCalled();

    try {
      await generateProvenance({
        repoRoot: FIXTURES_ROOT,
        reportsDir: reportsDir('duplicate'),
        loadModules: fakeLoadModules,
        gitRunner: makeGitRunner(),
      });
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof ProvenanceValidationError>;
      expect(err.issues).toHaveLength(1);
      expect(err.issues[0]).toContain('content/dup-target.md');
      expect(err.issues[0]).toContain('reports/duplicate/2026-01-02-a.md');
      expect(err.issues[0]).toContain('reports/duplicate/2026-01-02-b.md');
    }
  });

  it('a dangling `produced` path (does not exist on disk) -> build fails, and git is never touched', async () => {
    const gitRunner = makeGitRunner();
    try {
      await generateProvenance({
        repoRoot: FIXTURES_ROOT,
        reportsDir: reportsDir('dangling'),
        loadModules: fakeLoadModules,
        gitRunner,
      });
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof ProvenanceValidationError>;
      expect(err.issues).toHaveLength(1);
      expect(err.issues[0]).toContain('content/does-not-exist.md');
      expect(err.issues[0]).toContain('does not exist on disk');
    }
    expect(gitRunner).not.toHaveBeenCalled();
  });

  it('a `produced` path that attempts to escape the repo root ("..") -> build fails, and git is never touched (§7)', async () => {
    const gitRunner = makeGitRunner();
    try {
      await generateProvenance({
        repoRoot: FIXTURES_ROOT,
        reportsDir: reportsDir('escape'),
        loadModules: fakeLoadModules,
        gitRunner,
      });
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof ProvenanceValidationError>;
      expect(err.issues).toHaveLength(1);
      expect(err.issues[0]).toContain('../outside-repo.md');
      expect(err.issues[0]).toMatch(/escape the repo root|repo-relative/);
    }
    expect(gitRunner).not.toHaveBeenCalled();
  });

  it('a `produced` path that is a DIRECTORY, not a file -> build fails, and git is never touched (§4.1, QA P1 2026-07-23)', async () => {
    const gitRunner = makeGitRunner();
    try {
      await generateProvenance({
        repoRoot: FIXTURES_ROOT,
        reportsDir: reportsDir('produced-is-directory'),
        loadModules: fakeLoadModules,
        gitRunner,
      });
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof ProvenanceValidationError>;
      expect(err.issues).toHaveLength(1);
      expect(err.issues[0]).toContain('content/a-directory');
      expect(err.issues[0]).toContain('directory');
    }
    expect(gitRunner).not.toHaveBeenCalled();
  });

  it('the SAME item claiming the same `produced` path twice within ONE report names the report + item once, not "both X and X" (QA P2 2026-07-23)', async () => {
    const gitRunner = makeGitRunner();
    try {
      await generateProvenance({
        repoRoot: FIXTURES_ROOT,
        reportsDir: reportsDir('duplicate-same-report'),
        loadModules: fakeLoadModules,
        gitRunner,
      });
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof ProvenanceValidationError>;
      expect(err.issues).toHaveLength(1);
      expect(err.issues[0]).toContain('content/happy-item.md');
      expect(err.issues[0]).toContain('claimed twice within reports/duplicate-same-report/2026-01-13-duplicate-same-report.md');
      expect(err.issues[0]).toContain('item "same-item"');
      expect(err.issues[0]).toContain('remove one of the duplicate blocks');
      // The old, uninformative phrasing ("claimed by both X and X") must be gone.
      expect(err.issues[0]).not.toMatch(/claimed by both .* and .*claimed by both/);
    }
    expect(gitRunner).not.toHaveBeenCalled();
  });

  it('two DIFFERENT items in the same report claiming the same `produced` path names both items', async () => {
    try {
      await generateProvenance({
        repoRoot: FIXTURES_ROOT,
        reportsDir: reportsDir('duplicate-same-report-different-items'),
        loadModules: fakeLoadModules,
        gitRunner: makeGitRunner(),
      });
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof ProvenanceValidationError>;
      expect(err.issues).toHaveLength(1);
      expect(err.issues[0]).toContain('reports/duplicate-same-report-different-items/2026-01-14-duplicate-same-report-different-items.md');
      expect(err.issues[0]).toContain('item "item-a"');
      expect(err.issues[0]).toContain('item "item-b"');
    }
  });

  it('git command failure (not installed / not a repo) -> loud ProvenanceGitError, distinct from a validation error', async () => {
    const gitRunner = makeGitRunner({ failOn: (args) => args[0] === 'rev-parse' });
    await expect(
      generateProvenance({
        repoRoot: FIXTURES_ROOT,
        reportsDir: reportsDir('happy'),
        loadModules: fakeLoadModules,
        gitRunner,
      }),
    ).rejects.toThrow(ProvenanceGitError);
  });

  it('shallow clone detected (`git rev-parse --is-shallow-repository` -> true) -> loud ProvenanceGitError naming fetch-depth', async () => {
    const gitRunner = makeGitRunner({ isShallow: 'true' });
    try {
      await generateProvenance({
        repoRoot: FIXTURES_ROOT,
        reportsDir: reportsDir('happy'),
        loadModules: fakeLoadModules,
        gitRunner,
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ProvenanceGitError);
      expect((error as Error).message).toContain('shallow');
      expect((error as Error).message).toContain('fetch-depth');
    }
  });

  it('`git log` itself failing (after a clean, non-shallow `rev-parse`) -> loud ProvenanceGitError', async () => {
    const gitRunner = makeGitRunner({ failOn: (args) => args[0] === 'log' });
    await expect(
      generateProvenance({
        repoRoot: FIXTURES_ROOT,
        reportsDir: reportsDir('happy'),
        loadModules: fakeLoadModules,
        gitRunner,
      }),
    ).rejects.toThrow(ProvenanceGitError);
  });

  it('a schema-invalid block still fails loudly through the full generate path (not just parse)', async () => {
    await expect(
      generateProvenance({
        repoRoot: FIXTURES_ROOT,
        reportsDir: reportsDir('bad-schema'),
        loadModules: fakeLoadModules,
        gitRunner: makeGitRunner(),
      }),
    ).rejects.toThrow(ProvenanceValidationError);
  });
});

describe('generateProvenance — against the REAL reports/ directory', () => {
  // Was "zero blocks shipped yet -> {}" (true 2026-07-23). The first backfill
  // tranche (2026-07-27, team/2026-07-27-provenance-backfill) shipped
  // `yaml provenance` blocks for eight logbook posts. The second
  // (2026-07-29, team/2026-07-29-provenance-project-strip, docs/
  // provenance-model.md §12 PR 7) added a SECOND block to
  // `reports/2026-07-16.md` covering exactly the three project write-ups
  // that report's own commit (`48e4fe5`) actually created —
  // pizzaparty/mensapp/lovediary. The other three project write-ups named in
  // that same report's "Files" section (soulforge, portfolio,
  // chart-token-playground) were "replaced placeholders", not new files —
  // their real adding commit (`980a4c2`) belongs to an earlier, different
  // run that shipped placeholder text, not this one — so they are
  // deliberately NOT in `produced` and correctly render "no run record" on
  // the site (see the report's own "Project write-ups backfill" section and
  // the ProjectDetail PR body for the full accounting). This test's job is
  // now to guard that the real reports keep PARSING CLEANLY (no
  // schema/cast/uniqueness error) and that records key off exactly the
  // expected produced paths — not to snapshot the full record shape (the
  // happy-path tests above already own that), and not to assert commit
  // values (this fake git runner resolves none; the real generator resolves
  // them at build time).
  it('parses cleanly and produces one record per backfilled post/project path', async () => {
    const REPO_ROOT = path.resolve(DIRNAME, '..', '..');
    const records = await generateProvenance({
      repoRoot: REPO_ROOT,
      reportsDir: path.join(REPO_ROOT, 'reports'),
      loadModules: fakeLoadModules,
      gitRunner: makeGitRunner(),
    });
    expect(Object.keys(records).sort()).toEqual([
      'content/posts/2026-07-16-the-day-the-repos-got-honest.md',
      'content/posts/2026-07-17-teaching-the-studio-to-merge-itself.md',
      'content/posts/2026-07-18-we-hired-someone-to-look-at-the-page.md',
      'content/posts/2026-07-18-what-the-green-checkmarks-missed.md',
      'content/posts/2026-07-19-three-tries-at-the-same-overlap.md',
      'content/posts/2026-07-20-red-is-not-self-justifying.md',
      'content/posts/2026-07-22-one-commit-and-it-was-the-post.md',
      'content/posts/2026-07-23-two-things-that-passed-every-gate.md',
      'content/projects/lovediary.md',
      'content/projects/mensapp.md',
      'content/projects/pizzaparty.md',
    ]);
    // Deliberately excluded — see the doc comment above. Asserted here so a
    // future report block accidentally re-claiming one of these under a
    // wrong commit fails this test loudly, not silently.
    for (const excludedPath of [
      'content/projects/soulforge.md',
      'content/projects/portfolio.md',
      'content/projects/chart-token-playground.md',
    ]) {
      expect(records[excludedPath]).toBeUndefined();
    }
    // Every real record satisfies the schema's floor (authors non-empty).
    for (const record of Object.values(records)) {
      expect(record.authors.length).toBeGreaterThan(0);
    }
  });
});
