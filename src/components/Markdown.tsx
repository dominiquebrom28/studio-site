import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReactNode } from 'react';
import { Prose } from './ui/Prose';
import { Callout } from './Callout';
import { MarginNote } from './MarginNote';
import { PullQuote } from './PullQuote';
import { SectionByline } from './SectionByline';
import { slugifyHeading, headingIdsByLine, sectionBylinesByLine } from '@/content/toc';
import { classifyBlockquote, classifyMarginNote, stripCalloutLabel, stripMarginNoteLabel } from '@/lib/calloutTone';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/**
 * Sanitize link/image hrefs (spec §5 #19): allow only http(s), mailto, and
 * site-relative URLs; reject `javascript:` and any other scheme. Relative
 * URLs (no scheme) are always allowed.
 */
function sanitizeUrl(url: string): string {
  try {
    // A protocol-relative or relative URL throws on `new URL(url)` without a
    // base — treat that as "no scheme present" and allow it.
    const parsed = new URL(url, 'https://placeholder.invalid');
    if (url.startsWith('/') || url.startsWith('#') || url.startsWith('.')) {
      return url;
    }
    return ALLOWED_PROTOCOLS.has(parsed.protocol) ? url : '';
  } catch {
    return '';
  }
}

/** Flattens a React children tree down to its plain text content — used only
 * as the defensive fallback in the `h2` renderer below, for the rare case a
 * heading node has no source `position` to look up (e.g. a future synthetic
 * AST transform). Pure — no shared state, safe to call any number of times. */
function flattenToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenToText).join('');
  if (typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return flattenToText(props?.children);
  }
  return '';
}

/**
 * The one component that turns a markdown body string into React.
 * `react-markdown` builds a React vtree and escapes text by default — no
 * `rehype-raw`, no `dangerouslySetInnerHTML`, ever (spec §5 #19).
 *
 * H2 anchor ids (design-brief §5's desktop rail TOC): `headingIdsByLine`
 * (from `content/toc.ts`) computes a complete, pure `line → id` map from the
 * raw `body` string *once*, before any rendering happens. The `h2` renderer
 * below only performs a read-only lookup, keyed by the heading's real source
 * line number (`node.position.start.line`, passed by react-markdown) — it
 * never accumulates or mutates any counter during render. That purity is
 * required, not cosmetic: React StrictMode double-invokes render on purpose
 * to catch exactly this class of bug, and an earlier version of this
 * component (which mutated a shared `Map` from inside the `h2` renderer)
 * produced a spurious `-1`-suffixed id on the second pass, silently
 * de-syncing every rendered `<h2>`'s `id` from the ids `extractTableOfContents`
 * hands to the TOC — see `headingIdsByLine`'s doc comment and
 * `toc.test.ts`'s idempotency regression test for the full story.
 *
 * No new dependency (e.g. `rehype-slug`) is needed for this.
 *
 * blog-format-v2 additions (docs/blog-format-v2.md §2/§4), same "no new
 * remark plugin, no render-time mutation" discipline as the `h2` renderer
 * above:
 *
 * - `p`: a paragraph is replaced with `SectionByline` only when its source
 *   line number is a hit in `sectionBylinesByLine` — a pure, once-computed
 *   `line → names[]` map (`content/toc.ts`), the exact same by-line lookup
 *   shape as `headingIds` above. Everything else renders as an ordinary
 *   `<p>`.
 * - `blockquote`: classified once, read-only, via `classifyMarginNote` then
 *   `classifyBlockquote` (`src/lib/calloutTone.ts`) — three-way, checked in
 *   that order so the two label grammars never fight over one blockquote: a
 *   bold `Margin note — {CastName}:` first line renders `MarginNote`; a bold
 *   `Note:`/`Win:`/`Watch-out:` first line renders `Callout`; anything else
 *   renders `PullQuote` (today's unchanged default blockquote treatment).
 */
export function Markdown({ children, ruled = false }: { children: string; ruled?: boolean }) {
  const headingIds = headingIdsByLine(children);
  const sectionBylines = sectionBylinesByLine(children);

  return (
    <Prose ruled={ruled}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={sanitizeUrl}
        components={{
          h2({ node, children: headingChildren, ...rest }) {
            const line = node?.position?.start.line;
            const id = (line !== undefined ? headingIds.get(line) : undefined) ?? slugifyHeading(flattenToText(headingChildren));
            return (
              <h2 id={id} {...rest}>
                {headingChildren}
              </h2>
            );
          },
          p({ node, children: paragraphChildren, ...rest }) {
            const line = node?.position?.start.line;
            const names = line !== undefined ? sectionBylines.get(line) : undefined;
            if (names) {
              return <SectionByline names={names} />;
            }
            return <p {...rest}>{paragraphChildren}</p>;
          },
          blockquote({ children: quoteChildren }) {
            const marginNoteName = classifyMarginNote(quoteChildren);
            if (marginNoteName) {
              return <MarginNote name={marginNoteName}>{stripMarginNoteLabel(quoteChildren)}</MarginNote>;
            }
            const tone = classifyBlockquote(quoteChildren);
            if (tone) {
              return <Callout tone={tone}>{stripCalloutLabel(quoteChildren)}</Callout>;
            }
            return <PullQuote>{quoteChildren}</PullQuote>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </Prose>
  );
}
