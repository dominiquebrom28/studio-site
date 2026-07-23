import { describe, it, expect, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import ProjectDetail from './ProjectDetail';

/**
 * Automated a11y coverage (BACKLOG item B: "add axe to the component-test
 * config" — see `vitest.component.config.ts`'s header and
 * `Header.test.tsx`/`BlogPost.test.tsx` for the same pattern). Covers BOTH
 * `ProjectDetail` templates (`docs/project-page-v2.md` §6) against real
 * committed project content, not a synthetic fixture — `soulforge`
 * (`StandardTemplate`, has a `process`/`BuildTimeline`) and
 * `chart-token-playground` (`SingleSittingTemplate`, the only project using
 * it today).
 *
 * `<main>` wrapper: `ProjectDetail` is only ever rendered inside
 * `RootLayout`'s `<main id="main-content">` in the real app — reproducing
 * that one real ancestor landmark here (rather than disabling axe's
 * `region` rule) is what keeps this check honest; see `BlogPost.test.tsx`'s
 * `renderPost` doc comment for the full reasoning, identical here.
 */

afterEach(() => {
  cleanup();
});

async function renderProject(slug: string) {
  render(
    <MemoryRouter initialEntries={[`/projects/${slug}`]}>
      <main>
        <Routes>
          <Route path="/projects/:slug" element={<ProjectDetail />} />
        </Routes>
      </main>
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(screen.getAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0);
  });
}

describe('ProjectDetail — accessibility (axe)', () => {
  it('has zero axe violations on the standard template (soulforge — has a BuildTimeline process section)', async () => {
    await renderProject('soulforge');
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('has zero axe violations on the single-sitting template (chart-token-playground)', async () => {
    await renderProject('chart-token-playground');
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
