import { describe, it, expect, afterEach } from 'vitest';
import { LazyMotion, domAnimation } from 'framer-motion';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MediaGallery } from './MediaGallery';
import type { ProjectMediaItem } from '@/content/schemas';

/**
 * First customer of `vitest.component.config.ts` (BACKLOG "Component-level
 * test infrastructure is missing repo-wide"). Covers the DOM-4 play/stop
 * control's click/keyboard interaction and, specifically, the 2026-07-19
 * focus-retention fix: before that fix, the animation control was a
 * one-shot "Play" button that got swapped out for a bare `<img>` the moment
 * it was clicked, so a keyboard user who activated it via Enter/Space had
 * focus dumped onto `<body>`. The fix (see MediaGallery.tsx's `GalleryItem`
 * doc comment) makes it a single PERSISTENT `<button>` that only ever
 * changes its own label/icon/size — the same DOM node survives the toggle.
 * That claim rested on React reconciliation semantics + code review only,
 * with no passing assertion, until this file.
 *
 * `MediaGallery`'s `m.*` elements require a `LazyMotion` ancestor (see
 * `ProjectDetail.tsx`, the only real call site) — provided directly here via
 * the synchronous `domAnimation` bundle rather than the app's lazy
 * `import()` wrapper, since nothing in these tests needs the code-splitting
 * behavior itself, only the runtime `m.*` requires to not throw.
 */

const animationItem: ProjectMediaItem = {
  src: '/media/soulforge/world-map-pan.gif',
  alt: 'Panning across the SoulForge world map, each themed panel highlighting in turn',
  caption: 'World map pan — all seven elements',
  kind: 'animation',
  viewport: 'desktop',
  width: 1280,
  height: 800,
  poster: '/media/soulforge/world-map-pan-poster.png',
};

const stillItem: ProjectMediaItem = {
  src: '/media/soulforge/character-sheet.png',
  alt: 'Character sheet showing the six core stats',
  caption: 'Character sheet',
  kind: 'still',
  viewport: 'mobile',
  width: 750,
  height: 1334,
};

function renderGallery(items: ProjectMediaItem[]) {
  return render(
    <LazyMotion features={domAnimation} strict>
      <MediaGallery items={items} />
    </LazyMotion>,
  );
}

afterEach(() => {
  cleanup();
});

describe('MediaGallery — animation play/stop control', () => {
  it('renders the poster (not the real src) and a Play affordance before activation', () => {
    renderGallery([animationItem]);

    const img = screen.getByAltText(animationItem.alt);
    expect(img.getAttribute('src')).toBe(animationItem.poster);

    const toggle = screen.getByRole('button', { name: `Play animation — ${animationItem.caption}` });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Play animation')).toBeTruthy();
  });

  it('clicking Play swaps the control to Stop and starts the animation (real src)', () => {
    renderGallery([animationItem]);

    const playButton = screen.getByRole('button', { name: `Play animation — ${animationItem.caption}` });
    fireEvent.click(playButton);

    // Same query by role — no name filter, since aria-label just changed;
    // asserting there's exactly one button proves it's the SAME control,
    // not a second one appearing alongside a first.
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    const stopButton = buttons[0];

    expect(stopButton.getAttribute('aria-pressed')).toBe('true');
    expect(stopButton.getAttribute('aria-label')).toBe(`Stop animation — ${animationItem.caption}`);
    expect(screen.queryByText('Play animation')).toBeNull();

    const img = screen.getByAltText(animationItem.alt);
    expect(img.getAttribute('src')).toBe(animationItem.src);

    expect(screen.getByRole('status').textContent).toBe('Animation playing.');
  });

  it('clicking Stop returns the control to Play and shows the poster again', () => {
    renderGallery([animationItem]);

    const playButton = screen.getByRole('button', { name: `Play animation — ${animationItem.caption}` });
    fireEvent.click(playButton); // -> playing
    fireEvent.click(playButton); // -> stopped again (same node throughout)

    const toggle = screen.getByRole('button', { name: `Play animation — ${animationItem.caption}` });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Play animation')).toBeTruthy();

    const img = screen.getByAltText(animationItem.alt);
    expect(img.getAttribute('src')).toBe(animationItem.poster);

    expect(screen.getByRole('status').textContent).toBe('Animation stopped.');
  });

  it('retains focus on the control across the Play <-> Stop toggle (2026-07-19 regression)', () => {
    // This is the load-bearing assertion this whole file exists for: a
    // keyboard/mouse user who has focus on the control must still have
    // focus on it — the exact same node, not `<body>` — after the click
    // that toggles it. Before the fix, the control was conditionally
    // rendered (Play button unmounted, replaced by a bare `<img>`), which
    // unmounts the focused node out from under the user; React does not
    // auto-restore focus anywhere else, so focus reverts to `<body>`.
    renderGallery([animationItem]);

    const playButton = screen.getByRole('button', { name: `Play animation — ${animationItem.caption}` });
    playButton.focus();
    expect(document.activeElement).toBe(playButton);

    fireEvent.click(playButton);

    // Query again — if the fix ever regresses into unmount/remount, this
    // finds a genuinely different node, and the identity check below fails
    // even if activeElement still happens to be a `<button>`.
    const stopButton = screen.getByRole('button', { name: `Stop animation — ${animationItem.caption}` });
    expect(stopButton).toBe(playButton); // same DOM node, not a remount
    expect(document.activeElement).toBe(stopButton);
    expect(document.activeElement).not.toBe(document.body);

    fireEvent.click(stopButton);

    const playButtonAgain = screen.getByRole('button', { name: `Play animation — ${animationItem.caption}` });
    expect(playButtonAgain).toBe(stopButton);
    expect(document.activeElement).toBe(playButtonAgain);
    expect(document.activeElement).not.toBe(document.body);
  });
});

describe('MediaGallery — still items', () => {
  it('renders a still image with no play control', () => {
    renderGallery([stillItem]);

    const img = screen.getByAltText(stillItem.alt);
    expect(img.getAttribute('src')).toBe(stillItem.src);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('MediaGallery — empty state', () => {
  it('renders the designed empty stamp instead of nothing when there is no media', () => {
    renderGallery([]);

    expect(screen.getByText('No screens logged')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
