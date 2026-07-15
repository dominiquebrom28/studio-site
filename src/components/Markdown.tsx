import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prose } from './ui/Prose';

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

/**
 * The one component that turns a markdown body string into React.
 * `react-markdown` builds a React vtree and escapes text by default — no
 * `rehype-raw`, no `dangerouslySetInnerHTML`, ever (spec §5 #19).
 */
export function Markdown({ children, ruled = false }: { children: string; ruled?: boolean }) {
  return (
    <Prose ruled={ruled}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={sanitizeUrl}>
        {children}
      </ReactMarkdown>
    </Prose>
  );
}
