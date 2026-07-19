import { describe, it, expect } from 'vitest';
import {
  buildTimelineScaffold,
  positionForDate,
  GAP_THRESHOLD_DAYS,
  assignPhaseCaptionLanes,
  computeSideCaptionLayout,
  layoutPhaseCaptions,
  findHandoffs,
  buildRuleSegments,
  CAPTION_COLLISION_FRACTION,
  FALLBACK_CAPTION_HEIGHT_PX,
  RULE_ANCHOR_OFFSET_PX,
  LANE_GAP_PX,
  MIN_CAPTION_CLEARANCE_PX,
  type CaptionHeights,
} from './timeline';
import type { CommitBurst, ProcessPhase } from '@/content/schemas';

function burst(date: string, count: number, overrides: Partial<CommitBurst> = {}): CommitBurst {
  return { date, count, isCleanupSweep: false, ...overrides };
}

function phase(from: string, to: string | undefined, narrative: string, overrides: Partial<ProcessPhase> = {}): ProcessPhase {
  return { from, to, title: 'A phase', narrative, tone: 'build', mode: 'solo', ...overrides };
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

describe('computeSideCaptionLayout — fed REAL measured heights, not estimated ones', () => {
  it('a side with no captions falls back to the minimum clearance floor and an empty offsets array', () => {
    const layout = computeSideCaptionLayout([], 'above');
    expect(layout.offsets).toEqual([]);
    expect(layout.clearancePx).toBe(MIN_CAPTION_CLEARANCE_PX);
  });

  it('an unmeasured phase (absent from the heights map — first paint, before the DOM measurement effect has run) falls back to FALLBACK_CAPTION_HEIGHT_PX, never zero/collapsed', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-02-01', 1)], 'shipped');
    const assignments = assignPhaseCaptionLanes([phase('2026-01-01', undefined, 'not yet measured')], scaffold);
    const layout = computeSideCaptionLayout(assignments, 'above', {}); // empty measuredHeights
    expect(layout.offsets).toEqual([RULE_ANCHOR_OFFSET_PX]);
    expect(layout.clearancePx).toBe(RULE_ANCHOR_OFFSET_PX + FALLBACK_CAPTION_HEIGHT_PX + 16 /* CLEARANCE_SAFETY_MARGIN_PX */);
  });

  it('a single lane starts its offset at RULE_ANCHOR_OFFSET_PX and clearance covers exactly the REAL measured height', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-02-01', 1)], 'shipped');
    const assignments = assignPhaseCaptionLanes([phase('2026-01-01', undefined, 'measured caption')], scaffold);
    const measuredHeights: CaptionHeights = { 0: 226 }; // a real height from Dom's MensApp measurement
    const layout = computeSideCaptionLayout(assignments, 'above', measuredHeights);
    expect(layout.offsets).toEqual([RULE_ANCHOR_OFFSET_PX]);
    expect(layout.clearancePx).toBe(RULE_ANCHOR_OFFSET_PX + 226 + 16);
  });

  it('a second lane starts past the first lane\'s tallest MEASURED caption plus the inter-lane gap, and clearance grows to cover both', () => {
    // Three same-position phases (0 and 2 default to "above" and collide,
    // per the MensApp-shape trick used elsewhere in this file) — 0 claims
    // lane 0, 2 is pushed to lane 1.
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-02-01', 1)], 'shipped');
    const clustered = [
      phase('2026-01-01', undefined, 'tall caption', { title: 'A' }),
      phase('2026-01-01', undefined, 'below filler', { title: 'filler' }),
      phase('2026-01-01', undefined, 'short caption', { title: 'B' }),
    ];
    const assignments = assignPhaseCaptionLanes(clustered, scaffold);
    const measuredHeights: CaptionHeights = { 0: 434, 2: 168 }; // real MensApp heights
    const layout = computeSideCaptionLayout(assignments, 'above', measuredHeights);

    expect(layout.offsets).toEqual([RULE_ANCHOR_OFFSET_PX, RULE_ANCHOR_OFFSET_PX + 434 + LANE_GAP_PX]);
    expect(layout.clearancePx).toBe(RULE_ANCHOR_OFFSET_PX + 434 + LANE_GAP_PX + 168 + 16);
  });
});

describe('layoutPhaseCaptions — the MensApp regression (Dom\'s real browser measurement, 2026-07-19)', () => {
  // Dom measured these EXACT heights live in Chrome at 1280px after the
  // estimator-based fix still overlapped: "Build/The opening…" 226,
  // "Pivot/Supabase…" 264, "Build/The biggest…" 434, "Build/One commit…"
  // 472, "Cleanup/Commit…" 168 — matching, in content order, phases 0-4
  // below. The estimator guessed too LOW for phases 0 and 1, so lane 1
  // (phases 2 and 3) started before lane 0's real content had finished,
  // producing the reported 37px and 18px overlaps. Fed these same real
  // numbers, `layoutPhaseCaptions` must place every same-side/same-lane
  // pair with zero overlap — this is the exact case that broke in the browser.
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
    phase('2026-04-29', '2026-04-29', 'Day one, the hard way'),
    phase('2026-04-30', '2026-04-30', 'Realtime goes in, and comes back out four minutes later'),
    phase('2026-05-02', '2026-05-02', 'Eight commits, one long push toward festive'),
    phase('2026-05-04', '2026-05-05', 'The ambition spike'),
    phase('2026-07-16', '2026-07-16', '72 days quiet, then the sweep'),
  ];
  const realMeasuredHeights: CaptionHeights = { 0: 226, 1: 264, 2: 434, 3: 472, 4: 168 };

  it('places every same-side/same-lane pair with a non-negative gap — no overlap, given the exact real heights that broke in the browser', () => {
    const layout = layoutPhaseCaptions(mensappPhases, scaffold, realMeasuredHeights);

    for (const side of ['above', 'below'] as const) {
      const sideLayout = side === 'above' ? layout.above : layout.below;
      const inThisLane = new Map<number, { start: number; end: number }[]>();
      for (const assignment of layout.assignments) {
        if (assignment.side !== side) continue;
        const height = realMeasuredHeights[assignment.index];
        const start = sideLayout.offsets[assignment.lane];
        const list = inThisLane.get(assignment.lane) ?? [];
        list.push({ start, end: start + height });
        inThisLane.set(assignment.lane, list);
      }
      // Same lane == same vertical band on that side; a lane is only safe
      // if every occupant's box fits inside [offset, offset + laneMaxHeight].
      for (const [lane, boxes] of inThisLane) {
        const laneMax = boxes.reduce((max, b) => Math.max(max, b.end - b.start), 0);
        const laneStart = sideLayout.offsets[lane];
        for (const box of boxes) {
          expect(box.end).toBeLessThanOrEqual(laneStart + laneMax);
        }
      }
    }
  });

  it('the specific two colliding pairs Dom reported (phases 0/2 above, phases 1/3 below) land in different lanes', () => {
    const layout = layoutPhaseCaptions(mensappPhases, scaffold, realMeasuredHeights);
    const byIndex = new Map(layout.assignments.map((a) => [a.index, a]));
    expect(byIndex.get(0)!.side).toBe(byIndex.get(2)!.side);
    expect(byIndex.get(0)!.lane).not.toBe(byIndex.get(2)!.lane);
    expect(byIndex.get(1)!.side).toBe(byIndex.get(3)!.side);
    expect(byIndex.get(1)!.lane).not.toBe(byIndex.get(3)!.lane);
  });

  it('needs MORE clearance than a single-lane project fed the same real heights — collision-avoidance costs real vertical space, which is the honest trade-off, not a regression', () => {
    const singleLaneShapePhases = [mensappPhases[0], mensappPhases[4]];
    const singleLaneHeights: CaptionHeights = { 0: realMeasuredHeights[0], 1: realMeasuredHeights[4] };
    const mensappLayout = layoutPhaseCaptions(mensappPhases, scaffold, realMeasuredHeights);
    const singleLaneLayout = layoutPhaseCaptions(singleLaneShapePhases, scaffold, singleLaneHeights);
    expect(mensappLayout.clearancePx).toBeGreaterThan(singleLaneLayout.clearancePx);
  });
});

describe('layoutPhaseCaptions', () => {
  it('a single phase needing measurement not yet available falls back safely, never to zero clearance', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1)], 'shipped');
    const layout = layoutPhaseCaptions([phase('2026-01-01', undefined, 'unmeasured')], scaffold, {});
    expect(layout.clearancePx).toBeGreaterThan(0);
    expect(layout.clearancePx).toBe(RULE_ANCHOR_OFFSET_PX + FALLBACK_CAPTION_HEIGHT_PX + 16);
    // The empty side (no phase ever lands "below" here) still gets the floor.
    expect(layout.below.clearancePx).toBe(MIN_CAPTION_CLEARANCE_PX);
  });

  it('every assignment\'s caption stays anchored to its own phase (order-preserving output)', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-02-01', 1)], 'shipped');
    const phases = [
      phase('2026-01-01', undefined, 'first', { title: 'First' }),
      phase('2026-02-01', undefined, 'second', { title: 'Second' }),
    ];
    const layout = layoutPhaseCaptions(phases, scaffold, { 0: 150, 1: 150 });
    expect(layout.assignments.map((a) => a.phase.title)).toEqual(['First', 'Second']);
  });
});

describe('findHandoffs', () => {
  it('finds no handoff for an all-solo project (every project today)', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-02-01', 1)], 'shipped');
    const phases = [
      phase('2026-01-01', undefined, 'solo phase one'),
      phase('2026-02-01', undefined, 'solo phase two'),
    ];
    expect(findHandoffs(phases, scaffold)).toEqual([]);
  });

  it('finds no handoff for an all-team project', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-02-01', 1)], 'shipped');
    const phases = [
      phase('2026-01-01', undefined, 'team phase one', { mode: 'team' }),
      phase('2026-02-01', undefined, 'team phase two', { mode: 'team' }),
    ];
    expect(findHandoffs(phases, scaffold)).toEqual([]);
  });

  it('finds exactly one handoff at the midpoint between the last solo phase and the first team phase', () => {
    // Domain 2026-01-01 -> 2026-01-11 (10 days). Solo at day 0, team at day 10.
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-01-11', 1)], 'shipped');
    const phases = [
      phase('2026-01-01', undefined, 'started solo', { mode: 'solo' }),
      phase('2026-01-11', undefined, 'the team joined', { mode: 'team' }),
    ];
    const handoffs = findHandoffs(phases, scaffold);
    expect(handoffs).toHaveLength(1);
    expect(handoffs[0].position).toBeCloseTo(0.5, 5);
  });

  it('finds the handoff correctly regardless of input array order (uses chronological position, not array order)', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-01-11', 1)], 'shipped');
    const phases = [
      phase('2026-01-11', undefined, 'the team joined', { mode: 'team' }),
      phase('2026-01-01', undefined, 'started solo', { mode: 'solo' }),
    ];
    const handoffs = findHandoffs(phases, scaffold);
    expect(handoffs).toHaveLength(1);
    expect(handoffs[0].position).toBeCloseTo(0.5, 5);
  });

  it('finds every solo->team transition when phases toggle more than once', () => {
    const scaffold = buildTimelineScaffold([burst('2026-01-01', 1), burst('2026-01-31', 1)], 'shipped');
    const phases = [
      phase('2026-01-01', undefined, 'solo start', { mode: 'solo' }),
      phase('2026-01-11', undefined, 'team helps briefly', { mode: 'team' }),
      phase('2026-01-21', undefined, 'back to solo', { mode: 'solo' }),
      phase('2026-01-31', undefined, 'team again', { mode: 'team' }),
    ];
    const handoffs = findHandoffs(phases, scaffold);
    expect(handoffs).toHaveLength(2);
  });
});

describe('buildRuleSegments', () => {
  it('returns a single solo segment spanning the whole rule when there are no handoffs (pixel-identical to the old unsplit rule)', () => {
    expect(buildRuleSegments([])).toEqual([{ start: 0, end: 1, mode: 'solo' }]);
  });

  it('splits into a solo segment then a team segment at one handoff', () => {
    const segments = buildRuleSegments([0.5]);
    expect(segments).toEqual([
      { start: 0, end: 0.5, mode: 'solo' },
      { start: 0.5, end: 1, mode: 'team' },
    ]);
  });

  it('alternates solo/team across multiple handoffs, in position order regardless of input order', () => {
    const segments = buildRuleSegments([0.7, 0.3]);
    expect(segments).toEqual([
      { start: 0, end: 0.3, mode: 'solo' },
      { start: 0.3, end: 0.7, mode: 'team' },
      { start: 0.7, end: 1, mode: 'solo' },
    ]);
  });
});
