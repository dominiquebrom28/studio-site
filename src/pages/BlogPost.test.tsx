import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import BlogPost from './BlogPost';
import { getPostBySlug } from '@/content';

/**
 * Interaction + accessibility coverage for `BlogPost` (BACKLOG
 * "component-level interaction coverage is missing repo-wide" — see
 * `vitest.component.config.ts`'s header). Two components live here with
 * zero prior coverage:
 *
 *  - `ShareRow`'s clipboard control — never clicked by any test. It's a
 *    local, non-exported function inside this file (`grep -n "^function
 *    ShareRow" src/pages/BlogPost.tsx`), so the only way to reach it at all
 *    is through a real `BlogPost` mount, not an isolated import.
 *  - `BylineGroup`'s overflow rendering, exercised against the ONE real
 *    post that actually has 4 authors
 *    (`content/posts/2026-07-20-red-is-not-self-justifying.md`,
 *    `authors: ["Project Lead", "qa-tester", "frontend-dev", "designer"]`)
 *    rather than a synthetic fixture — the task brief for this file
 *    specifically calls out testing "the actual overflow rendering."
 *
 * Mounted via `MemoryRouter` + a single `/blog/:slug` `Route` (not the
 * app's full `RootLayout`/lazy-loaded route tree from `@/router`) — `Byline
 * Post` itself needs `useParams()`/`<Link>` router context and nothing
 * else (no `LazyMotion` ancestor: `grep framer-motion` across
 * `BlogPost.tsx` and everything it imports comes back empty, unlike
 * `ProjectDetail`/`MediaGallery`).
 */

function renderPost(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/blog/${slug}`]}>
      {/* `BlogPost` is only ever rendered inside `RootLayout`'s
          `<main id="main-content">` in the real app (see
          `src/components/layout/RootLayout.tsx`) — reproducing that one
          real ancestor landmark here (not disabling axe's `region` rule)
          is what keeps the axe check below honest: without it, EVERY
          component-level axe scan of a routed page (not just this one)
          would spuriously fail "content not contained by a landmark"
          purely because of how narrowly this test mounts the page, not
          because of any real accessibility gap in production. */}
      <main>
        <Routes>
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </main>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  // @ts-expect-error -- test-only cleanup of the stub installed in each clipboard test
  delete navigator.clipboard;
});

describe('BlogPost — ShareRow clipboard', () => {
  const slug = 'red-is-not-self-justifying';

  beforeEach(() => {
    const post = getPostBySlug(slug);
    expect(post, `fixture post "${slug}" must exist in content/posts`).toBeTruthy();
  });

  it('clicking "Copy link" writes the current URL to the clipboard and announces success via the aria-live toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    renderPost(slug);

    const copyButton = screen.getByRole('button', { name: 'Copy link' });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Link copied to clipboard.')).toBeTruthy();
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(window.location.href);

    // The confirmation lives in the always-mounted `aria-live="polite"`
    // region (design-brief §8 toast row / assistive-tech requirement) —
    // assert it's the SAME node that announces, not a separately-inserted
    // element, so screen readers actually pick up the change.
    const status = screen.getByText('Link copied to clipboard.').closest('[aria-live="polite"]');
    expect(status).toBeTruthy();
  });

  it('a clipboard failure (permission denied / insecure context) shows the error toast instead of throwing', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    renderPost(slug);

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    await waitFor(() => {
      expect(
        screen.getByText('Couldn’t copy — copy the address from your browser’s bar instead.'),
      ).toBeTruthy();
    });
    expect(screen.queryByText('Link copied to clipboard.')).toBeNull();
  });

  it('the toast reverts to idle (empty) after its hold duration', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    renderPost(slug);

    await vi.waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
      expect(screen.getByText('Link copied to clipboard.')).toBeTruthy();
    });

    await vi.advanceTimersByTimeAsync(2500);

    expect(screen.queryByText('Link copied to clipboard.')).toBeNull();
  });

  it('the "Email this post" affordance is a real mailto link, not a JS handler (works with JS disabled / screen readers that skip button semantics)', () => {
    renderPost(slug);
    const post = getPostBySlug(slug)!;

    const emailLink = screen.getByRole('link', { name: 'Email this post' });
    const href = emailLink.getAttribute('href') ?? '';
    expect(href.startsWith('mailto:?subject=')).toBe(true);
    expect(decodeURIComponent(href)).toContain(post.title);
  });
});

describe('BlogPost — BylineGroup overflow (real 4-author post)', () => {
  const slug = 'red-is-not-self-justifying';

  it('renders exactly 3 visible avatar stamps + a "+1" overflow badge, with a single accessible group name covering all 4 authors', () => {
    renderPost(slug);

    const expectedLabel = 'Written by Nora, Iris, Milo, and Vera';

    // Rendered twice in the real page (mobile block `lg:hidden` + desktop
    // rail `hidden lg:block`) — genuinely both present in this jsdom mount
    // since this component-test config skips the Tailwind Vite plugin (see
    // `vitest.component.config.ts`'s header), so neither `lg:` breakpoint
    // class actually hides either copy here. Mutually exclusive by CSS at
    // any real viewport width; asserting on BOTH here is the honest
    // reflection of that, not a bug being missed.
    const lists = screen.getAllByRole('list', { name: expectedLabel });
    expect(lists).toHaveLength(2);

    for (const list of lists) {
      const links = within(list).getAllByRole('link');
      expect(links).toHaveLength(3);
      expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
        'Nora — view the Cast page',
        'Iris — view the Cast page',
        'Milo — view the Cast page',
      ]);
    }

    const overflowBadges = screen.getAllByText('+1');
    expect(overflowBadges).toHaveLength(2);
    for (const badge of overflowBadges) {
      expect(badge.getAttribute('aria-hidden')).toBe('true');
    }

    // The plain-text name line beneath the stamps carries ALL 4 names
    // (joinNames' Oxford-comma form) — the overflow "+1" badge is a visual
    // count only, never the sole place the 4th author's contribution is
    // recorded.
    const nameLines = screen.getAllByText('Nora, Iris, Milo, and Vera');
    expect(nameLines).toHaveLength(2);
  });

  it('falls back to the raw authors array (all 4 real cast names) for the sign-off, still signing as ONE voice (post.author only)', () => {
    const post = getPostBySlug(slug)!;
    expect(post.authors).toEqual(['Project Lead', 'qa-tester', 'frontend-dev', 'designer']);
    expect(post.author).toBe('Project Lead'); // blog-format-v2 §3: authors[0], never a joint signature

    renderPost(slug);
    expect(screen.getByText('— Nora')).toBeTruthy();
    expect(screen.getByText('Signed, Nora, Project Lead')).toBeTruthy();
  });
});

describe('BlogPost — accessibility (axe)', () => {
  it('has zero axe violations on the real 4-author post', async () => {
    renderPost('red-is-not-self-justifying');
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
