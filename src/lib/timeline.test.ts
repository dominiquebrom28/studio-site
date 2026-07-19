import { describe, it, expect } from 'vitest';
import {
  buildTimelineScaffold,
  positionForDate,
  GAP_THRESHOLD_DAYS,
  assignPhaseCaptionLanes,
  computeSideCaptionLayout,
  layoutPhaseCaptions,
  estimateCaptionHeightPx,
  CAPTION_COLLISION_FRACTION,
  CAPTION_CHARS_PER_LINE,
  CAPTION_LINE_HEIGHT_PX,
  CAPTION_CHROME_PX,
  RULE_ANCHOR_OFFSET_PX,
  LANE_GAP_PX,
  MIN_CAPTION_CLEARANCE_PX,
} from './timeline';
import type { CommitBurst, ProcessPhase } from '@/content/schemas';

function burst(date: string, count: number, overrides: Partial<CommitBurst> = {}): CommitBurst {
  return { date, count, isCleanupSweep: false, ...overrides };
}

function phase(from: string, to: string | undefined, narrative: string, overrides: Partial<ProcessPhase> = {}): ProcessPhase {
  return { from, to, title: 'A phase', narrative, tone: 'build', ...overrides };
}

/** A narrative of an exact character length — lets clearance-math tests
 * reason about a known caption height instead of guessing real prose length. */
function narrativeOfLength(length: number): string {
  return 'x'.repeat(length);
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

describe('estimateCaptionHeightPx', () => {
  it('is a deterministic function of narrative length (chars/line -> lines -> px)', () => {
    // 68 chars = exactly 2 lines at 34 chars/line.
    const height = estimateCaptionHeightPx(phase('2026-01-01', undefined, narrativeOfLength(68)));
    expect(height).toBe(CAPTION_CHROME_PX + 2 * CAPTION_LINE_HEIGHT_PX);
  });

  it('rounds a partial line up, never down (a 1-character overflow still needs a whole extra line)', () => {
    const height = estimateCaptionHeightPx(phase('2026-01-01', undefined, narrativeOfLength(CAPTION_CHARS_PER_LINE + 1)));
    expect(height).toBe(CAPTION_CHROME_PX + 2 * CAPTION_LINE_HEIGHT_PX);
  });

  it('never returns less than a single line, even for a near-empty narrative', () => {
    const height = estimateCaptionHeightPx(phase('2026-01-01', undefined, 'x'));
    expect(height).toBe(CAPTION_CHROME_PX + CAPTION_LINE_HEIGHT_PX);
  });
});

describe('assignPhaseCaptionLanes', () => {
  it('a single phase gets lane 0 on its default (alternating-index) side', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-02-01', 1)], 'shipped');
    const assignments = assignPhaseCaptionLanes([phase('2026-01-01', undefined, 'one phase, nothing to collide with')], scaffold);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({ side: 'above', lane: 0 });
  });

  it('keeps two far-apart phases on lane 0 of their alternating sides (the four "already look right" projects\' shape)', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-12-01', 1)], 'shipped');
    const phases = [phase('2026-01-01', undefined, 'first'), phase('2026-12-01', undefined, 'second')];
    const assignments = assignPhaseCaptionLanes(phases, scaffold);
    expect(assignments[0]).toMatchObject({ side: 'above', lane: 0 });
    expect(assignments[1]).toMatchObject({ side: 'below', lane: 0 });
  });

  it('pushes two phases at near-identical positions on the same default side into distinct lanes', () => {
    // Domain 2026-01-01 -> 2026-01-11 (10 days). Phases at index 0 and 2
    // both default to "above"; their positions (day 0 and day 1 of 10) are
    // 0.1 apart — comfortably inside CAPTION_COLLISION_FRACTION (0.36) —
    // so they must NOT share lane 0.
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-01-11', 1)], 'shipped');
    const phases = [
      phase('2026-01-01', undefined, 'above, day 0'),
      phase('2026-01-05', undefined, 'below, middling'), // keeps the "below" lane out of this assertion
      phase('2026-01-02', undefined, 'above, day 1 — near-identical to phase 0'),
    ];
    const assignments = assignPhaseCaptionLanes(phases, scaffold);
    expect(assignments[0].side).toBe('above');
    expect(assignments[2].side).toBe('above');
    // Same side, near-identical position — MUST land in different lanes.
    expect(assignments[0].lane).not.toBe(assignments[2].lane);
  });

  it('two phases anchored on the exact same date (a real content shape — soulforge/portfolio both do this) land on opposite sides and never collide', () => {
    const scaffold = buildTimelineScaffold([burst('2026-06-15', 1), burst('2026-07-16', 1)], 'shipped');
    const phases = [
      phase('2026-06-15', '2026-06-15', 'first same-day phase'),
      phase('2026-06-15', '2026-06-15', 'second same-day phase'),
    ];
    const assignments = assignPhaseCaptionLanes(phases, scaffold);
    expect(assignments[0].position).toBe(assignments[1].position);
    expect(assignments[0].side).not.toBe(assignments[1].side);
    expect(assignments[0].lane).toBe(0);
    expect(assignments[1].lane).toBe(0);
  });

  it('packs the MensApp shape (5 phases clustered in the first ~7% of a 78-day domain) without any same-side/same-lane collision', () => {
    // Exact dates/positions from content/projects/mensapp.md.
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
      phase('2026-04-29', '2026-04-29', 'Day one, the hard way'),
      phase('2026-04-30', '2026-04-30', 'Realtime goes in, and comes back out four minutes later'),
      phase('2026-05-02', '2026-05-02', 'Eight commits, one long push toward festive'),
      phase('2026-05-04', '2026-05-05', 'The ambition spike'),
      phase('2026-07-16', '2026-07-16', '72 days quiet, then the sweep'),
    ];
    const assignments = assignPhaseCaptionLanes(phases, scaffold);

    // No two assignments sharing a side AND a lane may be closer than the
    // collision fraction — the actual invariant this whole module exists to
    // guarantee. Checked exhaustively rather than asserting exact lane
    // numbers, so this test keeps holding even if the packing heuristic's
    // internals change later.
    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const a = assignments[i];
        const b = assignments[j];
        if (a.side === b.side && a.lane === b.lane) {
          expect(Math.abs(a.position - b.position)).toBeGreaterThanOrEqual(CAPTION_COLLISION_FRACTION);
        }
      }
    }

    // The tightly-clustered first four phases (positions 0, 0.013, 0.038,
    // 0.071 of the 78-day domain) alternate above/below by index but are
    // all mutually within the collision fraction — by the pigeonhole
    // principle, at least one side needs more than one lane.
    const maxLane = Math.max(...assignments.map((a) => a.lane));
    expect(maxLane).toBeGreaterThan(0);
  });
});

describe('computeSideCaptionLayout', () => {
  it('a side with no captions falls back to the minimum clearance floor and an empty offsets array', () => {
    const layout = computeSideCaptionLayout([], 'above');
    expect(layout.offsets).toEqual([]);
    expect(layout.clearancePx).toBe(MIN_CAPTION_CLEARANCE_PX);
  });

  it('a single lane starts its offset at RULE_ANCHOR_OFFSET_PX and clearance covers exactly that caption', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-02-01', 1)], 'shipped');
    const narrative = narrativeOfLength(68); // exactly 2 lines
    const assignments = assignPhaseCaptionLanes([phase('2026-01-01', undefined, narrative)], scaffold);
    const layout = computeSideCaptionLayout(assignments, 'above');
    const expectedHeight = CAPTION_CHROME_PX + 2 * CAPTION_LINE_HEIGHT_PX;
    expect(layout.offsets).toEqual([RULE_ANCHOR_OFFSET_PX]);
    expect(layout.clearancePx).toBe(RULE_ANCHOR_OFFSET_PX + expectedHeight + 16 /* CLEARANCE_SAFETY_MARGIN_PX */);
  });

  it('a second lane starts past the first lane\'s tallest caption plus the inter-lane gap, and clearance grows to cover both', () => {
    // Two same-side phases forced into two lanes (identical position).
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-02-01', 1)], 'shipped');
    const shortNarrative = narrativeOfLength(34); // 1 line
    const tallNarrative = narrativeOfLength(340); // 10 lines
    const phases = [
      phase('2026-01-01', undefined, tallNarrative), // index 0 -> above, lane 0 (claims first)
      phase('2026-01-01', undefined, shortNarrative, { title: 'B' }), // index 1 -> below by default...
    ];
    // Force both onto "above" by using index parity directly is awkward via
    // the public API (side is derived, not injectable) — instead, reuse the
    // MensApp-style same-position-different-index trick: three phases where
    // 0 and 2 are both "above" and collide.
    const clustered = [
      phase('2026-01-01', undefined, tallNarrative),
      phase('2026-01-01', undefined, 'below filler', { title: 'filler' }),
      phase('2026-01-01', undefined, shortNarrative, { title: 'second above' }),
    ];
    void phases; // (kept only to document the simpler-but-unusable shape above)
    const assignments = assignPhaseCaptionLanes(clustered, scaffold);
    const layout = computeSideCaptionLayout(assignments, 'above');

    const tallHeight = CAPTION_CHROME_PX + 10 * CAPTION_LINE_HEIGHT_PX;
    const shortHeight = CAPTION_CHROME_PX + CAPTION_LINE_HEIGHT_PX;
    expect(layout.offsets).toEqual([RULE_ANCHOR_OFFSET_PX, RULE_ANCHOR_OFFSET_PX + tallHeight + LANE_GAP_PX]);
    expect(layout.clearancePx).toBe(RULE_ANCHOR_OFFSET_PX + tallHeight + LANE_GAP_PX + shortHeight + 16);
  });
});

describe('layoutPhaseCaptions', () => {
  it('a project with well-spaced phases needs LESS than the old flat 22rem (352px) clearance', () => {
    // SoulForge's real shape: two same-day phases (opposite sides, lane 0
    // each) plus one far-future phase — every project this shape covers
    // (soulforge, portfolio, pizzaparty, lovediary) should come out under
    // the old static value once clearance is content-derived.
    const scaffold = buildTimelineScaffold([burst('2026-06-15', 2), burst('2026-07-16', 1)], 'shipped');
    const phases = [
      phase('2026-06-15', '2026-06-15', narrativeOfLength(380)),
      phase('2026-06-15', '2026-06-15', narrativeOfLength(403)),
      phase('2026-07-16', '2026-07-16', narrativeOfLength(324)),
    ];
    const layout = layoutPhaseCaptions(phases, scaffold);
    expect(layout.clearancePx).toBeLessThan(352);
  });

  it('a single phase needs far less clearance than the old flat 22rem (352px)', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1)], 'shipped');
    const layout = layoutPhaseCaptions([phase('2026-01-01', undefined, narrativeOfLength(120))], scaffold);
    expect(layout.clearancePx).toBeLessThan(352);
    // The empty side (no phase ever lands "below" here) still gets the floor.
    expect(layout.below.clearancePx).toBe(MIN_CAPTION_CLEARANCE_PX);
  });

  it('the MensApp shape needs MORE clearance than a single-lane project — collision-avoidance costs real vertical space, which is the honest trade-off, not a regression', () => {
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
    const mensappPhases = [
      phase('2026-04-29', '2026-04-29', narrativeOfLength(269)),
      phase('2026-04-30', '2026-04-30', narrativeOfLength(372)),
      phase('2026-05-02', '2026-05-02', narrativeOfLength(325)),
      phase('2026-05-04', '2026-05-05', narrativeOfLength(289)),
      phase('2026-07-16', '2026-07-16', narrativeOfLength(194)),
    ];
    const singleLaneShapePhases = [
      phase('2026-04-29', '2026-04-29', narrativeOfLength(269)),
      phase('2026-07-16', '2026-07-16', narrativeOfLength(194)),
    ];
    const mensappLayout = layoutPhaseCaptions(mensappPhases, scaffold);
    const singleLaneLayout = layoutPhaseCaptions(singleLaneShapePhases, scaffold);
    expect(mensappLayout.clearancePx).toBeGreaterThan(singleLaneLayout.clearancePx);
  });

  it('every assignment\'s caption stays anchored to its own phase (order-preserving output)', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-02-01', 1)], 'shipped');
    const phases = [
      phase('2026-01-01', undefined, 'first', { title: 'First' }),
      phase('2026-02-01', undefined, 'second', { title: 'Second' }),
    ];
    const layout = layoutPhaseCaptions(phases, scaffold);
    expect(layout.assignments.map((a) => a.phase.title)).toEqual(['First', 'Second']);
  });
});
