import type { Project } from './schemas';

/**
 * The single source of truth for the "solo build" disambiguation copy
 * (BACKLOG P1, positioning-disambiguation). This exact wording first
 * shipped as page furniture hard-coded inline in `ProjectHero`'s eyebrow
 * row (docs/project-page-v2.md §6/§7); it's extracted here so `ProjectHero`
 * (detail pages) and `ProjectCard` (grid — Home's "Recent builds" and the
 * `/projects` index) render byte-identical text instead of two copies that
 * can silently drift apart.
 *
 * Reads `project.template` because the single-sitting template already had
 * its own variant ("ONE SITTING · SOLO BUILD" vs "SOLO BUILD · NO AGENT
 * TEAM") — this preserves that distinction rather than flattening it.
 * Callers are responsible for checking `project.soloBuild` before calling
 * this (it always returns a label; it does not decide visibility).
 */
export function soloBuildLabel(template: Project['template']): string {
  return template === 'single-sitting' ? 'ONE SITTING · SOLO BUILD' : 'SOLO BUILD · NO AGENT TEAM';
}
