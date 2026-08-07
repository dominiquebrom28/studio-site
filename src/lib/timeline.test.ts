import { describe, it, expect } from 'vitest';
import { buildTimelineScaffold, positionForDate, numberPhasesChronologically, GAP_THRESHOLD_DAYS } from './timeline';
import type { CommitBurst, ProcessPhase } from '@/content/schemas';

function burst(date: string, count: number, overrides: Partial<CommitBurst> = {}): CommitBurst {
  return { date, count, isCleanupSweep: false, ...overrides };
}

function phase(from: string, to: string | undefined, narrative: string, overrides: Partial<ProcessPhase> = {}): ProcessPhase {
  return { from, to, title: 'A phase', narrative, tone: 'build', ...overrides };
}

describe('buildTimelineScaffold', () => {
  it('throws on an empty commit list (single-sitting template exists for exactly this case)', () => {
    expect(() => buildTimelineScaffold([], 'shipped')).toThrow();
  });

  it('positions the first and last commit at 0 and 1 for a closed (non-in-progress) project', () => {
    const scaffold = buildTimelineScaffold(
      [burst('2026-04-29', 7), burst('2026-07-16', 1, { isCleanupSweep: true })],
      'shipped',
    );
    expect(scaffold.ticks[0].position).toBe(0);
    expect(scaffold.ticks[1].position).toBe(1);
    expect(scaffold.isOpenEnded).toBe(false);
    expect(scaffold.domainEnd).toBe('2026-07-16');
  });

  it('is real elapsed time, LINEAR — not evenly spaced ticks (MensApp shape: a dense early cluster, then a long stretch)', () => {
    // Domain: 2026-04-29 -> 2026-07-16 = 78 days total.
    const scaffold = buildTimelineScaffold(
      [
        burst('2026-04-29', 7),
        burst('2026-04-30', 6), // +1 day
        burst('2026-05-02', 8), // +2 days
        burst('2026-05-04', 1), // +2 days
        burst('2026-05-05', 1), // +1 day
        burst('2026-07-16', 1, { isCleanupSweep: true }), // +72 days
      ],
      'shipped',
    );

    const positions = scaffold.ticks.map((t) => t.position);
    // Evenly-spaced ticks (the thing this component must NOT do) would put
    // 6 ticks at 0, 0.2, 0.4, 0.6, 0.8, 1. The real dates instead collapse
    // the first five into a tight knot near the start.
    expect(positions[0]).toBe(0);
    expect(positions[4]).toBeCloseTo(6 / 78, 5); // the 5th commit, 6 real days in
    expect(positions[4]).toBeLessThan(0.2); // nowhere near "evenly spaced" 0.8
    expect(positions[5]).toBe(1);

    // The gap between the dense knot and the sweep is proportionally huge
    // (72 of 78 days) — exactly the "honest by construction" void the spec
    // requires, not a fudge.
    expect(positions[5] - positions[4]).toBeCloseTo(72 / 78, 5);
  });

  it('flags a gap only when real elapsed days meet the threshold (boundary: 13 days no flag, 14 days flagged)', () => {
    const justUnder = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-01-14', 1)], 'shipped'); // 13 days
    expect(justUnder.gaps).toEqual([]);

    const atThreshold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-01-15', 1)], 'shipped'); // 14 days
    expect(atThreshold.gaps).toHaveLength(1);
    expect(atThreshold.gaps[0].days).toBe(GAP_THRESHOLD_DAYS);
  });

  it(`stamps a gap's real duration when >= ${GAP_THRESHOLD_DAYS} days apart, positioned at the midpoint`, () => {
    const scaffold = buildTimelineScaffold([burst('2026-06-15', 9), burst('2026-07-16', 1)], 'shipped');
    // 31 real days apart (June 15 -> July 16).
    expect(scaffold.gaps).toHaveLength(1);
    expect(scaffold.gaps[0].days).toBe(31);
    expect(scaffold.gaps[0].position).toBeCloseTo(0.5, 5);
  });

  it('does not flag a gap under the threshold', () => {
    const scaffold = buildTimelineScaffold([burst('2026-05-03', 1), burst('2026-05-04', 8)], 'in-progress');
    expect(scaffold.gaps).toEqual([]);
  });

  it('extends the domain to "now" with an explicit open terminus when status is in-progress', () => {
    const now = new Date('2026-07-19T12:00:00Z');
    const scaffold = buildTimelineScaffold(
      [burst('2026-06-15', 9), burst('2026-07-16', 1, { isCleanupSweep: true })],
      'in-progress',
      now,
    );
    expect(scaffold.isOpenEnded).toBe(true);
    expect(scaffold.domainEnd).toBe('2026-07-19');
    // The last real commit (the sweep) is no longer at position 1 — the
    // rule keeps drawing past it to "today."
    expect(scaffold.ticks[1].position).toBeLessThan(1);
  });

  it('does not extend the domain past the last commit for a shipped/archived project', () => {
    const now = new Date('2026-12-01T00:00:00Z');
    const scaffold = buildTimelineScaffold([burst('2026-04-29', 7), burst('2026-07-16', 1)], 'archived', now);
    expect(scaffold.isOpenEnded).toBe(false);
    expect(scaffold.domainEnd).toBe('2026-07-16');
    expect(scaffold.ticks[1].position).toBe(1);
  });

  it('sorts commits by date regardless of input order', () => {
    const scaffold = buildTimelineScaffold([burst('2026-07-16', 1), burst('2026-06-15', 9)], 'shipped');
    expect(scaffold.ticks.map((t) => t.date)).toEqual(['2026-06-15', '2026-07-16']);
  });

  it('handles a zero-span domain (a single commit day) without dividing by zero', () => {
    const scaffold = buildTimelineScaffold([burst('2026-06-24', 1)], 'shipped');
    expect(scaffold.ticks[0].position).toBe(0);
    expect(Number.isNaN(scaffold.ticks[0].position)).toBe(false);
    expect(scaffold.gaps).toEqual([]);
  });

  it('preserves count and the cleanup-sweep flag per tick', () => {
    const scaffold = buildTimelineScaffold([burst('2026-06-15', 9), burst('2026-07-16', 1, { isCleanupSweep: true })], 'shipped');
    expect(scaffold.ticks[0].count).toBe(9);
    expect(scaffold.ticks[0].isCleanupSweep).toBe(false);
    expect(scaffold.ticks[1].isCleanupSweep).toBe(true);
  });

  it('omits an empty-string commitUrl rather than exposing a falsy-but-defined value', () => {
    const scaffold = buildTimelineScaffold([burst('2026-06-15', 9, { commitUrl: '' })], 'shipped');
    expect(scaffold.ticks[0].commitUrl).toBeUndefined();
  });
});

describe('positionForDate', () => {
  it('maps a phase date onto an existing scaffold domain', () => {
    const scaffold = buildTimelineScaffold([burst('2026-04-29', 7), burst('2026-07-16', 1)], 'shipped');
    // Halfway through the 78-day domain.
    const midDate = new Date(Date.parse('2026-04-29') + (Date.parse('2026-07-16') - Date.parse('2026-04-29')) / 2)
      .toISOString()
      .slice(0, 10);
    expect(positionForDate(midDate, scaffold)).toBeCloseTo(0.5, 1);
  });

  it('clamps a date before domainStart to 0', () => {
    const scaffold = buildTimelineScaffold([burst('2026-04-29', 7), burst('2026-07-16', 1)], 'shipped');
    expect(positionForDate('2026-01-01', scaffold)).toBe(0);
  });

  it('clamps a date after domainEnd to 1', () => {
    const scaffold = buildTimelineScaffold([burst('2026-04-29', 7), burst('2026-07-16', 1)], 'shipped');
    expect(positionForDate('2026-12-01', scaffold)).toBe(1);
  });
});

describe('numberPhasesChronologically (ported from the abandoned tail — see docs/buildmode-tail-assessment.md §5a)', () => {
  // This is now the ONLY "layout" a phase gets on the desktop rule — a
  // chronological number, nothing more. See the doc comment on this
  // function in timeline.ts for why side/lane/height/clearance math was
  // deleted rather than iterated on again: it structurally cannot overlap,
  // at any phase count or clustering, because the packing problem itself
  // no longer exists (phase narratives are a normal-flow list, not
  // absolutely-positioned boxes).

  it('numbers a single phase 1', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-02-01', 1)], 'shipped');
    const numbered = numberPhasesChronologically(
      [phase('2026-01-01', undefined, 'the only phase')],
      scaffold,
    );
    expect(numbered).toHaveLength(1);
    expect(numbered[0]).toMatchObject({ number: 1, position: 0 });
  });

  it('numbers phases in real chronological (position) order, not array-authored order', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-01-31', 1)], 'shipped');
    // Authored out of order on purpose — the later date first.
    const phases = [
      phase('2026-01-31', undefined, 'chronologically last', { title: 'Last' }),
      phase('2026-01-01', undefined, 'chronologically first', { title: 'First' }),
    ];
    const numbered = numberPhasesChronologically(phases, scaffold);
    expect(numbered.map((n) => n.phase.title)).toEqual(['First', 'Last']);
    expect(numbered.map((n) => n.number)).toEqual([1, 2]);
  });

  it('numbers the MensApp shape (5 phases clustered in the first ~7% of a 78-day domain) 1 through 5 in date order — the exact shape that broke lane-packing twice', () => {
    const scaffold = buildTimelineScaffold(
      [
        burst('2026-04-29', 7),
        burst('2026-04-30', 6),
        burst('2026-05-02', 8),
        burst('2026-05-04', 1),
        burst('2026-05-05', 1),
        burst('2026-07-16', 1, { isCleanupSweep: true }),
      ],
      'shipped',
    );
    const phases = [
      phase('2026-04-29', '2026-04-29', 'Day one, the hard way', { title: 'Day one' }),
      phase('2026-04-30', '2026-04-30', 'Realtime goes in, and comes back out four minutes later', { title: 'Realtime' }),
      phase('2026-05-02', '2026-05-02', 'Eight commits, one long push toward festive', { title: 'Eight commits' }),
      phase('2026-05-04', '2026-05-05', 'The ambition spike', { title: 'Ambition spike' }),
      phase('2026-07-16', '2026-07-16', '72 days quiet, then the sweep', { title: 'The sweep' }),
    ];
    const numbered = numberPhasesChronologically(phases, scaffold);
    expect(numbered.map((n) => n.number)).toEqual([1, 2, 3, 4, 5]);
    expect(numbered.map((n) => n.phase.title)).toEqual([
      'Day one',
      'Realtime',
      'Eight commits',
      'Ambition spike',
      'The sweep',
    ]);
    // Positions strictly increasing — no clustering-related ambiguity in
    // the ordering, even though four of these sit within a few percent of
    // the rule's length of each other.
    for (let i = 1; i < numbered.length; i++) {
      expect(numbered[i].position).toBeGreaterThanOrEqual(numbered[i - 1].position);
    }
  });

  it('breaks a tie (two phases anchored at the exact same position) by original array index, deterministically', () => {
    const scaffold = buildTimelineScaffold([burst('2026-06-15', 1), burst('2026-07-16', 1)], 'shipped');
    const phases = [
      phase('2026-06-15', '2026-06-15', 'first same-day phase', { title: 'A' }),
      phase('2026-06-15', '2026-06-15', 'second same-day phase', { title: 'B' }),
    ];
    const numbered = numberPhasesChronologically(phases, scaffold);
    expect(numbered[0].position).toBe(numbered[1].position);
    expect(numbered.map((n) => n.phase.title)).toEqual(['A', 'B']);
    expect(numbered.map((n) => n.number)).toEqual([1, 2]);
  });

  it('returns an empty array for zero phases', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1)], 'shipped');
    expect(numberPhasesChronologically([], scaffold)).toEqual([]);
  });
});
