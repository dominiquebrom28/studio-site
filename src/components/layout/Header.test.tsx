import { describe, it, expect, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import axe from 'axe-core';
import { Header } from './Header';

/**
 * Interaction coverage for `Header`'s mobile drawer + `useFocusTrap`
 * (BACKLOG "component-level interaction coverage is missing repo-wide" —
 * see `vitest.component.config.ts`'s header). `useFocusTrap` is only ever
 * consumed here (`grep useFocusTrap src` — one call site), so its real
 * behavior — engage, cycle, release on close/Escape, return focus to the
 * trigger (design-brief §9 keyboard order / §6 "Mobile: hamburger → ...
 * focus-trapped, closes on Esc and outside-click, returns focus to the
 * trigger") — is exercised through the actual component, the same
 * "test the real thing, not a synthetic harness" house style
 * `MediaGallery.test.tsx` establishes, rather than a standalone hook
 * harness.
 */

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

function openDrawer() {
  const trigger = screen.getByRole('button', { name: 'Open menu' });
  fireEvent.click(trigger);
  return trigger;
}

describe('Header — mobile drawer', () => {
  it('is closed by default, trigger reports aria-expanded=false, no dialog mounted', () => {
    renderHeader();

    const trigger = screen.getByRole('button', { name: 'Open menu' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens on trigger click: mounts a labeled modal dialog and flips aria-expanded', () => {
    renderHeader();
    const trigger = openDrawer();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const dialog = screen.getByRole('dialog', { name: 'Mobile navigation' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('locks body scroll while open and restores it on close (design-brief §6)', () => {
    renderHeader();
    expect(document.body.style.overflow).toBe('');

    openDrawer();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
  });

  describe('focus trap (useFocusTrap)', () => {
    it('engages: moves focus onto the first focusable element inside the drawer (the close button) the moment it opens', () => {
      renderHeader();
      openDrawer();

      const dialog = screen.getByRole('dialog', { name: 'Mobile navigation' });
      const closeButton = within(dialog).getByRole('button', { name: 'Close menu' });
      expect(document.activeElement).toBe(closeButton);
    });

    it('cycles: Tab on the last focusable element wraps back to the first (does not escape into background content)', () => {
      renderHeader();
      openDrawer();

      const dialog = screen.getByRole('dialog', { name: 'Mobile navigation' });
      const closeButton = within(dialog).getByRole('button', { name: 'Close menu' });
      const themeToggle = within(dialog).getByRole('button', { name: /Switch to (dark|light) mode/ });

      themeToggle.focus();
      expect(document.activeElement).toBe(themeToggle);

      fireEvent.keyDown(document, { key: 'Tab' });
      expect(document.activeElement).toBe(closeButton);
    });

    it('cycles: Shift+Tab on the first focusable element wraps back to the last', () => {
      renderHeader();
      openDrawer();

      const dialog = screen.getByRole('dialog', { name: 'Mobile navigation' });
      const closeButton = within(dialog).getByRole('button', { name: 'Close menu' });
      const themeToggle = within(dialog).getByRole('button', { name: /Switch to (dark|light) mode/ });

      expect(document.activeElement).toBe(closeButton); // trap already put focus here on open

      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(themeToggle);
    });

    it('releases on Escape: closes the drawer and unmounts the dialog', () => {
      renderHeader();
      openDrawer();
      expect(screen.getByRole('dialog')).toBeTruthy();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByRole('button', { name: 'Open menu' }).getAttribute('aria-expanded')).toBe('false');
    });

    it('releases on the in-drawer close (X) button click', () => {
      renderHeader();
      openDrawer();
      const dialog = screen.getByRole('dialog', { name: 'Mobile navigation' });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close menu' }));
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('releases on backdrop click', () => {
      renderHeader();
      openDrawer();

      // The backdrop is the OTHER `aria-label="Close menu"` button (the
      // full-bleed overlay behind the dialog) — two buttons share that
      // label while the drawer is open (backdrop + the in-drawer X), so
      // query by all matches and click the one that is NOT inside the
      // dialog itself.
      const dialog = screen.getByRole('dialog', { name: 'Mobile navigation' });
      const closeButtons = screen.getAllByRole('button', { name: 'Close menu' });
      const backdrop = closeButtons.find((button) => !dialog.contains(button));
      expect(backdrop).toBeTruthy();

      fireEvent.click(backdrop!);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    /**
     * FALSIFYING TEST for the reported dead `triggerRef` in `Header.tsx`.
     *
     * Investigation finding: `triggerRef` was assigned to the hamburger
     * `<button ref={triggerRef}>` but never read anywhere — truly dead, not
     * a false positive. BUT its evident intent (design-brief §6: "returns
     * focus to the trigger") was NOT actually dead functionality — it
     * appeared to already work via `useFocusTrap`'s own
     * `document.activeElement` capture-on-engage fallback, AS LONG AS the
     * click that opened the drawer had already focused the trigger button
     * first.
     *
     * That assumption is false. Verified directly against this repo's own
     * jsdom: `fireEvent.click(button)` does NOT move focus onto the button
     * (confirmed empirically — `document.activeElement` stays `<body>`
     * after a bare click, exactly matching real Safari desktop's
     * documented behavior of not focusing a clicked `<button>`). So before
     * the fix, opening the drawer via a plain click and then closing it
     * returns focus to whatever was active before (here, `<body>` — focus
     * is silently LOST, not returned to the trigger) instead of the
     * hamburger button. This is the concrete, provable bug `triggerRef`'s
     * absence caused: the fix is to wire it into `useFocusTrap` as the
     * definitive return target (see that hook's updated doc comment) —
     * not to delete it.
     *
     * This test is written to FAIL red against the pre-fix hook (which
     * only had the `document.activeElement` fallback) and PASS green once
     * `triggerRef` is threaded through — confirmed by hand before
     * `Header.tsx`'s `useFocusTrap` call was updated to pass it.
     */
    it('returns focus to the hamburger trigger on close, even though clicking it never focused it in the first place', () => {
      renderHeader();
      const trigger = openDrawer(); // plain click — does NOT focus `trigger` in jsdom (verified above)
      expect(document.activeElement).not.toBe(trigger);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(document.activeElement).toBe(trigger);
    });
  });
});

describe('Header — accessibility (axe)', () => {
  it('has zero axe violations with the drawer closed', async () => {
    renderHeader();
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  /**
   * `landmark-unique` is disabled ONLY for this open-drawer scan, with a
   * concrete, verified reason (not a blanket suppression): opening the
   * drawer mounts a SECOND `<nav aria-label="Primary">` (the drawer's own
   * copy) alongside the header's always-present desktop `<nav
   * aria-label="Primary">` — the two are mutually exclusive in a real
   * browser via the `md:` breakpoint (`hidden md:flex` vs. the drawer only
   * rendering `< md`), but this component-test config deliberately skips
   * the Tailwind Vite plugin (see that config's header comment), so no
   * `@media` rule actually applies here and jsdom shows BOTH navs as
   * simultaneously visible — a false duplicate that cannot occur outside
   * this narrow test environment. Confirmed empirically: the closed-state
   * scan directly above (identical markup, one nav) reports zero
   * violations at all with every rule enabled.
   */
  it('has zero axe violations with the drawer open (landmark-unique excluded: jsdom-only duplicate nav, see comment)', async () => {
    renderHeader();
    openDrawer();
    const results = await axe.run(document.body, {
      rules: { 'landmark-unique': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
