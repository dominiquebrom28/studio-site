import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

/**
 * `Callout`'s three recognized tones (docs/blog-format-v2.md §2/§4). No
 * fourth tone yet — three cover everything seen in posts so far (spec §6).
 */
export type CalloutTone = 'note' | 'win' | 'watch-out';

/** Single source of truth for each tone's visible eyebrow label — shared by
 * `classifyBlockquote` (matching the label) and `Callout` (displaying it). */
export const CALLOUT_TONE_LABEL: Record<CalloutTone, string> = {
  note: 'Note',
  win: 'Win',
  'watch-out': 'Watch-out',
};

function toArray(node: ReactNode): ReactNode[] {
  if (node === undefined || node === null || typeof node === 'boolean') return [];
  return Array.isArray(node) ? node : [node];
}

function isBlankText(node: ReactNode): boolean {
  return typeof node === 'string' && node.trim() === '';
}

/** The first non-blank-text entry in `nodes`, plus its index in that same
 * array — or `undefined` if every entry is blank/empty. */
function firstMeaningful(nodes: ReactNode): { node: ReactNode; index: number } | undefined {
  const arr = toArray(nodes);
  const index = arr.findIndex((node) => !isBlankText(node));
  return index === -1 ? undefined : { node: arr[index], index };
}

/** Flattens a React children tree down to its plain text content — used
 * only to read a `<strong>` label's text, regardless of how react-markdown
 * nested it. Pure — no shared state, safe to call any number of times. */
function flattenToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenToText).join('');
  if (isValidElement(node)) {
    return flattenToText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

interface LabeledBlockquoteShape<T> {
  /** The first meaningful block-level child of the blockquote (normally a
   * `<p>`, or `Markdown.tsx`'s `p`-renderer element wrapping one — either
   * way, something with a `children` prop). */
  block: ReactElement<{ children?: ReactNode }>;
  /** `block`'s index within the blockquote's top-level children array. */
  blockIndex: number;
  /** `block`'s own children, as a flat array. */
  blockChildren: ReactNode[];
  /** Index of the leading `<strong>` label within `blockChildren`. */
  labelIndex: number;
  /** Whatever `matchLabel` extracted from the label text (a `CalloutTone`,
   * or a `MarginNote` cast-name string). */
  value: T;
}

/**
 * Shared shape-detection for `classifyBlockquote`/`stripCalloutLabel` AND
 * `classifyMarginNote`/`stripMarginNoteLabel` below, so a tone-detector and
 * a name-detector can never disagree about what counts as "a labeled
 * blockquote" in the first place — only `matchLabel` (the label TEXT
 * itself) differs between the two. Returns `null` for anything that isn't
 * EXACTLY "first meaningful block child is a `<p>`-like element whose first
 * meaningful inline child is a `<strong>`" OR whose label text
 * `matchLabel` itself rejects (returns `null` for).
 */
function detectLabeledBlockquote<T>(
  children: ReactNode,
  matchLabel: (label: string) => T | null,
): LabeledBlockquoteShape<T> | null {
  const firstBlock = firstMeaningful(children);
  if (!firstBlock || !isValidElement(firstBlock.node)) return null;

  const blockChildren = toArray((firstBlock.node.props as { children?: ReactNode }).children);
  const inline = firstMeaningful(blockChildren);
  if (!inline || !isValidElement(inline.node) || inline.node.type !== 'strong') return null;

  const label = flattenToText((inline.node.props as { children?: ReactNode }).children).trim();
  const value = matchLabel(label);
  if (value === null) return null;

  return {
    block: firstBlock.node as ReactElement<{ children?: ReactNode }>,
    blockIndex: firstBlock.index,
    blockChildren,
    labelIndex: inline.index,
    value,
  };
}

function detectCallout(children: ReactNode): LabeledBlockquoteShape<CalloutTone> | null {
  return detectLabeledBlockquote(children, (label) => {
    const match = /^(note|win|watch-out):$/i.exec(label);
    return match ? (match[1].toLowerCase() as CalloutTone) : null;
  });
}

/** The em dash/hyphen separator between "Margin note" and the cast name in
 * the `MarginNote` label grammar `Margin note — {CastName}:` (design-brief
 * §6). Accepts either a real em dash or a plain hyphen (with any amount of
 * surrounding whitespace) so a writer whose editor doesn't auto-convert to
 * an em dash still authors a valid note — a strict em-dash-only match would
 * be an invisible authoring trap. */
const MARGIN_NOTE_LABEL = /^margin note\s*[—-]\s*(.+):$/i;

function detectMarginNote(children: ReactNode): LabeledBlockquoteShape<string> | null {
  return detectLabeledBlockquote(children, (label) => {
    const match = MARGIN_NOTE_LABEL.exec(label);
    if (!match) return null;
    const castName = match[1].trim();
    // v1 requires an explicit cast name (spec "OUT OF SCOPE v1": the bare
    // unattributed form needs a Judge/Fable avatar that doesn't exist yet).
    // An empty capture (e.g. "Margin note —:") is not a valid margin note —
    // fall through to Callout/PullQuote rather than rendering a nameless one.
    return castName === '' ? null : castName;
  });
}

/**
 * Classifies a rendered blockquote's children as a `Callout` tone, or `null`
 * for an ordinary `PullQuote` — per docs/blog-format-v2.md §2/§4's binding
 * rule: the *first line's shape* is the only signal. Bold text matching
 * `Note:`/`Win:`/`Watch-out:` (case-insensitive), as the very first inline
 * child of the very first block child, classifies as that tone; anything
 * else (no bold first line, a different bold label, no label at all) is a
 * PullQuote.
 *
 * Pure — operates on the React element tree react-markdown hands the
 * `blockquote` renderer, without ever mounting/rendering anything, so it's
 * unit-testable with plain `React.createElement` calls in a `.test.ts` file
 * (no jsdom, no new test dependency — see `calloutTone.test.ts`).
 */
export function classifyBlockquote(children: ReactNode): CalloutTone | null {
  return detectCallout(children)?.value ?? null;
}

/**
 * Classifies a rendered blockquote's children as a `MarginNote` cast-name
 * string, or `null` if it doesn't match the grammar — per the `MarginNote`
 * spec (design-brief §6): a bold, colon-terminated `Margin note — {Name}:`
 * first line (case-insensitive, em dash or hyphen separator), as the very
 * first inline child of the very first block child. Checked BEFORE
 * `classifyBlockquote` in `Markdown.tsx`'s `blockquote` renderer (three-way:
 * margin note → callout → pull quote) — the two label grammars don't
 * overlap (`Note:`/`Win:`/`Watch-out:` vs. `Margin note — {Name}:`), so
 * ordering only matters for which component ends up owning ambiguous future
 * labels, not for any input either detector already recognizes today.
 *
 * Returns the RAW captured name string, unresolved — `MarginNote` itself
 * (via `getCastMemberByName`) decides whether that name is a real cast
 * member or degrades to a plain-text label. This module never fails a build
 * over an unresolved name; that's a rendering-time, not classification-time,
 * concern.
 */
export function classifyMarginNote(children: ReactNode): string | null {
  return detectMarginNote(children)?.value ?? null;
}

/**
 * Strips the recognized bold `{Label}:` marker (and the single space after
 * it) from a labeled blockquote's first block child, so the rendered
 * component (`Callout` or `MarginNote`) doesn't repeat the label its own
 * eyebrow already shows. A true no-op (returns the exact same `children`
 * reference) when `detect` doesn't itself recognize the shape — safe to
 * call defensively, never mangles a plain PullQuote's content.
 */
function stripLabel<T>(children: ReactNode, detect: (children: ReactNode) => LabeledBlockquoteShape<T> | null): ReactNode {
  const shape = detect(children);
  if (!shape) return children;

  const rest = shape.blockChildren.slice(shape.labelIndex + 1);
  const [head, ...tail] = rest;
  const trimmedRest = typeof head === 'string' ? [head.replace(/^ /, ''), ...tail] : rest;

  const newBlock = cloneElement(shape.block, { children: trimmedRest });
  const newArr = [...toArray(children)];
  newArr[shape.blockIndex] = newBlock;
  return newArr;
}

export function stripCalloutLabel(children: ReactNode): ReactNode {
  return stripLabel(children, detectCallout);
}

export function stripMarginNoteLabel(children: ReactNode): ReactNode {
  return stripLabel(children, detectMarginNote);
}
