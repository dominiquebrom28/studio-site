import { describe, it, expect, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, cleanup } from '@testing-library/react';
import axe from 'axe-core';
import type { Post } from '@/content';
import { PostCard } from './PostCard';

/**
 * Pre-launch review fix 5, "blog cards hide the retrospective/day-log
 * distinction that already exists in the data": `PostCard` (used on both `/`
 * and `/blog`) never read `post.tldr`, even though 17/22 posts set it and it
 * already drives a real `TLDRBlock` on the post page. Adds a small mono
 * "TL;DR" chip next to the date, derived purely from `post.tldr` presence —
 * no parallel frontmatter flag, so it cannot drift from the real signal.
 */

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    slug: 'example-post',
    title: 'Example Post',
    summary: 'A short honest summary of what this post is.',
    date: '2026-01-01',
    tags: [],
    tldr: undefined,
    backlogRefs: undefined,
    cover: undefined,
    draft: false,
    order: undefined,
    author: 'Dom',
    authors: ['Dom'],
    provenance: undefined,
    body: 'Body copy.',
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

function renderCard(post: Post) {
  render(
    <MemoryRouter>
      <PostCard post={post} />
    </MemoryRouter>,
  );
}

describe('PostCard — TL;DR chip', () => {
  it('renders a "TL;DR" chip when post.tldr is set', () => {
    renderCard(makePost({ tldr: ['First point.', 'Second point.'] }));
    expect(screen.getByText('TL;DR')).not.toBeNull();
  });

  it('renders NO "TL;DR" chip when post.tldr is absent', () => {
    renderCard(makePost({ tldr: undefined }));
    expect(screen.queryByText('TL;DR')).toBeNull();
  });

  it('has zero axe violations with the chip present', async () => {
    render(
      <MemoryRouter>
        <main>
          <PostCard post={makePost({ tldr: ['First point.', 'Second point.'] })} />
        </main>
      </MemoryRouter>,
    );
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
