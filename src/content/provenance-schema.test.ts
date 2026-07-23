import { describe, it, expect } from 'vitest';
import {
  CommitSchema,
  JudgeSchema,
  TokensSchema,
  ProvenanceBlockSchema,
  ProvenanceRecordSchema,
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
});
