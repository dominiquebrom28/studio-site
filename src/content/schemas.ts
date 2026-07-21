import { z } from 'zod';

/** Kebab-case slug: lowercase letters, digits, hyphens; no leading/trailing/double hyphens. */
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const urlOrEmpty = z
  .string()
  .refine((value) => value === '' || /^https?:\/\//.test(value), {
    message: 'must be an http(s) URL',
  })
  .optional();

// Canonical calendar date, `YYYY-MM-DD` only. The regex pins the FORMAT (a
// bare `Date.parse` refine accepts "July 18, 2026", "2026/07/18",
// "2026-07-18T00:00:00Z" etc. — all of which then ship malformed into
// sitemap `<lastmod>` and, worse, silently defeat the same-day `order`
// tie-break, since two posts on the same calendar day written in different
// string forms group into different date buckets); the refine pins that the
// canonical string is also a REAL date (rejects "2026-13-45").
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'must be a canonical date "YYYY-MM-DD" (e.g. "2026-07-15")',
  })
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'must be a real calendar date (e.g. "2026-07-15")',
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

// --- Process/narrative additions (docs/project-page-v2.md §10) ---
//
// All of the below are OPTIONAL at the ProjectFrontmatterSchema level and
// none of the six existing project files set any of them yet — this is a
// strict additive change, verified by schemas.test.ts's "all six existing
// projects still parse with no new fields" pass-through tests.

/** The recorded/inferred provenance convention (spec §1): every narrative
 * block on a project page is tagged as straight-from-git-history
 * (`logged`), the studio's own interpretive reading (`read`), or an honest
 * admission that the source material doesn't say (`not-stated`). */
export const ProvenanceSchema = z.enum(['logged', 'read', 'not-stated']);
export type Provenance = z.infer<typeof ProvenanceSchema>;

/** A single narrative field: prose text plus the provenance tag that governs
 * its typographic treatment (italic for `read`, roman otherwise — spec §1B)
 * and its `ProvenanceTag` badge. Used directly for `goal` ("Why this
 * exists" — one block, one tag, one to three sentences). */
export const NarrativeFieldSchema = z.object({
  text: z.string().min(1),
  source: ProvenanceSchema,
});
export type NarrativeField = z.infer<typeof NarrativeFieldSchema>;

// `brief` deviates from the spec §10 code sample, which shows
// `brief: NarrativeFieldSchema.optional()` (a single text+source pair).
// That can't actually represent what spec §3 asks for: "The Brief" is 2-4
// BULLETS, and — its own words — "One line may honestly be `not-stated`
// where a project has no discernible brief... say so plainly rather than
// padding" (PizzaParty's case). A single scalar `source` has nowhere to put
// a bullet-level exception. `NarrativeCardFieldSchema` keeps one `source`
// for the block's eyebrow `ProvenanceTag` (spec §1A: the tag sits on the
// block, not sprinkled per line) while giving each bullet its own
// `NarrativeField` so an individual line can honestly diverge (e.g. mostly
// `read` bullets, one `not-stated`). Flagged as a deliberate schema
// deviation, not an oversight — see the frontend-dev report.
export const NarrativeCardFieldSchema = z.object({
  source: ProvenanceSchema,
  bullets: z.array(NarrativeFieldSchema).min(2).max(4),
});
export type NarrativeCardField = z.infer<typeof NarrativeCardFieldSchema>;

/** A `BuildTimeline` phase caption (spec §2.2 "narrative layer"): a real
 * in-flow caption anchored to a date range (or a single point, when `to` is
 * omitted), always rendered as real content — never `aria-hidden`. */
export const ProcessPhaseSchema = z.object({
  from: isoDate,
  to: isoDate.optional(),
  title: z.string().min(1),
  narrative: z.string().min(1),
  tone: z.enum(['build', 'silence', 'pivot', 'cleanup', 'reactivation']),
});
export type ProcessPhase = z.infer<typeof ProcessPhaseSchema>;

/** One day's worth of real commit history (spec §2.2 "scaffold"). `date` is
 * day-granularity on purpose — matches `docs/research/commit-bursts.md`,
 * which is the authoritative, mechanically-extracted source for this data
 * (transcribe from there; never hand-estimate). `isCleanupSweep` flags the
 * 2026-07-16 five-repo sweep specifically. */
export const CommitBurstSchema = z.object({
  date: isoDate,
  count: z.number().int().positive(),
  isCleanupSweep: z.boolean().default(false),
  commitUrl: urlOrEmpty,
});
export type CommitBurst = z.infer<typeof CommitBurstSchema>;

/** The full `BuildTimeline` data set for a project. `commits.min(1)` — a
 * project that declares `process` at all must have at least one real commit
 * to scaffold the timeline on; a project with truly nothing to draw (Chart
 * Token Playground) omits `process` entirely and uses `template:
 * "single-sitting"` instead (spec §2.4), which reads `sessionsNote` off the
 * frontmatter directly rather than through this shape. */
export const ProjectProcessSchema = z.object({
  commits: z.array(CommitBurstSchema).min(1),
  phases: z.array(ProcessPhaseSchema).default([]),
  sessionsNote: z.string().optional(),
});
export type ProjectProcess = z.infer<typeof ProjectProcessSchema>;

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
  // --- v2 (docs/project-page-v2.md §10) — all optional, all additive ---
  /** "Why this exists" narrative block (spec §3). */
  goal: NarrativeFieldSchema.optional(),
  /** "The Brief" card block (spec §3) — see `NarrativeCardFieldSchema`'s
   * doc comment for why this isn't the single-field shape spec §10 sketched. */
  brief: NarrativeCardFieldSchema.optional(),
  /** `BuildTimeline` data (spec §2). Absent on the single-sitting template
   * and on any project a content pass hasn't reached yet. */
  process: ProjectProcessSchema.optional(),
  // Defaults to 'standard' rather than being left undefined so every
  // existing project (six files, none of which set `template` yet) and
  // every consumer can treat this as an always-populated, two-valued
  // discriminant with no `project.template ?? 'standard'` fallback logic
  // scattered through components.
  template: z.enum(['standard', 'single-sitting']).default('standard'),
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
    // Same-day tie-break for `sortPosts` (loader.ts). Optional and additive —
    // every existing post has no `order` and keeps parsing unchanged.
    // Direction is deliberately spelled out here because an ordering field
    // whose direction is ambiguous is its own bug: HIGHER `order` = LATER in
    // the day = sorts FIRST (a post published at 21:00 with `order: 2`
    // outranks one at 10:00 with `order: 1` on the same date). Posts on the
    // same date that omit `order` sort AFTER every post on that date that
    // declares one; see `sortPosts` for the full chain (date -> order -> slug).
    order: z.number().int().optional(),
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
