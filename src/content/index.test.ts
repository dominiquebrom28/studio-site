import { describe, it, expect } from 'vitest';
import { getAllProjects, getAllPosts, getProjectBySlug, getPostBySlug, getFeaturedProjects, getLatestPosts } from './index';

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
});
