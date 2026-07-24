import { describe, it, expect, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import ProjectsIndex from './ProjectsIndex';
import { getAllProjects } from '@/content';

/**
 * Automated a11y coverage, same pattern as Home.test.tsx/ProjectDetail.test.tsx
 * (BACKLOG item B). `ProjectsIndex` renders against real committed content
 * (`getAllProjects` — no fixtures), so this exercises the real `ProjectCard`
 * grid, including the new solo-build tag, for free.
 *
 * `<main>` wrapper: `ProjectsIndex` is only ever rendered inside
 * `RootLayout`'s `<main id="main-content">` in the real app.
 */

afterEach(() => {
  cleanup();
});

function renderIndex() {
  render(
    <MemoryRouter initialEntries={['/projects']}>
      <main>
        <Routes>
          <Route path="/projects" element={<ProjectsIndex />} />
        </Routes>
      </main>
    </MemoryRouter>,
  );
}

describe('ProjectsIndex — accessibility (axe)', () => {
  it('has zero axe violations', async () => {
    renderIndex();

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0);
    });

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});

/**
 * BACKLOG P1 "positioning disambiguation" — every real project committed
 * today is solo work (`soloBuild: true`, see content/projects/*.md), so the
 * clarifier sentence and at least one per-card tag must both be present
 * against the real data set, not just a synthetic fixture (that coverage
 * lives in ProjectCard.test.tsx).
 */
describe('ProjectsIndex — solo/team build disambiguation', () => {
  it('surfaces the clarifier sentence under the H1', async () => {
    renderIndex();
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/predate the studio/i)).toBeTruthy();
  });

  it('tags exactly the projects with soloBuild: true, and no others, in the rendered grid', async () => {
    renderIndex();
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0);
    });

    const expectedSoloCount = getAllProjects().filter((project) => project.soloBuild).length;
    const tags = screen.getAllByText((_, element) => {
      const text = element?.textContent ?? '';
      return text === 'SOLO BUILD · NO AGENT TEAM' || text === 'ONE SITTING · SOLO BUILD';
    });
    // Each solo project renders exactly one tag chip inside its card link.
    // `getAllByText`'s textContent-matching custom matcher also matches (a)
    // ancestor wrapper elements whose full text happens to equal the label
    // and (b) the page's own clarifier sentence, which quotes the same
    // label inline outside any card — filter to only the tightest
    // (leaf-most) matches that live inside a `ProjectCard`'s `<a>` to get a
    // real per-card count.
    const leafCardTags = tags.filter(
      (el) => el.closest('a') !== null && !tags.some((other) => other !== el && el.contains(other)),
    );
    expect(leafCardTags).toHaveLength(expectedSoloCount);
  });
});
