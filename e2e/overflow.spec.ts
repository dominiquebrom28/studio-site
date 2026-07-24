import { test, expect } from '@playwright/test';
import { VIEWPORTS } from './viewports';

/**
 * Horizontal-overflow regression guard. A page that overflows horizontally
 * at a narrow width (a fixed-width element, an un-wrapped flex row, a table
 * without a scroll wrapper) is invisible to jsdom for the same reason as
 * everything else in this lane: jsdom lays out nothing and computes no
 * widths at all, so `scrollWidth`/`clientWidth` are meaningless there. This
 * is a real layout measurement that only a real browser can produce.
 *
 * Routes: every static route, plus one project detail and one blog post
 * (the two dynamic templates) — representative, not exhaustive (full-route
 * coverage of every project/post already exists at the structural level in
 * `src/smoke/routes.smoke.test.tsx`; this lane's job is the visual/layout
 * class that suite cannot check, not to re-run full coverage a second way).
 */

const ROUTES = ['/', '/projects', '/blog', '/cast', '/projects/soulforge', '/blog/red-is-not-self-justifying'];

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`No horizontal overflow @ ${viewportName} (${viewport.width}px)`, () => {
    for (const route of ROUTES) {
      test(route, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(route);

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));

        expect(scrollWidth, `document.documentElement.scrollWidth (${scrollWidth}) should not exceed clientWidth (${clientWidth}) — something is overflowing horizontally`).toBeLessThanOrEqual(
          clientWidth,
        );
      });
    }
  });
}
