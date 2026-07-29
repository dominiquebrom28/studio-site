import { test, expect, type Page } from '@playwright/test';
import { VIEWPORTS } from './viewports';

/**
 * Performance budget (BACKLOG MEDIUM "Performance budget for the now-
 * image-heavy project pages" — DOM-4 put GIFs/PNGs on pages that were
 * previously text-only, the first time this site's perf profile changed).
 *
 * MEASUREMENT, NOT OPTIMIZATION — the groundwork already exists (click-to-
 * play means no GIF ever renders its real `src` until a reader explicitly
 * activates it, so a GIF can never be the LCP element — see
 * `MediaGallery.tsx`'s `showRealSrc`; every image has `width`/`height`
 * declared; `dist/` is small). This file's job is to take the numbers that
 * have never once been taken for this site, set a budget from that measured
 * reality, and guard against regression from here. See
 * `docs/performance-budget.md` for the full baseline table, reasoning, and
 * what this lane deliberately does NOT cover.
 *
 * Routes: the four project pages DOM-4 actually changed (media-heavy), plus
 * `/` and a blog post as controls. Reusing the shared `vite preview` webServer
 * from `playwright.config.ts` — see that file's header for why `vite preview`
 * against `dist/`, not the dev server, is the only artifact worth measuring
 * here.
 *
 * IMPORTANT CAVEAT (do not remove): this lane runs `vite preview` over
 * `localhost` loopback, in CI on a shared GitHub Actions runner or locally on
 * a dev machine. That measures the RENDER path this app controls (JS/CSS/
 * image weight, layout stability, main-thread responsiveness of the code
 * actually shipped) — it does NOT measure real-world network latency, cold
 * cache, cellular RTT, or a real device's CPU. A number that's green here
 * proves "this build didn't regress its own render path"; it does not and
 * cannot prove a real-world field LCP/CLS/INP number. Field data (Vercel
 * Speed Insights / CrUX) is the only source of truth for that, and is out of
 * this lane's scope entirely.
 */

const CONTROL_ROUTES = ['/', '/blog/red-is-not-self-justifying'] as const;
const MEDIA_ROUTES = [
  '/projects/lovediary',
  '/projects/soulforge',
  '/projects/portfolio',
  '/projects/pizzaparty',
] as const;
const ALL_ROUTES = [...CONTROL_ROUTES, ...MEDIA_ROUTES] as const;
type Route = (typeof ALL_ROUTES)[number];

/**
 * Per-route page-weight ceiling (transferred bytes, KB) — the most
 * defensible metric available in this lane (byte counts are exact and
 * deterministic; see docs/performance-budget.md for why LCP/CLS below carry
 * more caveats). Set from the ACTUAL measured baseline below (2026-07-29,
 * `vite preview`, cold context, desktop 1280×800, `networkidle`) with ~20%
 * headroom — not from an aspirational number. A budget born failing gets
 * disabled; these were falsified red→green against a real induced
 * regression before being trusted (see docs/performance-budget.md
 * "Falsification evidence").
 *
 * NOTE `/` is NOT a clean text-only control — measurement found it already
 * loads three featured-project cover PNGs via `ProjectCard` (soulforge/
 * portfolio/chart-token-playground hero images, `loading="lazy"` but within
 * the 800px-tall initial viewport so the browser fetches them immediately
 * regardless). That predates DOM-4 and is a real, separate finding — see
 * docs/performance-budget.md. The blog post is the only true text-only
 * control in this set.
 */
const PAGE_WEIGHT_CEILING_KB: Record<Route, number> = {
  '/': 2700, // measured 2247.7 KB
  '/blog/red-is-not-self-justifying': 1300, // measured 1047.1 KB — true text-only control
  '/projects/lovediary': 3000, // measured 2520.7 KB — heaviest route measured (two distinct hero PNGs: desktop 844KB + mobile 442KB, both real gallery items, plus the poster JPG)
  '/projects/soulforge': 2900, // measured 2431.7 KB
  '/projects/portfolio': 2950, // measured 2457.4 KB — despite portfolio-hero-desktop.png alone being 885KB, page total lands below lovediary's because portfolio's gallery has fewer additional stills
  '/projects/pizzaparty': 1900, // measured 1584.3 KB — smallest hero pair (231KB desktop / 193KB mobile) of the four DOM-4 routes
};

/**
 * CLS: Google's Core Web Vitals "good" threshold. Kept as the real, honest
 * target — NOT raised to paper over the finding below.
 */
const CLS_GOOD_THRESHOLD = 0.1;

/**
 * REAL VIOLATION FOUND, tracked explicitly rather than hidden by raising the
 * threshold (the pattern this repo uses — see `e2e/contrast.spec.ts`'s own
 * now-removed `KNOWN_VIOLATIONS`: "an allowlist that survives its own fix is
 * the anti-pattern"). DELETE A ROUTE'S ENTRY HERE THE MOMENT ITS CLS DROPS
 * BELOW `CLS_GOOD_THRESHOLD` — do not renumber, do not raise the ceiling.
 *
 * Root cause (confirmed, not guessed — see docs/performance-budget.md
 * "Falsification evidence" for how this was isolated): `withSuspense.tsx`'s
 * route fallback (`<p>Loading…</p>`) renders inside `RootLayout.tsx`'s
 * `flex min-h-screen flex-col` shell, ABOVE the persistent `<Footer />`.
 * `document.documentElement.scrollHeight` jumps from ~800px (the fallback)
 * to ~5096px the instant the real route chunk resolves — the already-
 * painted `<Footer>` is shoved from just below a two-line loading message
 * down to the bottom of the real page. That is a textbook Layout Instability
 * API shift (an already-rendered element's box moves, no user input), and it
 * is IDENTICAL (down to the 4th decimal, confirmed with
 * `reducedMotion: 'reduce'`) whether or not any of this app's transform-only
 * entrance animations run — so it is NOT the DOM-4 images, and it is NOT the
 * framer-motion entrance choreography. It is present on EVERY route this app
 * has, including the text-only blog-post control, which is exactly why this
 * is reported as a general app-shell finding, not a "the images are heavy"
 * finding — DOM-4's images are, per this measurement, not the CLS problem.
 * A fix (matching skeleton height, or moving the fallback outside the flex
 * shell) is out of scope for this measurement-only task; see
 * docs/performance-budget.md.
 *
 * Epsilon (0.02) absorbs no real jitter (this shift is deterministic to 4
 * decimals across repeated local runs) — it exists purely so this test
 * doesn't nuisance-fail on a rounding difference between machines, while
 * still catching a genuine NEW shift stacked on top of the known one.
 */
const KNOWN_CLS_VIOLATIONS: Partial<Record<Route, number>> = {
  '/': 0.3955,
  '/blog/red-is-not-self-justifying': 0.3905,
  '/projects/lovediary': 0.3901,
  '/projects/soulforge': 0.3901,
  '/projects/portfolio': 0.3901,
  '/projects/pizzaparty': 0.3901,
};
const CLS_KNOWN_VIOLATION_EPSILON = 0.02;

/** Core Web Vitals "good" LCP threshold (2.5s). See file header — this lane
 * can only prove the render path doesn't regress against it locally, not a
 * real field LCP. */
const LCP_GOOD_THRESHOLD_MS = 2500;

/**
 * Waits out the route-level Suspense fallback — same pattern as
 * `e2e/contrast.spec.ts`'s `waitForAppSettled` (see that file's doc comment
 * for the falsified-for-real reason this wait exists: measuring mid-
 * navigation catches the fallback, not real app content). Duplicated locally
 * rather than imported — each `e2e/*.spec.ts` file owns this small helper
 * independently, matching this repo's existing convention (`contrast.spec.ts`
 * has its own copy too; there is no shared `e2e/` util module today).
 */
async function waitForAppSettled(page: Page) {
  await expect(page.getByText('Loading…')).toHaveCount(0);
}

/**
 * Installs the CLS/LCP `PerformanceObserver`s via `addInitScript` — this
 * MUST run before `page.goto`, so the observers are attached before the
 * app's first paint, not after (an observer attached post-navigation would
 * miss the exact shift this file's `KNOWN_CLS_VIOLATIONS` documents, which
 * happens ~350-400ms after navigation start).
 */
async function instrumentPerf(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    (window as unknown as { __lcp: number }).__lcp = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
          if (!entry.hadRecentInput && typeof entry.value === 'number') {
            (window as unknown as { __cls: number }).__cls += entry.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {
      // layout-shift unsupported — leaves __cls at 0, which the assertion
      // below would wrongly read as "perfect." Not a risk in the Chromium
      // project this lane runs (see playwright.config.ts), but documented
      // rather than silently trusted.
    }
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries() as Array<PerformanceEntry & { renderTime?: number; loadTime?: number }>;
        const last = entries[entries.length - 1];
        if (last) (window as unknown as { __lcp: number }).__lcp = last.renderTime || last.loadTime || 0;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // Same caveat as above, for largest-contentful-paint.
    }
  });
}

/**
 * Sums transferred bytes for every response on the page via Playwright's
 * response events — real bytes over the wire (`content-length` header when
 * present; falls back to the actual body length for the rare response that
 * omits it, e.g. some dev-server chunked responses). Registered BEFORE
 * `page.goto` so no response is missed. This is a first-load, cold-context
 * measurement (a fresh `browser.newContext()` per test — no shared cache
 * across tests), matching what a first-time visitor's browser would fetch,
 * not what a warm-cache repeat visit would.
 */
function trackTransferredBytes(page: Page): { total: () => number } {
  let total = 0;
  page.on('response', (response) => {
    void (async () => {
      try {
        const headers = response.headers();
        const declared = headers['content-length'] ? Number.parseInt(headers['content-length'], 10) : null;
        if (declared != null && !Number.isNaN(declared)) {
          total += declared;
          return;
        }
        const body = await response.body();
        total += body.length;
      } catch {
        // A response that errors/aborts before its body is available
        // contributes 0 bytes here — undercounting on failure is the safe
        // direction for a budget ceiling (never inflates a false failure).
      }
    })();
  });
  return { total: () => total };
}

async function measureRoute(page: Page, route: Route) {
  // Explicit desktop viewport (matching `VIEWPORTS.desktop` — 1280×800 —
  // used everywhere else in this lane), NOT the Playwright `Desktop Chrome`
  // device preset's default 1280×720. Falsified for real: CLS's impact
  // fraction is (shifted area / viewport area), so the shorter 720px preset
  // measured a meaningfully DIFFERENT (larger) CLS for the exact same DOM
  // shift than 800px does — an artifact of which viewport height happened to
  // be active, not a real difference in the app. Pinning it here keeps this
  // file's numbers comparable to the rest of `e2e/` and to the baseline
  // recorded in docs/performance-budget.md.
  await page.setViewportSize(VIEWPORTS.desktop);
  await instrumentPerf(page);
  const bytes = trackTransferredBytes(page);
  await page.goto(route, { waitUntil: 'networkidle' });
  await waitForAppSettled(page);
  // Let any late layout-shift/LCP entries land (a real user's browser
  // reports these asynchronously too) before reading the accumulators.
  await page.waitForTimeout(500);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  const lcp = await page.evaluate(() => (window as unknown as { __lcp: number }).__lcp);
  return { totalKB: bytes.total() / 1024, cls, lcp };
}

test.describe('Performance budget — page weight (transferred bytes)', () => {
  for (const route of ALL_ROUTES) {
    test(`${route} stays under its page-weight ceiling`, async ({ page }) => {
      const { totalKB } = await measureRoute(page, route);
      const ceiling = PAGE_WEIGHT_CEILING_KB[route];
      expect(
        totalKB,
        `${route} transferred ${totalKB.toFixed(1)} KB, ceiling is ${ceiling} KB (see docs/performance-budget.md for how this ceiling was set)`,
      ).toBeLessThanOrEqual(ceiling);
    });
  }
});

test.describe('Performance budget — CLS (layout-shift, Core Web Vitals threshold 0.1)', () => {
  for (const route of ALL_ROUTES) {
    test(`${route}`, async ({ page }) => {
      const { cls } = await measureRoute(page, route);
      const known = KNOWN_CLS_VIOLATIONS[route];
      if (known != null) {
        // Tracked, real, pre-existing violation (see KNOWN_CLS_VIOLATIONS
        // doc comment above) — asserting against the known baseline (plus a
        // small epsilon) so this test still catches a NEW regression
        // stacked on top of the known one, without being red for an issue
        // this task was not scoped to fix.
        expect(
          cls,
          `${route} CLS=${cls.toFixed(4)} exceeds its tracked known-violation baseline (${known} + ${CLS_KNOWN_VIOLATION_EPSILON} epsilon) — this is a NEW regression on top of the documented Suspense-fallback shift, not the known one`,
        ).toBeLessThanOrEqual(known + CLS_KNOWN_VIOLATION_EPSILON);
      } else {
        expect(cls, `${route} CLS=${cls.toFixed(4)} exceeds the Core Web Vitals "good" threshold of ${CLS_GOOD_THRESHOLD}`).toBeLessThan(
          CLS_GOOD_THRESHOLD,
        );
      }
    });
  }
});

test.describe('Performance budget — LCP (largest contentful paint, Core Web Vitals threshold 2.5s)', () => {
  for (const route of ALL_ROUTES) {
    test(`${route}`, async ({ page }) => {
      const { lcp } = await measureRoute(page, route);
      // See file header: this proves the RENDER path (what this app
      // controls) doesn't regress past 2.5s locally. It does not and cannot
      // prove a real-world field LCP — no network latency, no real device
      // CPU, no cold cache are represented by a loopback `vite preview` hit.
      expect(lcp, `${route} LCP=${lcp.toFixed(0)}ms exceeds the Core Web Vitals "good" threshold of ${LCP_GOOD_THRESHOLD_MS}ms (render-path only — see file header)`).toBeLessThan(
        LCP_GOOD_THRESHOLD_MS,
      );
    });
  }
});

/**
 * NOT INP. INP (Interaction to Next Paint) is defined as a FIELD metric — a
 * session-level p98 over every real interaction a real user made, on their
 * real device, under their real conditions. It is structurally impossible to
 * produce a real INP number in a lab/CI run: there is no session, no real
 * user, no p98 to take over N>1 interactions, and this loopback environment
 * has none of the device/thermal/background-tab variance INP exists to
 * capture.
 *
 * What follows is a SYNTHETIC INTERACTION-LATENCY PROXY: one measured click
 * on `MediaGallery`'s "Play animation" control (the one real, stateful click
 * interaction on a DOM-4 media-heavy page — toggling `isPlaying`, which
 * swaps the poster for the real GIF `src` and re-renders the button), timed
 * entirely in-page from the click event to two frames later (a proxy for
 * "next paint"). It is ONE sample on ONE interaction on ONE fast local
 * machine — it can catch a gross regression (something that starts blocking
 * the main thread synchronously on this exact click), and it CANNOT stand in
 * for INP, is not asserted against the 200ms INP field threshold, and must
 * never be reported or graphed as if it were INP. Falsified for real (see
 * docs/performance-budget.md): a temporary synchronous main-thread block
 * injected before the click handler moved this number from ~16ms to >250ms,
 * confirming the measurement is sensitive to the thing it claims to catch.
 */
test.describe('Interaction-latency proxy (NOT INP — see doc comment)', () => {
  test('lovediary — click-to-play toggle, single-sample local proxy only', async ({ page }) => {
    await page.goto('/projects/lovediary', { waitUntil: 'networkidle' });
    await waitForAppSettled(page);

    const playButton = page.getByRole('button', { name: /Play animation/ });
    await expect(playButton).toBeVisible();

    await page.evaluate(() => {
      (window as unknown as { __interactionMs: number | null }).__interactionMs = null;
      const btn = document.querySelector('button[aria-label^="Play animation"]');
      btn?.addEventListener(
        'click',
        () => {
          const clickTime = performance.now();
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              (window as unknown as { __interactionMs: number | null }).__interactionMs = performance.now() - clickTime;
            });
          });
        },
        { once: true },
      );
    });

    await playButton.click();
    await page.waitForFunction(() => (window as unknown as { __interactionMs: number | null }).__interactionMs !== null);
    const interactionMs = await page.evaluate(() => (window as unknown as { __interactionMs: number | null }).__interactionMs);

    // Generous, NOT a Vitals compliance claim: this only exists to catch a
    // gross synchronous main-thread stall on this interaction, not to
    // assert field-grade responsiveness.
    expect(
      interactionMs,
      `synthetic click-to-next-paint proxy took ${interactionMs?.toFixed(0)}ms — this is a local single-sample proxy, NOT an INP measurement (see describe-block comment)`,
    ).toBeLessThan(300);
  });
});
