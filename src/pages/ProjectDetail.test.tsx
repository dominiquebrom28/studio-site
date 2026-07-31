import { describe, it, expect, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
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

/**
 * Provenance strip on project detail (docs/provenance-model.md §12 PR 7).
 *
 * Fixtures are real committed content, not synthetic — the backfill in
 * `reports/2026-07-16.md` gives exactly three of the six real projects
 * (pizzaparty, mensapp, lovediary) a real record via
 * `src/content/provenance.generated.json`; the other three
 * (soulforge, portfolio, chart-token-playground) are the honest "no run
 * record" degrade on purpose (see the PR body / report for why those three
 * are excluded — their real adding commit belongs to a different, earlier
 * run that shipped placeholder content, not this one).
 */
describe('ProjectDetail — provenance strip (real content + generated artifact)', () => {
  it('a project WITH a backfilled record (mensapp) renders the real ledger: written-by, reviewer, and a run link — no fabricated Judge/commit-pending text', async () => {
    await renderProject('mensapp');

    const note = screen.getByRole('note', { name: 'Provenance' });
    expect(within(note).getByText('Written by Sanne, marketer')).toBeTruthy();
    expect(within(note).getByText('reviewed by Nora, Project Lead (lead-review)')).toBeTruthy();
    // `judge: null` on this record — inline variant deliberately suppresses
    // the judge:null explanatory row (rail-only, ProvenanceStrip §6/§3.1) —
    // so nothing "Judge"-shaped should appear on this single-column page.
    expect(within(note).queryByText(/Judge/)).toBeNull();
    // Real commit for content/projects/mensapp.md (48e4fe5...) — a real link,
    // not a "pending"/"—" placeholder.
    const commitLink = within(note).getByRole('link', { name: '48e4fe545224' });
    expect(commitLink.getAttribute('href')).toBe(
      'https://github.com/dominiquebrom28/studio-site/commit/48e4fe54522482be1416f6cb902398183ae3f7be',
    );
    const runLink = within(note).getByRole('link', { name: '2026-07-16' });
    expect(runLink.getAttribute('href')).toBe(
      'https://github.com/dominiquebrom28/studio-site/blob/main/reports/2026-07-16.md',
    );
    // Never a bare placeholder standing in for an absent field.
    expect(within(note).queryByText(/—|n\/a|unknown/i)).toBeNull();
  });

  it('the framing line above the strip disambiguates "this write-up" from "the project itself" (docs/project-page-v2.md §7 concern)', async () => {
    await renderProject('mensapp');
    expect(
      screen.getByText(/MensApp is Dom’s own solo build.*this note is about how the page describing it was produced, not the software itself\./),
    ).toBeTruthy();
  });

  it('a project with NO record (soulforge — real adding commit belongs to a different, earlier run) degrades to the same honest "no run record" state posts use, with no Written-by claim at all', async () => {
    await renderProject('soulforge');

    const note = screen.getByRole('note', { name: 'Provenance' });
    const degrade = within(note).getByText('no run record for this entry');
    expect(degrade).toBeTruthy();
    expect(degrade.closest('a')).toBeNull(); // never a link — nothing to link to
    expect(degrade.getAttribute('title')).toMatch(/predates the provenance model/);
    // No "Written by" claim: unlike a post, a project has no independent
    // authorship fact outside a provenance record, so with none, nothing is
    // guessed (ProvenanceStrip's `author` prop is omitted by the caller).
    expect(within(note).queryByText(/Written by/)).toBeNull();
  });

  it('a project with no record on the single-sitting template (chart-token-playground) shows the same honest degrade', async () => {
    await renderProject('chart-token-playground');
    const note = screen.getByRole('note', { name: 'Provenance' });
    expect(within(note).getByText('no run record for this entry')).toBeTruthy();
    expect(within(note).queryByText(/Written by/)).toBeNull();
  });

  it('has zero axe violations on the project-with-record strip (mensapp)', async () => {
    await renderProject('mensapp');
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('has zero axe violations on the project-with-no-record strip (lovediary has a record; portfolio does not — covers the no-record standard-template case not already exercised above)', async () => {
    await renderProject('portfolio');
    const note = screen.getByRole('note', { name: 'Provenance' });
    expect(within(note).getByText('no run record for this entry')).toBeTruthy();
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
