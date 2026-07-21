import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { Markdown } from './Markdown';
import { MarginNote } from './MarginNote';

/**
 * Component-level coverage for `MarginNote` (BACKLOG "MarginNote
 * component"), run against `src/components/Markdown.tsx` — the real
 * classify → strip → render pipeline (`src/lib/calloutTone.ts`'s
 * `classifyMarginNote`/`stripMarginNoteLabel`), not just the component in
 * isolation, so the three-way blockquote dispatch (margin note → callout →
 * pull quote) and the DOM reading-order guarantee are exercised for real.
 *
 * No `@testing-library/jest-dom` in this repo yet — assertions use plain
 * `.toBeTruthy()`/`.toBeNull()`, matching `MediaGallery.test.tsx`'s existing
 * convention (this codebase's only other component test).
 *
 * v1 ships the inline-everywhere fallback (see `MarginNote.tsx`'s doc
 * comment) — one render, every breakpoint, no lane/portal/ResizeObserver —
 * so there is no responsive-variant surface to test here beyond the states
 * below.
 */

afterEach(() => {
  cleanup();
});

describe('MarginNote — via Markdown blockquote dispatch', () => {
  it('renders a resolved cast name with its avatar and identity line', () => {
    const body = [
      'The world map loader used to stall silently.',
      '',
      '> **Margin note — frontend-dev:** Two scars on this one, both mine.',
    ].join('\n');
    render(<Markdown>{body}</Markdown>);

    const aside = screen.getByRole('complementary', { name: 'Margin note from Milo, frontend-dev' });
    expect(aside).toBeTruthy();
    expect(within(aside).getByRole('img', { name: 'frontend-dev' })).toBeTruthy();
    expect(within(aside).getByText('Milo, frontend-dev')).toBeTruthy();
    expect(within(aside).getByText('Two scars on this one, both mine.')).toBeTruthy();
    // The label itself is stripped from the rendered quip — never repeated.
    expect(within(aside).queryByText(/Margin note —/)).toBeNull();
  });

  it('degrades an unresolved name to a plain-text label with no avatar, and does not fail to render', () => {
    const body = [
      'A stray note from the human, not a cast member.',
      '',
      '> **Margin note — Dom:** This bit really happened.',
    ].join('\n');
    render(<Markdown>{body}</Markdown>);

    const aside = screen.getByRole('complementary', { name: 'Margin note from Dom' });
    expect(within(aside).getByText('Dom')).toBeTruthy();
    expect(within(aside).queryByRole('img')).toBeNull();
  });

  it('renders a long note in full, with no truncation', () => {
    const longQuip =
      'This one runs long on purpose — several sentences of reviewer color, ' +
      'the kind of aside that would get clipped by a fixed-height card or an ' +
      'ellipsis rule if this component ever grew one, which spec §6/§9 forbids: ' +
      'never truncated, never hidden, always the full real text in document flow.';
    const body = ['Anchor paragraph for a long quip.', '', `> **Margin note — qa:** ${longQuip}`].join('\n');
    render(<Markdown>{body}</Markdown>);

    expect(screen.getByText(longQuip)).toBeTruthy();
  });

  it('renders two nearby notes as two full, independent asides — neither is dropped or merged', () => {
    const body = [
      'First anchor paragraph.',
      '',
      '> **Margin note — designer:** First quip.',
      '',
      'Second anchor paragraph, right after.',
      '',
      '> **Margin note — architect:** Second quip.',
    ].join('\n');
    render(<Markdown>{body}</Markdown>);

    expect(screen.getByRole('complementary', { name: 'Margin note from Vera, designer' })).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Margin note from Theo, architect' })).toBeTruthy();
    expect(screen.getByText('First quip.')).toBeTruthy();
    expect(screen.getByText('Second quip.')).toBeTruthy();
  });

  it('renders a Callout normally for a Note:/Win:/Watch-out: label — the two grammars do not collide', () => {
    const body = ['A paragraph before an ordinary callout.', '', '> **Note:** An ordinary callout, not a margin note.'].join(
      '\n',
    );
    render(<Markdown>{body}</Markdown>);

    expect(screen.getByText('An ordinary callout, not a margin note.')).toBeTruthy();
    expect(screen.queryByRole('complementary', { name: /Margin note/ })).toBeNull();
  });
});

/**
 * FALSIFICATION (the task's binding requirement): asserts the note's real
 * DOM node is a sibling that comes IMMEDIATELY after its anchor paragraph,
 * before any CSS/portal repositioning could apply — spec §5/§9's binding
 * reading-order rule. This was watched RED, then GREEN:
 *
 *   RED — temporarily wrapped `MarginNote`'s returned `<aside>` in an extra
 *   `<div>` (simulating a lane/portal-style implementation that inserts a
 *   layout wrapper around the note instead of leaving it as a bare sibling).
 *   `anchorParagraph.nextElementSibling` then pointed at that wrapper `div`,
 *   not the `aside` found via `getByRole('complementary', ...)` — the
 *   `toBe` assertion below failed exactly as expected.
 *
 *   GREEN — reverted `MarginNote.tsx` to render the bare `<aside>` with no
 *   wrapper, re-ran, and it passed. No production code differs from before
 *   this test was added; the revert was the fix.
 */
describe('MarginNote — reading order (falsified red -> green)', () => {
  it('is a DOM sibling immediately after its anchor paragraph, not merely present somewhere on the page', () => {
    const body = ['This exact paragraph is the anchor.', '', '> **Margin note — designer:** Anchored right after.'].join(
      '\n',
    );
    render(<Markdown>{body}</Markdown>);

    const anchorParagraph = screen.getByText('This exact paragraph is the anchor.');
    const aside = screen.getByRole('complementary', { name: 'Margin note from Vera, designer' });

    expect(anchorParagraph.tagName).toBe('P');
    expect(anchorParagraph.nextElementSibling).toBe(aside);
    // Both live directly under Prose's wrapping div — real sibling flow, no
    // intermediate positioning wrapper.
    expect(anchorParagraph.parentElement).toBe(aside.parentElement);
  });
});

describe('MarginNote — used directly (out-of-Markdown API shape)', () => {
  it('accepts the { children, name } props the renderer produces', () => {
    render(<MarginNote name="security-auditor">A direct-usage smoke check of the component API.</MarginNote>);
    expect(screen.getByRole('complementary', { name: 'Margin note from Karin, security-auditor' })).toBeTruthy();
  });
});
