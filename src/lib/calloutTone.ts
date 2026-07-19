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

interface CalloutShape {
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
  tone: CalloutTone;
}

/**
 * Shared shape-detection for both `classifyBlockquote` and
 * `stripCalloutLabel` below, so the two can never disagree about what
 * counts as a match. Returns `null` for anything that isn't EXACTLY "first
 * meaningful block child is a `<p>`-like element whose first meaningful
 * inline child is a `<strong>` reading `Note:`/`Win:`/`Watch-out:`
 * (case-insensitive)".
 */
function detectCallout(children: ReactNode): CalloutShape | null {
  const firstBlock = firstMeaningful(children);
  if (!firstBlock || !isValidElement(firstBlock.node)) return null;

  const blockChildren = toArray((firstBlock.node.props as { children?: ReactNode }).children);
  const inline = firstMeaningful(blockChildren);
  if (!inline || !isValidElement(inline.node) || inline.node.type !== 'strong') return null;

  const label = flattenToText((inline.node.props as { children?: ReactNode }).children).trim();
  const match = /^(note|win|watch-out):$/i.exec(label);
  if (!match) return null;

  return {
    block: firstBlock.node as ReactElement<{ children?: ReactNode }>,
    blockIndex: firstBlock.index,
    blockChildren,
    labelIndex: inline.index,
    tone: match[1].toLowerCase() as CalloutTone,
  };
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
  return detectCallout(children)?.tone ?? null;
}

/**
 * Strips the recognized bold `{Label}:` marker (and the single space after
 * it) from a classified callout's first block child, so `Callout` renders
 * the remaining prose without repeating the label its own eyebrow already
 * shows. A true no-op (returns the exact same `children` reference) for
 * anything `classifyBlockquote` wouldn't itself classify as a callout —
 * safe to call defensively, never mangles a plain PullQuote's content.
 */
export function stripCalloutLabel(children: ReactNode): ReactNode {
  const shape = detectCallout(children);
  if (!shape) return children;

  const rest = shape.blockChildren.slice(shape.labelIndex + 1);
  const [head, ...tail] = rest;
  const trimmedRest = typeof head === 'string' ? [head.replace(/^ /, ''), ...tail] : rest;

  const newBlock = cloneElement(shape.block, { children: trimmedRest });
  const newArr = [...toArray(children)];
  newArr[shape.blockIndex] = newBlock;
  return newArr;
}
