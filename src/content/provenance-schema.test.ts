import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CommitSchema,
  JudgeSchema,
  TokensSchema,
  ProvenanceBlockSchema,
  ProvenanceRecordSchema,
  RunsArtifactRowSchema,
  RUN_ID_PATTERN,
  REPORT_PATH_PATTERN,
  RUN_KIND_BY_H1_PREFIX,
} from './provenance-schema';

const validCommit = {
  hash: 'a'.repeat(40),
  short: 'a1b2c3d',
  date: '2026-07-18T10:00:00.000Z',
};

const validBlock = {
  item: 'second-blog-post',
  title: 'Second blog post',
  branch: 'team/2026-07-18-second-post',
  produced: ['content/posts/2026-07-18-what-the-green-checkmarks-missed.md'],
  authors: ['Project Lead'],
  reviewers: [{ by: 'Project Lead', kind: 'fact-check' }],
  judge: null,
  tokens: null,
};

describe('CommitSchema', () => {
  it('accepts a real 40-char hex hash and a 7-12 char short hash', () => {
    expect(() => CommitSchema.parse(validCommit)).not.toThrow();
  });

  it('rejects a hash that is not exactly 40 hex chars', () => {
    expect(() => CommitSchema.parse({ ...validCommit, hash: 'a'.repeat(39) })).toThrow();
    expect(() => CommitSchema.parse({ ...validCommit, hash: 'a'.repeat(41) })).toThrow();
    expect(() => CommitSchema.parse({ ...validCommit, hash: 'g'.repeat(40) })).toThrow(); // not hex
  });

  it('rejects a short hash outside the 7-12 char range', () => {
    expect(() => CommitSchema.parse({ ...validCommit, short: 'a'.repeat(6) })).toThrow();
    expect(() => CommitSchema.parse({ ...validCommit, short: 'a'.repeat(13) })).toThrow();
  });
});

describe('JudgeSchema — type-level fabrication guards (§4.3)', () => {
  it('score must be a number, not a string — "93" and "≈93" are both rejected', () => {
    expect(() => JudgeSchema.parse({ verdict: 'PASS', round: 1, score: 93, outOf: 100 })).not.toThrow();
    expect(() => JudgeSchema.parse({ verdict: 'PASS', round: 1, score: '93', outOf: 100 })).toThrow();
  });

  it('verdict is a closed enum — no free-text verdicts', () => {
    expect(() => JudgeSchema.parse({ verdict: 'PASS', round: 1, score: 90, outOf: 100 })).not.toThrow();
    expect(() => JudgeSchema.parse({ verdict: 'PASSED', round: 1, score: 90, outOf: 100 })).toThrow();
  });

  it('round is bounded to 1-3', () => {
    expect(() => JudgeSchema.parse({ verdict: 'PASS', round: 0, score: 90, outOf: 100 })).toThrow();
    expect(() => JudgeSchema.parse({ verdict: 'PASS', round: 4, score: 90, outOf: 100 })).toThrow();
  });

  it('score is bounded to 0-100', () => {
    expect(() => JudgeSchema.parse({ verdict: 'PASS', round: 1, score: -1, outOf: 100 })).toThrow();
    expect(() => JudgeSchema.parse({ verdict: 'PASS', round: 1, score: 101, outOf: 100 })).toThrow();
  });

  it('outOf defaults to 100 when omitted', () => {
    const parsed = JudgeSchema.parse({ verdict: 'PASS', round: 1, score: 90 });
    expect(parsed.outOf).toBe(100);
  });
});

describe('TokensSchema — scope/agent refine', () => {
  it('scope "run" needs no agent', () => {
    expect(() => TokensSchema.parse({ approx: 173000, scope: 'run' })).not.toThrow();
  });

  it('scope "agent" REQUIRES an agent name', () => {
    expect(() => TokensSchema.parse({ approx: 50000, scope: 'agent' })).toThrow();
    expect(() => TokensSchema.parse({ approx: 50000, scope: 'agent', agent: 'marketer' })).not.toThrow();
  });

  it('approx must be a positive integer', () => {
    expect(() => TokensSchema.parse({ approx: 0, scope: 'run' })).toThrow();
    expect(() => TokensSchema.parse({ approx: -5, scope: 'run' })).toThrow();
    expect(() => TokensSchema.parse({ approx: 1.5, scope: 'run' })).toThrow();
  });
});

describe('ProvenanceBlockSchema (§4.1 raw report block shape)', () => {
  it('accepts the spec\'s own §4.1 example block verbatim', () => {
    expect(() => ProvenanceBlockSchema.parse(validBlock)).not.toThrow();
  });

  it('accepts a block with a real Judge verdict + a run-scoped token estimate', () => {
    expect(() =>
      ProvenanceBlockSchema.parse({
        ...validBlock,
        judge: { verdict: 'PASS', round: 2, score: 93, outOf: 100 },
        tokens: { approx: 173000, scope: 'run' },
      }),
    ).not.toThrow();
  });

  it('`produced` must list at least one path', () => {
    expect(() => ProvenanceBlockSchema.parse({ ...validBlock, produced: [] })).toThrow();
  });

  it('`item` must be lowercase kebab-case', () => {
    expect(() => ProvenanceBlockSchema.parse({ ...validBlock, item: 'Second Blog Post' })).toThrow();
    expect(() => ProvenanceBlockSchema.parse({ ...validBlock, item: 'second_blog_post' })).toThrow();
  });

  it('`authors` must be non-empty', () => {
    expect(() => ProvenanceBlockSchema.parse({ ...validBlock, authors: [] })).toThrow();
  });

  it('`reviewers[].kind` is a closed enum of the five real review types', () => {
    expect(() =>
      ProvenanceBlockSchema.parse({ ...validBlock, reviewers: [{ by: 'Dom', kind: 'vibes-check' }] }),
    ).toThrow();
  });

  it('`reviewers` defaults to [] when omitted', () => {
    const { reviewers: _omit, ...withoutReviewers } = validBlock;
    const parsed = ProvenanceBlockSchema.parse(withoutReviewers);
    expect(parsed.reviewers).toEqual([]);
  });

  it('`judge` distinguishes null (explicitly not judged) from absent (unrecorded) — §3.1', () => {
    const { judge: _omit, ...withoutJudge } = validBlock;
    const withNullJudge = ProvenanceBlockSchema.parse(validBlock);
    const withAbsentJudge = ProvenanceBlockSchema.parse(withoutJudge);
    expect(withNullJudge.judge).toBeNull();
    expect('judge' in withAbsentJudge).toBe(false);
  });
});

describe('ProvenanceRecordSchema (§4.2 — the per-file generated record)', () => {
  it('accepts a fully-populated record with a real commit', () => {
    expect(() =>
      ProvenanceRecordSchema.parse({
        runId: '2026-07-18',
        reportPath: 'reports/2026-07-18.md',
        item: 'second-blog-post',
        branch: 'team/2026-07-18-second-post',
        authors: ['Project Lead'],
        reviewers: [{ by: 'Project Lead', kind: 'fact-check' }],
        judge: null,
        tokens: null,
        commit: validCommit,
      }),
    ).not.toThrow();
  });

  it('`commit` is nullable but NOT optional — the key must always be present, one way or the other (§4.2)', () => {
    const base = {
      runId: '2026-07-18',
      reportPath: 'reports/2026-07-18.md',
      item: 'second-blog-post',
      authors: ['Project Lead'],
      reviewers: [],
    };
    // Present + null ("no commit yet") — legal.
    expect(() => ProvenanceRecordSchema.parse({ ...base, commit: null })).not.toThrow();
    // Key entirely absent — illegal (would be ambiguous between "not
    // resolved" and "resolution failed" — exactly the ambiguity §5.2's
    // failure table exists to remove).
    expect(() => ProvenanceRecordSchema.parse(base)).toThrow();
  });

  it('does NOT carry `produced` or `title` — those are block-only, join-time fields', () => {
    const parsed = ProvenanceRecordSchema.parse({
      runId: '2026-07-18',
      reportPath: 'reports/2026-07-18.md',
      item: 'second-blog-post',
      authors: ['Project Lead'],
      reviewers: [],
      commit: null,
      // Extra keys a caller might mistakenly carry through from the block —
      // Zod's default (non-strict) object parsing strips them silently,
      // which is exactly what we want here (they're join-only fields).
      produced: ['content/posts/foo.md'],
      title: 'Some title',
    } as never);
    expect(parsed).not.toHaveProperty('produced');
    expect(parsed).not.toHaveProperty('title');
  });

  it('`runId` and `reportPath` are now regex-pinned, not bare strings (docs/reports-surface.md §4.1/§6 PR 0)', () => {
    const base = {
      item: 'second-blog-post',
      authors: ['Project Lead'],
      reviewers: [],
      commit: null,
    };
    // A rejection that would actually matter: `reportPath` containing a
    // directory traversal or an absolute URL — the exact hazard the spec
    // calls out, since this value is interpolated into an `href` in
    // `ProvenanceStrip.tsx`.
    expect(() => ProvenanceRecordSchema.parse({ ...base, runId: '2026-07-18', reportPath: 'reports/../../etc/passwd.md' })).toThrow();
    expect(() => ProvenanceRecordSchema.parse({ ...base, runId: '2026-07-18', reportPath: 'https://evil.example/x.md' })).toThrow();
    expect(() => ProvenanceRecordSchema.parse({ ...base, runId: '2026-07-18', reportPath: '/etc/passwd' })).toThrow();
    // Wrong root directory — must be under `reports/`.
    expect(() => ProvenanceRecordSchema.parse({ ...base, runId: '2026-07-18', reportPath: 'docs/2026-07-18.md' })).toThrow();
    // `runId` must not be free text either.
    expect(() => ProvenanceRecordSchema.parse({ ...base, runId: 'not-a-date-at-all', reportPath: 'reports/2026-07-18.md' })).toThrow();
    expect(() => ProvenanceRecordSchema.parse({ ...base, runId: '../escape', reportPath: 'reports/2026-07-18.md' })).toThrow();

    // The real, legal shapes still parse.
    expect(() => ProvenanceRecordSchema.parse({ ...base, runId: '2026-07-18', reportPath: 'reports/2026-07-18.md' })).not.toThrow();
    expect(() => ProvenanceRecordSchema.parse({ ...base, runId: '2026-07-21-review', reportPath: 'reports/2026-07-21-review.md' })).not.toThrow();
    expect(() =>
      ProvenanceRecordSchema.parse({ ...base, runId: 'maintenance-2026-07-20', reportPath: 'reports/maintenance-2026-07-20.md' }),
    ).not.toThrow();
  });
});

/**
 * Regression guard, per the task: "validate these regexes against every real
 * value currently in `src/content/provenance.generated.json` and every
 * filename in `reports/` before committing — if a real existing value fails,
 * the regex is wrong, not the data." Reads the REAL committed artifact and
 * the REAL `reports/` directory off disk (not fixtures), so this fails the
 * moment a future real report/artifact value stops matching the pattern.
 */
describe('RUN_ID_PATTERN / REPORT_PATH_PATTERN — against every real value on disk', () => {
  const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

  it('every runId/reportPath already committed in provenance.generated.json matches both patterns', () => {
    const artifactPath = path.join(REPO_ROOT, 'src', 'content', 'provenance.generated.json');
    const raw = fs.readFileSync(artifactPath, 'utf8');
    const artifact = JSON.parse(raw) as Record<string, { runId: string; reportPath: string }>;
    const entries = Object.entries(artifact);
    expect(entries.length).toBeGreaterThan(0); // meaningless against zero records

    for (const [producedPath, record] of entries) {
      expect(record.runId, `runId "${record.runId}" (from ${producedPath}) does not match RUN_ID_PATTERN`).toMatch(RUN_ID_PATTERN);
      expect(
        record.reportPath,
        `reportPath "${record.reportPath}" (from ${producedPath}) does not match REPORT_PATH_PATTERN`,
      ).toMatch(REPORT_PATH_PATTERN);
    }
  });

  it('every real filename in reports/ produces a runId + reportPath that match both patterns', () => {
    const reportsDir = path.join(REPO_ROOT, 'reports');
    const filenames = fs.readdirSync(reportsDir).filter((name) => name.endsWith('.md'));
    expect(filenames.length).toBeGreaterThan(0);

    for (const filename of filenames) {
      const runId = filename.replace(/\.md$/, '');
      const reportPath = `reports/${filename}`;
      expect(runId, `runId "${runId}" (from reports/${filename}) does not match RUN_ID_PATTERN`).toMatch(RUN_ID_PATTERN);
      expect(reportPath, `reportPath "${reportPath}" does not match REPORT_PATH_PATTERN`).toMatch(REPORT_PATH_PATTERN);
    }
  });
});

describe('RunsArtifactRowSchema (docs/reports-surface.md §3.2)', () => {
  const validRow = {
    runId: '2026-07-20',
    reportPath: 'reports/2026-07-20.md',
    title: 'Run report — 2026-07-20',
    date: '2026-07-20',
    kind: 'run-report' as const,
  };

  it('accepts a fully-populated row', () => {
    expect(() => RunsArtifactRowSchema.parse(validRow)).not.toThrow();
  });

  it('`kind` is optional — a row with no recognised kind omits the key entirely', () => {
    const { kind: _omit, ...withoutKind } = validRow;
    const parsed = RunsArtifactRowSchema.parse(withoutKind);
    expect('kind' in parsed).toBe(false);
  });

  it('`kind` is a closed enum — no free-text kinds', () => {
    expect(() => RunsArtifactRowSchema.parse({ ...validRow, kind: 'blog-post' })).toThrow();
  });

  it('`date` must be YYYY-MM-DD', () => {
    expect(() => RunsArtifactRowSchema.parse({ ...validRow, date: '07-20-2026' })).toThrow();
    expect(() => RunsArtifactRowSchema.parse({ ...validRow, date: '2026-7-20' })).toThrow();
  });

  it('`title` must be non-empty', () => {
    expect(() => RunsArtifactRowSchema.parse({ ...validRow, title: '' })).toThrow();
  });

  it('`runId`/`reportPath` share the same regex pins as ProvenanceRecordSchema — same injection guard', () => {
    expect(() => RunsArtifactRowSchema.parse({ ...validRow, reportPath: '../../etc/passwd' })).toThrow();
    expect(() => RunsArtifactRowSchema.parse({ ...validRow, reportPath: 'https://evil.example/x.md' })).toThrow();
    expect(() => RunsArtifactRowSchema.parse({ ...validRow, runId: 'not a valid run id' })).toThrow();
  });

  it('RUN_KIND_BY_H1_PREFIX only ever maps to values the schema enum actually accepts', () => {
    for (const kind of Object.values(RUN_KIND_BY_H1_PREFIX)) {
      expect(() => RunsArtifactRowSchema.parse({ ...validRow, kind })).not.toThrow();
    }
  });

  it('has exactly the four kinds the real reports/ corpus uses today, no more, no fewer', () => {
    expect(Object.keys(RUN_KIND_BY_H1_PREFIX).sort()).toEqual(
      ['Critical review', 'Hire report', 'Maintenance sweep', 'Run report'].sort(),
    );
  });
});
