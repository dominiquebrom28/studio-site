import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { StrictMode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { routes } from '@/router';
import { getAllProjects } from '@/content';

/**
 * Regression guard for the 2026-07-19 P0 audit: "most of the project page
 * is invisible when `requestAnimationFrame` is throttled/suspended."
 *
 * ROOT CAUSE, restated as a testable fact: Framer Motion applies an `m.*`
 * element's `initial` prop as a synchronous inline `style` the moment it
 * mounts — this does NOT require a single animation frame to observe (see
 * the manual verification that led to this file: rendering an
 * `initial={{ opacity: 0 }}` element in jsdom and reading
 * `getComputedStyle(el).opacity` immediately after `render()`, with zero
 * timers advanced, already returns `"0"`). So `initial: { opacity: 0 }`
 * is not "briefly invisible until the animation runs" — it IS the
 * permanently-frozen state whenever the browser never gets around to
 * running that animation (a backgrounded/hidden tab, low-power mode, or —
 * the concrete operational cost that made this worth a regression test —
 * the studio's own scripted-scroll screenshot/GIF capture pipeline, which
 * throttles rAF and could only get honest captures by force-enabling
 * `prefers-reduced-motion`).
 *
 * WHAT THIS TEST DOES, precisely: stubs `requestAnimationFrame` /
 * `cancelAnimationFrame` to never invoke their callback (a harder freeze
 * than "throttled" — genuinely zero frames, matching the audit's own "rAF
 * frames in 1 second: 0" measurement) for the duration of each mount, then
 * asserts NO element in the rendered project-detail page carries an inline
 * `opacity: 0` computed style. This is deliberately real-DOM (not a source
 * regex) — it exercises the actual Framer Motion runtime the same way the
 * production bug did, over every committed project (both templates), not
 * a hand-picked fixture.
 *
 * `whileInView` entrances are covered too, for free: `src/smoke/setup.ts`
 * already stubs `IntersectionObserver` as a no-op that never fires a
 * callback (see that file's doc comment) — so every `whileInView` element
 * in this suite is ALSO permanently stuck at its `initial` value, exactly
 * mirroring "the entrance trigger never fires."
 *
 * SEPARATE, SUBTLER CASE — `BuildTimeline`'s rule: this is the one place on
 * the page a scroll-linked motion value is intentionally kept (the
 * "advances and reverses with scroll" draw-in Dom asked for by name,
 * `TimelineRule`'s ACCENT layer). The BASE layer underneath it must never
 * be re-bound to that same scroll value — a rule whose `scale{X,Y}` reads
 * from `scrollYProgress` sits at `scale: 0` (zero width/height) at the top
 * of the page, or forever if rAF is dead: the same failure as `opacity: 0`,
 * just expressed as a transform. The check below asserts the base layer
 * specifically (`[data-timeline-rule="base"]`) never carries a `scaleX`/
 * `scaleY` of 0 — the regression this whole file exists to prevent someone
 * reintroducing "a month from now" by moving the scroll binding onto the
 * wrong layer.
 */

let originalRaf: typeof window.requestAnimationFrame;
let originalCaf: typeof window.cancelAnimationFrame;

beforeAll(() => {
  originalRaf = window.requestAnimationFrame;
  originalCaf = window.cancelAnimationFrame;
  // Never invoke the callback — the point is zero animation frames ever
  // run, not "frames run slowly." Return an arbitrary non-zero handle id.
  window.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = () => {};
});

afterAll(() => {
  window.requestAnimationFrame = originalRaf;
  window.cancelAnimationFrame = originalCaf;
});

afterEach(() => {
  cleanup();
});

const allProjects = getAllProjects();

/** Every element that actually carries an inline `style` — the only place
 * Framer Motion's `initial`/`animate`/`whileInView`/scroll-linked motion
 * values ever land in this DOM (Tailwind utility classes don't apply here;
 * this suite's config skips the Tailwind Vite plugin, see vitest.smoke.config.ts). */
function elementsWithInlineStyle(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[style]'));
}

/** Reads a `scaleX(...)`/`scaleY(...)` value straight out of an element's
 * inline `transform` (Framer Motion writes motion-value-driven `scale`
 * props as this, synchronously, on mount — verified by hand: an
 * `initial={{ scaleX: 0 }}` element's `style.transform` already reads
 * `"scaleX(0)"` immediately after `render()`, no timers advanced). Returns
 * `null` when there's no transform at all — i.e. the element was never
 * bound to a scale motion value in the first place, which reads as
 * "definitely visible," not "unknown." */
function inlineScale(el: HTMLElement): number | null {
  const match = el.style.transform.match(/scale[XY]?\(\s*(-?[\d.]+)/);
  return match ? Number.parseFloat(match[1]) : null;
}

describe('motion resting-state (rAF frozen, zero frames)', () => {
  it.each(allProjects.map((project) => ({ label: project.slug, project })))(
    'project detail "$label" has no opacity:0 element with rAF/IntersectionObserver dead',
    async ({ project }) => {
      const router = createMemoryRouter(routes, { initialEntries: [`/projects/${project.slug}`] });
      render(
        <StrictMode>
          <RouterProvider router={router} />
        </StrictMode>,
      );

      // Wait only for the lazy route chunk to resolve — NOT for any
      // animation to complete (there is none: rAF is stubbed dead above).
      await waitFor(() => {
        expect(screen.getAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0);
      });

      const offenders = elementsWithInlineStyle().filter((el) => getComputedStyle(el).opacity === '0');
      expect(
        offenders,
        `${offenders.length} element(s) rendered at opacity:0 on "/projects/${project.slug}" with rAF ` +
          `dead — their content:\n${offenders.map((el) => `  "${el.textContent?.trim().slice(0, 60)}"`).join('\n')}`,
      ).toHaveLength(0);

      // The specific elements the 2026-07-19 audit named by hand, checked
      // explicitly so a future regression here fails with a precise
      // message rather than just "some element somewhere was opacity 0".
      const h1 = screen.getAllByRole('heading', { level: 1 })[0];
      expect(getComputedStyle(h1).opacity, `h1 "${h1.textContent}" is opacity:0`).not.toBe('0');

      const backLink = screen.getAllByText('← All projects')[0];
      expect(getComputedStyle(backLink).opacity, '"← All projects" back-link is opacity:0').not.toBe('0');

      for (const tech of project.stack) {
        const chip = screen.getByText(tech);
        expect(getComputedStyle(chip).opacity, `stack chip "${tech}" is opacity:0`).not.toBe('0');
      }

      // BuildTimeline's base rule (see the file-level doc comment's
      // "SEPARATE, SUBTLER CASE") — only rendered for projects with a
      // `process` field. Desktop AND mobile each render their own copy
      // (responsive duplicate content, see BuildTimeline.tsx), so this can
      // find more than one; every one of them must be scale-1 (or
      // transform-free entirely), never scale-0.
      if (project.process) {
        const baseRules = document.querySelectorAll<HTMLElement>('[data-timeline-rule="base"]');
        expect(baseRules.length, 'expected at least one BuildTimeline base rule to be rendered').toBeGreaterThan(0);
        for (const rule of Array.from(baseRules)) {
          const scale = inlineScale(rule);
          expect(scale, `BuildTimeline base rule rendered at scale:0 (transform: "${rule.style.transform}")`).not.toBe(0);
        }
      }
    },
  );
});
