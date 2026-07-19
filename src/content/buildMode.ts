import type { Project } from './schemas';

/**
 * Every string this file exports is PUBLIC-FACING COPY. `'team'`/
 * `'solo-to-team'` wording is new as of the 2026-07-19 handoff feature and
 * has not had Dom's sign-off — flagged in the frontend-dev report, same as
 * the spec's own "taste call" framing elsewhere in this codebase.
 */

/**
 * `ProjectHero`'s eyebrow stamp — one line, full sentence-ish phrasing.
 * `'solo'`'s wording is UNCHANGED from before this feature (Dom explicitly
 * approved it: "Good call on the 'solo build' differentiation").
 */
export const buildModeEyebrow: Record<Project['buildMode'], string> = {
  solo: 'SOLO BUILD · NO AGENT TEAM',
  team: 'BUILT WITH THE TEAM',
  'solo-to-team': 'SOLO BUILD → THE TEAM JOINED',
};

/** The single-sitting template's eyebrow uses its own "ONE SITTING" framing
 * — combined with build-mode the same way `buildModeEyebrow` is. */
export const singleSittingEyebrow: Record<Project['buildMode'], string> = {
  solo: 'ONE SITTING · SOLO BUILD',
  team: 'ONE SITTING · BUILT WITH THE TEAM',
  'solo-to-team': 'ONE SITTING · SOLO BUILD → TEAM JOINED',
};

/** `ProjectCard`'s at-a-glance chip label — shorter, scannable across a grid. */
export const buildModeChipLabel: Record<Project['buildMode'], string> = {
  solo: 'Solo build',
  team: 'Team build',
  'solo-to-team': 'Solo → Team',
};

/**
 * `ProjectCard`'s chip tone — `'muted'` (blends in, the neutral default) for
 * a purely solo project, `'tint'` (the studio's existing `marker-700`
 * accent — already used for cleanup-sweep flags and live links, no new
 * color) for any project the team was ever involved in. Signals "team was
 * involved at some point" at a glance without a full read of the text.
 */
export const buildModeChipTone: Record<Project['buildMode'], 'muted' | 'tint'> = {
  solo: 'muted',
  team: 'tint',
  'solo-to-team': 'tint',
};
