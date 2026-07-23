import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';

/**
 * Interaction coverage for `ThemeToggle` (BACKLOG "component-level
 * interaction coverage is missing repo-wide" — see
 * `vitest.component.config.ts`'s header). Never clicked by any test before
 * this file — the sun/inkwell icon swap, `aria-label` flip, and
 * `localStorage`/`document.documentElement[data-theme]` persistence
 * (`src/lib/theme.ts`) had zero passing assertions.
 *
 * `getCurrentTheme()` reads `document.documentElement`'s `data-theme`
 * attribute directly (not `window.matchMedia`), so no extra jsdom stub is
 * needed here beyond resetting that attribute + `localStorage` between
 * tests — both are real global state `applyTheme` mutates, and would
 * otherwise leak between test cases in this same jsdom instance.
 */

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});

describe('ThemeToggle', () => {
  it('defaults to the light-mode affordance when no theme has been set yet', () => {
    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: 'Switch to dark mode' });
    expect(button).toBeTruthy();
  });

  it('picks up an already-applied dark theme on mount (not hard-coded to light)', () => {
    // Simulates the real app's pre-paint inline script (index.html) having
    // already set `data-theme="dark"` before React hydrates/mounts.
    document.documentElement.setAttribute('data-theme', 'dark');

    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Switch to dark mode' })).toBeNull();
  });

  it('clicking toggles data-theme on the document root and flips the aria-label', () => {
    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: 'Switch to dark mode' });
    fireEvent.click(button);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(button.getAttribute('aria-label')).toBe('Switch to light mode');

    fireEvent.click(button);

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(button.getAttribute('aria-label')).toBe('Switch to dark mode');
  });

  it('persists the chosen theme to localStorage on every toggle', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Switch to dark mode' });

    fireEvent.click(button);
    expect(localStorage.getItem('theme')).toBe('dark');

    fireEvent.click(button);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('a fresh mount after a toggle reflects the persisted theme, not a reset default', () => {
    const { unmount } = render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    unmount();

    // Re-mount (simulates a route change / remount) without resetting
    // `document.documentElement` or `localStorage` — `applyTheme` already
    // wrote `data-theme="dark"` directly to the root element, independent
    // of this component instance, so a fresh mount must read that back via
    // `getCurrentTheme()` rather than reverting to the light default.
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy();
  });
});
