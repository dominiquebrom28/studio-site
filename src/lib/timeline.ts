import type { CommitBurst, Project } from '@/content/schemas';

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
