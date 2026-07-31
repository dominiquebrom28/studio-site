import { test, expect } from '@playwright/test';
import { VIEWPORTS } from './viewports';

/**
 * `Header`'s mobile drawer + `useFocusTrap` (`src/components/layout/
 * Header.tsx`, `src/lib/useFocusTrap.ts`) — already covered LOGICALLY by
 * `src/components/layout/Header.test.tsx` under jsdom (open/close, dialog
 * role, `aria-expanded`, body-scroll-lock style). What jsdom cannot exercise
 * is real browser behavior underneath that logic:
 *   - jsdom's `fireEvent.click` does not move focus onto the clicked element
 *     first (`useFocusTrap.ts`'s own doc comment names this exact gap, and
 *     the fix it required — `triggerRef` — was only proven necessary by a
 *     component test that had to work around the jsdom limitation, not by
 *     ever observing real click-then-focus behavior). A real Chromium click
 *     does move focus, so this is the first suite that exercises the actual
 *     code path `triggerRef` was built for.
 *   - Real `Tab`/`Shift+Tab` key dispatch goes through Chromium's native
 *     focus/tab-order machinery before `useFocusTrap`'s `keydown` handler
 *     ever sees it; jsdom's component test only ever fires a synthetic
 *     `Tab` keydown event and checks the handler's own `preventDefault`
 *     logic in isolation.
 *   - `md:hidden` / `hidden md:flex` (which button exists AT ALL at a given
 *     width) is a real media query — invisible to jsdom entirely.
 */

test.describe('Header — mobile drawer (real browser)', () => {
  test('hamburger trigger is visible at 375, hidden at 768+ (md=768 breakpoint)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();

    await page.setViewportSize(VIEWPORTS.tablet);
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();

    await page.setViewportSize(VIEWPORTS.desktop);
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();
  });

  test('opening via a real click traps focus, real Tab/Shift+Tab cycle within it, Escape closes and returns focus to the trigger', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');

    const trigger = page.getByRole('button', { name: 'Open menu' });
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: 'Mobile navigation' });
    await expect(dialog).toBeVisible();

    // First focusable inside the drawer gets focus on open (useFocusTrap).
    const closeButton = dialog.getByRole('button', { name: 'Close menu' });
    await expect(closeButton).toBeFocused();

    // Real Shift+Tab from the first focusable must wrap to the LAST
    // focusable in the drawer, not escape it onto page content behind it.
    await page.keyboard.press('Shift+Tab');
    const focusables = dialog.locator(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const lastFocusable = focusables.last();
    await expect(lastFocusable).toBeFocused();

    // And real Tab from the last focusable wraps back to the first.
    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();

    // Escape closes and returns focus to the hamburger trigger — the exact
    // behavior `triggerRef` exists for (a mouse-opened drawer must not lose
    // focus to `<body>` on close).
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('locks page scroll while open: scrolling does not move the page', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/blog/red-is-not-self-justifying'); // a genuinely tall, scrollable page

    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).toBeVisible();

    await page.mouse.wheel(0, 800);
    const scrollYWhileOpen = await page.evaluate(() => window.scrollY);
    expect(scrollYWhileOpen).toBe(0);

    await page.keyboard.press('Escape');
    // Wait for the close to actually land (React state update + effect
    // cleanup resetting `body.style.overflow`) before scrolling again —
    // without this the wheel can race the close and land while the scroll
    // lock is still applied, which isn't the thing under test here.
    await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).toBeHidden();
    // Re-dispatch the wheel INSIDE the poll, not just re-read scrollY.
    // Root-caused via a real CI failure's Playwright trace (2026-07-29,
    // run 30433103427): a single `page.mouse.wheel` synthetic gesture can
    // occasionally be a no-op — the trace showed `window.scrollY` reads
    // completing in 3-6ms for the full 5s poll window (the page/renderer
    // was never frozen or CPU-starved) while the one wheel dispatch that
    // preceded them simply produced no scroll at all. The scroll-lock
    // RELEASE was already proven correct in that same run (dialog removed,
    // focus returned to the trigger per its accessibility snapshot) —
    // reproduced/falsified locally too: `body.style.overflow` resets
    // synchronously and correctly even under adversarial (60x CPU
    // throttled) conditions, yet the old single-dispatch-then-poll-the-read
    // pattern still failed at that throttle, and re-dispatching the wheel
    // on every poll attempt (this fix) turned it green 12/12. A longer
    // timeout cannot fix a dropped input event; retrying the actual action
    // can. `html { scroll-smooth }` (src/index.css) means a successful
    // scroll still animates rather than landing instantly, which is exactly
    // why this needs to be `expect.poll` rather than an immediate read.
    await expect
      .poll(async () => {
        await page.mouse.wheel(0, 800);
        return page.evaluate(() => window.scrollY);
      })
      .toBeGreaterThan(0);
  });
});
