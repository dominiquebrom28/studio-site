import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './frontmatter';
import { cast } from './cast';

/**
 * Content-validation gate (BACKLOG "Content-validation gate in CI",
 * 2026-07-18). Runs against the REAL `content/posts/*.md` files (not
 * fixtures) via the same `import.meta.glob` pattern `loader.ts` uses — a
 * committed file that violates one of these rules fails this test, which is
 * already wired into the required `npm test` step in `.github/workflows/
 * ci.yml`'s `build` job. No separate CI step was needed for this gate: this
 * repo already treats "importing content throws -> test fails" as its
 * content-lint mechanism (see index.test.ts's file-level doc comment) — two
 * of the five rules below (`slugs unique`, `summary <= 200 chars`) are
 * ALREADY enforced for free by the existing Zod schema + `loader.ts`'s
 * duplicate-slug check, which run every time this module graph is imported.
 * This file adds the three rules nothing currently enforces: the
 * filename/date match, the no-shared-date rule, and the author/cast check.
 *
 * WHY: 2026-07-18 evening, Dom caught the blog rendering in the wrong
 * order live. Root cause was a date decision, plus a filename/date mismatch
 * and a two-posts-one-date tie no gate flagged.
 *
 * CORRECTION (2026-07-19, Dom, verbatim): "one of the checks gave an error
 * because 2 blog posts had the same date. but this IS possible on days we
 * worked more than usual." He's right, and it lines up with this studio's
 * standing policy (2026-07-18): "Multiple posts per day are fine for
 * significant events; significance earns a post, volume never does." A
 * shared date is a legitimate, expected outcome on a productive day — it is
 * NOT the bug. This gate originally banned shared dates outright, which
 * punished exactly the days it should have been celebrating.
 *
 * The actual defect was never the shared date: it was that `sortPosts`
 * (loader.ts) used to break same-date ties with nothing but
 * `Array.prototype.sort`'s stability against `import.meta.glob`'s
 * (filesystem-order, not content-order) object — i.e. public reading order
 * on a tied date was decided by filename spelling. `sortPosts` now has an
 * explicit, documented tie-break chain (date -> `order` desc -> slug asc),
 * so this gate's job is narrower and more accurate: sharing a date is
 * legal, but each post sharing that date MUST declare a distinct `order` —
 * leaving the resulting order to chance is what's actually disallowed.
 *
 * COUPLING NOTE (flagged per the task, for whoever lands the multi-author
 * schema change): the author rule below reads the RAW parsed YAML
 * (`data.author`), not the Zod-typed `PostFrontmatter.author` field, and
 * normalizes it to an array before checking each entry. That's deliberate:
 * it means this check keeps working unchanged whether `author` is a single
 * string (today) or an array of strings (the in-flight schema change) —
 * nothing here needs to change when that lands. If the multi-author schema
 * introduces a different SHAPE for author (e.g. `{ name, role }` objects
 * instead of plain strings), this rule's `normalizeAuthors` below is the
 * one place to update.
 */

const postFiles = import.meta.glob('/content/posts/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

// Added for the "asset paths resolve to real files" gate below — sibling
// glob to `postFiles`, same eager/raw pattern `loader.ts` uses for
// `content/projects/*.md`. Nothing above this line touched `content/
// projects/` at all; the pre-existing rules in this file are post-only.
const projectFiles = import.meta.glob('/content/projects/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const FILENAME_DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})-/;

interface ParsedPost {
  path: string;
  filename: string;
  data: Record<string, unknown>;
}

const posts: ParsedPost[] = Object.entries(postFiles).map(([filePath, raw]) => {
  const { data } = parseFrontmatter(raw);
  const filename = filePath.split('/').pop() ?? filePath;
  return { path: filePath, filename, data };
});

const projects: ParsedPost[] = Object.entries(projectFiles).map(([filePath, raw]) => {
  const { data } = parseFrontmatter(raw);
  const filename = filePath.split('/').pop() ?? filePath;
  return { path: filePath, filename, data };
});

/** Normalizes `author` to a string array regardless of whether the current
 * schema has it as a single string or (post multi-author migration) an
 * array — see the coupling note in this file's header comment. */
function normalizeAuthors(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string') return [value];
  return [];
}

/** blog-format-v2 made `authors[]` and `author` MUTUALLY EXCLUSIVE (schema
 * `.refine`), so a multi-author post carries `authors` and no `author` at
 * all. This gate originally read only `data.author` — which meant the first
 * real multi-author post ever published failed it with "no author field
 * found" while being perfectly valid. The gate was wrong, not the content
 * (again — see the same-date rule, PR #24). Read whichever field is set. */
function authorsOf(data: Record<string, unknown>): string[] {
  return normalizeAuthors(data.authors ?? data.author);
}

const VALID_AUTHOR_NAMES = new Set<string>([...cast.map((member) => member.name), 'Dom']);

describe('content validation — post frontmatter (real content/posts)', () => {
  it('has at least one post to validate (this suite is meaningless against zero files)', () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  describe('date matches the filename YYYY-MM-DD prefix', () => {
    for (const post of posts) {
      it(`${post.filename}`, () => {
        const match = FILENAME_DATE_PATTERN.exec(post.filename);
        expect(match, `"${post.filename}" does not start with a YYYY-MM-DD- prefix`).not.toBeNull();
        const filenameDate = match![1];
        expect(
          post.data.date,
          `"${post.filename}": frontmatter date "${post.data.date}" does not match the filename's date prefix "${filenameDate}"`,
        ).toBe(filenameDate);
      });
    }
  });

  it('if two or more posts share a date, each must declare a distinct `order` (sharing a date is legal; leaving the resulting order to chance is not)', () => {
    const byDate = new Map<string, ParsedPost[]>();
    for (const post of posts) {
      const date = typeof post.data.date === 'string' ? post.data.date : String(post.data.date);
      const existing = byDate.get(date) ?? [];
      existing.push(post);
      byDate.set(date, existing);
    }

    const sharedDates = [...byDate.entries()].filter(([, group]) => group.length > 1);

    const problems: string[] = [];
    for (const [date, group] of sharedDates) {
      const seenOrders = new Map<number, string>();
      for (const post of group) {
        const order = post.data.order;
        if (typeof order !== 'number' || !Number.isFinite(order)) {
          problems.push(
            `  ${date}: "${post.filename}" shares this date with ${group.length - 1} other post(s) but has no numeric \`order\` set`,
          );
          continue;
        }
        const clash = seenOrders.get(order);
        if (clash) {
          problems.push(
            `  ${date}: "${post.filename}" and "${clash}" both declare \`order: ${order}\` — must be distinct`,
          );
        } else {
          seenOrders.set(order, post.filename);
        }
      }
    }

    expect(problems, problems.length > 0 ? problems.join('\n') : undefined).toEqual([]);
  });

  describe('summary is <=200 chars', () => {
    // Belt-and-suspenders: `PostFrontmatterSchema` (schemas.ts) already
    // enforces `.max(200)` at parse time, so a violation here would already
    // fail `loader.ts`'s module-level parse (and therefore every test that
    // imports it) before this test ever ran. Kept for a clear, specific
    // failure message pointing at the exact file and length.
    for (const post of posts) {
      it(`${post.filename}`, () => {
        const summary = typeof post.data.summary === 'string' ? post.data.summary : '';
        expect(summary.length, `"${post.filename}": summary is ${summary.length} chars, must be <=200`).toBeLessThanOrEqual(200);
      });
    }
  });

  describe('slugs are unique', () => {
    // Belt-and-suspenders: `loader.ts`'s `buildCollection` already throws on
    // a duplicate slug at module-load time (see its `seenSlugs` check),
    // which would fail every test importing `content/index.ts` before this
    // one runs. Asserted again here so this file is a complete, standalone
    // statement of every rule in the BACKLOG item, not just the three rules
    // nothing else covers.
    it('every post resolves to a distinct slug (explicit `slug:` or filename stem)', () => {
      const slugs = posts.map((post) => {
        const explicit = typeof post.data.slug === 'string' ? post.data.slug : undefined;
        return explicit ?? post.filename.replace(/\.md$/, '');
      });
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  });

  describe('author resolves to a cast member or "Dom"', () => {
    for (const post of posts) {
      it(`${post.filename}`, () => {
        const authors = authorsOf(post.data);
        expect(authors.length, `"${post.filename}": no author/authors field found`).toBeGreaterThan(0);
        for (const author of authors) {
          expect(
            VALID_AUTHOR_NAMES.has(author),
            `"${post.filename}": author "${author}" is not "Dom" and does not match any cast member's \`name\` (${[...VALID_AUTHOR_NAMES].join(', ')})`,
          ).toBe(true);
        }
      });
    }
  });
});

/**
 * Asset-path existence gate (BACKLOG P2 batch, 2026-07-21 review: "build-time
 * check that `cover`/`media[].src`/`poster` paths exist on disk"). Since
 * DOM-4, `cover` (projects + posts), every `media[].src`, and every
 * `media[].poster` (projects only — `ProjectMediaItemSchema`, schemas.ts) are
 * plain `z.string()` frontmatter fields: Zod validates the STRING'S shape
 * (non-empty, and `poster` required when `kind: "animation"`) but nothing
 * checks the string actually names a file that exists. A typo — or a real
 * asset that was renamed/moved without updating the content file — ships a
 * broken `<img>`/poster to production while every existing gate (schema
 * validation, `npm test`, `npm run build`) stays green: the build only knows
 * about STRINGS, never touches the filesystem to confirm the referenced file
 * is actually there. Same "declared but not delivered" failure class the
 * whole 2026-07-21 review was about (see this file's header comment for the
 * sibling incident on `sortPosts`).
 *
 * MAPPING (confirmed empirically, not assumed — see `MediaGallery.tsx`'s
 * `<img src={item.src}>` / `<img src={displaySrc}>` and `PostCover.tsx`'s
 * `<img src={post.cover}>`: these values are used AS-IS as the `src`
 * attribute, never transformed): a content path is a public-root URL,
 * e.g. `/images/projects/soulforge/soulforge-hero-desktop.png`. Vite's
 * default (unconfigured — `vite.config.ts` sets no `publicDir`) `public/`
 * directory serves everything under it at the site root, so that string
 * maps 1:1 onto `public/images/projects/soulforge/soulforge-hero-desktop.png`
 * on disk: strip the leading `/`, resolve under `public/`.
 *
 * An absolute `http(s)://` value is left unchecked (some future post cover
 * could legitimately point at an externally-hosted image) — the same
 * allowance the `repo`/`liveUrl` fields already get via `urlOrEmpty`
 * (schemas.ts). A relative value that does NOT start with `/` is flagged as
 * its own failure — it can't resolve to a `public/`-root path at all, which
 * is itself a bug worth naming precisely rather than silently skipping.
 *
 * CASE SENSITIVITY (task requirement — macOS is case-insensitive by default,
 * Linux CI is not): `fs.existsSync`/`fs.statSync` alone would silently PASS
 * a path that differs only in case on a contributor's Mac and then 404 on
 * Vercel's Linux build. `resolveCaseSensitive` below never calls
 * `existsSync` — it walks the path one path segment at a time via
 * `fs.readdirSync`, and at each level requires the exact segment string to
 * appear (case-sensitive: JS `Array.prototype.includes` string comparison)
 * among the REAL directory entries returned by the filesystem. Tested by
 * deliberately mis-casing a real, otherwise-valid path locally on this
 * macOS checkout (see the PR body for the exact red output) — the
 * case-sensitive walk failed it even though this machine's filesystem
 * itself is case-insensitive and `fs.existsSync` on the same mis-cased path
 * returns `true` here.
 */
describe('content validation — asset paths resolve to real files on disk', () => {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  // src/content -> repo root -> public/
  const PUBLIC_ROOT = path.resolve(dirname, '../../public');
  // Scope of the orphan check (rule 2 below) — project screenshots/posters
  // live exclusively under this subtree; post covers do not have a fixed
  // subtree yet (zero posts set `cover` today) so they're excluded from the
  // orphan scan to avoid a false positive the moment the first one is added
  // somewhere else under `public/`.
  const PROJECT_MEDIA_ROOT = path.join(PUBLIC_ROOT, 'images', 'projects');
  // Orphan scan is deliberately scoped to real IMAGE files only. Without an
  // extension filter, `public/images/projects/CAPTIONS.md` (a real,
  // intentionally-committed alt-text/caption reference doc living in that
  // same directory — see its own header comment) would flag as an "orphan"
  // every single run: it is never a `cover`/`media[].src`/`poster` value and
  // was never meant to be one. That's exactly the "noisy check gets
  // disabled" failure mode the task warns about, for a file that isn't a bug
  // at all — filtering to known asset extensions removes the false positive
  // without weakening the real check (a genuinely orphaned image still has
  // one of these extensions).
  const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

  /**
   * Resolves `relPath` (repo-relative, no leading slash, e.g.
   * `"images/projects/x/y.png"`) against `PUBLIC_ROOT` one path segment at a
   * time via `fs.readdirSync`, requiring an EXACT (case-sensitive) string
   * match against real directory entries at every level — see this
   * `describe` block's header comment for why `fs.existsSync` alone can't be
   * trusted here.
   */
  function resolveCaseSensitive(relPath: string): { exists: boolean; reason: string } {
    const segments = relPath.split('/').filter((segment) => segment.length > 0);
    if (segments.length === 0) {
      return { exists: false, reason: 'path is empty after stripping the leading "/"' };
    }

    let currentDir = PUBLIC_ROOT;
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      const isLastSegment = i === segments.length - 1;
      const shownSoFar = segments.slice(0, i + 1).join('/');

      let entries: string[];
      try {
        entries = fs.readdirSync(currentDir);
      } catch {
        return {
          exists: false,
          reason: `"${path.relative(PUBLIC_ROOT, currentDir) || '.'}" is not a directory under public/`,
        };
      }

      if (!entries.includes(segment)) {
        return {
          exists: false,
          reason: `no entry named "${segment}" (case-sensitive) in "public/${path.relative(PUBLIC_ROOT, currentDir) || ''}" — got up to "public/${shownSoFar}"`,
        };
      }

      currentDir = path.join(currentDir, segment);

      if (isLastSegment) {
        const stat = fs.statSync(currentDir);
        if (!stat.isFile()) {
          return { exists: false, reason: `"public/${relPath}" exists but is not a file` };
        }
      }
    }

    return { exists: true, reason: '' };
  }

  /** Collects every path actually checked (used by the orphan scan below to
   * know what's "claimed" by content) and pushes a precise problem message —
   * naming the content file, the exact field, and the offending path, per
   * the task's requirement #1 — for anything that fails to resolve. */
  function checkAssetPath(
    value: unknown,
    field: string,
    filename: string,
    problems: string[],
    claimedPaths: Set<string>,
  ): void {
    if (typeof value !== 'string' || value.length === 0) return; // absent/malformed — schema's job, not this gate's
    if (/^https?:\/\//.test(value)) return; // externally-hosted; not a local `public/` path to check

    if (!value.startsWith('/')) {
      problems.push(
        `"${filename}": ${field} "${value}" does not start with "/" — cannot resolve to a public/-root path`,
      );
      return;
    }

    claimedPaths.add(value);

    const relPath = value.slice(1);
    const result = resolveCaseSensitive(relPath);
    if (!result.exists) {
      problems.push(`"${filename}": ${field} "${value}" does not resolve to a real file under public/ (${result.reason})`);
    }
  }

  it('every project `cover` / `media[].src` / `media[].poster` resolves to a real file under public/ (case-sensitive)', () => {
    const problems: string[] = [];
    const claimedPaths = new Set<string>();

    for (const project of projects) {
      checkAssetPath(project.data.cover, 'cover', project.filename, problems, claimedPaths);

      const media = Array.isArray(project.data.media) ? project.data.media : [];
      media.forEach((item, index) => {
        const record = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
        checkAssetPath(record.src, `media[${index}].src`, project.filename, problems, claimedPaths);
        checkAssetPath(record.poster, `media[${index}].poster`, project.filename, problems, claimedPaths);
      });
    }

    expect(problems, problems.length > 0 ? problems.join('\n') : undefined).toEqual([]);
  });

  it('every post `cover` resolves to a real file under public/ (case-sensitive)', () => {
    const problems: string[] = [];
    const claimedPaths = new Set<string>();

    for (const post of posts) {
      checkAssetPath(post.data.cover, 'cover', post.filename, problems, claimedPaths);
    }

    expect(problems, problems.length > 0 ? problems.join('\n') : undefined).toEqual([]);
  });

  /**
   * Rule 2 (task requirement #2, "flag the inverse if cheap and
   * unambiguous"): every real image file under `public/images/projects/`
   * that no content file references at all. Judged cheap and unambiguous
   * enough to keep ON, scoped tightly to avoid the noise the task warns
   * about:
   *   - extension-filtered (see `IMAGE_EXTENSIONS` above) so a non-asset
   *     file like `CAPTIONS.md` never false-positives.
   *   - scoped to `public/images/projects/` only, not all of `public/`
   *     (favicons, OG images, etc. are page furniture referenced from
   *     `index.html`/meta tags, not content frontmatter — flagging those as
   *     "orphans" here would be a false positive against a check whose job
   *     is specifically "did a content file forget to reference this project
   *     asset").
   *   - compares against the exact string values collected by the two tests
   *     above (`claimedPaths` is rebuilt from the SAME real content here, not
   *     duplicated logic) so a rename in content is reflected automatically.
   */
  it('no orphaned image files under public/images/projects/ (referenced by zero content files)', () => {
    const claimedPaths = new Set<string>();
    const unusedProblems: string[] = []; // not asserted on — reused checkAssetPath signature only

    for (const project of projects) {
      checkAssetPath(project.data.cover, 'cover', project.filename, unusedProblems, claimedPaths);
      const media = Array.isArray(project.data.media) ? project.data.media : [];
      media.forEach((item) => {
        const record = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
        checkAssetPath(record.src, 'media[].src', project.filename, unusedProblems, claimedPaths);
        checkAssetPath(record.poster, 'media[].poster', project.filename, unusedProblems, claimedPaths);
      });
    }
    for (const post of posts) {
      checkAssetPath(post.data.cover, 'cover', post.filename, unusedProblems, claimedPaths);
    }

    function walk(dir: string): string[] {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return [];
      }
      return entries.flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        if (!IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) return [];
        return [full];
      });
    }

    const realFiles = walk(PROJECT_MEDIA_ROOT);
    const orphans = realFiles
      .map((absolute) => '/' + path.relative(PUBLIC_ROOT, absolute).split(path.sep).join('/'))
      .filter((publicPath) => !claimedPaths.has(publicPath));

    expect(
      orphans,
      orphans.length > 0
        ? `these image files under public/images/projects/ are referenced by no content file's cover/media[].src/media[].poster:\n${orphans.join('\n')}`
        : undefined,
    ).toEqual([]);
  });
});
