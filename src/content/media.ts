import type { ProjectMediaItem } from './schemas';

/**
 * Animations lead, stills support — this is Dom's own directive plus the
 * market research cited in BACKLOG.md (DOM-4): short walkthrough motion
 * measurably outperforms static screenshots for engagement, with annotated
 * stills as the supporting cast, not the other way round. A stable sort
 * (kind only) preserves whatever order a project authored its stills in.
 *
 * Kept in `src/content/` (alongside `sortProjects`/`sortPosts` in
 * loader.ts) rather than in the `MediaGallery` component file itself — pure
 * data-ordering logic, testable and reusable without a DOM/React runtime.
 */
export function sortForGallery(items: ProjectMediaItem[]): ProjectMediaItem[] {
  return [...items].sort((a, b) => {
    if (a.kind === b.kind) return 0;
    return a.kind === 'animation' ? -1 : 1;
  });
}
