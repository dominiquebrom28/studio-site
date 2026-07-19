import { describe, it, expect } from 'vitest';
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

/** Normalizes `author` to a string array regardless of whether the current
 * schema has it as a single string or (post multi-author migration) an
 * array — see the coupling note in this file's header comment. */
function normalizeAuthors(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string') return [value];
  return [];
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
        const authors = normalizeAuthors(post.data.author);
        expect(authors.length, `"${post.filename}": no author field found`).toBeGreaterThan(0);
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
