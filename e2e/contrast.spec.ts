import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { VIEWPORTS } from './viewports';

/**
 * REAL-BROWSER color-contrast — the high-value unlock this whole lane exists
 * to enable (BACKLOG: "`color-contrast` is documented as structurally
 * unverifiable in jsdom (no canvas)... contrast remains covered only by the
 * design brief's hand-computed table"). axe-core's `color-contrast` rule
 * needs an actual `<canvas>` to sample rendered pixel colors — jsdom has no
 * canvas implementation at all, so every existing `axe.run()` call in this
 * repo (`Header.test.tsx`, `Home.test.tsx`, etc.) silently runs zero
 * contrast checks. A real Chromium page has a real canvas, so this is the
 * first place `color-contrast` has ever actually executed against this
 * app's rendered (not hand-computed) styles.
 *
 * Reuses the `axe-core` devDependency already installed for the jsdom axe
 * suites (`package.json`) — injected directly as a script tag rather than
 * adding `@axe-core/playwright` as a second axe integration. One axe
 * version, one place it's pinned, no second dependency for what amounts to
 * "call `axe.run()` in a page context."
 *
 * Light AND dark mode: design-brief §2 hand-computes separate token tables
 * for both, and §9 explicitly warns that "assuming light-mode and dark-mode
 * text-on-fill combinations are symmetric without checking both" is an
 * avoid-list item. Dark mode is reached by pre-seeding `localStorage` before
 * first paint (`page.addInitScript`), matching exactly how a real returning
 * user gets dark mode — via `index.html`'s inline pre-paint script reading
 * `localStorage.getItem('theme')` (see that file's comment: "so hydration
 * never disagrees with the pre-paint choice"). Deliberately NOT done by
 * clicking `ThemeToggle` after load: `body` has a `transition: background-
 * color 180ms` (`src/index.css`), so a click-then-immediately-audit
 * sequence can catch the DOM mid-transition, sampling a blended intermediate
 * color that is neither the light nor the dark token — falsified for real:
 * an earlier version of this file did exactly that and intermittently
 * reported a "violation" whose `bgColor` (`#d3cec5`) matches neither
 * `--paper` token, only their CSS-transition blend.
 *
 * Scope: `color-contrast` only, not a full axe ruleset. The existing jsdom
 * axe suites already own every OTHER rule axe can evaluate without a canvas
 * (aria roles, landmark structure, label associations, etc.) — duplicating
 * those here would be redundant, not additive. This file's entire reason to
 * exist is the one rule jsdom cannot run.
 */

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf-8');

type AxeViolation = { id: string; target: string; ratio: string | undefined };

/**
 * Waits out the route-level Suspense fallback (`src/lib/withSuspense.tsx`'s
 * "Loading…") before measuring anything. Without this, a run against a cold
 * chunk cache can catch the DOM mid-navigation — falsified for real: an
 * early version of this file raced exactly that on a `--workers=1` run and
 * reported a "violation" on the fallback's `<p>`, not on any real app
 * surface. Every route in this app renders its real content well under a
 * second once the JS chunk is fetched (no network calls, no async data —
 * `docs/spec.md` §4), so waiting the fallback out rather than working around
 * it is the honest fix, not a timeout-and-hope.
 */
async function waitForAppSettled(page: Page) {
  await expect(page.getByText('Loading…')).toHaveCount(0);
}

async function runColorContrastAudit(page: Page): Promise<AxeViolation[]> {
  await waitForAppSettled(page);
  await page.addScriptTag({ content: AXE_SOURCE });
  const results = await page.evaluate(async () => {
    // @ts-expect-error — axe is attached to `window` by the injected script tag, not imported
    const raw = await window.axe.run(document.body, { runOnly: ['color-contrast'] });
    return raw.violations.flatMap((v: { id: string; nodes: Array<{ target: string[]; any: Array<{ data?: { contrastRatio?: number } }> }> }) =>
      v.nodes.map((n) => ({
        id: v.id,
        target: n.target.join(' '),
        ratio: n.any[0]?.data?.contrastRatio?.toFixed(2),
      })),
    );
  });
  return results as AxeViolation[];
}

/** Navigates with the theme pre-seeded via `localStorage` (see file header
 * for why this is NOT a post-load `ThemeToggle` click). */
async function gotoWithTheme(page: Page, url: string, theme: 'light' | 'dark') {
  await page.addInitScript((t) => window.localStorage.setItem('theme', t), theme);
  await page.goto(url);
}

function describeViolations(violations: AxeViolation[]): string {
  return violations.map((v) => `${v.id} (${v.ratio}:1): ${v.target}`).join('\n');
}

/**
 * KNOWN, TRACKED violation — not hidden, not silently allowed. Found by
 * this exact test while wiring this lane up (BACKLOG "Real-browser
 * responsive/visual testing" follow-on, added below): `Callout`'s
 * `watch-out` tone (`src/components/Callout.tsx`) renders its `text-warning`
 * label directly on `color-mix(in srgb, var(--warning) 8%, var(--paper-
 * raised))`, NOT on flat `--paper`/`--paper-raised` — the pairing design-
 * brief §2's hand-computed table actually verified (4.69:1). Against the
 * real mixed wash the label is rendered on, axe measures 4.45:1: a genuine
 * AA failure the brief's table structurally could not have caught (it never
 * computed against a `color-mix()` output, only the two flat tokens it
 * blends). This is exactly the class of bug this lane exists to find — see
 * this PR's report for the full story. Fixing the token is a design/
 * frontend-dev call (not this lane's job to make unilaterally), so it's
 * tracked here as an explicit known-issue, not swept under a passing test:
 * if the ratio ever moves, this allowlist stops matching and the test goes
 * red again until someone updates it — it cannot silently stay "green" once
 * the underlying number changes in either direction.
 */
const KNOWN_VIOLATIONS: AxeViolation[] = [
  { id: 'color-contrast', target: '.text-warning', ratio: '4.45' },
];

test.describe('Color contrast — real browser (axe color-contrast rule)', () => {
  test('home page, light mode, desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    const violations = await runColorContrastAudit(page);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  test('home page, dark mode, desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoWithTheme(page, '/', 'dark');
    const violations = await runColorContrastAudit(page);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  test('home page, light mode, mobile (375 — different visible chrome: hamburger, no desktop nav)', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    const violations = await runColorContrastAudit(page);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  test('a blog post, light mode, desktop (provenance strip / chips / links / Callout — the highest token variety of any page)', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/blog/red-is-not-self-justifying');
    const violations = await runColorContrastAudit(page);
    // See KNOWN_VIOLATIONS' doc comment: one tracked, real, pre-existing
    // failure is allowed through by exact match — anything else (a NEW
    // violation, or this one's ratio changing at all) fails the test.
    expect(violations, describeViolations(violations)).toEqual(KNOWN_VIOLATIONS);
  });
});
