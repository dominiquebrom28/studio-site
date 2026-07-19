import { describe, it, expect } from 'vitest';
import {
  buildCollection,
  slugFromPath,
  sortProjects,
  sortPosts,
  filterVisiblePosts,
} from './loader';
import { ProjectFrontmatterSchema, PostFrontmatterSchema, type Project, type Post } from './schemas';

function projectFile(frontmatterYaml: string, body = 'Body.'): string {
  return `---\n${frontmatterYaml}\n---\n\n${body}`;
}

const baseProjectFrontmatter = `title: "Test Project"
summary: "A test project."
stack: ["Vite"]
status: "shipped"
date: "2026-01-01"`;

const basePostFrontmatter = `title: "Test Post"
date: "2026-01-01"
summary: "A test post."`;

describe('slugFromPath', () => {
  it('derives the filename stem from a full glob path', () => {
    expect(slugFromPath('/content/projects/soulforge.md')).toBe('soulforge');
  });

  it('strips only the .md extension, keeping dots elsewhere in the name', () => {
    expect(slugFromPath('/content/posts/2026-07-15-i-gave-claude-a-dev-team.md')).toBe(
      '2026-07-15-i-gave-claude-a-dev-team',
    );
  });
});

describe('buildCollection — slug derivation', () => {
  it('uses the filename stem as the slug when no frontmatter override is given', () => {
    const files = {
      '/content/projects/soulforge.md': projectFile(baseProjectFrontmatter),
    };
    const items = buildCollection(files, ProjectFrontmatterSchema, 'project');
    expect(items[0].slug).toBe('soulforge');
  });

  it('uses the frontmatter `slug` field when explicitly provided, overriding the filename', () => {
    const files = {
      '/content/projects/some-file-name.md': projectFile(
        `${baseProjectFrontmatter}\nslug: "custom-slug"`,
      ),
    };
    const items = buildCollection(files, ProjectFrontmatterSchema, 'project');
    expect(items[0].slug).toBe('custom-slug');
  });
});

describe('buildCollection — duplicate slug rejection', () => {
  it('throws when two files resolve to the same slug via filename stem', () => {
    const files = {
      '/content/projects/soulforge.md': projectFile(baseProjectFrontmatter),
      '/content/projects/subdir/soulforge.md': projectFile(baseProjectFrontmatter),
    };
    expect(() => buildCollection(files, ProjectFrontmatterSchema, 'project')).toThrow(/duplicate/i);
  });

  it('throws when an explicit frontmatter slug collides with another file', () => {
    const files = {
      '/content/projects/a.md': projectFile(`${baseProjectFrontmatter}\nslug: "shared"`),
      '/content/projects/b.md': projectFile(`${baseProjectFrontmatter}\nslug: "shared"`),
    };
    expect(() => buildCollection(files, ProjectFrontmatterSchema, 'project')).toThrow(/duplicate/i);
  });
});

describe('buildCollection — kebab-case slug enforcement', () => {
  it('rejects an explicit frontmatter slug that is not kebab-case', () => {
    const files = {
      '/content/projects/a.md': projectFile(`${baseProjectFrontmatter}\nslug: "Not_Kebab_Case"`),
    };
    expect(() => buildCollection(files, ProjectFrontmatterSchema, 'project')).toThrow();
  });

  // Spec §2: "Slugs are lowercase kebab-case, validated at build time" — this
  // is stated as a property of every slug, not just explicit overrides. A
  // slug derived from the filename stem (the common case — most content
  // files won't set `slug` at all) must be held to the same rule.
  it('rejects a filename-derived slug that is not kebab-case (BUG: currently unenforced)', () => {
    const files = {
      '/content/projects/Not_Kebab_Case.md': projectFile(baseProjectFrontmatter),
    };
    expect(() => buildCollection(files, ProjectFrontmatterSchema, 'project')).toThrow();
  });
});

describe('buildCollection — Zod validation', () => {
  it('throws a descriptive error when a required field is missing', () => {
    const files = {
      '/content/projects/broken.md': projectFile(`title: "Missing stuff"`),
    };
    expect(() => buildCollection(files, ProjectFrontmatterSchema, 'project')).toThrow(
      /Invalid project frontmatter/,
    );
  });

  it('throws when a field has the wrong type / invalid enum value', () => {
    const files = {
      '/content/projects/broken.md': projectFile(
        `${baseProjectFrontmatter}\nstatus: "not-a-real-status"`,
      ),
    };
    expect(() => buildCollection(files, ProjectFrontmatterSchema, 'project')).toThrow();
  });

  it('carries the raw markdown body through untouched (not parsed at load time)', () => {
    const files = {
      '/content/projects/a.md': projectFile(baseProjectFrontmatter, '# Heading\n\nSome *body* text.'),
    };
    const items = buildCollection(files, ProjectFrontmatterSchema, 'project');
    expect(items[0].body).toBe('# Heading\n\nSome *body* text.');
  });

  it('post schema rejects a missing required field the same way', () => {
    const files = {
      '/content/posts/broken.md': projectFile(`title: "No date or summary"`),
    };
    expect(() => buildCollection(files, PostFrontmatterSchema, 'post')).toThrow(
      /Invalid post frontmatter/,
    );
  });

  it('post schema accepts a fully valid post frontmatter block', () => {
    const files = {
      '/content/posts/ok.md': projectFile(basePostFrontmatter),
    };
    const items = buildCollection(files, PostFrontmatterSchema, 'post');
    expect(items[0].slug).toBe('ok');
  });
});

describe('sortProjects', () => {
  it('sorts by `order` ascending first, ignoring date when order differs', () => {
    const projects = [
      { slug: 'c', order: 2, date: '2020-01-01' },
      { slug: 'a', order: 1, date: '1999-01-01' },
      { slug: 'b', order: 3, date: '2030-01-01' },
    ] as unknown as Project[];
    const sorted = sortProjects(projects);
    expect(sorted.map((p) => p.slug)).toEqual(['a', 'c', 'b']);
  });

  it('falls back to date descending when `order` is absent on all items', () => {
    const projects = [
      { slug: 'older', date: '2020-01-01' },
      { slug: 'newest', date: '2026-06-01' },
      { slug: 'middle', date: '2023-01-01' },
    ] as unknown as Project[];
    const sorted = sortProjects(projects);
    expect(sorted.map((p) => p.slug)).toEqual(['newest', 'middle', 'older']);
  });

  it('treats items without `order` as sorting after items with `order`', () => {
    const projects = [
      { slug: 'no-order', date: '2030-01-01' },
      { slug: 'has-order', order: 5, date: '2000-01-01' },
    ] as unknown as Project[];
    const sorted = sortProjects(projects);
    expect(sorted.map((p) => p.slug)).toEqual(['has-order', 'no-order']);
  });

  it('does not mutate the input array', () => {
    const projects = [
      { slug: 'a', order: 2, date: '2020-01-01' },
      { slug: 'b', order: 1, date: '2020-01-01' },
    ] as unknown as Project[];
    const original = [...projects];
    sortProjects(projects);
    expect(projects).toEqual(original);
  });
});

describe('sortPosts', () => {
  it('sorts by date descending', () => {
    const posts = [
      { slug: 'oldest', date: '2020-01-01' },
      { slug: 'newest', date: '2026-07-15' },
      { slug: 'middle', date: '2023-05-05' },
    ] as unknown as Post[];
    const sorted = sortPosts(posts);
    expect(sorted.map((p) => p.slug)).toEqual(['newest', 'middle', 'oldest']);
  });

  // Posts sharing an identical date and neither declaring `order` fall back
  // to `slug` ascending — a guaranteed, content-derived tie-break, NOT
  // `Array.prototype.sort`'s input-order stability and NOT
  // `import.meta.glob`'s filesystem/filename order. That determinism is what
  // `getAdjacentPosts` (content/index.ts) relies on for a well-defined
  // "newer"/"older" neighbor when two posts share a date.
  it('falls back to slug ascending for posts sharing an identical date with no `order`', () => {
    const posts = [
      { slug: 'same-date-c', date: '2026-01-01' },
      { slug: 'same-date-a', date: '2026-01-01' },
      { slug: 'same-date-b', date: '2026-01-01' },
    ] as unknown as Post[];
    const sorted = sortPosts(posts);
    expect(sorted.map((p) => p.slug)).toEqual(['same-date-a', 'same-date-b', 'same-date-c']);
  });

  it('on a shared date, sorts by `order` descending — higher order (later in the day) shown first', () => {
    const posts = [
      { slug: 'morning', date: '2026-07-18', order: 1 },
      { slug: 'evening', date: '2026-07-18', order: 5 },
      { slug: 'afternoon', date: '2026-07-18', order: 3 },
    ] as unknown as Post[];
    const sorted = sortPosts(posts);
    expect(sorted.map((p) => p.slug)).toEqual(['evening', 'afternoon', 'morning']);
  });

  it('on a shared date, a post with no `order` sorts after every post on that date that declares one', () => {
    const posts = [
      { slug: 'no-order', date: '2026-07-18' },
      { slug: 'has-order', date: '2026-07-18', order: -5 },
    ] as unknown as Post[];
    const sorted = sortPosts(posts);
    expect(sorted.map((p) => p.slug)).toEqual(['has-order', 'no-order']);
  });

  it('falls back to slug ascending when date AND order are fully identical', () => {
    const posts = [
      { slug: 'z-post', date: '2026-07-18', order: 2 },
      { slug: 'a-post', date: '2026-07-18', order: 2 },
    ] as unknown as Post[];
    const sorted = sortPosts(posts);
    expect(sorted.map((p) => p.slug)).toEqual(['a-post', 'z-post']);
  });

  it('does not mutate the input array', () => {
    const posts = [
      { slug: 'a', date: '2020-01-01' },
      { slug: 'b', date: '2026-01-01' },
    ] as unknown as Post[];
    const original = [...posts];
    sortPosts(posts);
    expect(posts).toEqual(original);
  });
});

describe('filterVisiblePosts — draft gating on PROD', () => {
  const posts = [
    { slug: 'published', date: '2026-01-01', draft: false },
    { slug: 'draft-post', date: '2026-01-02', draft: true },
  ] as unknown as Post[];

  it('includes drafts when isProd is false (dev preview)', () => {
    const visible = filterVisiblePosts(posts, false);
    expect(visible.map((p) => p.slug)).toEqual(['published', 'draft-post']);
  });

  it('excludes drafts when isProd is true (production build)', () => {
    const visible = filterVisiblePosts(posts, true);
    expect(visible.map((p) => p.slug)).toEqual(['published']);
  });
});
