import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import axe from 'axe-core';
import { PostCover } from './PostCover';

/**
 * Component-level coverage for `PostCover` (BACKLOG P1 "dead-field /
 * retired-device cleanup" — `PostFrontmatterSchema`'s `cover` field existed
 * on the schema but was set by zero posts and rendered nowhere until this
 * pass). Fixtures below are synthetic test-file-only data (same convention
 * as `ProvenanceStrip.test.tsx`) — never a real `content/posts/*.md` file,
 * so this doesn't put a cover on a real post as a side effect of testing
 * one.
 *
 * Falsified red first: before `PostCover.tsx` existed, this file's import
 * of `./PostCover` failed module resolution outright — every test below
 * failed at collection, not at an assertion, confirming there was no
 * pre-existing implementation this test could have been trivially
 * satisfied by.
 */

afterEach(() => {
  cleanup();
});

describe('PostCover — cover set', () => {
  const post = { cover: '/media/posts/red-is-not-self-justifying-cover.png', title: 'Red Is Not Self-Justifying' };

  it('renders an <img> with the cover src and alt text falling back to the post title', () => {
    render(<PostCover post={post} />);

    const img = screen.getByRole('img', { name: post.title }) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(post.cover);
    expect(img.getAttribute('alt')).toBe(post.title);
  });

  it('has zero axe violations', async () => {
    const { container } = render(
      <main>
        <PostCover post={post} />
      </main>,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});

describe('PostCover — no cover', () => {
  const post = { cover: undefined, title: 'A Post With No Cover' };

  it('renders nothing — no placeholder, no image, no wrapping element', () => {
    const { container } = render(<PostCover post={post} />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.innerHTML).toBe('');
  });
});
