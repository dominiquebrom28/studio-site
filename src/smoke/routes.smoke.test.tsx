import { describe, it, expect, afterEach, vi } from 'vitest';
import { StrictMode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { routes } from '@/router';
import { getAllProjects, getAllPosts } from '@/content';

/**
 * Real-DOM smoke test (BACKLOG "Browser-level smoke test in CI", 2026-07-18).
 *
 * WHY THIS EXISTS, AND WHY IT MOUNTS FOR REAL: four separate bugs in a row
 * shipped past typecheck + lint + 108 unit tests + a `renderToStaticMarkup`
 * QA harness, each one only caught by a human opening a browser:
 *
 *   1. 2026-07-15 — a hero design-token collision (visual, NOT covered here).
 *   2. 2026-07-17 — broken mobile reading order (visual/layout, NOT covered
 *      here — see the file-level "what this deliberately does not cover"
 *      note below).
 *   3. 2026-07-18 — every blog TOC anchor was dead. Root cause: a render-time
 *      `Map` mutation inside `Markdown.tsx`'s `h2` renderer that only
 *      misbehaved under React StrictMode's double-invoke of render. A
 *      single-pass `renderToStaticMarkup` harness — what QA had — cannot
 *      reproduce a double-invoke bug, by construction: it only ever renders
 *      once. THIS is why this suite does a real `createRoot`-style mount
 *      (via RTL's `render`) wrapped in `<StrictMode>`, not static rendering.
 *      (The bug itself is already fixed — see `content/toc.ts`'s
 *      `headingIdsByLine` doc comment — this suite is the regression guard
 *      against the whole *class* of double-invoke bug, not a one-off repro.)
 *   4. 2026-07-18 (later same day) — every route except `/` 404'd in
 *      production (SPA with no rewrite rule; `vercel.json` fixed it).
 *      `localhost` stayed green throughout because Vite's dev server does
 *      SPA fallback silently. A local jsdom mount has the exact same blind
 *      spot — jsdom never talks to Vercel's routing layer at all. THIS is
 *      why that failure class is covered by a *different* check
 *      (`scripts/check-deployed-routes.mjs`, a plain HTTP check against a
 *      real deployed URL) instead of being shoehorned in here. See that
 *      script's header comment for the reasoning.
 *
 * WHAT THIS SUITE CHECKS, per route: exactly one `<h1>`, every in-page
 * anchor (`href="#..."`) resolves to an element that actually exists in the
 * rendered DOM, every internal path anchor (`href="/..."`) points at a route
 * this app actually serves (including real content slugs — a link to a
 * project/post slug that doesn't exist is a dead link the same way a dead
 * `#anchor` is), and zero `console.error` calls happen during mount.
 *
 * WHAT THIS DELIBERATELY DOES NOT COVER (consciously, not an oversight):
 * design-token/visual collisions (class 1 above) and responsive/mobile
 * reading order (class 2) are not DOM-structure problems — a node can be in
 * a perfectly valid position in the accessibility tree and still be
 * visually broken (wrong color token, wrong order at a mobile breakpoint).
 * Catching those needs either a human visual pass or real screenshot-diff
 * tooling (Percy/Chromatic/Playwright with pixel baselines) with cross-
 * browser/viewport matrices and baseline maintenance — real ongoing cost
 * that isn't justified yet for a small static site. Flagging the gap
 * explicitly rather than pretending this gate is complete.
 *
 * WHY NOT PLAYWRIGHT: the four classes above are what motivated this gate.
 * Of those, jsdom + StrictMode cheaply catches class 3 (and gives general
 * regression coverage for h1/anchor/console-error hygiene on every route);
 * class 4 needs a real deployed URL, not a "real browser" — a plain HTTP
 * check covers it with no browser at all; classes 1 and 2 need visual
 * diffing, which neither jsdom nor headless Playwright gives you for free.
 * A full browser (~300MB download, slower CI, cross-platform flake surface)
 * would not have caught anything jsdom doesn't already catch here — so it's
 * not added. Revisit if/when this becomes a multi-page app with real visual
 * regression risk that's worth the ongoing maintenance cost.
 */

// Static routes always exist. Dynamic routes are pulled from the REAL
// content set (not fixtures) so this suite exercises whatever is actually
// committed right now — including the Markdown/TOC path (BlogPost) and the
// project-detail path.
const project = getAllProjects()[0];
const post = getAllPosts()[0];

interface RouteCase {
  label: string;
  path: string;
}

const routeCases: RouteCase[] = [
  { label: 'home', path: '/' },
  { label: 'projects index', path: '/projects' },
  { label: 'blog index', path: '/blog' },
  { label: 'cast', path: '/cast' },
  { label: 'not found (unknown path)', path: '/this-route-does-not-exist' },
];

if (project) {
  routeCases.push({ label: 'project detail', path: `/projects/${project.slug}` });
}
if (post) {
  routeCases.push({ label: 'blog post', path: `/blog/${post.slug}` });
}

// The set of internal paths this app can actually resolve to a real page —
// used to catch a dead `href="/..."` link the same way we catch a dead
// `href="#..."` one. Kept independent of `routes.tsx`'s pattern strings
// (`projects/:slug` etc.) so this is a check against real, resolvable
// destinations, not a re-statement of the route table.
const KNOWN_PATHS = new Set<string>([
  '/',
  '/projects',
  '/blog',
  '/cast',
  ...getAllProjects().map((p) => `/projects/${p.slug}`),
  ...getAllPosts().map((p) => `/blog/${p.slug}`),
]);

function isKnownInternalPath(href: string): boolean {
  const [pathOnly] = href.split(/[?#]/);
  const normalized = pathOnly.length > 1 && pathOnly.endsWith('/') ? pathOnly.slice(0, -1) : pathOnly;
  return KNOWN_PATHS.has(normalized);
}

describe('route smoke test (real DOM mount, StrictMode)', () => {
  afterEach(() => {
    cleanup();
  });

  it.each(routeCases)('$label ($path) renders cleanly', async ({ path }) => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const router = createMemoryRouter(routes, { initialEntries: [path] });
    render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );

    // Every route is lazy-loaded (React.lazy + Suspense) — wait past the
    // "Loading…" fallback for the real page content before asserting
    // anything about it.
    const heading = await waitFor(() => {
      const h1s = screen.getAllByRole('heading', { level: 1 });
      expect(h1s.length).toBeGreaterThan(0);
      return h1s;
    });

    // Exactly one <h1> per route (page content + layout chrome combined —
    // Header/Footer/GrainOverlay never contribute their own h1).
    expect(heading.length).toBe(1);

    // Every in-page anchor resolves to something real.
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
    for (const anchor of anchors) {
      const href = anchor.getAttribute('href') ?? '';
      if (href === '') continue;

      if (href.startsWith('#')) {
        const id = href.slice(1);
        if (id === '') continue; // bare "#" (top-of-page link) — nothing to resolve
        expect(document.getElementById(id), `dead in-page anchor: href="${href}" on route "${path}"`).not.toBeNull();
        continue;
      }

      if (href.startsWith('/')) {
        expect(isKnownInternalPath(href), `dead internal link: href="${href}" on route "${path}"`).toBe(true);
      }
      // External links (http(s)://, mailto:) are out of scope here — a live-
      // link checker is a different, network-dependent tool this gate isn't.
    }

    expect(
      consoleErrorSpy,
      `console.error was called while mounting "${path}":\n${consoleErrorSpy.mock.calls.map((c) => c.join(' ')).join('\n')}`,
    ).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
