import { describe, it, expect } from 'vitest';
import {
  ProjectFrontmatterSchema,
  ProjectMediaItemSchema,
  PostFrontmatterSchema,
  BacklogRefSchema,
  ProvenanceSchema,
  NarrativeFieldSchema,
  NarrativeCardFieldSchema,
  ProcessPhaseSchema,
  CommitBurstSchema,
  ProjectProcessSchema,
} from './schemas';
import { parseFrontmatter } from './frontmatter';

// Frozen snapshots of each of the six real `content/projects/*.md` files'
// FRONTMATTER, as committed at the time this v2 schema landed (2026-07-19) —
// deliberately NOT a live `import.meta.glob` read of `content/projects/*.md`.
// A parallel content-authoring pass is actively adding `goal`/`brief`/
// `process`/`template` to these same six files while this schema is being
// built (see the task brief), so a live read would make this exact
// backward-compatibility regression test flaky/racy against work happening
// in a different file at the same time. A frozen fixture is the correct
// tool here: it proves the SCHEMA change itself is additive against what
// those six files looked like before any v2 field existed, independent of
// whatever the content pass lands afterward. Ongoing "does the real content
// still validate" coverage for the CURRENT file contents is a separate,
// live concern (parseable by construction via `loader.ts`'s module-level
// parse, which every test importing `content/index.ts` already exercises).
const FROZEN_PROJECT_FRONTMATTER: Record<string, string> = {
  'soulforge.md': `title: "SoulForge"
slug: "soulforge"
summary: "A life-RPG habit tracker in pixel-art — one intense build day, then the plan outran the code."
stack: ["Vite", "React", "TypeScript", "Phaser", "Zustand", "Supabase"]
status: "in-progress"
repo: "https://github.com/dominiquebrom28/soulforge"
featured: true
order: 1
date: "2026-06-15"`,
  'chart-token-playground.md': `title: "Chart Token Playground"
slug: "chart-token-playground"
summary: "A semantic chart-token workbench for the Sollie design system, shipped as a single self-contained HTML file."
stack: ["React", "Zustand", "TypeScript", "Vite", "Tailwind CSS"]
status: "shipped"
cover: "/images/projects/chart-token-playground/ctp-hero-desktop.png"
media:
  - src: "/images/projects/chart-token-playground/ctp-flow.gif"
    poster: "/images/projects/chart-token-playground/ctp-flow-poster.jpg"
    alt: "placeholder alt"
    caption: "placeholder caption"
    kind: "animation"
    viewport: "desktop"
    width: 1000
    height: 625
featured: true
order: 3
date: "2026-06-24"`,
  'portfolio.md': `title: "Portfolio"
slug: "portfolio"
summary: "Dom's own portfolio, rebuilt as five switchable design directions — including a playable RPG version of itself."
stack: ["React", "react-router", "framer-motion", "Vite", "TypeScript"]
status: "in-progress"
cover: "/images/projects/portfolio/portfolio-hero-desktop.png"
featured: true
order: 2
date: "2026-07-06"`,
  'mensapp.md': `title: "MensApp"
slug: "mensapp"
summary: "A friend-group event app — polls, a live pub quiz, and a beer-crate counter — actually used for the real event."
stack: ["React", "Vite", "Supabase"]
status: "shipped"
repo: "https://github.com/dominiquebrom28/mensapp"
featured: false
order: 4
date: "2026-04-29"`,
  'lovediary.md': `title: "LoveDiary"
slug: "lovediary"
summary: "A couples' timeline app for logging relationship moments — polished single-player, but its partner sync is UI-only fake."
stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Zustand", "framer-motion"]
status: "in-progress"
repo: "https://github.com/dominiquebrom28/lovediary"
featured: false
order: 5
date: "2026-05-03"`,
  'pizzaparty.md': `title: "PizzaParty"
slug: "pizzaparty"
summary: "Spin the wheel, eat the pizza — a polished demo whose coupon/partner features were scaffolded and never built."
stack: ["HTML", "JavaScript", "Tailwind CSS", "Canvas API"]
status: "archived"
repo: "https://github.com/dominiquebrom28/pizzaparty"
featured: false
order: 6
date: "2026-05-01"`,
};

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

  describe('v2 fields (docs/project-page-v2.md §10) — additive, all optional', () => {
    it('defaults `template` to "standard" when absent', () => {
      expect(ProjectFrontmatterSchema.parse(validProject).template).toBe('standard');
    });

    describe('`soloBuild` (BACKLOG P1 positioning-disambiguation)', () => {
      it('defaults to `true` when absent — matches every project file that predates this field', () => {
        expect(ProjectFrontmatterSchema.parse(validProject).soloBuild).toBe(true);
      });

      it('accepts an explicit `soloBuild: false` for a future team-built project', () => {
        expect(ProjectFrontmatterSchema.parse({ ...validProject, soloBuild: false }).soloBuild).toBe(false);
      });

      it('accepts an explicit `soloBuild: true`', () => {
        expect(ProjectFrontmatterSchema.parse({ ...validProject, soloBuild: true }).soloBuild).toBe(true);
      });

      it('rejects a non-boolean `soloBuild` value', () => {
        expect(() => ProjectFrontmatterSchema.parse({ ...validProject, soloBuild: 'yes' })).toThrow();
      });
    });

    it('leaves `goal`, `brief`, `process` undefined when absent', () => {
      const result = ProjectFrontmatterSchema.parse(validProject);
      expect(result.goal).toBeUndefined();
      expect(result.brief).toBeUndefined();
      expect(result.process).toBeUndefined();
    });

    it('accepts an explicit `template: "single-sitting"`', () => {
      expect(ProjectFrontmatterSchema.parse({ ...validProject, template: 'single-sitting' }).template).toBe(
        'single-sitting',
      );
    });

    it('rejects an invalid `template` value', () => {
      expect(() => ProjectFrontmatterSchema.parse({ ...validProject, template: 'extended' })).toThrow();
    });

    it('accepts a populated `goal` field', () => {
      const result = ProjectFrontmatterSchema.parse({
        ...validProject,
        goal: { text: 'One intense build day, then the plan outran the code.', source: 'read' },
      });
      expect(result.goal).toEqual({ text: 'One intense build day, then the plan outran the code.', source: 'read' });
    });

    it('accepts a populated `brief` card with 2-4 bullets, one `not-stated`', () => {
      const result = ProjectFrontmatterSchema.parse({
        ...validProject,
        brief: {
          source: 'read',
          bullets: [
            { text: 'Make the fun part work.', source: 'read' },
            { text: 'No explicit written brief exists for this project.', source: 'not-stated' },
          ],
        },
      });
      expect(result.brief?.bullets).toHaveLength(2);
      expect(result.brief?.bullets[1].source).toBe('not-stated');
    });

    it('rejects a `brief` with only 1 bullet (min 2)', () => {
      expect(() =>
        ProjectFrontmatterSchema.parse({
          ...validProject,
          brief: { source: 'read', bullets: [{ text: 'Only one.', source: 'read' }] },
        }),
      ).toThrow();
    });

    it('rejects a `brief` with more than 4 bullets (max 4)', () => {
      expect(() =>
        ProjectFrontmatterSchema.parse({
          ...validProject,
          brief: {
            source: 'read',
            bullets: Array.from({ length: 5 }, (_, i) => ({ text: `Bullet ${i}`, source: 'read' as const })),
          },
        }),
      ).toThrow();
    });

    it('accepts a populated `process` block with commits, phases, and a cleanup sweep flag', () => {
      const result = ProjectFrontmatterSchema.parse({
        ...validProject,
        process: {
          commits: [
            { date: '2026-06-15', count: 9 },
            { date: '2026-07-16', count: 1, isCleanupSweep: true },
          ],
          phases: [
            {
              from: '2026-06-15',
              title: 'The build day',
              narrative: 'This cluster reads like getting the world walkable in one sitting.',
              tone: 'build',
            },
          ],
        },
      });
      expect(result.process?.commits).toHaveLength(2);
      expect(result.process?.commits[1].isCleanupSweep).toBe(true);
      expect(result.process?.phases).toHaveLength(1);
    });

    it('defaults a commit`s `isCleanupSweep` to false when absent', () => {
      const result = ProjectProcessSchema.parse({ commits: [{ date: '2026-06-15', count: 9 }] });
      expect(result.commits[0].isCleanupSweep).toBe(false);
    });

    it('defaults `process.phases` to an empty array when absent', () => {
      const result = ProjectProcessSchema.parse({ commits: [{ date: '2026-06-15', count: 9 }] });
      expect(result.phases).toEqual([]);
    });

    it('rejects a `process` with zero commits (min 1 — a project with nothing to scaffold uses `template: "single-sitting"` instead, not an empty `process`)', () => {
      expect(() => ProjectProcessSchema.parse({ commits: [] })).toThrow();
    });

    it('rejects a commit with a non-positive count', () => {
      expect(() => CommitBurstSchema.parse({ date: '2026-06-15', count: 0 })).toThrow();
    });

    it('rejects a commit with an invalid date', () => {
      expect(() => CommitBurstSchema.parse({ date: 'not-a-date', count: 1 })).toThrow();
    });

    it('accepts a process phase with only `from` (a single-point event, `to` omitted)', () => {
      expect(() =>
        ProcessPhaseSchema.parse({
          from: '2026-07-16',
          title: 'Cleanup sweep',
          narrative: 'The day five stalled repos got rescued at once.',
          tone: 'cleanup',
        }),
      ).not.toThrow();
    });

    it('rejects a process phase with an invalid `tone`', () => {
      expect(() =>
        ProcessPhaseSchema.parse({
          from: '2026-07-16',
          title: 'x',
          narrative: 'x',
          tone: 'triumph',
        }),
      ).toThrow();
    });

    it('rejects an empty `NarrativeField` text', () => {
      expect(() => NarrativeFieldSchema.parse({ text: '', source: 'read' })).toThrow();
    });

    it('rejects an invalid `Provenance` value', () => {
      expect(() => ProvenanceSchema.parse('guessed')).toThrow();
    });

    it('accepts every valid `Provenance` value', () => {
      for (const source of ['logged', 'read', 'not-stated'] as const) {
        expect(ProvenanceSchema.parse(source)).toBe(source);
      }
    });

    it('rejects a `NarrativeCardField` missing `source`', () => {
      expect(() =>
        NarrativeCardFieldSchema.parse({
          bullets: [
            { text: 'a', source: 'read' },
            { text: 'b', source: 'read' },
          ],
        }),
      ).toThrow();
    });

    describe('backward compatibility — all six pre-v2 project frontmatter snapshots still parse untouched', () => {
      const entries = Object.entries(FROZEN_PROJECT_FRONTMATTER);

      it('has exactly six frozen snapshots to validate', () => {
        expect(entries.length).toBe(6);
      });

      for (const [filename, yaml] of entries) {
        it(`${filename}`, () => {
          const { data } = parseFrontmatter(`---\n${yaml}\n---\n\nBody.`);
          expect(() => ProjectFrontmatterSchema.parse(data)).not.toThrow();
          const result = ProjectFrontmatterSchema.parse(data);
          // None of these pre-v2 snapshots authors any v2 field — this is the
          // literal "still parse untouched" bar the spec sets, not just
          // "doesn't throw".
          expect(result.goal).toBeUndefined();
          expect(result.brief).toBeUndefined();
          expect(result.process).toBeUndefined();
          expect(result.template).toBe('standard');
        });
      }
    });
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
