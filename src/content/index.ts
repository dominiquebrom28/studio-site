import { projects, posts } from './loader';
import type { Project, Post } from './schemas';

export type { Project, Post } from './schemas';

export function getAllProjects() {
  return projects;
}

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}

export function getAllPosts() {
  return posts;
}

export function getPostBySlug(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function getFeaturedProjects(limit = 3) {
  return projects.filter((project) => project.featured).slice(0, limit);
}

/**
 * Up to `limit` OTHER projects (excludes the project matching `slug`),
 * preserving the existing sorted order (see `sortProjects` in loader.ts),
 * wrapping around from the current project's position so a project near
 * the end of the list still yields a full set. If `slug` isn't found,
 * returns the first `limit` projects.
 */
export function getMoreProjects(slug: string, limit = 3): Project[] {
  const index = projects.findIndex((project) => project.slug === slug);
  if (index === -1) return projects.slice(0, limit);

  const rest: Project[] = [];
  for (let i = 1; i < projects.length && rest.length < limit; i++) {
    rest.push(projects[(index + i) % projects.length]);
  }
  return rest;
}

export function getLatestPosts(limit = 3) {
  return posts.slice(0, limit);
}

/**
 * The chronologically newer and older post relative to `slug`, in the
 * existing sorted order (posts: `date` desc — see `sortPosts` in loader.ts).
 *
 * Unlike `getMoreProjects` above, this deliberately does NOT wrap. A project
 * "more projects" rail is an undated mini-list, so wrapping from the last
 * item back to the first is a reasonable, honest choice there. A blog is a
 * dated, chronological logbook — the newest entry genuinely has no "newer"
 * post yet, and the oldest genuinely has no "older" one. Wrapping "next" from
 * the newest post back around to the oldest would silently assert a false
 * adjacency in a sequence readers expect to be linear, which reads as a bug,
 * not a feature. Dead-ending at both edges is the more honest behavior here.
 *
 * `posts` (module-level) is already draft-filtered in production by
 * `filterVisiblePosts` in loader.ts before it's sorted — a draft can never
 * be `slug`'s neighbor here, because a draft is never in the array this
 * walks in the first place. That filtering happens upstream, once, rather
 * than being re-checked per-call here.
 *
 * Extracted to a pure, exported, parameterized function (same QA
 * testability pattern as `filterVisiblePosts`) so edge cases — a
 * single-post corpus, an unknown slug, identical-date tie-break order —
 * can be asserted directly against synthetic data instead of only against
 * whatever real content happens to exist when the test runs.
 */
export function getAdjacentPostsFrom(
  sortedPosts: readonly Post[],
  slug: string,
): { newer: Post | undefined; older: Post | undefined } {
  const index = sortedPosts.findIndex((post) => post.slug === slug);
  if (index === -1) return { newer: undefined, older: undefined };

  return {
    newer: index > 0 ? sortedPosts[index - 1] : undefined,
    older: index < sortedPosts.length - 1 ? sortedPosts[index + 1] : undefined,
  };
}

export function getAdjacentPosts(slug: string): { newer: Post | undefined; older: Post | undefined } {
  return getAdjacentPostsFrom(posts, slug);
}
