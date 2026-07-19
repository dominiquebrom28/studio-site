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
 * (mobile's inline flow ordering), `numberPhasesChronologically` below, and
 * `findHandoffs`, so every consumer reads the exact same anchor for a given
 * phase.
 */
export function phaseAnchorPosition(phase: Pick<ProcessPhase, 'from' | 'to'>, scaffold: Pick<TimelineScaffold, 'domainStart' | 'domainEnd'>): number {
  const fromPos = positionForDate(phase.from, scaffold);
  if (!phase.to) return fromPos;
  const toPos = positionForDate(phase.to, scaffold);
  return (fromPos + toPos) / 2;
}

/* ------------------------------------------------------------------------ */
/* Phase numbering (2026-07-19, THIRD attempt at the MensApp overlap fix —  */
/* see the doc comment on `numberPhasesChronologically` below for why the   */
/* first two attempts — flat padding, then estimated/measured absolute      */
/* caption positioning with lane-packing — were abandoned rather than       */
/* iterated on again).                                                       */
/* ------------------------------------------------------------------------ */

export interface NumberedPhase {
  phase: ProcessPhase;
  /** 1-based, chronological order (real elapsed-time position — never
   * array/content-authored order). Ties (two phases anchored at the exact
   * same position) break by original array index for a deterministic,
   * stable number. This is the ONE number a phase carries everywhere it
   * appears — the rule's small marker and its matching list item both read
   * it from here, so they can never disagree. */
  number: number;
  /** 0-1 rule position — same anchor definition `phaseAnchorPosition` has
   * always used (midpoint of `from`/`to`). */
  position: number;
}

/**
 * Orders every phase chronologically and numbers it 1..N — the entire
 * "layout" a phase needs on the desktop rule now. Pure, DOM-free, and
 * intentionally the simplest possible function: no side, no lane, no
 * height, no clearance.
 *
 * HISTORY, for whoever's tempted to re-add positioning math here: MensApp's
 * five phases cluster in the first ~7% of a 78-day domain (honest
 * elapsed-time positioning DOES this on purpose whenever a project has a
 * burst-then-silence shape — the norm, not the exception, across all six
 * projects). Four of those phases' 224px-wide caption boxes sit within 51px
 * of each other horizontally, an unconditional ~190px of horizontal
 * overlap that can ONLY be resolved by stacking them into vertical lanes.
 * Two rounds of lane-packing (first with estimated caption heights, then
 * with real `ResizeObserver`-measured ones — see git history) both still
 * produced real overlaps in the browser, because the geometry itself — N
 * absolutely-positioned, fixed-width boxes anchored to N arbitrarily close
 * points on one rule — has no correct general solution; every additional
 * clustered phase makes it worse. So the fix is not a better packing
 * algorithm: phase narratives no longer live in absolutely-positioned boxes
 * around the rule at all. They're an ordered list in normal document flow
 * below it (`DesktopTimeline` in BuildTimeline.tsx) — which cannot overlap,
 * structurally, at any phase count or clustering — and this function is
 * the only thing connecting a list item back to its point on the rule.
 *
 * This is a deliberate deviation from docs/project-page-v2.md §2.2 (desktop
 * alternating captions + `MarginNote` connectors) — noted there for Dom to
 * reconcile the spec.
 */
export function numberPhasesChronologically(
  phases: readonly ProcessPhase[],
  scaffold: Pick<TimelineScaffold, 'domainStart' | 'domainEnd'>,
): NumberedPhase[] {
  return phases
    .map((phase, index) => ({ phase, index, position: phaseAnchorPosition(phase, scaffold) }))
    .sort((a, b) => a.position - b.position || a.index - b.index)
    .map(({ phase, position }, i) => ({ phase, position, number: i + 1 }));
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
