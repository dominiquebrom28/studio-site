import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import axe from 'axe-core';
import { ProvenanceStrip } from './ProvenanceStrip';
import type { ProvenanceRecord } from '@/content/provenance-schema';

/**
 * Component-level coverage for `ProvenanceStrip` v2
 * (docs/provenance-model.md §12 PR 5) — the three states (full/partial/
 * none), both variants (inline/rail), the honesty rules (§6: absent fields
 * leave no trace, never a placeholder), commit/run link construction, and
 * axe coverage for every state per the task brief's binding a11y gate.
 *
 * Fixtures below are entirely synthetic (never real content/report data —
 * see the task's honesty constraint: "Do NOT invent fixture records in
 * `content/` ... use test fixtures inside test files only") but every
 * field is shaped exactly as `ProvenanceRecordSchema` requires, matching
 * `provenance-schema.test.ts`'s own fixture convention.
 *
 * `<main>` wrapper for axe checks: same reasoning as `BlogPost.test.tsx`/
 * `Home.test.tsx` — `ProvenanceStrip` is only ever rendered inside
 * `RootLayout`'s `<main id="main-content">` in the real app; reproducing
 * that one ancestor landmark here keeps the axe "region" rule honest
 * rather than disabling it.
 */

afterEach(() => {
  cleanup();
});

const fullRecord: ProvenanceRecord = {
  runId: '2026-07-18',
  reportPath: 'reports/2026-07-18.md',
  item: 'second-blog-post',
  authors: ['marketer'],
  reviewers: [{ by: 'Project Lead', kind: 'fact-check' }],
  judge: { verdict: 'PASS', round: 2, score: 93, outOf: 100 },
  tokens: { approx: 173000, scope: 'run' },
  commit: {
    hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
    short: 'a1b2c3d',
    date: '2026-07-18T10:00:00.000Z',
  },
};

const partialRecord: ProvenanceRecord = {
  runId: '2026-07-16',
  reportPath: 'reports/2026-07-16.md',
  item: 'project-page-backfill',
  authors: ['marketer'],
  // Deliberately sparse: one reviewer, no Judge key at all (unrecorded, not
  // `null`), no tokens figure, and no commit yet — the exact "partial"
  // shape §6 describes: "present chips render, absent chips are simply
  // absent."
  reviewers: [{ by: 'qa-tester', kind: 'qa' }],
  commit: null,
};

const judgeNullRecord: ProvenanceRecord = {
  ...fullRecord,
  runId: '2026-07-15',
  reportPath: 'reports/2026-07-15.md',
  judge: null,
};

function renderStrip(props: Parameters<typeof ProvenanceStrip>[0]) {
  return render(
    <main>
      <ProvenanceStrip {...props} />
    </main>,
  );
}

describe('ProvenanceStrip — "none" state (provenance === undefined)', () => {
  it('inline: renders the Written-by chip plus a visible, non-linked "no run record" chip', () => {
    renderStrip({ author: 'marketer', provenance: undefined, variant: 'inline' });

    const note = screen.getByRole('note', { name: 'Provenance' });
    expect(within(note).getByText('Written by Sanne, marketer')).toBeTruthy();
    const degrade = within(note).getByText('no run record for this entry');
    expect(degrade).toBeTruthy();
    // Deliberately visible but not a real chip — no link, muted styling
    // signalled by the same class as the rest of the ledger (never
    // color-only per WCAG 1.4.1 — the TEXT itself says "no run record").
    expect(degrade.closest('a')).toBeNull();
    expect(degrade.getAttribute('title')).toMatch(/predates the provenance model/);
  });

  it('rail: renders the same honest degrade as a labelled row, not a chip', () => {
    renderStrip({ author: 'marketer', provenance: undefined, variant: 'rail' });

    const note = screen.getByRole('note', { name: 'Provenance' });
    expect(within(note).getByText('Sanne, marketer')).toBeTruthy();
    const degrade = within(note).getByText('no run record for this entry');
    expect(degrade).toBeTruthy();
    expect(degrade.getAttribute('title')).toMatch(/predates the provenance model/);
  });

  it('still renders the resolved author avatar even with no provenance record — crediting is independent of run data', () => {
    renderStrip({ author: 'marketer', provenance: undefined, variant: 'inline' });
    expect(screen.getByRole('img', { name: 'marketer' })).toBeTruthy();
  });

  it('degrades an unresolved author (e.g. "Dom") to plain text, no fabricated avatar', () => {
    renderStrip({ author: 'Dom', provenance: undefined, variant: 'inline' });
    expect(screen.getByText('Written by Dom')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('has zero axe violations (inline)', async () => {
    renderStrip({ author: 'marketer', provenance: undefined, variant: 'inline' });
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('has zero axe violations (rail)', async () => {
    renderStrip({ author: 'marketer', provenance: undefined, variant: 'rail' });
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});

describe('ProvenanceStrip — full record, inline variant', () => {
  it('renders every field in order, joined by " · ", each a real sentence', () => {
    renderStrip({ author: 'marketer', provenance: fullRecord, variant: 'inline' });
    const note = screen.getByRole('note', { name: 'Provenance' });

    expect(within(note).getByText('Written by Sanne, marketer')).toBeTruthy();
    expect(within(note).getByText('reviewed by Nora, Project Lead (fact-check)')).toBeTruthy();
    expect(within(note).getByText('Judge (Fable-5): PASS, round 2, 93/100')).toBeTruthy();
    expect(within(note).getByText('~173k tokens (self-reported, whole run)')).toBeTruthy();
    // "·" separators are aria-hidden decoration, not part of the announced sentence.
    expect(within(note).getAllByText('·', { selector: '[aria-hidden="true"]' }).length).toBeGreaterThan(0);
  });

  it('the commit chip is a real link built from the repo base + the 40-hex hash, labelled with the short hash', () => {
    renderStrip({ author: 'marketer', provenance: fullRecord, variant: 'inline' });
    const commitLink = screen.getByRole('link', { name: 'a1b2c3d' });
    expect(commitLink.getAttribute('href')).toBe(
      'https://github.com/dominiquebrom28/studio-site/commit/a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
    );
    expect(commitLink.getAttribute('target')).toBe('_blank');
    expect(commitLink.getAttribute('rel')).toBe('noreferrer');
  });

  it('the run chip links to the report file on GitHub, labelled with the runId', () => {
    renderStrip({ author: 'marketer', provenance: fullRecord, variant: 'inline' });
    const runLink = screen.getByRole('link', { name: '2026-07-18' });
    expect(runLink.getAttribute('href')).toBe(
      'https://github.com/dominiquebrom28/studio-site/blob/main/reports/2026-07-18.md',
    );
  });

  it('has zero axe violations', async () => {
    renderStrip({ author: 'marketer', provenance: fullRecord, variant: 'inline' });
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});

describe('ProvenanceStrip — full record, rail variant', () => {
  it('renders the graded-paper Judge badge, decorative (aria-hidden), restating the plain-text JUDGE row', () => {
    renderStrip({ author: 'marketer', provenance: fullRecord, variant: 'rail' });

    // The badge text is a visual restatement — hidden from the accessibility
    // tree so it's never announced twice, and never the sole carrier of the
    // verdict (design-brief §9's decorative-only-enforced-structurally rule).
    expect(screen.queryByText('PASS · Round 2 · 93/100')?.closest('[aria-hidden="true"]')).toBeTruthy();
    // The plain-text row is the real, accessible carrier of the same fact.
    expect(screen.getByText('Judge (Fable-5): PASS, round 2, 93/100')).toBeTruthy();
    // The `judge: null` explanatory row is a DIFFERENT state (§3.1) — a
    // record with a real verdict must never also show "Judge review — none
    // for this entry", which would directly contradict the badge/row above it.
    expect(screen.queryByText('Judge review')).toBeNull();
  });

  it('renders every field as a labelled row (dt/dd pair)', () => {
    renderStrip({ author: 'marketer', provenance: fullRecord, variant: 'rail' });
    expect(screen.getByText('Reviewed').tagName).toBe('DT');
    expect(screen.getByText('Judge (Fable-5)', { selector: 'dt' })).toBeTruthy();
    expect(screen.getByText('Commit').tagName).toBe('DT');
    expect(screen.getByText('Tokens').tagName).toBe('DT');
    expect(screen.getByText('Run').tagName).toBe('DT');
  });

  it('has zero axe violations', async () => {
    renderStrip({ author: 'marketer', provenance: fullRecord, variant: 'rail' });
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});

describe('ProvenanceStrip — partial record (some fields absent)', () => {
  it('inline: renders only the fields that exist, with no placeholder for the absent ones', () => {
    renderStrip({ author: 'marketer', provenance: partialRecord, variant: 'inline' });
    const note = screen.getByRole('note', { name: 'Provenance' });

    expect(within(note).getByText('Written by Sanne, marketer')).toBeTruthy();
    expect(within(note).getByText('reviewed by Iris, qa-tester (qa)')).toBeTruthy();
    // "run of {link}" is two text nodes either side of the anchor — assert
    // via the link's own accessible name rather than one contiguous string.
    expect(within(note).getByRole('link', { name: '2026-07-16' })).toBeTruthy();

    // Absent fields: no Judge chip, no commit chip, no tokens chip — and
    // critically, no "n/a" / "—" / "unknown" placeholder standing in for any
    // of them (§6, binding).
    expect(within(note).queryByText(/Judge/)).toBeNull();
    expect(within(note).queryByText(/built on commit/)).toBeNull();
    expect(within(note).queryByText(/tokens/)).toBeNull();
    expect(within(note).queryByText(/—|n\/a|unknown/i)).toBeNull();
  });

  it('a `commit: null` record (not yet committed) omits the commit chip entirely — no "pending" text', () => {
    renderStrip({ author: 'marketer', provenance: partialRecord, variant: 'inline' });
    expect(screen.queryByRole('link', { name: /commit/i })).toBeNull();
  });

  it('rail: no graded-paper badge and no JUDGE row when judge is unrecorded (key absent, not null)', () => {
    renderStrip({ author: 'marketer', provenance: partialRecord, variant: 'rail' });
    expect(screen.queryByText(/Judge/)).toBeNull();
    expect(screen.queryByText('Judge review')).toBeNull();
  });

  it('has zero axe violations', async () => {
    renderStrip({ author: 'marketer', provenance: partialRecord, variant: 'inline' });
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});

describe('ProvenanceStrip — `judge: null` (explicitly not Judge-reviewed, §3.1)', () => {
  it('inline strip suppresses the judge:null row entirely (§6: "the inline strip suppresses")', () => {
    renderStrip({ author: 'marketer', provenance: judgeNullRecord, variant: 'inline' });
    const note = screen.getByRole('note', { name: 'Provenance' });
    expect(within(note).queryByText(/Judge/)).toBeNull();
    // Everything else on the record still renders normally.
    expect(within(note).getByText('reviewed by Nora, Project Lead (fact-check)')).toBeTruthy();
  });

  it('rail renders the distinct explanatory row, citing the real reviewer(s)', () => {
    renderStrip({ author: 'marketer', provenance: judgeNullRecord, variant: 'rail' });
    expect(screen.getByText('Judge review')).toBeTruthy();
    expect(
      screen.getByText('none for this entry; reviewed by Nora, Project Lead (fact-check).'),
    ).toBeTruthy();
    // No graded-paper badge — there is no verdict to stamp.
    expect(screen.queryByText(/Round \d/)).toBeNull();
  });

  it('rail omits the "; reviewed by" clause when there are no reviewers at all', () => {
    const record: ProvenanceRecord = { ...judgeNullRecord, reviewers: [] };
    renderStrip({ author: 'marketer', provenance: record, variant: 'rail' });
    expect(screen.getByText('none for this entry.')).toBeTruthy();
  });

  it('has zero axe violations (rail)', async () => {
    renderStrip({ author: 'marketer', provenance: judgeNullRecord, variant: 'rail' });
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});

describe('ProvenanceStrip — multiple reviewers', () => {
  const record: ProvenanceRecord = {
    ...fullRecord,
    reviewers: [
      { by: 'Project Lead', kind: 'fact-check' },
      { by: 'qa-tester', kind: 'qa' },
    ],
  };

  it('inline renders one chip per reviewer', () => {
    renderStrip({ author: 'marketer', provenance: record, variant: 'inline' });
    expect(screen.getByText('reviewed by Nora, Project Lead (fact-check)')).toBeTruthy();
    expect(screen.getByText('reviewed by Iris, qa-tester (qa)')).toBeTruthy();
  });

  it('rail numbers each reviewer row when there is more than one', () => {
    renderStrip({ author: 'marketer', provenance: record, variant: 'rail' });
    expect(screen.getByText('Reviewed (1/2)')).toBeTruthy();
    expect(screen.getByText('Reviewed (2/2)')).toBeTruthy();
  });
});

describe('ProvenanceStrip — token scope rendering', () => {
  it('a run-scoped estimate reads "whole run"', () => {
    renderStrip({ author: 'marketer', provenance: fullRecord, variant: 'inline' });
    expect(screen.getByText('~173k tokens (self-reported, whole run)')).toBeTruthy();
  });

  it('an agent-scoped estimate names the specific agent, never "whole run"', () => {
    const record: ProvenanceRecord = {
      ...fullRecord,
      tokens: { approx: 50000, scope: 'agent', agent: 'frontend-dev' },
    };
    renderStrip({ author: 'marketer', provenance: record, variant: 'inline' });
    expect(screen.getByText('~50k tokens (self-reported, frontend-dev)')).toBeTruthy();
    expect(screen.queryByText(/whole run/)).toBeNull();
  });
});
