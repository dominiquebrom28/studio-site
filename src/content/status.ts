import type { Project } from './schemas';

/** Human-readable label for a project's lifecycle status (§5/§6 of the design brief). */
export const statusLabel: Record<Project['status'], string> = {
  shipped: 'Shipped',
  'in-progress': 'In progress',
  archived: 'Archived',
};

/** Semantic tone class (success/warning/muted) for a project's status dot + label. */
export const statusToneClass: Record<Project['status'], string> = {
  shipped: 'text-success',
  'in-progress': 'text-warning',
  archived: 'text-ink-muted',
};
