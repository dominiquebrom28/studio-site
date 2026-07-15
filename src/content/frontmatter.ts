import { load } from 'js-yaml';

/**
 * Browser-safe frontmatter splitter (spec §3.3).
 *
 * `gray-matter` was the spec's suggested default but it pulls in Node
 * `Buffer` assumptions that throw `Buffer is not defined` in a pure-browser
 * Vite bundle. Verified here by *not* depending on it: this is a tiny
 * `---`-delimited splitter feeding `js-yaml` (pure JS, no Node globals),
 * which is confirmed to run in the built browser bundle (see loader tests
 * and the production build referenced in the run report).
 */
export interface ParsedMarkdown {
  data: Record<string, unknown>;
  content: string;
}

// `([\s\S]*?)\r?\n` required a newline before the closing fence, so an EMPTY
// block (`---\n---\nBody.`, opens and closes with nothing between) never
// matched at all — the whole raw string fell through as unparsed "content",
// fence lines and all. `(?:([\s\S]*?)\r?\n)?` makes that inner newline+block
// optional so a zero-line yaml block still matches.
const FRONTMATTER_PATTERN = /^---\r?\n(?:([\s\S]*?)\r?\n)?---\r?\n?([\s\S]*)$/;

export function parseFrontmatter(raw: string): ParsedMarkdown {
  const match = FRONTMATTER_PATTERN.exec(raw);
  if (!match) {
    return { data: {}, content: raw.trim() };
  }

  const [, yamlBlock, body] = match;
  // `yamlBlock` is `undefined` for an empty block (the optional group above
  // didn't match) — `js-yaml`'s `load()` returns `undefined` for an empty
  // string, so normalize to `''` rather than passing `undefined` through.
  const parsed = load(yamlBlock ?? '');
  const data = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};

  return { data, content: body.trim() };
}
