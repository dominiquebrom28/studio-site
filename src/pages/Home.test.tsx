import { describe, it, expect, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import Home from './Home';

/**
 * Automated a11y coverage (BACKLOG item B: "add axe to the component-test
 * config" — see `vitest.component.config.ts`'s header and
 * `Header.test.tsx`/`ProjectDetail.test.tsx`/`BlogPost.test.tsx` for the
 * same pattern). `Home` renders against real committed content
 * (`getFeaturedProjects`/`getLatestPosts` — no fixtures), so this exercises
 * `CastStrip`, `ProjectCard`, and `PostCard` for free.
 *
 * `<main>` wrapper: same reasoning as `BlogPost.test.tsx`/
 * `ProjectDetail.test.tsx` — `Home` is only ever rendered inside
 * `RootLayout`'s `<main id="main-content">` in the real app.
 */

afterEach(() => {
  cleanup();
});

describe('Home — accessibility (axe)', () => {
  it('has zero axe violations', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </main>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0);
    });

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
