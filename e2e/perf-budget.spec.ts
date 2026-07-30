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
 * FIXED 2026-07-30 (docs/cls-fallback-decision.md): every route below used to
 * carry a real, measured ~0.39 CLS violation from the route-Suspense fallback
 * — `withSuspense.tsx`'s fallback rendered inside `RootLayout.tsx`'s
 * `flex min-h-screen flex-col` shell, ABOVE the persistent `<Footer>`, whose
 * later jump into its real position (`document.documentElement.scrollHeight`
 * ~800px → ~5096px) counted as a full Layout Instability API shift.
 *
 * Fix, two treatments for two distinct causes (see the decision doc for the
 * full derivation): (A) `RouteFallback` now reserves `min-h-[100svh]`, so on
 * a cold load the footer starts strictly below the fold and its later move
 * never re-enters a previously-visible frame — the API stops counting it.
 * (B) the `<Suspense>` boundary is hoisted to a single stable instance
 * wrapping `<Outlet />` in `RootLayout`, instead of a fresh instance per
 * route — an in-app navigation is now an update to an already-mounted
 * boundary (kept on screen by react-router v7's unconditional
 * `startTransition` wrapping of navigation state), not a fresh mount that
 * always shows its fallback.
 *
 * The old `KNOWN_CLS_VIOLATIONS` allowlist (and its epsilon) was deliberately
 * REMOVED, not updated to lower numbers — an allowlist that survives its own
 * fix is the anti-pattern this repo already retired once (see
 * `e2e/contrast.spec.ts`'s own now-removed `KNOWN_VIOLATIONS`, same reasoning
 * verbatim). Every route below now asserts the real, unconditional Core Web
 * Vitals "good" threshold. Measured real CLS after the fix (`vite preview`,
 * desktop 1280×800, cold context, this lane's exact harness):
 * `/` 0.0055, `/blog/red-is-not-self-justifying` 0.0005,
 * `/projects/lovediary` 0.0001, `/projects/soulforge` 0.0001,
 * `/projects/portfolio` 0, `/projects/pizzaparty` 0.0001; the new in-app
 * `/ → /projects` transition test below measured 0.0055 — all comfortably
 * under 0.1, see docs/cls-fallback-decision.md and this task's PR for the
 * falsification evidence (revert either treatment and this suite goes red
 * again at the original ~0.39 for cold loads / a real measured violation for
 * the transition).
 */

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
 * Same layout-shift observer as `instrumentPerf`, but installed via
 * `page.evaluate` directly into the CURRENT document instead of
 * `page.addInitScript`. `addInitScript` only takes effect on the NEXT
 * navigation that creates a new document — useless for measuring a
 * client-side (SPA) route transition, which never creates one. This is used
 * exclusively by the in-app-transition test below, after the starting route
 * has already settled, to scope the measurement to the transition itself.
 *
 * Deliberately `buffered: false` (omitted), NOT `buffered: true` like
 * `instrumentPerf` above. `buffered: true` replays every `layout-shift`
 * entry recorded since navigation start, including ones from the ALREADY-
 * SETTLED cold load this function is installed after — falsified for real:
 * with `buffered: true` here, the transition test measured the exact same
 * ~0.39 CLS as a reverted cold-load fallback even though no fallback ever
 * painted during the transition itself (confirmed separately with a
 * `waitForSelector('text=Loading…')` probe that never resolved) — it was
 * silently re-summing the cold load's own already-counted shift, not
 * measuring the transition. Only new, post-installation entries matter here.
 */
async function instrumentPerfLive(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
          if (!entry.hadRecentInput && typeof entry.value === 'number') {
            (window as unknown as { __cls: number }).__cls += entry.value;
          }
        }
      }).observe({ type: 'layout-shift' });
    } catch {
      // layout-shift unsupported — leaves __cls at 0. See `instrumentPerf`'s
      // identical caveat above; not a risk in the Chromium project this lane
      // runs (playwright.config.ts).
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
      expect(cls, `${route} CLS=${cls.toFixed(4)} exceeds the Core Web Vitals "good" threshold of ${CLS_GOOD_THRESHOLD}`).toBeLessThan(
        CLS_GOOD_THRESHOLD,
      );
    });
  }

  /**
   * In-app SPA transition (docs/cls-fallback-decision.md treatment B). Every
   * test above is a COLD `page.goto`; this exercises a client-side
   * navigation between two already-lazy routes instead. Starts on `/`
   * (already painted), clicks the nav link to `/projects` (lazy, never yet
   * mounted this session), and asserts the TRANSITION itself stays under the
   * same CLS threshold.
   *
   * NAMED COVERAGE GAP (falsified for real, not assumed — see this
   * describe-block's sibling test below and its own doc comment): this
   * assertion, BY ITSELF, does NOT reliably catch a reverted treatment B.
   * Reverting the Suspense hoist back to a per-route `withSuspense(...)` call
   * per route did NOT reproduce a red CLS here, even with an artificial
   * 1500ms delay injected on the `/projects` chunk request — this app's route
   * config has every route as a sibling at the same `<Outlet/>` position with
   * the SAME wrapper component types (`RouteErrorBoundary` → `Suspense`)
   * regardless of which route is active, so React's default (unkeyed)
   * reconciliation does not remount that boundary on a sibling-route swap
   * either way; the decision doc's framing of "per-route vs. hoisted" as the
   * behavioral difference does not hold for THIS app's flat topology. The one
   * case that DID reproduce a fallback flash was an explicit
   * `key={pathname}` on the hoisted boundary (the exact trap the decision
   * doc names) — and even then, CLS still measured ~0 here, because
   * treatment A's `min-h-[100svh]` reservation independently keeps the
   * footer below the fold whether or not the fallback flashes, so a
   * treatment-B-only regression is invisible to a CLS assertion as long as
   * treatment A holds. The real, deterministic regression guard for
   * treatment B specifically is the sibling test below, which asserts the
   * fallback is never shown at all (not merely that CLS stays low) under the
   * same injected latency. Reported here rather than buried, matching this
   * repo's 2026-07-29 precedent for a falsification that fails to fail.
   */
  test('in-app transition (/ → /projects) stays under the CLS threshold', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppSettled(page);

    // Instrumented AFTER the cold load settles and BEFORE the click, so the
    // measured CLS is scoped to the transition itself, not conflated with
    // `/`'s own (already-covered, already-green) cold-load shift. Uses
    // `instrumentPerfLive`, NOT `instrumentPerf` — see that function's doc
    // comment for why `addInitScript` cannot observe an SPA transition.
    await instrumentPerfLive(page);
    await page.getByRole('link', { name: 'Projects' }).first().click();
    await expect(page).toHaveURL(/\/projects$/);
    await waitForAppSettled(page);
    await page.waitForTimeout(500);

    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(
      cls,
      `/ → /projects in-app transition CLS=${cls.toFixed(4)} exceeds the Core Web Vitals "good" threshold of ${CLS_GOOD_THRESHOLD}`,
    ).toBeLessThan(CLS_GOOD_THRESHOLD);
  });

  /**
   * The deterministic regression guard for treatment B specifically (see the
   * coverage-gap note on the sibling test above for why the CLS number alone
   * cannot be trusted to catch this). Asserts the route fallback ("Loading…")
   * is never shown at any point during an in-app transition to a
   * never-yet-mounted lazy route — not "CLS stays low", but "the fallback
   * never paints at all", which is what a single stable Suspense instance
   * that keeps the last-committed route on screen actually guarantees.
   *
   * Artificial latency (1500ms) is injected on the `/projects` chunk request
   * because this lane's local loopback `vite preview` server otherwise
   * resolves that ~2KB chunk within a single frame — too fast for even a
   * genuinely fresh per-route Suspense mount to ever paint its fallback (this
   * was falsified for real: reverting to per-route `withSuspense(...)` with
   * NO injected latency never showed the fallback either, which is why this
   * test does not rely on ambient network speed at all). With this injected
   * latency, an explicit `key={pathname}` on the hoisted boundary (the exact
   * trap docs/cls-fallback-decision.md warns against) reliably reproduces a
   * flash; the shipped code (hoisted, `resetKey` only, no `key`) does not.
   */
  test('in-app transition (/ → /projects) never flashes the route fallback, even under injected chunk latency', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.route('**/assets/ProjectsIndex-*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppSettled(page);

    await page.getByRole('link', { name: 'Projects' }).first().click();
    // Actively polls DURING the (artificially slowed) transition — the
    // fallback is what this test exists to catch, so it must look for it
    // while the chunk is still pending, not just check its absence once
    // everything has already settled.
    let sawFallback = false;
    for (let i = 0; i < 20; i++) {
      if ((await page.getByText('Loading…').count()) > 0) {
        sawFallback = true;
        break;
      }
      await page.waitForTimeout(150);
    }
    await expect(page).toHaveURL(/\/projects$/);
    await waitForAppSettled(page);

    expect(
      sawFallback,
      'the route fallback ("Loading…") flashed during an in-app transition to a never-yet-mounted lazy route — the single hoisted Suspense boundary should keep the last-committed route on screen until the next one resolves, never falling back to its own fallback (docs/cls-fallback-decision.md treatment B)',
    ).toBe(false);
  });
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
