import { z } from 'zod';
import { parseFrontmatter } from './frontmatter';
import {
  ProjectFrontmatterSchema,
  PostFrontmatterSchema,
  type Project,
  type Post,
  type PostFrontmatter,
} from './schemas';

// Same rule the Zod schemas use for an explicit frontmatter `slug` override
// (schemas.ts) — kept in sync here so a filename-derived slug is held to the
// identical bar (spec §2: "Slugs are lowercase kebab-case, validated at
// build time" is a property of every slug, not just explicit overrides).
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Eager glob: raw markdown strings, resolved at build time (spec §3.3).
// content/ lives outside src/ — see the `@content` alias + `server.fs.allow`
// in vite.config.ts.
const projectFiles = import.meta.glob('/content/projects/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const postFiles = import.meta.glob('/content/posts/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

export function slugFromPath(path: string): string {
  const stem = path.split('/').pop() ?? path;
  return stem.replace(/\.md$/, '');
}

export function buildCollection<TFrontmatter extends { slug?: string }>(
  files: Record<string, string>,
  schema: z.ZodType<TFrontmatter>,
  kind: 'project' | 'post',
): (TFrontmatter & { slug: string; body: string })[] {
  const seenSlugs = new Set<string>();
  const items: (TFrontmatter & { slug: string; body: string })[] = [];

  for (const [path, raw] of Object.entries(files)) {
    const { data, content } = parseFrontmatter(raw);
    const fileStem = slugFromPath(path);

    let frontmatter: TFrontmatter;
    try {
      frontmatter = schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `[content] Invalid ${kind} frontmatter in "${path}":\n${error.issues
            .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
            .join('\n')}`,
        );
      }
      throw error;
    }

    const slug = frontmatter.slug ?? fileStem;

    // The Zod schema already validates an *explicit* `slug:` frontmatter
    // value against this same pattern, but a filename-derived slug (the
    // common case — most content files don't set `slug` at all) bypassed
    // it entirely. Validate the resolved slug, not just the override.
    if (!SLUG_PATTERN.test(slug)) {
      throw new Error(
        `[content] Invalid ${kind} slug "${slug}" (from "${path}") — slugs must be lowercase kebab-case. ` +
          `Rename the file or set an explicit \`slug:\` frontmatter field.`,
      );
    }

    if (seenSlugs.has(slug)) {
      throw new Error(
        `[content] Duplicate ${kind} slug "${slug}" — check "${path}" against the other file using this slug.`,
      );
    }
    seenSlugs.add(slug);

    items.push({ ...frontmatter, slug, body: content });
  }

  return items;
}

const allProjectsRaw = buildCollection(projectFiles, ProjectFrontmatterSchema, 'project');
const allPostsRaw = buildCollection(postFiles, PostFrontmatterSchema, 'post');

/**
 * Normalizes a raw parsed post (post-Zod, pre-derived) to the `Post` shape
 * every component actually reads (blog-format-v2 §3). This is the loader-
 * level derivation the spec calls for — NOT a schema default — precisely so
 * the `author`/`authors` mutual-exclusion `.refine` in schemas.ts sees the
 * frontmatter exactly as written (neither field silently pre-filled) before
 * this function ever runs.
 *
 * `post.authors` is always populated: an explicit `authors` array wins,
 * otherwise a single `author` string is wrapped in a one-element array,
 * otherwise (neither field set) it falls back to `['Dom']` — the same
 * fallback identity `author` used to default to at the schema level, moved
 * here so it applies uniformly. `post.author` is always `authors[0]`, so
 * every existing single-author consumer (`Byline`, `ProvenanceStrip`,
 * `BlogPost`'s cast-member lookup, and the always-one-voice signature
 * block) keeps compiling and behaving identically, with zero code changes,
 * even against a multi-author post.
 */
export function normalizePost(raw: PostFrontmatter & { slug: string; body: string }): Post {
  const { author, authors: rawAuthors, ...rest } = raw;
  const authors = rawAuthors ?? (author ? [author] : ['Dom']);
  return { ...rest, authors, author: authors[0] };
}

// Drafts (posts) are filtered only in production so they preview in `npm run
// dev` but never ship (spec §3.3). Projects don't have a draft flag in the
// schema; `status` is the only lifecycle field and every status is public.
// Extracted to a pure, exported function (QA testability pass — no behavior
// change) so the PROD-gating rule can be asserted directly in tests instead
// of relying on `import.meta.env.PROD`, which can't be flipped mid-test-run.
export function filterVisiblePosts(items: Post[], isProd: boolean): Post[] {
  return isProd ? items.filter((post) => !post.draft) : items;
}

const normalizedPosts = (allPostsRaw as (PostFrontmatter & { slug: string; body: string })[]).map(normalizePost);
const visiblePosts = filterVisiblePosts(normalizedPosts, import.meta.env.PROD);

export function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const orderA = a.order ?? Number.POSITIVE_INFINITY;
    const orderB = b.order ?? Number.POSITIVE_INFINITY;
    if (orderA !== orderB) return orderA - orderB;
    return Date.parse(b.date) - Date.parse(a.date);
  });
}

export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export const projects: readonly Project[] = Object.freeze(sortProjects(allProjectsRaw as Project[]));
export const posts: readonly Post[] = Object.freeze(sortPosts(visiblePosts as Post[]));
