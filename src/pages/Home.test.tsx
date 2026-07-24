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

/**
 * BACKLOG P1 "positioning disambiguation" — the hero above "Recent builds"
 * claims "an AI dev team builds software"; every real project currently in
 * `content/projects/*.md` is solo work (`soloBuild: true`). Both the
 * per-card tag and the section's own clarifier sentence must actually be
 * present against real committed content, not just asserted in isolation
 * against a synthetic fixture.
 */
describe('Home — solo/team build disambiguation', () => {
  it('surfaces the clarifier sentence and at least one solo-build tag in the "Recent builds" grid', async () => {
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
      expect(screen.getByRole('heading', { level: 2, name: 'Recent builds' })).toBeTruthy();
    });

    expect(screen.getByText(/predate this AI team/i)).toBeTruthy();
    expect(screen.getAllByText('SOLO BUILD · NO AGENT TEAM').length).toBeGreaterThan(0);
  });
});
