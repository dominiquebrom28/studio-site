export interface TocEntry {
  id: string;
  text: string;
}

/**
 * Strip a small, deliberately limited set of inline markdown syntax (bold,
 * italic, inline code, links, images, reference-style links) so a heading's
 * slug/id is stable even when the heading itself uses that formatting. This
 * is not a full markdown parser — it only needs to approximate what
 * `react-markdown` has already reduced a heading down to by the time
 * `Markdown.tsx`'s heading-id logic sees it.
 *
 * Order matters: images are stripped to nothing (`img` elements render with
 * no text children — an image's alt text never appears in the rendered
 * heading's text content, so it must not appear in the id either) *before*
 * the inline-link pass runs, otherwise the link regex would match the
 * `[alt](url)` tail of an image and leave a stray `!`. Reference-style links
 * (`[text][ref]`) are collapsed to their link text the same way inline links
 * are, since react-markdown resolves them to the same `<a>` text content.
 */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .trim();
}

/**
 * Lowercase-kebab slug for a heading — the base id before de-duplication.
 *
 * **Deliberately ASCII-only** (backlog "point at the right thing", 2026-07-29
 * decision, not a bug report): `[^a-z0-9]+` strips *every* non-ASCII
 * character, so a non-Latin-script heading collapses to whatever ASCII
 * fragments (if any) survive — e.g. `"Über café ñ 中文标题"` → `"ber-caf"`,
 * and an all-non-Latin heading (e.g. pure CJK or Cyrillic) collapses to the
 * empty string, which `nextUniqueId` below then falls back to `"section"`
 * for. This matches every other URL-facing slug on the site (post/project
 * `slug` frontmatter is hand-authored ASCII kebab-case; nothing here invents
 * a non-ASCII-safe alternative for headings alone) and keeps generated
 * anchors readable and shareable in a plain URL bar.
 *
 * Two headings that collapse to the *same* base this way (whether from
 * identical non-Latin content, or just both losing all their distinguishing
 * characters) do NOT produce duplicate/colliding ids: `scanH2Headings`'s
 * `seen` map (via `nextUniqueId`) de-dups on this function's *output*, the
 * exact same mechanism that already de-dups two headings with genuinely
 * identical ASCII text — so the two failure modes ("same text" and "same
 * post-strip text") get the same safety net for free, verified for both
 * `extractTableOfContents` and `headingIdsByLine` in `toc.test.ts`. No post
 * in this repo has shipped a non-ASCII H2 as of this writing (verified via
 * `content/posts/*.md`), so this is a documented design decision pinned by a
 * test, not a live-content fix.
 */
export function slugifyHeading(text: string): string {
  return stripInlineMarkdown(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Given a candidate base id and a running `seen` count map, returns a unique
 * id — the first occurrence of a base slug gets the bare slug, every repeat
 * gets a numeric suffix (`-1`, `-2`, ...). Used internally by `scanH2Headings`
 * below (the single source of truth both `extractTableOfContents` and
 * `headingIdsByLine` read from), and kept exported because `toc.test.ts`
 * exercises the de-duplication rule directly.
 */
export function nextUniqueId(base: string, seen: Map<string, number>): string {
  const safeBase = base || 'section';
  const count = seen.get(safeBase) ?? 0;
  seen.set(safeBase, count + 1);
  return count === 0 ? safeBase : `${safeBase}-${count}`;
}

interface ScannedHeading {
  /** 1-based line number in the source, matching hast/unist `Position.start.line`. */
  line: number;
  text: string;
  id: string;
}

/**
 * The single, pure scan of a markdown body's H2 headings — in document
 * order, skipping fenced code blocks, with a fresh de-dup `seen` map created
 * and consumed entirely *inside* this one call (never shared or mutated
 * across calls). Calling this twice with the same `body` always produces two
 * identical arrays: it reads only its `body` argument and returns a new
 * result every time, no closures over external state. `extractTableOfContents`
 * and `headingIdsByLine` are both thin projections of this one scan, so they
 * can never drift out of sync with each other.
 */
function scanH2Headings(body: string): ScannedHeading[] {
  const seen = new Map<string, number>();
  const headings: ScannedHeading[] = [];
  let inFence = false;
  const lines = body.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const text = stripInlineMarkdown(match[1]);
    if (!text) continue;

    headings.push({ line: i + 1, text, id: nextUniqueId(slugifyHeading(text), seen) });
  }

  return headings;
}

/**
 * Auto-generated table of contents (design-brief §5 blog-post desktop rail:
 * "auto-generated table of contents if the post has 3+ H2s"). Parses the raw
 * markdown body for level-2 headings only — H1 is the post title rendered by
 * page chrome, never part of the body; H3+ is too granular for a rail TOC —
 * in document order.
 *
 * Callers decide the "3+ H2s" gate (`entries.length >= 3`) — this function
 * only extracts what's really there; it never pads or fabricates entries.
 *
 * Pure: same `body` in, same `TocEntry[]` out, every time (see
 * `scanH2Headings`) — no shared/mutated state survives past a single call.
 */
export function extractTableOfContents(body: string): TocEntry[] {
  return scanH2Headings(body).map(({ id, text }) => ({ id, text }));
}

/**
 * Maps each H2's 1-based source line number to its precomputed, de-duplicated
 * id — the fix for the "every TOC link is dead" bug (React StrictMode
 * double-render pass, 2026-07-18 QA browser verification).
 *
 * The bug: `Markdown.tsx`'s `h2` renderer used to own a `Map` created once
 * per `Markdown` component render and then *mutate it during the render
 * itself* (incrementing a de-dup counter each time an `h2` was rendered).
 * That's a side effect inside render, which React StrictMode deliberately
 * double-invokes to catch — the second pass saw every heading as "already
 * seen" and appended a spurious `-1` to every id, while `extractTableOfContents`
 * (a genuinely pure function, called once against the raw string, not
 * re-invoked by React) kept producing the un-suffixed id. Two paths that
 * happened to agree on a single render pass and silently diverged on a
 * double one — every TOC anchor 404'd.
 *
 * The fix: `Markdown.tsx` calls this function *once*, before rendering
 * anything, to get a complete `line → id` map computed purely from the
 * `body` string. Its `h2` renderer then does a **read-only lookup** by the
 * heading's real source line number (from the hast node react-markdown
 * passes via `node.position.start.line`) instead of accumulating a counter
 * during render. A lookup is idempotent by construction: calling this
 * function N times against the same `body` (exactly what StrictMode's
 * double-render does to whatever computes `Markdown`'s local state) always
 * returns a `Map` with the same line→id entries — there's no shared counter
 * left to double-increment. See `toc.test.ts`'s idempotency test for the
 * regression coverage.
 *
 * Text-keyed lookup alone would not be enough: two headings with identical
 * text (a real, tested case — see "de-duplicates identical heading text")
 * must still resolve to their own distinct ids. Line number is a
 * deterministic, source-derived key that's unique per heading occurrence
 * without needing any incrementing counter at lookup time.
 */
export function headingIdsByLine(body: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const heading of scanH2Headings(body)) {
    map.set(heading.line, heading.id);
  }
  return map;
}

const SECTION_BYLINE_PATTERN = /^\*Section by:\s*(.+?)\*$/i;

export interface ScannedSectionByline {
  /** 1-based source line number of the matched `*Section by: ...*` line
   * itself (not the heading's line) — the line `Markdown.tsx`'s `p`
   * renderer looks up by `node.position.start.line`, the same by-line-
   * number lookup pattern `headingIdsByLine` already established for `h2`. */
  line: number;
  names: string[];
}

/**
 * Scans a markdown body for `*Section by: {Name}[, {Name}...]*` lines that
 * are the FIRST non-blank line directly after an `## ` heading
 * (docs/blog-format-v2.md §2 "SectionByline" / §4 "Section byline"
 * authoring surface) — a pure, line-based scan, the exact same shape as
 * `scanH2Headings` above: fence-aware, no remark plugin, no shared/mutated
 * state across calls, same result every time for the same `body`.
 *
 * Case-insensitive on "Section by:". An identical-looking italic line
 * anywhere else in a section (not the first non-blank line after its
 * heading) is deliberately NOT matched — per the spec, it's just an
 * ordinary paragraph there, not parsed. A line that doesn't match the
 * pattern at all is likewise left alone — this mechanism can only under-
 * render (fall back to a plain paragraph), never fail a build.
 */
export function scanSectionBylines(body: string): ScannedSectionByline[] {
  const results: ScannedSectionByline[] = [];
  const lines = body.split('\n');
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (!/^##\s+\S/.test(line)) continue;

    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    if (j >= lines.length) continue;

    const match = SECTION_BYLINE_PATTERN.exec(lines[j].trim());
    if (!match) continue;

    const names = match[1]
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    if (names.length === 0) continue;

    results.push({ line: j + 1, names });
  }

  return results;
}

/**
 * Line-number-keyed projection of `scanSectionBylines` — the read-only
 * lookup `Markdown.tsx`'s `p` renderer uses (`node.position.start.line`),
 * mirroring `headingIdsByLine`'s idempotent-by-construction shape exactly,
 * for the same StrictMode-safety reason documented on that function: a
 * pure function computed once from the raw source string can never drift
 * out of sync with itself across a double-render pass, because there is no
 * shared counter or mutated state for a second pass to disagree with.
 */
export function sectionBylinesByLine(body: string): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const entry of scanSectionBylines(body)) {
    map.set(entry.line, entry.names);
  }
  return map;
}
