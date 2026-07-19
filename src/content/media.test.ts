import { describe, it, expect } from 'vitest';
import { sortForGallery } from './media';
import type { ProjectMediaItem } from './schemas';

function makeItem(overrides: Partial<ProjectMediaItem> & { src: string }): ProjectMediaItem {
  return {
    alt: 'alt text',
    caption: 'a caption',
    kind: 'still',
    viewport: 'desktop',
    width: 100,
    height: 100,
    ...overrides,
  };
}

describe('sortForGallery', () => {
  it('returns an empty array unchanged (graceful degradation — no media)', () => {
    expect(sortForGallery([])).toEqual([]);
  });

  it('puts animation items before still items (animations lead, per DOM-4)', () => {
    const still = makeItem({ src: 'still.png', kind: 'still' });
    const animation = makeItem({ src: 'flow.gif', kind: 'animation' });
    const result = sortForGallery([still, animation]);
    expect(result.map((item) => item.src)).toEqual(['flow.gif', 'still.png']);
  });

  it('preserves authored order within the same kind (stable sort)', () => {
    const stillA = makeItem({ src: 'a.png', kind: 'still' });
    const stillB = makeItem({ src: 'b.png', kind: 'still' });
    const result = sortForGallery([stillB, stillA]);
    expect(result.map((item) => item.src)).toEqual(['b.png', 'a.png']);
  });

  it('does not mutate the input array', () => {
    const items = [makeItem({ src: 'a.png', kind: 'still' }), makeItem({ src: 'b.gif', kind: 'animation' })];
    const original = [...items];
    sortForGallery(items);
    expect(items).toEqual(original);
  });
});
