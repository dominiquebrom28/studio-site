import { describe, it, expect } from 'vitest';
import { resolveRunsArtifact, sortRuns, buildProducedByReportPath, getAllRuns } from './runs';
import type { RunsArtifactRow, ProvenanceArtifact, ProvenanceRecord } from './provenance-schema';
import type { Post, Project } from './schemas';

function validRow(overrides: Partial<RunsArtifactRow> = {}): RunsArtifactRow {
  return {
    runId: '2026-07-18',
    reportPath: 'reports/2026-07-18.md',
    title: 'Run report — 2026-07-18',
    date: '2026-07-18',
    kind: 'run-report',
    ...overrides,
  };
}

/** A fully-valid `ProvenanceRecord` (docs/provenance-model.md §4.2), reused
 * across the `buildProducedByReportPath` join tests below — same fixture
 * shape `loader.test.ts` uses for the forward join. */
function validRecord(overrides: Partial<ProvenanceRecord> = {}): ProvenanceRecord {
  return {
    runId: '2026-07-20',
    reportPath: 'reports/2026-07-20.md',
    item: 'post-red-is-not-self-justifying',
    authors: ['Project Lead'],
    reviewers: [],
    judge: null,
    commit: null,
    ...overrides,
  };
}

describe('resolveRunsArtifact — fail-loud on a missing/invalid generated artifact (docs/provenance-model.md §5.2)', () => {
  it('throws an actionable error (naming `provenance:generate`) when the artifact glob matched nothing at all', () => {
    expect(() => resolveRunsArtifact(undefined)).toThrow(/Missing generated runs artifact/);
  });

  it('does NOT confuse "missing" with "present but empty" — an empty array is a valid, honest artifact', () => {
    expect(resolveRunsArtifact([])).toEqual([]);
  });

  it('throws a field-qualified error when the artifact exists but fails RunsArtifactSchema', () => {
    expect(() => resolveRunsArtifact([{ ...validRow(), date: 'not-a-date' }])).toThrow(/date/);
  });

  it('returns real, fully-populated rows unchanged on success', () => {
    const rows = [validRow()];
    expect(resolveRunsArtifact(rows)).toEqual(rows);
  });
});

describe('sortRuns — date desc, runId (filename-stem) asc tie-break, matching sortPosts\'s final rule', () => {
  it('sorts by date descending', () => {
    const rows = [
      validRow({ runId: 'a', date: '2026-01-01' }),
      validRow({ runId: 'b', date: '2026-07-01' }),
      validRow({ runId: 'c', date: '2026-03-01' }),
    ];
    expect(sortRuns(rows).map((r) => r.runId)).toEqual(['b', 'c', 'a']);
  });

  it('breaks a same-date tie by runId ascending, never input/glob order — mirrors the real 2026-07-15 3-way tie', () => {
    const rows = [
      validRow({ runId: '2026-07-15-persona-and-build', date: '2026-07-15' }),
      validRow({ runId: '2026-07-15', date: '2026-07-15' }),
      validRow({ runId: '2026-07-15-design-brief', date: '2026-07-15' }),
    ];
    expect(sortRuns(rows).map((r) => r.runId)).toEqual([
      '2026-07-15',
      '2026-07-15-design-brief',
      '2026-07-15-persona-and-build',
    ]);
  });

  it('does not mutate the input array', () => {
    const rows = [validRow({ runId: 'a', date: '2020-01-01' }), validRow({ runId: 'b', date: '2026-01-01' })];
    const original = [...rows];
    sortRuns(rows);
    expect(rows).toEqual(original);
  });
});

describe('buildProducedByReportPath — the reverse join to Post/Project (docs/reports-surface.md §3.2)', () => {
  it('resolves a produced content/posts/ path to the matching live Post via the shared provenance record reference', () => {
    const record = validRecord();
    const artifact: ProvenanceArtifact = { 'content/posts/2026-07-20-red-is-not-self-justifying.md': record };
    const post = {
      slug: 'red-is-not-self-justifying',
      title: 'Red Is Not Self-Justifying',
      provenance: record,
    } as unknown as Post;

    const index = buildProducedByReportPath(artifact, [post], []);

    expect(index.get('reports/2026-07-20.md')).toEqual([
      { kind: 'post', slug: 'red-is-not-self-justifying', title: 'Red Is Not Self-Justifying' },
    ]);
  });

  it('resolves a produced content/projects/ path to the matching live Project', () => {
    const record = validRecord({ item: 'project-writeups-new-2026-07-16', reportPath: 'reports/2026-07-16.md' });
    const project = { slug: 'lovediary', title: 'LoveDiary', provenance: record } as unknown as Project;

    const index = buildProducedByReportPath({ 'content/projects/lovediary.md': record }, [], [project]);

    expect(index.get('reports/2026-07-16.md')).toEqual([{ kind: 'project', slug: 'lovediary', title: 'LoveDiary' }]);
  });

  it('a run whose reportPath never appears in the artifact resolves to no entry at all — "no recorded output"', () => {
    const index = buildProducedByReportPath({}, [], []);
    expect(index.get('reports/2026-07-24.md')).toBeUndefined();
    expect(index.has('reports/2026-07-24.md')).toBe(false);
  });

  it('a produced path outside content/posts or content/projects (docs/, scripts/) is silently excluded — no in-site link exists for it', () => {
    const record = validRecord({ item: 'reports-surface-spec', reportPath: 'reports/2026-07-30.md' });
    const artifact: ProvenanceArtifact = { 'docs/reports-surface.md': record };

    const index = buildProducedByReportPath(artifact, [], []);

    expect(index.get('reports/2026-07-30.md')).toBeUndefined();
  });

  it('a produced path naming a post filtered out of the live `posts` array (e.g. a draft in prod) resolves to no entry — never fabricated', () => {
    const record = validRecord();
    const artifact: ProvenanceArtifact = { 'content/posts/still-draft.md': record };

    // The post this record names is deliberately NOT passed in `postsList` —
    // simulating `filterVisiblePosts` excluding a draft in production.
    const index = buildProducedByReportPath(artifact, [], []);

    expect(index.get(record.reportPath)).toBeUndefined();
  });

  it('a batch run producing one post and three projects from a single report resolves every one, sorted by slug', () => {
    // Mirrors the real reports/2026-07-16.md run: three provenance records
    // with byte-identical content (same item/commit/reportPath) but three
    // DISTINCT object instances — exactly what independent JSON keys parse
    // to, even when their text is duplicated. Confirms the join disambiguates
    // by path->record identity, not by (non-unique) `item` content.
    const recordA = validRecord({ item: 'project-writeups-new-2026-07-16', reportPath: 'reports/2026-07-16.md' });
    const recordB = validRecord({ item: 'project-writeups-new-2026-07-16', reportPath: 'reports/2026-07-16.md' });
    const recordC = validRecord({ item: 'project-writeups-new-2026-07-16', reportPath: 'reports/2026-07-16.md' });
    const recordPost = validRecord({ item: 'post-the-day-the-repos-got-honest', reportPath: 'reports/2026-07-16.md' });

    const projZebra = { slug: 'zebra-project', title: 'Zebra', provenance: recordA } as unknown as Project;
    const projApple = { slug: 'apple-project', title: 'Apple', provenance: recordB } as unknown as Project;
    const projMango = { slug: 'mango-project', title: 'Mango', provenance: recordC } as unknown as Project;
    const post = { slug: 'the-day-the-repos-got-honest', title: 'The day', provenance: recordPost } as unknown as Post;

    const artifact: ProvenanceArtifact = {
      'content/projects/zebra.md': recordA,
      'content/projects/apple.md': recordB,
      'content/projects/mango.md': recordC,
      'content/posts/2026-07-16-the-day-the-repos-got-honest.md': recordPost,
    };

    const index = buildProducedByReportPath(artifact, [post], [projZebra, projApple, projMango]);

    expect(index.get('reports/2026-07-16.md')?.map((r) => r.slug)).toEqual([
      'apple-project',
      'mango-project',
      'the-day-the-repos-got-honest',
      'zebra-project',
    ]);
  });
});

describe('getAllRuns — against the real generated data (src/content/runs.generated.json + provenance.generated.json)', () => {
  it('returns a non-empty, date-descending list', () => {
    const runs = getAllRuns();
    expect(runs.length).toBeGreaterThan(0);
    for (let i = 1; i < runs.length; i++) {
      expect(Date.parse(runs[i - 1].date)).toBeGreaterThanOrEqual(Date.parse(runs[i].date));
    }
  });

  it('covers all three report filename shapes: plain date, date-suffixed, and maintenance-prefixed', () => {
    const byId = new Map(getAllRuns().map((r) => [r.runId, r]));

    expect(byId.get('2026-07-29')).toMatchObject({
      reportPath: 'reports/2026-07-29.md',
      date: '2026-07-29',
      kind: 'run-report',
    });
    expect(byId.get('2026-07-21-review')).toMatchObject({
      reportPath: 'reports/2026-07-21-review.md',
      date: '2026-07-21',
      kind: 'critical-review',
    });
    expect(byId.get('maintenance-2026-07-20')).toMatchObject({
      reportPath: 'reports/maintenance-2026-07-20.md',
      date: '2026-07-20',
      kind: 'maintenance-sweep',
    });
  });

  it('honestly reports "no recorded output" (an empty `produced` array) for a run with no yaml provenance block', () => {
    const run = getAllRuns().find((r) => r.runId === '2026-07-29');
    expect(run).toBeDefined();
    expect(run?.produced).toEqual([]);
  });

  it('resolves a run with recorded output to the live post\'s current title and slug', () => {
    const run = getAllRuns().find((r) => r.runId === '2026-07-20');
    expect(run?.produced).toContainEqual({
      kind: 'post',
      slug: 'red-is-not-self-justifying',
      title: 'Red Is Not Self-Justifying',
    });
  });

  it('resolves the 2026-07-16 batch run to its one post and three projects', () => {
    const run = getAllRuns().find((r) => r.runId === '2026-07-16');
    expect(run?.produced.map((p) => p.kind).sort()).toEqual(['post', 'project', 'project', 'project']);
    expect(run?.produced.map((p) => p.slug).sort()).toEqual([
      'lovediary',
      'mensapp',
      'pizzaparty',
      'the-day-the-repos-got-honest',
    ]);
  });
});
