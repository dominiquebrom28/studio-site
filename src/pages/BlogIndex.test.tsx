import { describe, it, expect, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, cleanup } from '@testing-library/react';
import axe from 'axe-core';
import BlogIndex from './BlogIndex';
import { getAllPosts } from '@/content';

/**
 * `getAllPosts` is mocked as a spy WRAPPING the real implementation (real
 * committed content, same pattern `ProjectsIndex.test.tsx` uses directly) so
 * every test gets real posts by default — only the "empty state" describe
 * block below overrides it (`mockReturnValueOnce([])`) to reach the branch
 * that can't otherwise be exercised while this repo has real posts.
 */
vi.mock('@/content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/content')>();
  return { ...actual, getAllPosts: vi.fn(actual.getAllPosts) };
});

afterEach(() => {
  cleanup();
});

// `<main>` wrapper: `BlogIndex` is only ever rendered inside `RootLayout`'s
// `<main id="main-content">` in the real app (same reasoning as
// `ProjectsIndex.test.tsx`) — without it, axe's landmark-region rule flags
// content that would be fine in its real mount point.
function renderBlogIndex() {
  return render(
    <MemoryRouter>
      <main>
        <BlogIndex />
      </main>
    </MemoryRouter>,
  );
}

describe('BlogIndex — real content', () => {
  it('renders the Logbook heading and at least one post card', () => {
    renderBlogIndex();

    expect(screen.getByRole('heading', { level: 1, name: 'The Logbook' })).toBeTruthy();
    expect(screen.getAllByRole('link').length).toBeGreaterThan(0);
    expect(screen.queryByText('No entries yet — the first run report is still warm.')).toBeNull();
  });

  it('has zero axe violations', async () => {
    renderBlogIndex();
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});

/**
 * Regression coverage for the empty-state "see reports/ on GitHub" link
 * (backlog "point at the right thing", 2026-07-29): it used to point at
 * Dom's bare GitHub *profile* — a mismatch with its own "reports/" copy —
 * instead of the `studio-site` repo's actual `reports/` folder.
 */
describe('BlogIndex — empty state (no posts)', () => {
  it('renders the "no entries yet" copy with a way-forward link straight to reports/, not Dom\'s profile', () => {
    vi.mocked(getAllPosts).mockReturnValueOnce([]);
    renderBlogIndex();

    expect(screen.getByText('No entries yet — the first run report is still warm.')).toBeTruthy();

    const link = screen.getByRole('link', { name: '→ see reports/ on GitHub' });
    expect(link.getAttribute('href')).toBe('https://github.com/dominiquebrom28/studio-site/tree/main/reports');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noreferrer');
  });

  it('has zero axe violations in the empty state', async () => {
    vi.mocked(getAllPosts).mockReturnValueOnce([]);
    renderBlogIndex();

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
