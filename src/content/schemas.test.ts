import { describe, it, expect } from 'vitest';
import {
  ProjectFrontmatterSchema,
  ProjectMediaItemSchema,
  PostFrontmatterSchema,
  BacklogRefSchema,
} from './schemas';

const validProject = {
  title: 'SoulForge',
  summary: 'A gamified productivity RPG.',
  stack: ['Vite', 'React'],
  status: 'in-progress',
  date: '2026-06-15',
};

const validMediaItem = {
  src: '/images/projects/example/example-hero-desktop.png',
  alt: 'Example project desktop view showing the main dashboard.',
  caption: 'Example project default workspace.',
  kind: 'still' as const,
  viewport: 'desktop' as const,
  width: 1280,
  height: 800,
};

const validPost = {
  title: 'I gave Claude a dev team',
  date: '2026-07-15',
  summary: 'How the studio was set up.',
};

describe('ProjectFrontmatterSchema', () => {
  it('accepts valid frontmatter and applies defaults', () => {
    const result = ProjectFrontmatterSchema.parse(validProject);
    expect(result.featured).toBe(false);
    expect(result.title).toBe('SoulForge');
  });

  it('rejects a missing required field (title)', () => {
    const { title: _title, ...rest } = validProject;
    expect(() => ProjectFrontmatterSchema.parse(rest)).toThrow();
  });

  it('rejects a missing required field (summary)', () => {
    const { summary: _summary, ...rest } = validProject;
    expect(() => ProjectFrontmatterSchema.parse(rest)).toThrow();
  });

  it('rejects a missing required field (stack)', () => {
    const { stack: _stack, ...rest } = validProject;
    expect(() => ProjectFrontmatterSchema.parse(rest)).toThrow();
  });

  it('rejects an empty stack array (min 1)', () => {
    expect(() => ProjectFrontmatterSchema.parse({ ...validProject, stack: [] })).toThrow();
  });

  it('rejects an invalid status enum value', () => {
    expect(() => ProjectFrontmatterSchema.parse({ ...validProject, status: 'finished' })).toThrow();
  });

  it('rejects a summary over 160 chars', () => {
    expect(() =>
      ProjectFrontmatterSchema.parse({ ...validProject, summary: 'x'.repeat(161) }),
    ).toThrow();
  });

  it('rejects an invalid (non-ISO-parseable) date', () => {
    expect(() => ProjectFrontmatterSchema.parse({ ...validProject, date: 'not-a-date' })).toThrow();
  });

  it('rejects a non-kebab-case explicit slug override', () => {
    expect(() =>
      ProjectFrontmatterSchema.parse({ ...validProject, slug: 'SoulForge_V2' }),
    ).toThrow();
    expect(() => ProjectFrontmatterSchema.parse({ ...validProject, slug: 'Soul Forge' })).toThrow();
    expect(() => ProjectFrontmatterSchema.parse({ ...validProject, slug: '-leading-hyphen' })).toThrow();
    expect(() => ProjectFrontmatterSchema.parse({ ...validProject, slug: 'double--hyphen' })).toThrow();
  });

  it('accepts a valid kebab-case explicit slug override', () => {
    const result = ProjectFrontmatterSchema.parse({ ...validProject, slug: 'soul-forge-v2' });
    expect(result.slug).toBe('soul-forge-v2');
  });

  it('rejects a repo/liveUrl that is not http(s)', () => {
    expect(() =>
      ProjectFrontmatterSchema.parse({ ...validProject, repo: 'javascript:alert(1)' }),
    ).toThrow();
    expect(() =>
      ProjectFrontmatterSchema.parse({ ...validProject, liveUrl: 'ftp://example.com' }),
    ).toThrow();
  });

  it('accepts an empty-string repo/liveUrl (treated as absent)', () => {
    expect(() => ProjectFrontmatterSchema.parse({ ...validProject, repo: '' })).not.toThrow();
  });

  it('defaults `media` to an empty array when absent (graceful degradation — the four projects with no assets yet)', () => {
    const result = ProjectFrontmatterSchema.parse(validProject);
    expect(result.media).toEqual([]);
  });

  it('accepts `cover` and a populated `media` gallery together', () => {
    const result = ProjectFrontmatterSchema.parse({
      ...validProject,
      cover: '/images/projects/example/example-hero-desktop.png',
      media: [validMediaItem],
    });
    expect(result.cover).toBe('/images/projects/example/example-hero-desktop.png');
    expect(result.media).toHaveLength(1);
    expect(result.media[0].kind).toBe('still');
  });

  it('rejects a media item missing a required field (alt)', () => {
    const { alt: _alt, ...rest } = validMediaItem;
    expect(() => ProjectFrontmatterSchema.parse({ ...validProject, media: [rest] })).toThrow();
  });

  it('rejects a media item with an invalid `kind`', () => {
    expect(() =>
      ProjectFrontmatterSchema.parse({
        ...validProject,
        media: [{ ...validMediaItem, kind: 'video' }],
      }),
    ).toThrow();
  });

  it('rejects a media item with an invalid `viewport`', () => {
    expect(() =>
      ProjectFrontmatterSchema.parse({
        ...validProject,
        media: [{ ...validMediaItem, viewport: 'tablet' }],
      }),
    ).toThrow();
  });

  it('rejects non-positive or non-integer width/height (needed to reserve a layout box, no CLS)', () => {
    expect(() => ProjectMediaItemSchema.parse({ ...validMediaItem, width: 0 })).toThrow();
    expect(() => ProjectMediaItemSchema.parse({ ...validMediaItem, width: -100 })).toThrow();
    expect(() => ProjectMediaItemSchema.parse({ ...validMediaItem, height: 12.5 })).toThrow();
  });

  it('accepts an `animation` media item with an optional `poster` frame', () => {
    const result = ProjectMediaItemSchema.parse({
      ...validMediaItem,
      kind: 'animation',
      poster: '/images/projects/example/example-flow-poster.jpg',
    });
    expect(result.poster).toBe('/images/projects/example/example-flow-poster.jpg');
  });

  it('rejects an `animation` media item without a `poster` (a poster-less animation falls back to rendering the real, autoplaying src on first paint — see GalleryItem`s `item.poster ?? item.src`, so this must fail validation, not silently degrade)', () => {
    expect(() => ProjectMediaItemSchema.parse({ ...validMediaItem, kind: 'animation' })).toThrow();
  });

  it('does not require `poster` on a `still` item (the refinement only fires for kind: "animation")', () => {
    expect(() => ProjectMediaItemSchema.parse({ ...validMediaItem, kind: 'still' })).not.toThrow();
  });
});

describe('PostFrontmatterSchema', () => {
  it('accepts valid frontmatter and applies defaults', () => {
    const result = PostFrontmatterSchema.parse(validPost);
    expect(result.draft).toBe(false);
    expect(result.tags).toEqual([]);
  });

  // blog-format-v2 §3: the schema no longer defaults `author` to "Dom" —
  // that fallback moved to the loader's `normalizePost` so it applies
  // uniformly across `author`/`authors`/neither. At the schema level, a post
  // that sets neither field simply parses with `author` and `authors` both
  // absent.
  it('leaves `author` and `authors` both absent when neither is set (no schema-level default anymore)', () => {
    const result = PostFrontmatterSchema.parse(validPost);
    expect(result.author).toBeUndefined();
    expect(result.authors).toBeUndefined();
  });

  it('rejects a missing required field (date)', () => {
    const { date: _date, ...rest } = validPost;
    expect(() => PostFrontmatterSchema.parse(rest)).toThrow();
  });

  it('rejects a missing required field (summary)', () => {
    const { summary: _summary, ...rest } = validPost;
    expect(() => PostFrontmatterSchema.parse(rest)).toThrow();
  });

  it('rejects a summary over 200 chars', () => {
    expect(() => PostFrontmatterSchema.parse({ ...validPost, summary: 'x'.repeat(201) })).toThrow();
  });

  it('rejects a non-boolean draft value', () => {
    expect(() => PostFrontmatterSchema.parse({ ...validPost, draft: 'yes' })).toThrow();
  });

  it('rejects a non-kebab-case explicit slug override', () => {
    expect(() => PostFrontmatterSchema.parse({ ...validPost, slug: 'Not_Kebab' })).toThrow();
  });

  describe('authors (multi-author, blog-format-v2 §3)', () => {
    it('accepts a single `author` string with no `authors` field', () => {
      const result = PostFrontmatterSchema.parse({ ...validPost, author: 'designer' });
      expect(result.author).toBe('designer');
      expect(result.authors).toBeUndefined();
    });

    it('accepts an `authors` array with no `author` field', () => {
      const result = PostFrontmatterSchema.parse({ ...validPost, authors: ['designer', 'frontend-dev'] });
      expect(result.authors).toEqual(['designer', 'frontend-dev']);
      expect(result.author).toBeUndefined();
    });

    it('rejects a post that sets BOTH `author` and `authors` (mutually exclusive)', () => {
      expect(() =>
        PostFrontmatterSchema.parse({ ...validPost, author: 'designer', authors: ['designer', 'frontend-dev'] }),
      ).toThrow(/mutually exclusive/);
    });

    it('rejects an empty `authors` array (min 1)', () => {
      expect(() => PostFrontmatterSchema.parse({ ...validPost, authors: [] })).toThrow();
    });

    it('rejects more than 4 authors', () => {
      expect(() =>
        PostFrontmatterSchema.parse({
          ...validPost,
          authors: ['designer', 'frontend-dev', 'backend-dev', 'devops', 'qa-tester'],
        }),
      ).toThrow();
    });

    it('accepts exactly 4 authors (the max)', () => {
      const result = PostFrontmatterSchema.parse({
        ...validPost,
        authors: ['designer', 'frontend-dev', 'backend-dev', 'devops'],
      });
      expect(result.authors).toHaveLength(4);
    });
  });

  describe('tldr (blog-format-v2 §3/§4)', () => {
    it('accepts 2-5 plain-text bullets', () => {
      const result = PostFrontmatterSchema.parse({ ...validPost, tldr: ['First point.', 'Second point.'] });
      expect(result.tldr).toEqual(['First point.', 'Second point.']);
    });

    it('rejects fewer than 2 bullets', () => {
      expect(() => PostFrontmatterSchema.parse({ ...validPost, tldr: ['Only one.'] })).toThrow();
    });

    it('rejects more than 5 bullets', () => {
      expect(() =>
        PostFrontmatterSchema.parse({ ...validPost, tldr: ['a', 'b', 'c', 'd', 'e', 'f'] }),
      ).toThrow();
    });

    it('rejects a bullet over 140 chars', () => {
      expect(() =>
        PostFrontmatterSchema.parse({ ...validPost, tldr: ['x'.repeat(141), 'A second bullet.'] }),
      ).toThrow();
    });

    it('is absent (not an empty array) when the post declares no tldr', () => {
      expect(PostFrontmatterSchema.parse(validPost).tldr).toBeUndefined();
    });
  });

  describe('backlogRefs (blog-format-v2 §3)', () => {
    it('accepts a valid backlogRefs array', () => {
      const result = PostFrontmatterSchema.parse({
        ...validPost,
        backlogRefs: [{ label: 'Blog engine', status: 'completed' }],
      });
      expect(result.backlogRefs).toEqual([{ label: 'Blog engine', status: 'completed' }]);
    });

    it('rejects an invalid status enum value', () => {
      expect(() =>
        PostFrontmatterSchema.parse({
          ...validPost,
          backlogRefs: [{ label: 'Blog engine', status: 'done' }],
        }),
      ).toThrow();
    });

    it('rejects more than 6 backlogRefs', () => {
      const refs = Array.from({ length: 7 }, (_, i) => ({ label: `Item ${i}`, status: 'completed' as const }));
      expect(() => PostFrontmatterSchema.parse({ ...validPost, backlogRefs: refs })).toThrow();
    });
  });
});

describe('BacklogRefSchema', () => {
  it('accepts each valid status value', () => {
    for (const status of ['completed', 'in-progress', 'planned'] as const) {
      expect(BacklogRefSchema.parse({ label: 'x', status }).status).toBe(status);
    }
  });

  it('rejects an empty label', () => {
    expect(() => BacklogRefSchema.parse({ label: '', status: 'completed' })).toThrow();
  });
});
