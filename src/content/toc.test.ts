import { describe, it, expect } from 'vitest';
import { slugifyHeading, nextUniqueId, extractTableOfContents, headingIdsByLine } from './toc';

describe('slugifyHeading', () => {
  it('lowercases and hyphenates plain text', () => {
    expect(slugifyHeading('The bug that was invisible on desktop')).toBe(
      'the-bug-that-was-invisible-on-desktop',
    );
  });

  it('strips inline markdown before slugifying', () => {
    expect(slugifyHeading('**Bold** and `code` and *italic* and [a link](https://example.com)')).toBe(
      'bold-and-code-and-italic-and-a-link',
    );
  });

  it('collapses non-alphanumeric runs and trims leading/trailing hyphens', () => {
    expect(slugifyHeading('  Six write-ups, zero invented facts!  ')).toBe(
      'six-write-ups-zero-invented-facts',
    );
  });

  // Regression: `stripInlineMarkdown` previously only stripped INLINE links
  // (`[text](url)`), leaving an image's `![alt](url)` syntax half-mangled
  // (a stray leading `!`, with the link-regex still eating the brackets and
  // parens) and reference-style links (`[text][ref]`) completely untouched.
  // Both diverged from what `Markdown.tsx` actually renders to the DOM: an
  // `<img>` contributes NO text to its heading's flattened text content (its
  // alt text is an attribute, not a child), and a reference-style link
  // resolves to the same plain `<a>text</a>` an inline link would. Verified
  // against a real `react-markdown` render (not just this regex) before
  // fixing — see the PASS/FAIL report for this pass.
  it('strips an image entirely (an <img> contributes no text to the real rendered heading)', () => {
    expect(slugifyHeading('![alt text](https://example.com/img.png) Caption')).toBe('caption');
  });

  it('collapses a reference-style link to its link text, matching the real <a> the DOM renders', () => {
    expect(slugifyHeading('See [the docs][ref] for more')).toBe('see-the-docs-for-more');
  });
});

describe('nextUniqueId', () => {
  it('returns the bare base id on first occurrence', () => {
    const seen = new Map<string, number>();
    expect(nextUniqueId('setup', seen)).toBe('setup');
  });

  it('suffixes repeats with an incrementing number', () => {
    const seen = new Map<string, number>();
    expect(nextUniqueId('setup', seen)).toBe('setup');
    expect(nextUniqueId('setup', seen)).toBe('setup-1');
    expect(nextUniqueId('setup', seen)).toBe('setup-2');
  });

  it('falls back to "section" for an empty base so an id is never blank', () => {
    const seen = new Map<string, number>();
    expect(nextUniqueId('', seen)).toBe('section');
  });
});

describe('extractTableOfContents', () => {
  it('extracts only H2 headings, in document order', () => {
    const body = `
# Post title (not part of the body)

Intro paragraph.

## First section

Some text.

### A subsection (not a TOC entry)

## Second section

More text.
`;
    const toc = extractTableOfContents(body);
    expect(toc).toEqual([
      { id: 'first-section', text: 'First section' },
      { id: 'second-section', text: 'Second section' },
    ]);
  });

  it('returns an empty array for a body with no H2s (never fabricates entries)', () => {
    expect(extractTableOfContents('Just a paragraph, no headings.')).toEqual([]);
  });

  it('de-duplicates identical heading text with stable, unique ids', () => {
    const body = '## Setup\n\ntext\n\n## Setup\n\nmore text\n';
    const toc = extractTableOfContents(body);
    expect(toc).toEqual([
      { id: 'setup', text: 'Setup' },
      { id: 'setup-1', text: 'Setup' },
    ]);
  });

  it('ignores lines that look like H2s inside fenced code blocks', () => {
    const body = '## Real heading\n\n```\n## not a heading\n```\n\n## Another real heading\n';
    const toc = extractTableOfContents(body);
    expect(toc).toEqual([
      { id: 'real-heading', text: 'Real heading' },
      { id: 'another-real-heading', text: 'Another real heading' },
    ]);
  });

  it('does not mistake H3+ for H2', () => {
    const body = '### Not H2\n\n#### Also not H2\n';
    expect(extractTableOfContents(body)).toEqual([]);
  });

  // Regression coverage at the extractTableOfContents level (not just
  // slugifyHeading in isolation) for the two anchor-drift bugs found and
  // fixed in this pass — an image or a reference-style link inside an H2
  // used to produce a TOC id that didn't match the id Markdown.tsx assigns
  // to the real DOM heading, which would have made the rail's TOC link dead.
  it('an image in a heading contributes no text to the id or the displayed TOC text', () => {
    const body = '## ![diagram](https://example.com/diagram.png) System overview\n\ntext\n';
    expect(extractTableOfContents(body)).toEqual([{ id: 'system-overview', text: 'System overview' }]);
  });

  it('a reference-style link in a heading collapses to its link text', () => {
    const body = '## See [the docs][ref] for more\n\ntext\n\n[ref]: https://example.com\n';
    expect(extractTableOfContents(body)).toEqual([{ id: 'see-the-docs-for-more', text: 'See the docs for more' }]);
  });

  it('matches the real committed post that has 3+ H2s (the TOC gate)', () => {
    // Sanity-checks the "3+ H2s" gate against real content without hardcoding
    // a slug import here (kept dependency-light — BlogPost.tsx itself wires
    // extractTableOfContents against getPostBySlug output).
    const body = `
## Six write-ups, zero invented facts

text

## The cleanup sweep

text

## Also today

text
`;
    expect(extractTableOfContents(body).length).toBeGreaterThanOrEqual(3);
  });
});

/**
 * Regression coverage for Bug 1 (2026-07-18 QA browser pass): every TOC link
 * was dead because `Markdown.tsx` used to derive heading ids by *mutating a
 * `Map` during render*. React StrictMode double-invokes render specifically
 * to catch impure renders like that one, and it did: the second pass saw
 * every heading as already-seen and appended a spurious `-1`, which
 * `extractTableOfContents` (genuinely pure, called once, never re-invoked by
 * React) never produced — 0/3 anchors resolved in the live DOM despite a
 * green build and a same-render-pass 21/21 `renderToStaticMarkup` check.
 *
 * `headingIdsByLine` is the fix's foundation: the assertion below is the
 * actual invariant that broke — computing ids from the same source twice
 * must yield an identical result, every time, with no dependency on how many
 * times (or in what order) the computation runs.
 */
describe('headingIdsByLine', () => {
  const body = `
## Six write-ups, zero invented facts

text

## The cleanup sweep

text

## Also today

text
`;

  it('is idempotent — computing it twice (or ten times) from the same source always yields an identical map', () => {
    const first = headingIdsByLine(body);
    const second = headingIdsByLine(body);
    const tenth = Array.from({ length: 10 }, () => headingIdsByLine(body)).pop()!;

    expect(second).toEqual(first);
    expect(tenth).toEqual(first);
    // None of the ids picked up a spurious `-1`/`-2` suffix from being
    // computed more than once — the exact symptom Bug 1 produced.
    expect([...first.values()]).toEqual([
      'six-write-ups-zero-invented-facts',
      'the-cleanup-sweep',
      'also-today',
    ]);
  });

  it('keys each id by the heading’s real 1-based source line number', () => {
    const map = headingIdsByLine('## First\n\ntext\n\n## Second\n');
    expect(map.get(1)).toBe('first');
    expect(map.get(5)).toBe('second');
  });

  it('gives identical-text headings their own distinct ids, keyed by line — not collapsed by text alone', () => {
    const map = headingIdsByLine('## Setup\n\ntext\n\n## Setup\n\nmore\n');
    expect(map.get(1)).toBe('setup');
    expect(map.get(5)).toBe('setup-1');
    expect(new Set(map.values()).size).toBe(2);
  });

  it('never drifts from extractTableOfContents — same ids, same order, computed from the same underlying scan', () => {
    const toc = extractTableOfContents(body);
    const byLine = headingIdsByLine(body);
    expect([...byLine.values()]).toEqual(toc.map((entry) => entry.id));
  });
});
