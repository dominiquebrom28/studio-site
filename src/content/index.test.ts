import { describe, it, expect } from 'vitest';
import {
  getAllProjects,
  getAllPosts,
  getProjectBySlug,
  getPostBySlug,
  getFeaturedProjects,
  getLatestPosts,
  getMoreProjects,
} from './index';

/**
 * Integration sanity check against the REAL content/ directory in this repo
 * (via the real `import.meta.glob`, not fixtures). This is the actual
 * "content lint" gate the spec (§3.3) calls for: if a committed markdown
 * file fails Zod validation or produces a bad slug, importing this module
 * throws and this test file fails to even load.
 */
describe('content loader — real repo content', () => {
  it('loads all committed projects without throwing validation errors', () => {
    const projects = getAllProjects();
    expect(projects.length).toBeGreaterThan(0);
    for (const project of projects) {
      expect(project.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(project.title.length).toBeGreaterThan(0);
    }
  });

  it('loads all committed posts without throwing validation errors', () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      expect(post.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('getProjectBySlug returns undefined for an unknown slug (NotFound path)', () => {
    expect(getProjectBySlug('this-project-does-not-exist')).toBeUndefined();
  });

  it('getPostBySlug returns undefined for an unknown slug (NotFound path)', () => {
    expect(getPostBySlug('this-post-does-not-exist')).toBeUndefined();
  });

  it('projects collection is frozen (immutable)', () => {
    expect(Object.isFrozen(getAllProjects())).toBe(true);
  });

  it('posts collection is frozen (immutable)', () => {
    expect(Object.isFrozen(getAllPosts())).toBe(true);
  });

  it('getFeaturedProjects only returns projects with featured: true', () => {
    const featured = getFeaturedProjects(10);
    for (const project of featured) {
      expect(project.featured).toBe(true);
    }
  });

  it('getLatestPosts respects the limit argument', () => {
    const latest = getLatestPosts(1);
    expect(latest.length).toBeLessThanOrEqual(1);
  });

  describe('getMoreProjects', () => {
    const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

    it('excludes the current slug from the returned list', () => {
      const all = getAllProjects();
      for (const project of all) {
        const more = getMoreProjects(project.slug, 3);
        expect(more.some((p) => p.slug === project.slug)).toBe(false);
      }
    });

    it('respects the limit argument — never more than `limit`, and exactly `limit` when enough other projects exist', () => {
      const all = getAllProjects();
      // With the real committed content set there are enough OTHER projects
      // (total - 1) to satisfy a limit of 3 for any starting slug.
      expect(all.length - 1).toBeGreaterThanOrEqual(3);

      for (const project of all) {
        const more = getMoreProjects(project.slug, 3);
        expect(more.length).toBeLessThanOrEqual(3);
        expect(more.length).toBe(3);
      }
    });

    it('wraps around for the last project in sorted order, still yielding a full set', () => {
      const all = getAllProjects();
      const last = all[all.length - 1];
      const more = getMoreProjects(last.slug, 3);
      expect(more.length).toBe(3);
      expect(more.every((p) => p.slug !== last.slug)).toBe(true);
    });

    it('falls back to the first `limit` projects for an unknown slug', () => {
      const all = getAllProjects();
      const more = getMoreProjects('this-slug-does-not-exist', 3);
      expect(more).toEqual(all.slice(0, 3));
    });

    it('never returns duplicate projects and every result is a real, validly-slugged project', () => {
      const all = getAllProjects();
      const allSlugs = new Set(all.map((p) => p.slug));

      for (const project of all) {
        const more = getMoreProjects(project.slug, 3);
        const seenSlugs = new Set<string>();
        for (const p of more) {
          expect(allSlugs.has(p.slug)).toBe(true);
          expect(p.slug).toMatch(SLUG_PATTERN);
          expect(seenSlugs.has(p.slug)).toBe(false);
          seenSlugs.add(p.slug);
        }
      }
    });
  });
});
