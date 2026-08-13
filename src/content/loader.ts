import { z } from 'zod';
import { parseFrontmatter } from './frontmatter';
import {
  ProjectFrontmatterSchema,
  PostFrontmatterSchema,
  type Project,
  type Post,
  type PostFrontmatter,
} from './schemas';
import { ProvenanceArtifactSchema, type ProvenanceArtifact, type ProvenanceRecord } from './provenance-schema';

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

// --- Provenance artifact join (docs/provenance-model.md §12 PR 4) ---
//
// `src/content/provenance.generated.json` is written by
// `scripts/provenance/generate.mjs`, wired into the `predev`/`prebuild`/
// `pretest` npm scripts (package.json) — by the time this module is
// evaluated in any normal `npm run dev|build|test`, it already exists.
// It is COMMITTED on purpose as of the 2026-07-27 reversal (see .gitignore's
// note on this file, and docs/provenance-model.md §5.2/§5.3: Vercel's
// shallow-clone deploy build can't regenerate it from git history, so the
// committed copy is its fallback, kept honest by CI's drift gate). It was
// gitignored/regenerate-every-build before that date; this file predates the
// reversal. Even committed, there is still exactly one real way it can be
// absent here at import time: something ran Vite/Vitest directly, bypassing
// every hook that regenerates it — a stale checkout, a broken CI cache, or
// the file getting deleted mid-session.
//
// That "missing" case must NEVER be silently treated the same as an
// EMPTY artifact (`{}` — today's real, honest, zero-records state; see
// `provenance:print`'s own "no records yet" message). Collapsing the two
// would let an infrastructure failure masquerade as "these content files
// legitimately have no run report," which is precisely the class of
// dishonesty §5.2's "generated artifact missing at import time -> loader
// throws" row exists to rule out — the same posture as the generator's own
// "git command fails -> build fails loudly" rule (§5.2), just one layer up.
//
// A plain `import artifact from './provenance.generated.json'` can't make
// that distinction: a missing target on a static import is a Vite
// module-resolution error thrown at transform time, in a shape aimed at a
// bundler maintainer, and it can't be intercepted to produce the
// actionable message below. `import.meta.glob` — already used for every
// content file above — is the one primitive in this codebase whose
// "nothing matched" case degrades to an empty object instead of an error,
// which is exactly the hook needed to tell "missing" and "present but
// empty" apart in application code.
// NOTE: `import.meta.glob` requires a string LITERAL argument (Vite's own
// compile-time restriction — it rewrites this call into a static set of
// imports before any JS runs, so it cannot accept a variable here even
// though the same literal is duplicated as `PROVENANCE_ARTIFACT_PATH`
// immediately below for the lookup key).
const provenanceArtifactModules = import.meta.glob('/src/content/provenance.generated.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

const PROVENANCE_ARTIFACT_PATH = '/src/content/provenance.generated.json';

/**
 * Validates (and fails loud on) the raw glob result for the generated
 * provenance artifact. Extracted to a pure function of its input — no glob,
 * no filesystem — specifically so both failure messages and the success
 * path are unit-testable without a real generated file on disk (see
 * loader.test.ts). Two distinct failure modes, both hard errors, both
 * named precisely (matching this loader's existing frontmatter-error
 * convention below):
 *
 *  - `rawArtifact === undefined`: the glob matched nothing at all — the
 *    artifact is genuinely missing (§5.2's "generated artifact missing at
 *    import time" row).
 *  - present but Zod-rejects: defense in depth against a corrupted or
 *    hand-edited file. The artifact is generator-written and committed
 *    (see the file-header note above), but nothing at the loader layer
 *    enforces that nobody edited it locally, and `generate.mjs` already
 *    re-validates each record before
 *    writing — this is the same "never trust, always re-check at the
 *    consuming boundary" posture as every other Zod-validated input in
 *    this file.
 */
export function resolveProvenanceArtifact(rawArtifact: unknown): ProvenanceArtifact {
  if (rawArtifact === undefined) {
    throw new Error(
      '[content] Missing generated provenance artifact at "src/content/provenance.generated.json". ' +
        'It is written by `scripts/provenance/generate.mjs` and normally regenerated automatically by ' +
        '`predev`/`prebuild`/`pretest` (package.json). Run `npm run provenance:generate` and retry — ' +
        'a missing artifact must never be treated the same as one that legitimately resolved zero ' +
        'records (docs/provenance-model.md §5.2).',
    );
  }

  const result = ProvenanceArtifactSchema.safeParse(rawArtifact);
  if (!result.success) {
    throw new Error(
      `[content] Generated provenance artifact at "src/content/provenance.generated.json" failed validation:\n${result.error.issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n')}\nRegenerate it with \`npm run provenance:generate\`.`,
    );
  }

  return result.data;
}

// Exported (docs/reports-surface.md §3.2/§6 PR 2) so `src/content/runs.ts`
// can build the reports-index reverse join — "which run produced this
// post/project" — from the SAME resolved artifact `buildCollection` below
// already joins forward ("which report produced this post/project"), rather
// than adding a second glob and a second failure path onto this one.
export const provenanceArtifact = resolveProvenanceArtifact(provenanceArtifactModules[PROVENANCE_ARTIFACT_PATH]);

/**
 * Joins a content file's `import.meta.glob` key (root-absolute, WITH a
 * leading slash — Vite's own convention, e.g. `"/content/posts/x.md"`)
 * against the generated artifact's keys, which are `produced` paths exactly
 * as a report writes them: repo-relative, no leading slash (§4.2's own
 * worked example: `"content/posts/2026-07-18-foo.md"`). The two shapes
 * agree on everything except that one leading character.
 */
export function repoRelativePath(globKey: string): string {
  return globKey.replace(/^\//, '');
}

export function slugFromPath(path: string): string {
  const stem = path.split('/').pop() ?? path;
  return stem.replace(/\.md$/, '');
}

export function buildCollection<TFrontmatter extends { slug?: string }>(
  files: Record<string, string>,
  schema: z.ZodType<TFrontmatter>,
  kind: 'project' | 'post',
  // Defaults to `{}` (never `undefined`) so every existing call site in
  // loader.test.ts — none of which know or care about provenance — keeps
  // compiling and behaving identically: an empty artifact resolves every
  // lookup below to `undefined`, the same honest "no record" result a real
  // artifact gives a file no report names.
  provenanceArtifact: ProvenanceArtifact = {},
): (TFrontmatter & { slug: string; body: string; provenance?: ProvenanceRecord })[] {
  const seenSlugs = new Set<string>();
  const items: (TFrontmatter & { slug: string; body: string; provenance?: ProvenanceRecord })[] = [];

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

    // `produced` paths in the artifact never carry a leading slash
    // (`repoRelativePath` above); a file this loader never sees a report
    // for simply has no matching key, and the lookup below is `undefined`
    // — the honest, designed "no record" case (schemas.ts §"provenance").
    items.push({ ...frontmatter, slug, body: content, provenance: provenanceArtifact[repoRelativePath(path)] });
  }

  return items;
}

const allProjectsRaw = buildCollection(projectFiles, ProjectFrontmatterSchema, 'project', provenanceArtifact);
const allPostsRaw = buildCollection(postFiles, PostFrontmatterSchema, 'post', provenanceArtifact);

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
export function normalizePost(
  raw: PostFrontmatter & { slug: string; body: string; provenance?: ProvenanceRecord },
): Post {
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

const normalizedPosts = (
  allPostsRaw as (PostFrontmatter & { slug: string; body: string; provenance?: ProvenanceRecord })[]
).map(normalizePost);
const visiblePosts = filterVisiblePosts(normalizedPosts, import.meta.env.PROD);

export function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const orderA = a.order ?? Number.POSITIVE_INFINITY;
    const orderB = b.order ?? Number.POSITIVE_INFINITY;
    if (orderA !== orderB) return orderA - orderB;
    const dateDiff = Date.parse(b.date) - Date.parse(a.date);
    if (dateDiff !== 0) return dateDiff;
    // Final tie-break: content-derived slug, never `import.meta.glob`'s
    // filesystem (filename-spelling) order. Two projects sharing BOTH `order`
    // and `date` otherwise fall back to glob order — the exact nondeterminism
    // `sortPosts` below was fixed for on 2026-07-18 but which was never closed
    // here in the sibling function.
    return a.slug.localeCompare(b.slug);
  });
}

// Fully deterministic — never falls back to `import.meta.glob`'s
// filesystem-order (i.e. filename spelling), which is what silently decided
// public reading order before this tie-break chain existed (see
// validate-content.test.ts's header comment for the incident that surfaced
// this). Chain, in priority order:
//   1. date descending (newest day first)
//   2. `order` descending WITHIN a shared date — higher `order` = later in
//      the day = shown first (same direction as "newest on top"; see the
//      field's doc comment in schemas.ts). A post with no `order` sorts
//      after every post on the same date that declares one.
//   3. `slug` ascending — a guaranteed, content-derived (not glob-order)
//      final tie-break for the case two same-date posts both omit `order`,
//      or one full-identical case where every prior key ties.
export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const dateDiff = Date.parse(b.date) - Date.parse(a.date);
    if (dateDiff !== 0) return dateDiff;

    const orderA = a.order ?? Number.NEGATIVE_INFINITY;
    const orderB = b.order ?? Number.NEGATIVE_INFINITY;
    if (orderA !== orderB) return orderB - orderA;

    return a.slug.localeCompare(b.slug);
  });
}

export const projects: readonly Project[] = Object.freeze(sortProjects(allProjectsRaw as Project[]));
export const posts: readonly Post[] = Object.freeze(sortPosts(visiblePosts as Post[]));
