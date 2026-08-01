import { describe, it, expect } from 'vitest';
import {
  getAllProjects,
  getAllPosts,
  getProjectBySlug,
  getPostBySlug,
  getFeaturedProjects,
  getLatestPosts,
  getMoreProjects,
  getAdjacentPosts,
  getAdjacentPostsFrom,
} from './index';
import type { Post } from './schemas';

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

  // blog-format-v2 §3's backward-compatibility promise, verified against the
  // REAL content directory: the pre-existing posts (single `author` string,
  // no `authors`/`tldr`/`backlogRefs` field) must still parse with zero
  // edits, and the loader's `normalizePost` must give every post a populated
  // `authors` array whose first element equals `author`.
  //
  // This deliberately does NOT assert a post count. It used to
  // (`expect(posts.length).toBe(5)`), which meant publishing a blog post —
  // the single thing this site exists to do — turned the suite red and
  // invited the author to "fix" the number without reading what broke. The
  // regression it was actually reaching for is *named legacy posts still
  // parsing*, so that is what LEGACY_POSTS pins; the invariant itself is
  // asserted over every post, however many there are.
  const LEGACY_POSTS = [
    'i-gave-claude-a-dev-team',
    'the-day-the-repos-got-honest',
    'teaching-the-studio-to-merge-itself',
    'we-hired-someone-to-look-at-the-page',
    'what-the-green-checkmarks-missed',
  ];

  it('the pre-blog-format-v2 posts all still load, unedited', () => {
    for (const slug of LEGACY_POSTS) {
      expect(getPostBySlug(slug), `legacy post ${slug} no longer loads`).toBeDefined();
    }
  });

  it('every real committed post gets a populated `authors` array, with `author` always equal to `authors[0]`', () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThanOrEqual(LEGACY_POSTS.length);
    for (const post of posts) {
      expect(post.authors.length).toBeGreaterThan(0);
      expect(post.authors.length).toBeLessThanOrEqual(4);
      expect(post.author).toBe(post.authors[0]);
    }
  });

  // The one real post this feature was demonstrated against (blog-format-v2
  // rollout) — a single-author post, so it must still resolve to exactly
  // the one `authors` entry the pre-existing `author: "Project Lead"`
  // frontmatter implies, unaffected by adding `tldr`/`backlogRefs`.
  it('the demo post (tldr + backlogRefs added) still normalizes to a single-author `authors` array', () => {
    const post = getPostBySlug('what-the-green-checkmarks-missed');
    expect(post?.authors).toEqual(['Project Lead']);
    expect(post?.author).toBe('Project Lead');
    expect(post?.tldr?.length).toBeGreaterThanOrEqual(2);
    expect(post?.backlogRefs?.length).toBeGreaterThan(0);
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

  describe('getAdjacentPosts', () => {
    it('the newest post (index 0) has no newer post — dead-ends, does not wrap', () => {
      const all = getAllPosts();
      const newest = all[0];
      const { newer, older } = getAdjacentPosts(newest.slug);
      expect(newer).toBeUndefined();
      // Only assert "has an older post" when a second post actually exists —
      // stays correct even if the content set ever shrinks to one post.
      if (all.length > 1) {
        expect(older?.slug).toBe(all[1].slug);
      }
    });

    it('the oldest post (last index) has no older post — dead-ends, does not wrap', () => {
      const all = getAllPosts();
      const oldest = all[all.length - 1];
      const { newer, older } = getAdjacentPosts(oldest.slug);
      expect(older).toBeUndefined();
      if (all.length > 1) {
        expect(newer?.slug).toBe(all[all.length - 2].slug);
      }
    });

    it('a post in the middle gets both a newer and an older neighbor, matching sorted order', () => {
      const all = getAllPosts();
      if (all.length < 3) return; // needs a real middle post to be meaningful
      const middleIndex = Math.floor(all.length / 2);
      const middle = all[middleIndex];
      const { newer, older } = getAdjacentPosts(middle.slug);
      expect(newer?.slug).toBe(all[middleIndex - 1].slug);
      expect(older?.slug).toBe(all[middleIndex + 1].slug);
    });

    it('returns both undefined for an unknown slug (no fallback list, unlike getMoreProjects)', () => {
      expect(getAdjacentPosts('this-post-does-not-exist')).toEqual({ newer: undefined, older: undefined });
    });
  });
});

/**
 * `getAdjacentPostsFrom` — the pure, parameterized core of `getAdjacentPosts`
 * — exercised against synthetic data so edge cases that don't naturally
 * exist in the real content set can be asserted directly:
 * a single-post corpus, draft exclusion, and identical-date tie-break order.
 */
describe('getAdjacentPostsFrom', () => {
  function post(slug: string, date: string): Post {
    return { slug, date } as unknown as Post;
  }

  it('a single-post corpus has neither a newer nor an older neighbor', () => {
    const only = [post('solo', '2026-01-01')];
    expect(getAdjacentPostsFrom(only, 'solo')).toEqual({ newer: undefined, older: undefined });
  });

  it('returns both undefined for an unknown slug, even against a non-empty corpus', () => {
    const posts = [post('a', '2026-01-03'), post('b', '2026-01-01')];
    expect(getAdjacentPostsFrom(posts, 'does-not-exist')).toEqual({ newer: undefined, older: undefined });
  });

  it('returns both undefined for an empty corpus', () => {
    expect(getAdjacentPostsFrom([], 'anything')).toEqual({ newer: undefined, older: undefined });
  });

  it('never resolves a draft as a neighbor, because drafts are excluded before this function ever sees the array', () => {
    // Simulates the real pipeline: loader.ts calls filterVisiblePosts (which
    // drops drafts) BEFORE sortPosts, so `posts` — and therefore whatever
    // array reaches this function — never contains a draft in production.
    // A draft slug passed in here (as if it had leaked through) correctly
    // resolves as "unknown", proving there's no fallback path that could
    // surface one as a neighbor.
    const published = [post('newest', '2026-01-03'), post('oldest', '2026-01-01')];
    // 'secret-draft' was excluded upstream and never makes it into `published`.
    expect(getAdjacentPostsFrom(published, 'secret-draft')).toEqual({ newer: undefined, older: undefined });
    // And the published posts on either side of where a draft WOULD have sat
    // still resolve to each other directly, not to the (absent) draft.
    expect(getAdjacentPostsFrom(published, 'newest').older?.slug).toBe('oldest');
    expect(getAdjacentPostsFrom(published, 'oldest').newer?.slug).toBe('newest');
  });

  it('posts sharing an identical date get a stable, deterministic order (input order preserved — Array.sort is stable)', () => {
    // Two posts with the exact same date: whichever comes first in the
    // caller-supplied (already-sorted) array is treated as "newer" — the
    // function does no secondary tie-break of its own, it trusts index order.
    const posts = [post('first', '2026-01-01'), post('second', '2026-01-01'), post('third', '2025-12-01')];
    expect(getAdjacentPostsFrom(posts, 'second')).toEqual({
      newer: posts[0],
      older: posts[2],
    });
    // Re-running against the identically-ordered array is deterministic.
    expect(getAdjacentPostsFrom(posts, 'second')).toEqual({
      newer: posts[0],
      older: posts[2],
    });
  });
});
