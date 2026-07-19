import { describe, it, expect } from 'vitest';
import { createElement, isValidElement, type ReactNode } from 'react';
import { classifyBlockquote, stripCalloutLabel } from './calloutTone';

/**
 * Builds the same React-element shape react-markdown hands the `blockquote`
 * renderer for `> **{label}** {rest}` — `<p><strong>{label}</strong>{rest}</p>`
 * — using plain `createElement` calls, no JSX (this file stays `.test.ts`,
 * matching the existing pure-logic test convention/`vitest.config.ts`
 * `include` glob; no jsdom, no new dependency).
 */
function paragraph(...children: ReactNode[]) {
  return createElement('p', {}, ...children);
}
function strong(text: string) {
  return createElement('strong', {}, text);
}

function firstParagraphText(node: ReactNode): ReactNode[] {
  const arr = Array.isArray(node) ? node : [node];
  const first = arr[0];
  if (!isValidElement(first)) return [];
  const inner = (first.props as { children?: ReactNode }).children;
  return Array.isArray(inner) ? inner : [inner];
}

describe('classifyBlockquote', () => {
  it('classifies a bold "Note:" first line as a note callout', () => {
    const children = paragraph(strong('Note:'), ' No studio-site audit has run yet.');
    expect(classifyBlockquote(children)).toBe('note');
  });

  it('classifies a bold "Win:" first line as a win callout, case-insensitively', () => {
    const children = paragraph(strong('WIN:'), ' The 57-test suite genuinely caught three other real bugs.');
    expect(classifyBlockquote(children)).toBe('win');
  });

  it('classifies a bold "Watch-out:" first line as a watch-out callout', () => {
    const children = paragraph(strong('Watch-out:'), ' Both bugs shipped past every automated gate.');
    expect(classifyBlockquote(children)).toBe('watch-out');
  });

  it('is case-insensitive on mixed-case labels too', () => {
    const children = paragraph(strong('Watch-Out:'), ' Something risky.');
    expect(classifyBlockquote(children)).toBe('watch-out');
  });

  it('returns null (PullQuote) for an ordinary blockquote with no bold label', () => {
    const children = paragraph('More output was never a tokens problem.');
    expect(classifyBlockquote(children)).toBeNull();
  });

  it('returns null for bold text that is not one of the three recognized labels', () => {
    const children = paragraph(strong('Important:'), ' Something else entirely.');
    expect(classifyBlockquote(children)).toBeNull();
  });

  it('returns null when the bold text matches a label word but is missing the trailing colon', () => {
    const children = paragraph(strong('Note'), ' Missing the colon.');
    expect(classifyBlockquote(children)).toBeNull();
  });

  it('returns null for empty/absent children', () => {
    expect(classifyBlockquote(undefined)).toBeNull();
    expect(classifyBlockquote([])).toBeNull();
    expect(classifyBlockquote(null)).toBeNull();
  });

  it('classifies using only the first block child when a blockquote has multiple paragraphs', () => {
    const children = [paragraph(strong('Win:'), ' First line.'), paragraph('Second paragraph, plain.')];
    expect(classifyBlockquote(children)).toBe('win');
  });

  it('does not classify a bold label that is not the first inline child', () => {
    const children = paragraph('Leading text, then ', strong('Note:'), ' a label that is not first.');
    expect(classifyBlockquote(children)).toBeNull();
  });
});

describe('stripCalloutLabel', () => {
  it('removes the bold label and the single following space from the first paragraph', () => {
    const children = paragraph(strong('Note:'), ' No studio-site audit has run yet.');
    const stripped = stripCalloutLabel(children);
    expect(firstParagraphText(stripped)).toEqual(['No studio-site audit has run yet.']);
  });

  it('leaves later paragraphs in a multi-paragraph blockquote untouched', () => {
    const children = [paragraph(strong('Win:'), ' First line.'), paragraph('Second paragraph, plain.')];
    const stripped = stripCalloutLabel(children) as ReactNode[];
    expect(firstParagraphText(stripped[0])).toEqual(['First line.']);
    expect(isValidElement(stripped[1]) && (stripped[1].props as { children?: ReactNode }).children).toBe(
      'Second paragraph, plain.',
    );
  });

  it('is a true no-op (same reference) for a shape classifyBlockquote would not call a callout', () => {
    const children = paragraph('Just plain text, no label.');
    expect(stripCalloutLabel(children)).toBe(children);
  });

  it('is a true no-op for an unrecognized bold label', () => {
    const children = paragraph(strong('Important:'), ' Something else.');
    expect(stripCalloutLabel(children)).toBe(children);
  });
});
