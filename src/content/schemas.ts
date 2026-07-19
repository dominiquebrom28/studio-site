import { z } from 'zod';

/** Kebab-case slug: lowercase letters, digits, hyphens; no leading/trailing/double hyphens. */
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const urlOrEmpty = z
  .string()
  .refine((value) => value === '' || /^https?:\/\//.test(value), {
    message: 'must be an http(s) URL',
  })
  .optional();

const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'must be a valid ISO date string (e.g. "2026-07-15")',
});

export const ProjectFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .regex(slugPattern, 'slug must be lowercase kebab-case')
    .optional(),
  summary: z.string().min(1).max(160),
  stack: z.array(z.string().min(1)).min(1),
  status: z.enum(['shipped', 'in-progress', 'archived']),
  repo: urlOrEmpty,
  liveUrl: urlOrEmpty,
  cover: z.string().optional(),
  featured: z.boolean().default(false),
  order: z.number().optional(),
  date: isoDate,
});

export type ProjectFrontmatter = z.infer<typeof ProjectFrontmatterSchema>;

/**
 * A single "worked on this entry" backlog reference (blog-format-v2 §3).
 * `label` is a free string, not an enum/id, on purpose — `BACKLOG.md` has no
 * stable per-item identifier today (see the spec §6 rationale). `status` is
 * the one part that IS schema-validated, since it drives `BacklogChip`'s
 * tone mapping.
 */
export const BacklogRefSchema = z.object({
  label: z.string().min(1),
  status: z.enum(['completed', 'in-progress', 'planned']),
});

export type BacklogChipRef = z.infer<typeof BacklogRefSchema>;

export const PostFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    slug: z
      .string()
      .regex(slugPattern, 'slug must be lowercase kebab-case')
      .optional(),
    date: isoDate,
    summary: z.string().min(1).max(200),
    tags: z.array(z.string().min(1)).default([]),
    // No `.default('Dom')` here on purpose (blog-format-v2 §3): the "Dom"
    // fallback moved to the loader-level `normalizePost` so it applies
    // uniformly whether a post sets neither `author` nor `authors`, one, or
    // (rejected below) both. A schema-level default on `author` alone would
    // make it always-truthy at parse time, silently breaking the
    // mutual-exclusion `.refine` for any post that only sets `authors`.
    author: z.string().min(1).optional(),
    // NEW (blog-format-v2 §3): ordered list, credit order = array order.
    // Mutually exclusive with `author` — see the `.refine` below.
    authors: z.array(z.string().min(1)).min(1).max(4).optional(),
    // NEW: 2-5 plain-text bullets, no inline markdown/links (§4 — a fact
    // needing a citation belongs in the body, not the TL;DR).
    tldr: z.array(z.string().min(1).max(140)).min(2).max(5).optional(),
    // NEW: up to 6 "worked on this entry" backlog labels.
    backlogRefs: z.array(BacklogRefSchema).max(6).optional(),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
  })
  .refine((frontmatter) => !(frontmatter.author && frontmatter.authors), {
    message: '`author` and `authors` are mutually exclusive — pick one',
    path: ['author'],
  });

export type PostFrontmatter = z.infer<typeof PostFrontmatterSchema>;

export interface Project extends ProjectFrontmatter {
  slug: string;
  body: string;
}

/**
 * The publicly-consumed post shape — `author`/`authors` are normalized here
 * to always-populated fields (see `normalizePost` in loader.ts), so every
 * existing consumer (`Byline`, `ProvenanceStrip`, `BlogPost`'s cast-member
 * lookup) keeps reading a plain `string` `post.author` with zero changes,
 * even for a multi-author post. `PostFrontmatter`'s `author`/`authors` stay
 * optional at the schema level (raw frontmatter, pre-normalization); `Post`
 * is what every component actually reads.
 */
export interface Post extends Omit<PostFrontmatter, 'author' | 'authors'> {
  slug: string;
  body: string;
  /** Always populated; always equal to `authors[0]` (the primary/compiling
   * voice — see loader.ts `normalizePost` and BlogPost.tsx's signature-block
   * rule). */
  author: string;
  /** Always populated (defaults to `['Dom']` when the post sets neither
   * `author` nor `authors`). Ordered; credit order = array order. */
  authors: string[];
}
