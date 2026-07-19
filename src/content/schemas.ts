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

// Project media gallery item (DOM-4: screenshots + short animations).
// `kind` distinguishes a still screenshot from a captured animation (GIF);
// `viewport` records which breakpoint the capture represents so the gallery
// can label it honestly instead of implying a single canonical view.
// `width`/`height` are the real intrinsic pixel dimensions of `src` — required
// (not inferred) so every gallery image can reserve its box up front and
// never shifts layout (design-brief §9 perf/CLS gate).
export const ProjectMediaItemSchema = z
  .object({
    src: z.string().min(1),
    alt: z.string().min(1),
    caption: z.string().min(1),
    kind: z.enum(['still', 'animation']),
    viewport: z.enum(['desktop', 'mobile']),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    // Static first-paint frame for an `animation` item (design-brief §9 /
    // DOM-4: a GIF autoplays the moment it loads and can't be paused after
    // the fact, which is motion the reader never consented to and a real LCP
    // risk. The gallery shows this poster and only swaps to `src` on an
    // explicit click — see `GalleryItem` in ProjectDetail.tsx).
    poster: z.string().optional(),
  })
  // `poster` is enforced as required for `kind: "animation"` here (rather
  // than left as a soft convention) because `GalleryItem`'s fallback is
  // `item.poster ?? item.src`: if `poster` is missing, the component falls
  // straight back to rendering the real animated `src` on first paint —
  // silently defeating the whole no-uninvited-motion guarantee the poster
  // exists for. QA (DOM-4 verification) found this reachable because the
  // schema originally allowed it. Still-only items are unaffected — the
  // check only fires for `kind: "animation"`.
  .superRefine((item, ctx) => {
    if (item.kind === 'animation' && !item.poster) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'a `poster` frame is required for kind: "animation" (prevents autoplay-on-load)',
        path: ['poster'],
      });
    }
  });

export type ProjectMediaItem = z.infer<typeof ProjectMediaItemSchema>;

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
  // Gallery is optional and defaults to empty so all six existing project
  // files (none of which set it yet) keep parsing unchanged (spec §3.1
  // backward-compatibility requirement).
  media: z.array(ProjectMediaItemSchema).default([]),
  featured: z.boolean().default(false),
  order: z.number().optional(),
  date: isoDate,
});

export type ProjectFrontmatter = z.infer<typeof ProjectFrontmatterSchema>;

export const PostFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .regex(slugPattern, 'slug must be lowercase kebab-case')
    .optional(),
  date: isoDate,
  summary: z.string().min(1).max(200),
  tags: z.array(z.string().min(1)).default([]),
  author: z.string().min(1).default('Dom'),
  cover: z.string().optional(),
  draft: z.boolean().default(false),
  // Same-day tie-break for `sortPosts` (loader.ts). Optional and additive —
  // every existing post has no `order` and keeps parsing unchanged.
  // Direction is deliberately spelled out here because an ordering field
  // whose direction is ambiguous is its own bug: HIGHER `order` = LATER in
  // the day = sorts FIRST (same convention as "the newest thing is on
  // top" — a post published at 21:00 with `order: 2` outranks one at 10:00
  // with `order: 1` on the same date). Posts on the same date that omit
  // `order` sort AFTER every post on that date that declares one; see
  // `sortPosts` for the full tie-break chain (date -> order -> slug).
  order: z.number().int().optional(),
});

export type PostFrontmatter = z.infer<typeof PostFrontmatterSchema>;

export interface Project extends ProjectFrontmatter {
  slug: string;
  body: string;
}

export interface Post extends PostFrontmatter {
  slug: string;
  body: string;
}
