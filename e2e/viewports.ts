/**
 * The three viewports this lane exists to cover (BACKLOG P1 "Real-browser
 * responsive/visual testing" — "Needs Playwright... at 375/768/1280").
 *
 * These line up with this repo's actual Tailwind breakpoints
 * (`src/styles/theme.css`: `--breakpoint-md: 768px`, `--breakpoint-lg:
 * 1024px`), not arbitrary device presets:
 *   - `mobile` (375) — below every breakpoint. Nothing in the app has a
 *     narrower behavior than this to test.
 *   - `tablet` (768) — exactly the `md` breakpoint. `Header`'s hamburger
 *     (`md:hidden`) and desktop nav (`hidden md:flex`) flip HERE, but
 *     `BlogPost`'s mobile-metadata/desktop-rail split (`lg:hidden` /
 *     `hidden lg:block`) does NOT flip until 1024 — so 768 is a genuine
 *     "mixed" state (desktop-style header nav, mobile-style article layout)
 *     that 375 and 1280 alone would never exercise. If these two
 *     breakpoints (`md` vs `lg`) were ever accidentally desynced, 768 is the
 *     width that would show it.
 *   - `desktop` (1280) — comfortably past `lg` (1024), matches the design
 *     brief's desktop reference width.
 */
export const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;
