import { test, expect } from '@playwright/test';
import { VIEWPORTS } from './viewports';

/**
 * The regression class this file exists for (BACKLOG P1 "Real-browser
 * responsive/visual testing"): reports/2026-07-17.md — on the project-detail
 * page, byline/status/stack metadata lived ONLY in a desktop sticky rail,
 * which on mobile stacks *after* the entire prose body in document flow, so
 * a phone reader hit every paragraph of copy before any metadata. A second,
 * shape-identical bug shipped 2026-07-18 on the blog post page: the fix for
 * the first bug (a `lg:hidden` mobile block duplicating the rail's content)
 * was rendered un-guarded, so BOTH the mobile block and the desktop rail
 * were visible at once at desktop width — the same byline/"Written by"
 * sentence, stacked, on one screen (see `src/components/Byline.tsx`'s doc
 * comment for the full story).
 *
 * `BlogPost.tsx` is the one route left in the app with this responsive
 * split today (`ProjectDetail.tsx` was redesigned to a single column in
 * project-page-v2 and no longer has one — see that file's history). jsdom
 * mounts BOTH branches unconditionally (`src/pages/BlogPost.test.tsx`'s own
 * comment: "genuinely both present in this jsdom mount") because jsdom does
 * not evaluate `@media` queries at all — so no existing suite can ever
 * catch either bug shape recurring. This file is what would have.
 *
 * Fixture: `red-is-not-self-justifying` — reused from
 * `src/pages/BlogPost.test.tsx` on purpose (same content, same
 * `backlogRefs`/multi-author shape already relied on elsewhere; not a new,
 * separately-maintained fixture).
 */

const POST_URL = '/blog/red-is-not-self-justifying';

/** The `h1 + div` mobile metadata block (Byline/BylineGroup + ProvenanceStrip,
 * `className="mb-6 lg:hidden"` in BlogPost.tsx) — selected structurally by
 * DOM position (immediately after the page's one `<h1>`), not by a Tailwind
 * class string, so this test keeps working even if the responsive
 * implementation changes utility classes. */
function mobileMetaBlock(page: import('@playwright/test').Page) {
  return page.locator('h1 + div').first();
}

/** The desktop rail — a real `<aside>` landmark. NOT the only `<aside>` on
 * the page: `Callout`/`MarginNote` (`src/components/Callout.tsx`,
 * `src/components/MarginNote.tsx`) also render `<aside>` for in-body
 * "Watch-out"/margin-note asides, and this post's body has one (falsified
 * this test against exactly that — `.first()` matched the in-body callout
 * instead and the test passed for the wrong reason). The rail is always the
 * LAST `<aside>` in document order: it's the second (final) child of the
 * `grid` container, a following sibling of the entire content column, so
 * every in-body aside is necessarily earlier in the DOM regardless of how
 * many the post's markdown contains. */
function desktopRail(page: import('@playwright/test').Page) {
  return page.locator('main aside').last();
}

test.describe('BlogPost — responsive metadata split (2026-07-17/18 regression class)', () => {
  test('at 375 (mobile): metadata block is visible, appears before the article body, desktop rail is not visible', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(POST_URL);

    const meta = mobileMetaBlock(page);
    const rail = desktopRail(page);
    const firstBodyParagraph = page.locator('article, main').getByText(/Two weeks of/).first();

    await expect(meta).toBeVisible();
    await expect(rail).toBeHidden();

    const metaBox = await meta.boundingBox();
    const bodyBox = await firstBodyParagraph.boundingBox();
    expect(metaBox).not.toBeNull();
    expect(bodyBox).not.toBeNull();
    // The actual 2026-07-17 bug: metadata rendered below the ENTIRE body on
    // mobile. Reading order = visual (top-to-bottom) order at this width,
    // so the meta block's top must sit above the body's first paragraph.
    expect(metaBox!.y).toBeLessThan(bodyBox!.y);
  });

  test('at 768 (tablet, below the lg=1024 breakpoint): same mobile behavior as 375', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto(POST_URL);

    await expect(mobileMetaBlock(page)).toBeVisible();
    await expect(desktopRail(page)).toBeHidden();
  });

  test('at 1280 (desktop): desktop rail is visible, mobile metadata block is not — never both at once', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(POST_URL);

    await expect(desktopRail(page)).toBeVisible();
    await expect(mobileMetaBlock(page)).toBeHidden();

    // Belt-and-suspenders on the exact 2026-07-18 bug shape: the "Written
    // by" sentence must appear only once in the accessibility tree's visible
    // text, not twice.
    const writtenByVisible = await page.getByText(/^Written by/).evaluateAll((nodes) =>
      nodes.filter((node) => {
        const style = window.getComputedStyle(node as Element);
        const rect = (node as Element).getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }).length,
    );
    expect(writtenByVisible).toBe(1);
  });
});
