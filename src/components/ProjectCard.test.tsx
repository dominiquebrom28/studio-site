import { describe, it, expect, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, cleanup } from '@testing-library/react';
import axe from 'axe-core';
import type { Project } from '@/content';
import { ProjectCard } from './ProjectCard';

/**
 * BACKLOG P1 "positioning disambiguation" — the hero claims "an AI dev team
 * builds software," but the grid underneath it is (today) 100% Dom's solo
 * pre-team work. `ProjectCard` must surface that distinction per-project,
 * driven by `project.soloBuild` (see `src/content/soloBuild.ts`), not by a
 * hard-coded slug list. These tests exist to prove that gate actually gates
 * — see the git history on this file: they were written and run RED against
 * the pre-fix `ProjectCard` (which rendered no tag at all, solo or not)
 * before the tag was added, then GREEN after, so a passing suite here is
 * evidence the assertion is real and not a tautology.
 */

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    slug: 'example-project',
    title: 'Example Project',
    summary: 'A short honest summary of what this project is.',
    stack: ['React', 'TypeScript'],
    status: 'shipped',
    date: '2026-01-01',
    repo: undefined,
    liveUrl: undefined,
    cover: undefined,
    media: [],
    featured: false,
    order: undefined,
    goal: undefined,
    brief: undefined,
    process: undefined,
    template: 'standard',
    soloBuild: true,
    body: 'Body copy.',
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

function renderCard(project: Project) {
  render(
    <MemoryRouter>
      <ProjectCard project={project} />
    </MemoryRouter>,
  );
}

describe('ProjectCard — solo/team build disambiguation', () => {
  it('renders the "SOLO BUILD · NO AGENT TEAM" tag for a solo-built project', () => {
    renderCard(makeProject({ soloBuild: true, template: 'standard' }));
    expect(screen.getByText('SOLO BUILD · NO AGENT TEAM')).not.toBeNull();
  });

  it('renders the single-sitting variant label when template is "single-sitting"', () => {
    renderCard(makeProject({ soloBuild: true, template: 'single-sitting' }));
    expect(screen.getByText('ONE SITTING · SOLO BUILD')).not.toBeNull();
    expect(screen.queryByText('SOLO BUILD · NO AGENT TEAM')).toBeNull();
  });

  it('renders NO solo-build tag for a team-built project (soloBuild: false)', () => {
    renderCard(makeProject({ soloBuild: false }));
    expect(screen.queryByText('SOLO BUILD · NO AGENT TEAM')).toBeNull();
    expect(screen.queryByText('ONE SITTING · SOLO BUILD')).toBeNull();
  });

  it('does not hide the tag from the accessibility tree — it is real, meaningful text content', () => {
    renderCard(makeProject({ soloBuild: true }));
    const tag = screen.getByText('SOLO BUILD · NO AGENT TEAM');
    // Walk up to make sure nothing between the text node and the card root
    // was marked aria-hidden (which would silently drop it from the a11y
    // tree while leaving it visible — the opposite of what a factual
    // qualifier needs).
    let node: HTMLElement | null = tag;
    while (node) {
      expect(node.getAttribute('aria-hidden')).not.toBe('true');
      node = node.parentElement;
    }
  });

  it('has zero axe violations with the tag present', async () => {
    // Wrapped in <main>, same reasoning as Home.test.tsx/ProjectDetail.test.tsx
    // — ProjectCard is only ever rendered inside a real landmark
    // (`RootLayout`'s `<main id="main-content">`) in the actual app, so
    // reproducing that one ancestor here (rather than disabling axe's
    // `region` rule) is what keeps this check honest.
    render(
      <MemoryRouter>
        <main>
          <ProjectCard project={makeProject({ soloBuild: true })} />
        </main>
      </MemoryRouter>,
    );
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
