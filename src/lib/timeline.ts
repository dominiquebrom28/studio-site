import type { CommitBurst, ProcessPhase, Project } from '@/content/schemas';

/**
 * Pure `BuildTimeline` position math (docs/project-page-v2.md §2.2), kept
 * out of the component file so the load-bearing rule — "position along the
 * rule is real elapsed time, linear, not evenly spaced ticks" — is
 * unit-testable without a DOM, per the task brief's explicit instruction.
 *
 * The whole point of this component is that the SILENCE is honest: a
 * 31-day gap must occupy exactly 31/(total span) of the rule, not "the next
 * slot." Every position below is `(date - domainStart) / (domainEnd -
 * domainStart)`, clamped to [0, 1] — never index-based, never bucketed.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Any gap of 14 real days or more between two consecutive commit bursts
 * gets its duration stamped mid-void (spec §2.2 "gap labeling"). */
export const GAP_THRESHOLD_DAYS = 14;

export interface TimelineTick {
  date: string;
  count: number;
  isCleanupSweep: boolean;
  commitUrl?: string;
  /** 0-1, real elapsed-time position along the rule. */
  position: number;
}

export interface TimelineGap {
  /** 0-1, the midpoint of the gap — where the duration label sits. */
  position: number;
  days: number;
}

export interface TimelineScaffold {
  ticks: TimelineTick[];
  gaps: TimelineGap[];
  /** ISO date of the first commit — always a real commit date. */
  domainStart: string;
  /**
   * ISO date the rule currently ends at. Equal to the last commit's date
   * for a closed project; equal to `now` (truncated to a day) for an
   * `in-progress` project — see `isOpenEnded`.
   */
  domainEnd: string;
  /** True when `status: "in-progress"` — the rule extends past the last
   * real commit to "today," with an explicit "→ still open" terminus,
   * rather than silently stopping the line (spec §2.2). */
  isOpenEnded: boolean;
}

function toIsoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Builds the full scaffold — tick positions, gap positions/durations, and
 * the open-ended terminus — for `BuildTimeline`. `now` is an injectable
 * parameter (defaults to the real current time) precisely so "is this
 * project's rule still drawing today" is deterministic and testable without
 * mocking global `Date`.
 *
 * Throws if `commits` is empty — callers (BuildTimeline, and the
 * `ProjectProcessSchema` this data comes from) both already guarantee at
 * least one commit; a project with genuinely nothing to scaffold uses the
 * single-sitting template instead (spec §2.4), never an empty `process`.
 */
export function buildTimelineScaffold(
  commits: readonly CommitBurst[],
  status: Project['status'],
  now: Date = new Date(),
): TimelineScaffold {
  if (commits.length === 0) {
    throw new Error('buildTimelineScaffold requires at least one commit burst');
  }

  const sorted = [...commits].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const domainStartMs = Date.parse(first.date);
  const lastCommitMs = Date.parse(last.date);
  const isOpenEnded = status === 'in-progress';
  const domainEndMs = isOpenEnded ? Math.max(now.getTime(), lastCommitMs) : lastCommitMs;
  // A single-commit-day domain (domainEndMs === domainStartMs, status not
  // in-progress) has zero span — guard the divide so every tick still
  // resolves to a valid, non-NaN position (0) instead of dividing by zero.
  const span = Math.max(domainEndMs - domainStartMs, 1);

  function position(ms: number): number {
    return Math.min(1, Math.max(0, (ms - domainStartMs) / span));
  }

  const ticks: TimelineTick[] = sorted.map((commit) => ({
    date: commit.date,
    count: commit.count,
    isCleanupSweep: commit.isCleanupSweep,
    commitUrl: commit.commitUrl || undefined,
    position: position(Date.parse(commit.date)),
  }));

  const gaps: TimelineGap[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prevMs = Date.parse(sorted[i - 1].date);
    const curMs = Date.parse(sorted[i].date);
    const days = Math.round((curMs - prevMs) / DAY_MS);
    if (days >= GAP_THRESHOLD_DAYS) {
      gaps.push({ position: position((prevMs + curMs) / 2), days });
    }
  }

  return {
    ticks,
    gaps,
    domainStart: first.date,
    domainEnd: isOpenEnded ? toIsoDay(domainEndMs) : last.date,
    isOpenEnded,
  };
}

/**
 * Maps an arbitrary ISO date (typically a `ProcessPhase.from`/`to`) onto an
 * already-built scaffold's [0,1] rule — used to anchor phase captions and
 * their connector lines to the same linear-time axis the commit ticks use.
 * Clamped the same way tick positions are, so a phase date slightly outside
 * the commit-derived domain (shouldn't normally happen, but content is
 * hand-authored) never produces an off-rule position.
 */
export function positionForDate(dateIso: string, scaffold: Pick<TimelineScaffold, 'domainStart' | 'domainEnd'>): number {
  const startMs = Date.parse(scaffold.domainStart);
  const endMs = Date.parse(scaffold.domainEnd);
  const span = Math.max(endMs - startMs, 1);
  return Math.min(1, Math.max(0, (Date.parse(dateIso) - startMs) / span));
}

/**
 * A phase's anchor position on the [0,1] rule — the midpoint of `from`/`to`
 * when both are set, `from` alone otherwise. Shared by `BuildTimeline`
 * (mobile's inline flow ordering) and `assignPhaseCaptionLanes` below, so
 * both read the exact same anchor a caption's connector actually points at.
 */
export function phaseAnchorPosition(phase: Pick<ProcessPhase, 'from' | 'to'>, scaffold: Pick<TimelineScaffold, 'domainStart' | 'domainEnd'>): number {
  const fromPos = positionForDate(phase.from, scaffold);
  if (!phase.to) return fromPos;
  const toPos = positionForDate(phase.to, scaffold);
  return (fromPos + toPos) / 2;
}

/* ------------------------------------------------------------------------ */
/* Desktop caption collision-avoidance (docs/project-page-v2.md §2.2 fix,   */
/* 2026-07-19 "MensApp captions overlap each other" finding)                */
/* ------------------------------------------------------------------------ */
//
// Prior behaviour picked a caption's side (above/below the rule) purely from
// its array index (`index % 2`). That's fine when phases are spread out
// along the domain — the four other standard-template projects all
// coincidentally are — but MensApp's five phases cluster in the first ~7%
// of a 78-day domain, so two same-side captions land close enough in real
// position to visually overlap. Bumping vertical padding (the previous
// fix) can't solve this: the captions collide with EACH OTHER along the
// horizontal axis, not with the heading/commit-log above/below them.
//
// The fix below is a hybrid of the collision-avoidance strategies the task
// brief names: alternate sides by default (preserves the exact layout of
// every project that already looks right), but when a caption's horizontal
// footprint would collide with the nearest earlier caption already
// claiming a lane on that side, push it into a new vertical lane instead
// (bullet "stack same-side captions into distinct vertical lanes" +
// "push to a second lane on collision") — a straightforward greedy
// lane-packing pass over phases sorted by real position (bullet "greedy
// lane-packing pass over phases sorted by position").

export type CaptionSide = 'above' | 'below';

/**
 * Desktop caption footprint, expressed as a fraction of the rule's own
 * width — used to decide whether two same-side, same-lane captions would
 * visually overlap. Derived from the fixed desktop geometry (spec §6.1's
 * `max-w-[720px]` content column; `DesktopTimeline`'s `pr-24` (96px)
 * reserved for the "still open" terminus, leaving ~624px for the rule
 * itself) and each caption's fixed `w-56` (224px) box centered on its
 * anchor: two same-lane captions start to overlap once their anchors sit
 * within one caption-width of each other, i.e. 224/624 ≈ 0.36 of the
 * rule's total span. This is a geometry-derived ESTIMATE (this module has
 * no DOM access by design), not a live measurement — flagged for
 * confirmation in the browser pass.
 */
export const CAPTION_COLLISION_FRACTION = 0.36;

export interface PhaseCaptionAssignment {
  phase: ProcessPhase;
  /** The phase's original index in the input array — callers key off this,
   * not array order, since assignment is computed in position-sorted order
   * internally. */
  index: number;
  position: number;
  side: CaptionSide;
  /** 0-based; 0 = the lane nearest the rule. */
  lane: number;
}

/**
 * Assigns every phase caption a side and a lane, guaranteeing no two
 * captions on the same side AND lane are closer than `minGap` apart. Pure —
 * takes only the scaffold's domain bounds, no DOM/layout access — so it's
 * unit-testable on its own (see timeline.test.ts).
 *
 * Returned in the SAME order as the `phases` input (one entry per phase),
 * even though the packing itself walks phases in chronological (position)
 * order internally.
 */
export function assignPhaseCaptionLanes(
  phases: readonly ProcessPhase[],
  scaffold: Pick<TimelineScaffold, 'domainStart' | 'domainEnd'>,
  minGap: number = CAPTION_COLLISION_FRACTION,
): PhaseCaptionAssignment[] {
  const withMeta = phases.map((phase, index) => ({
    phase,
    index,
    position: phaseAnchorPosition(phase, scaffold),
  }));

  // Walk in chronological (position) order so a lane's "last claimed
  // position" is always compared against its nearest earlier neighbour —
  // content is already authored chronologically (every phase's `from`
  // ascending) for all six projects today, so this re-sort is a no-op for
  // real content, but keeps the collision math correct even if that ever
  // slips.
  const sorted = [...withMeta].sort((a, b) => a.position - b.position);

  const laneLastPosition: Record<CaptionSide, number[]> = { above: [], below: [] };
  const byIndex = new Map<number, PhaseCaptionAssignment>();

  for (const { phase, index, position } of sorted) {
    // Default side alternates by the phase's ORIGINAL array index — exactly
    // the pre-existing `index % 2` rule — so any project whose phases are
    // already spaced out (every project but MensApp, today) keeps the
    // identical layout it has now.
    const side: CaptionSide = index % 2 === 0 ? 'above' : 'below';
    const lane = claimLane(laneLastPosition[side], position, minGap);
    byIndex.set(index, { phase, index, position, side, lane });
  }

  return phases.map((_, index) => byIndex.get(index)!);
}

/** Finds the first lane on this side whose most-recently-claimed position is
 * at least `minGap` away from `position` (reusing it, so lanes stay
 * maximally packed), opening a new lane only when every existing one is
 * still too close. */
function claimLane(lastPositionPerLane: number[], position: number, minGap: number): number {
  for (let lane = 0; lane < lastPositionPerLane.length; lane++) {
    if (position - lastPositionPerLane[lane] >= minGap) {
      lastPositionPerLane[lane] = position;
      return lane;
    }
  }
  lastPositionPerLane.push(position);
  return lastPositionPerLane.length - 1;
}

/* ------------------------------------------------------------------------ */
/* Vertical clearance — content-aware, replacing the previous flat          */
/* `pt-[22rem] pb-[22rem]` (itself a fix for a DIFFERENT bug: captions      */
/* clipping the H2 above / commit-log below — see BuildTimeline.tsx's       */
/* history). That flat value was sized for the single tallest caption ever  */
/* measured (LoveDiary, 322px); it was never meant to reserve room for TWO  */
/* stacked lanes on a busy side, and it's needlessly large for every        */
/* project whose captions are shorter than that one measurement.            */
/*                                                                            */
/* 2026-07-19, SECOND FIX: a character-count HEIGHT ESTIMATOR lived here    */
/* briefly and was wrong in exactly the direction that causes overlap — a   */
/* browser's real caption heights (Dom's MensApp measurement: 226, 264,     */
/* 434, 472px) depend on where the text actually WRAPS, which character     */
/* count cannot predict (identical counts can differ by a whole line; one   */
/* long word can cost 20px). Estimating a quantity the browser already      */
/* knows exactly was the bug, twice over. This module now takes REAL        */
/* measured heights as a plain input — see `useMeasuredCaptionHeights` in   */
/* BuildTimeline.tsx for where those numbers come from (`ResizeObserver` +  */
/* a synchronous `useLayoutEffect` read). The packing/stacking MATH below   */
/* is unchanged and still pure/testable; only the numbers it's fed changed. */
/* ------------------------------------------------------------------------ */

/** Real measured caption heights (px), keyed by `PhaseCaptionAssignment.index`
 * (the phase's original array index) — NOT estimated. A phase absent from
 * this map hasn't been measured yet (first paint, before the DOM
 * measurement effect has run) and falls back to `FALLBACK_CAPTION_HEIGHT_PX`. */
export type CaptionHeights = Readonly<Record<number, number>>;

/**
 * Used ONLY for a caption that hasn't been measured yet — first paint,
 * before `useMeasuredCaptionHeights`'s `useLayoutEffect` has run. This is a
 * generic safety net (comfortably larger than every real height Dom
 * measured across MensApp, up to 472px), not a per-project or per-caption
 * estimate — the exact category of "guess" that caused this bug twice.
 * Real measurements always override it as soon as they land, which (per
 * `useLayoutEffect`'s ordering) is before the browser paints, in any real
 * browser — so in practice this value is rarely, if ever, actually seen. Its
 * only job is to guarantee "not a collapsed/overlapping layout" if
 * measurement is unavailable at all (e.g. jsdom without a `ResizeObserver`
 * stub) — it does not need to be, and deliberately is not, tuned per
 * content.
 */
export const FALLBACK_CAPTION_HEIGHT_PX = 520;

/** Matches the connector's existing length in `DesktopPhaseCaption` (the
 * `height="28"` SVG) — the gap between the rule and a lane-0 caption's near
 * edge. */
export const RULE_ANCHOR_OFFSET_PX = 28;
/** Vertical breathing room between two stacked lanes on the same side. */
export const LANE_GAP_PX = 16;
/** Added on top of the deepest lane's own height so a caption's last line
 * never sits flush against the media gallery/commit-log below (or the H2
 * above). */
export const CLEARANCE_SAFETY_MARGIN_PX = 16;
/** Floor so a side with zero (or very short) captions still reads as
 * deliberate spacing, not a collapsed gap. */
export const MIN_CAPTION_CLEARANCE_PX = 96;

export interface SideCaptionLayout {
  /** `offsets[lane]` — px distance from the rule's centerline to the near
   * edge of that lane's captions; also the connector SVG's length for every
   * caption placed in that lane. Empty when this side has no captions. */
  offsets: number[];
  /** This side's required `paddingTop`/`paddingBottom` (px). */
  clearancePx: number;
}

/** Computes one side's (above or below) lane offsets and required
 * clearance from a full set of assignments — the max REAL measured caption
 * height per lane (falling back to `FALLBACK_CAPTION_HEIGHT_PX` for any
 * phase not yet measured), stacked outward from the rule. */
export function computeSideCaptionLayout(
  assignments: readonly PhaseCaptionAssignment[],
  side: CaptionSide,
  measuredHeights: CaptionHeights = {},
): SideCaptionLayout {
  const laneMaxHeights: number[] = [];
  for (const assignment of assignments) {
    if (assignment.side !== side) continue;
    const height = measuredHeights[assignment.index] ?? FALLBACK_CAPTION_HEIGHT_PX;
    laneMaxHeights[assignment.lane] = Math.max(laneMaxHeights[assignment.lane] ?? 0, height);
  }

  if (laneMaxHeights.length === 0) {
    return { offsets: [], clearancePx: MIN_CAPTION_CLEARANCE_PX };
  }

  const offsets: number[] = [];
  let cursor = RULE_ANCHOR_OFFSET_PX;
  for (const height of laneMaxHeights) {
    offsets.push(cursor);
    cursor += height + LANE_GAP_PX;
  }
  const clearancePx = Math.max(MIN_CAPTION_CLEARANCE_PX, cursor - LANE_GAP_PX + CLEARANCE_SAFETY_MARGIN_PX);
  return { offsets, clearancePx };
}

export interface TimelineCaptionLayout {
  assignments: PhaseCaptionAssignment[];
  above: SideCaptionLayout;
  below: SideCaptionLayout;
  /** `max(above.clearancePx, below.clearancePx)` — applied to BOTH
   * `paddingTop` and `paddingBottom` so the container stays symmetric and
   * the rule (positioned at a plain `top: 50%`) stays exactly centered;
   * see BuildTimeline.tsx's `DesktopTimeline` for why asymmetric padding
   * would silently break that. */
  clearancePx: number;
}

/** The single entry point `BuildTimeline` calls: side/lane assignment +
 * per-side offsets + the one clearance value both `paddingTop` and
 * `paddingBottom` should use. `measuredHeights` is REAL DOM measurement
 * (or empty, pre-measurement) — see `CaptionHeights`'s doc comment. */
export function layoutPhaseCaptions(
  phases: readonly ProcessPhase[],
  scaffold: Pick<TimelineScaffold, 'domainStart' | 'domainEnd'>,
  measuredHeights: CaptionHeights = {},
  minGap: number = CAPTION_COLLISION_FRACTION,
): TimelineCaptionLayout {
  const assignments = assignPhaseCaptionLanes(phases, scaffold, minGap);
  const above = computeSideCaptionLayout(assignments, 'above', measuredHeights);
  const below = computeSideCaptionLayout(assignments, 'below', measuredHeights);
  return { assignments, above, below, clearancePx: Math.max(above.clearancePx, below.clearancePx) };
}

/* ------------------------------------------------------------------------ */
/* The solo -> team handoff (2026-07-19, Dom: "started out as a solo       */
/* project... and then at one point we had the team look at it").          */
/* ------------------------------------------------------------------------ */
//
// A project is not permanently solo or team — it's a chronology, and the
// team showing up (if it ever does) is just a later point on the SAME
// rule this module already draws. `findHandoffs` locates that point (or
// points, if a project's phases genuinely toggle more than once) purely
// from each phase's `mode`, in real chronological order — never from
// array order, so hand-authored phase lists still resolve correctly.

export interface TimelineHandoff {
  /** 0-1 rule position — the midpoint between the last solo phase and the
   * first team phase immediately following it. */
  position: number;
}

/**
 * Every point where a solo phase is immediately followed (in real
 * chronological order) by a team phase. Empty for an all-solo or all-team
 * project (all six today) — callers should render NOTHING extra in that
 * case, per the brief's "must stay legible when 100% solo" requirement.
 */
export function findHandoffs(
  phases: readonly ProcessPhase[],
  scaffold: Pick<TimelineScaffold, 'domainStart' | 'domainEnd'>,
): TimelineHandoff[] {
  const sorted = [...phases]
    .map((phase) => ({ phase, position: phaseAnchorPosition(phase, scaffold) }))
    .sort((a, b) => a.position - b.position);

  const handoffs: TimelineHandoff[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].phase.mode === 'solo' && sorted[i].phase.mode === 'team') {
      handoffs.push({ position: (sorted[i - 1].position + sorted[i].position) / 2 });
    }
  }
  return handoffs;
}

/** A rule segment for `TimelineRule`'s "the rule itself changes treatment
 * after the handoff" cue — `mode` picks the segment's color. */
export interface RuleSegment {
  start: number;
  end: number;
  mode: 'solo' | 'team';
}

/**
 * Splits the [0,1] rule into alternating solo/team segments at each handoff
 * position. Returns a single all-`'solo'` segment spanning the whole rule
 * when `handoffPositions` is empty — pixel-identical to the previous
 * single, unsplit rule `<div>`, so every all-solo project (all six today)
 * renders exactly as it did before this feature existed.
 */
export function buildRuleSegments(handoffPositions: readonly number[]): RuleSegment[] {
  const sortedBoundaries = [...handoffPositions].sort((a, b) => a - b);
  const bounds = [0, ...sortedBoundaries, 1];
  const segments: RuleSegment[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    if (bounds[i] === bounds[i + 1]) continue; // guards a handoff at exactly 0 or 1
    segments.push({ start: bounds[i], end: bounds[i + 1], mode: i % 2 === 0 ? 'solo' : 'team' });
  }
  return segments.length > 0 ? segments : [{ start: 0, end: 1, mode: 'solo' }];
}
