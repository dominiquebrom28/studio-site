import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page, type Locator } from '@playwright/test';
import { VIEWPORTS } from './viewports';
import { parseFrontmatter } from '../src/content/frontmatter';

/**
 * Real-browser regression guard for the desktop `BuildTimeline` phase-list
 * bug fixed 2026-08-06 (see `src/components/BuildTimeline.tsx`'s "LAYOUT,
 * deliberate deviation from spec §2.2" doc comment for the full story):
 *
 *  1. The OLD desktop layout absolutely-positioned N fixed-width (`w-56` =
 *     224px) phase-caption boxes along a date axis inside a 720px column.
 *     With phases clustered early in a long date domain (MensApp: 5 phases
 *     in the first ~7% of a 78-day domain; Studio Site has the same
 *     clustering shape), N caption boxes anchored to N arbitrarily close
 *     points collided character-for-character — measured 196.3px of overlap
 *     on `/projects/mensapp`, 76.7px on `/projects/studio-site`. The fix
 *     replaces the caption boxes with a numbered rule marker + an `<ol>` of
 *     phase narratives in NORMAL DOCUMENT FLOW, where overlap is
 *     structurally impossible.
 *  2. Fixing #1 removed the `pt-[22rem] pb-[22rem]` padding that was
 *     INCIDENTALLY supplying clearance before the `<details>` commit-log
 *     disclosure below it. Without a deliberate replacement, the last
 *     phase's list item sits at EXACTLY 0px from `<details>` on every
 *     project page with a process section. Fixed with a plain `mb-6` on the
 *     list's container.
 *
 * THIS CLASS OF BUG IS INVISIBLE TO EVERY OTHER SUITE IN THIS REPO: jsdom
 * (`vitest.smoke.config.ts` / `vitest.component.config.ts`) lays out
 * nothing and computes no real widths/heights/positions at all — a fixed-
 * width absolutely-positioned box "overlapping" its neighbor is not a
 * concept jsdom can represent, so `timeline.test.ts`'s pure position-math
 * assertions (0-1 rule positions) can verify the NUMBERS behind the old
 * layout are correct while the actual rendered PIXELS still collide. Real
 * layout, in a real browser, against the real built `dist/`, is the only
 * way to catch it — which is why this lives in `e2e/`, matching every
 * other file in this lane's own stated reason to exist.
 *
 * GATE-HONESTY REQUIREMENT (explicit ask for this task, this repo's own
 * precedent — a deployed-smoke job green for weeks with no URL set; a
 * claims gate inspecting 2 claims across 23 reports; PR #73's own
 * falsification-that-failed-to-fail): a selector that queries for the
 * desktop phase list, finds ZERO nodes, and then asserts "zero overlapping
 * pairs found" is a gate that passes on every possible page, including a
 * completely broken one, and checks nothing. Every route below either
 * asserts a REAL positive count of list items it found and inspected, or —
 * for `/projects/chart-token-playground`, which renders no process section
 * at all — asserts that absence explicitly and confirms the page otherwise
 * rendered real content, so "found nothing because broken" and "found
 * nothing because this page correctly has none" can never be confused.
 *
 * ROUTE DISCOVERY, driven off real content, not a hardcoded list: reads
 * `content/projects/*.md` frontmatter directly (via the same
 * `parseFrontmatter` the app itself uses — `src/content/frontmatter.ts`,
 * a pure function with no Vite-only APIs, safe to import in this Node-side
 * spec) and mirrors `ProjectDetail.tsx`'s exact branch logic: a project
 * renders the process section (`{project.process && (...)}` inside
 * `StandardTemplate`) iff its `template` frontmatter field is not
 * `"single-sitting"` AND it has a `process` field at all — `template ===
 * "single-sitting"` routes to `SingleSittingTemplate`, which never renders
 * `BuildTimeline` regardless of whether `process` is present. A future
 * project added to `content/projects/` — including one with 6 phases
 * clustered even tighter than MensApp's 5 — is covered automatically the
 * next time this suite runs, with no addition to a route list here.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_CONTENT_DIR = path.join(__dirname, '..', 'content', 'projects');

interface DiscoveredProject {
  slug: string;
  hasProcessSection: boolean;
}

function discoverProjects(): DiscoveredProject[] {
  const files = readdirSync(PROJECTS_CONTENT_DIR).filter((file) => file.endsWith('.md'));
  return files.map((file) => {
    const raw = readFileSync(path.join(PROJECTS_CONTENT_DIR, file), 'utf-8');
    const { data } = parseFrontmatter(raw);
    const slug = typeof data.slug === 'string' ? data.slug : file.replace(/\.md$/, '');
    // Mirrors ProjectDetail.tsx's exact template branch — see file header.
    const hasProcessSection = data.template !== 'single-sitting' && Boolean(data.process);
    return { slug, hasProcessSection };
  });
}

const PROJECTS = discoverProjects();
const WITH_PROCESS = PROJECTS.filter((p) => p.hasProcessSection);
const WITHOUT_PROCESS = PROJECTS.filter((p) => !p.hasProcessSection);

/**
 * Discovery sanity gate — NOT per-route. If `content/projects/` ever moved,
 * got renamed, or `discoverProjects()` broke silently (a frontmatter field
 * rename, a parse failure swallowed somewhere), `PROJECTS` would quietly
 * resolve to `[]`, both partitions below would be empty, EVERY per-route
 * `test()` call below the module-scope `for` loops would simply never be
 * generated, and this entire file would report "0 passed, 0 failed" — a
 * silent no-op gate, exactly the failure class this task exists to close.
 * This test makes that loud instead: it hard-codes the two routes the
 * historical bug actually broke (mensapp, studio-site) and the one route
 * that must legitimately render nothing (chart-token-playground) as an
 * independent tripwire that does not depend on the discovery/partition
 * machinery being correct.
 */
test.describe('Route discovery sanity (guards against a silently-empty route list)', () => {
  test('discovered at least one project with a process section, including mensapp and studio-site', () => {
    expect(WITH_PROCESS.length, 'discoverProjects() found zero projects with a process section — check content/projects/*.md and the discovery logic above').toBeGreaterThan(0);
    const slugs = WITH_PROCESS.map((p) => p.slug);
    expect(slugs).toContain('mensapp');
    expect(slugs).toContain('studio-site');
  });

  test('discovered at least one project WITHOUT a process section, including chart-token-playground', () => {
    expect(WITHOUT_PROCESS.length, 'discoverProjects() found zero single-sitting/process-less projects — check content/projects/*.md and the discovery logic above').toBeGreaterThan(0);
    expect(WITHOUT_PROCESS.map((p) => p.slug)).toContain('chart-token-playground');
  });
});

/**
 * Waits out the route-level Suspense fallback — same pattern/reasoning as
 * `e2e/contrast.spec.ts` and `e2e/perf-budget.spec.ts`'s own identical
 * helper (each file in this lane owns its own copy; no shared `e2e/` util
 * module exists today).
 */
async function waitForAppSettled(page: Page) {
  await expect(page.getByText('Loading…')).toHaveCount(0);
}

/**
 * The process section, found structurally (by its `<h2>The process</h2>`
 * heading — `ProjectDetail.tsx`'s `StandardTemplate`), never by a Tailwind
 * class string, matching this lane's existing convention (see
 * `e2e/reading-order.spec.ts`'s `desktopRail` comment for why: this test
 * keeps working even if the implementation's utility classes change).
 */
function processSection(page: Page): Locator {
  return page.locator('section').filter({ has: page.getByRole('heading', { level: 2, name: 'The process', exact: true }) });
}

/**
 * The desktop phase list — the ONE `<ol>` inside the process section. The
 * mobile presentation (`MobileTimeline`) is a `lg:hidden` plain `<div>`
 * flow, never an `<ol>`, so this selector can never accidentally pick up
 * the wrong breakpoint's markup, at any viewport. Hidden at narrower
 * viewports via `hidden lg:block` (verified irrelevant here — every test
 * below runs at 1280px, past the `lg` 1024px breakpoint).
 */
function desktopPhaseList(page: Page): Locator {
  return processSection(page).locator('ol');
}

/**
 * Takes `whileInView` framer-motion animation out of the equation entirely
 * rather than trying to out-wait it: `DesktopPhaseListItem` and
 * `MobilePhaseRow` (`src/components/BuildTimeline.tsx`) both animate via
 * `whileInView` (`initial: { y: 16 } -> { y: 0 }`, 0.35s, gated on
 * `useReducedMotion()` AND an `IntersectionObserver` viewport entry with a
 * `-40px` margin) — measuring their bounding boxes before that settles
 * would catch mid-animation `y` offsets, or (worse) values from BEFORE the
 * reveal has ever triggered at all if the element hasn't scrolled into the
 * observer's margin yet. `useReducedMotion()` reads
 * `window.matchMedia('(prefers-reduced-motion: reduce)')` — this emulates
 * exactly that media feature (`page.emulateMedia`, called before `goto` so
 * it's active from the very first paint, not just from whenever it's
 * called), which collapses the component's own motion branch to
 * `{ initial: { y: 0 }, whileInView: { y: 0 } }` — i.e. every phase list
 * item is unconditionally at its final resting position from the very
 * first render, with no scroll, no `IntersectionObserver` firing, and no
 * animation frame required to observe it. This is the same "un-animated/
 * never-triggered state must equal the settled state" property
 * `src/smoke/motion-resting-state.smoke.test.tsx` already regression-tests
 * for this exact component tree (see that file's header) — reusing the
 * emulated-media approach here, rather than a scroll-then-`waitForTimeout`
 * dance, means these assertions measure the SAME state on every run,
 * deterministically, with no timing dependence on this machine's speed.
 *
 * (NOT a context-level `test.use({ reducedMotion: ... })`: `reducedMotion`
 * is a `BrowserContextOptions` field, not one Playwright exposes as a
 * top-level `PlaywrightTestOptions` key settable via `test.use()` in a spec
 * file — `page.emulateMedia` is the supported per-test equivalent, same
 * mechanism `e2e/contrast.spec.ts` already establishes this file's own
 * convention for: pre-paint emulation via an explicit call before `goto`,
 * not a post-load toggle that can race the thing it's trying to control.)
 */
async function useReducedMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

/** Minimum tolerated distance, in px, between the bottom of one phase-list
 * `<li>` and the top of the next. `0`, not some larger "clearly readable"
 * number: the FIX's entire claim is that normal document flow (`<ol>` +
 * `flex flex-col gap-5`) makes overlap STRUCTURALLY impossible, not merely
 * unlikely — any negative gap (an actual overlap) is a real regression,
 * however small. Real measured gaps in the fixed tree are ~20px (the
 * `gap-5` Tailwind utility, 1.25rem) — see the falsification report for
 * this task, which also confirms this assertion catches a real,
 * artificially-reintroduced overlap (a temporary `-mt-24` on the list item)
 * with actual measured negative numbers, not just a boolean.
 */
const MAX_TOLERATED_LI_OVERLAP_PX = 0;

/** Minimum required gap, in px, between the last phase-list `<li>` and the
 * `<details>` commit-log disclosure directly below it — pins the SECOND,
 * `mb-6`, regression the dev's own fix addresses (this task's brief: "the
 * last `<li>` sat at exactly 0px from `<details>` on all six project
 * pages"). Real measured gap in the fixed tree is exactly 24px (`mb-6` =
 * 1.5rem) on every project checked (mensapp, studio-site — see this task's
 * falsification report). Set at half that, 12px: comfortably distinguishes
 * a real regression (measured 0px with `mb-6` removed, confirmed by
 * falsification) from the fixed state, while not being brittle to a future,
 * deliberate spacing-scale change (`mb-6` -> `mb-4`, 16px) that keeps the
 * real INTENT — "a real, visible gap, not touching" — intact. */
const MIN_LIST_TO_DETAILS_GAP_PX = 12;

for (const { slug } of WITH_PROCESS) {
  test.describe(`/projects/${slug} — desktop (1280px) process timeline`, () => {
    test('phase-list items exist and never overlap vertically', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await useReducedMotion(page);
      await page.goto(`/projects/${slug}`);
      await waitForAppSettled(page);

      const list = desktopPhaseList(page);
      await expect(list, `/projects/${slug} is expected (from content/projects/${slug}.md frontmatter) to render a process section with a desktop phase list, but no <ol> was found inside it`).toHaveCount(1);

      const items = list.locator('li');
      const count = await items.count();
      // The zero-elements guard this task's brief calls out by name: if the
      // list exists but is somehow empty, every subsequent overlap check
      // below is vacuously true (an empty array has no overlapping pairs).
      // A page this task's own real content marks as having a process
      // section MUST have found real items to have actually tested anything.
      expect(count, `/projects/${slug}'s desktop phase <ol> was found but contains zero <li> items — this page's own process.phases content should have produced at least one`).toBeGreaterThan(0);

      const boxes = [];
      for (let i = 0; i < count; i++) {
        const box = await items.nth(i).boundingBox();
        expect(box, `/projects/${slug} phase-list item ${i} has no bounding box (not rendered/visible at 1280px)`).not.toBeNull();
        boxes.push(box!);
      }

      for (let i = 1; i < boxes.length; i++) {
        const prev = boxes[i - 1];
        const curr = boxes[i];
        const overlap = prev.y + prev.height - curr.y;
        expect(
          overlap,
          `/projects/${slug}: phase-list item ${i - 1} (bottom ${(prev.y + prev.height).toFixed(1)}px) overlaps item ${i} (top ${curr.y.toFixed(1)}px) by ${overlap.toFixed(1)}px`,
        ).toBeLessThanOrEqual(MAX_TOLERATED_LI_OVERLAP_PX);
      }
    });

    test('a real, minimum gap separates the last phase-list item from the commit-log <details>', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await useReducedMotion(page);
      await page.goto(`/projects/${slug}`);
      await waitForAppSettled(page);

      const items = desktopPhaseList(page).locator('li');
      const count = await items.count();
      expect(count, `/projects/${slug}: expected at least one phase-list item to measure a gap from — found zero`).toBeGreaterThan(0);

      const lastBox = await items.nth(count - 1).boundingBox();
      expect(lastBox, `/projects/${slug}: last phase-list item has no bounding box`).not.toBeNull();

      const details = processSection(page).locator('details');
      await expect(details, `/projects/${slug}: expected exactly one commit-log <details> in the process section`).toHaveCount(1);
      const detailsBox = await details.boundingBox();
      expect(detailsBox, `/projects/${slug}: commit-log <details> has no bounding box`).not.toBeNull();

      const gap = detailsBox!.y - (lastBox!.y + lastBox!.height);
      expect(
        gap,
        `/projects/${slug}: only ${gap.toFixed(1)}px between the last phase-list item (bottom ${(lastBox!.y + lastBox!.height).toFixed(1)}px) and the commit-log <details> (top ${detailsBox!.y.toFixed(1)}px) — the 2026-08-06 regression this pins measured exactly 0px here`,
      ).toBeGreaterThanOrEqual(MIN_LIST_TO_DETAILS_GAP_PX);
    });
  });
}

for (const { slug } of WITHOUT_PROCESS) {
  test.describe(`/projects/${slug} — desktop (1280px), no process section`, () => {
    test('renders no process section at all, and that absence is a distinct, explicitly-asserted outcome, not a vacuous pass', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`/projects/${slug}`);
      await waitForAppSettled(page);

      // The gate-honesty requirement this test exists for: assert the ZERO
      // count explicitly, distinct from "found and inspected N real items,
      // zero of which overlapped" above. If this expectation were deleted
      // and replaced with only the overlap-loop pattern from the
      // WITH_PROCESS block, an empty phase list here would make assertion
      // #1 vacuously true FOR THE WRONG REASON — indistinguishable, from
      // the report alone, from a real page whose overlap check genuinely
      // ran and passed.
      await expect(
        desktopPhaseList(page),
        `/projects/${slug} is expected (from its own frontmatter — template: single-sitting) to render NO process section/phase list, but one was found`,
      ).toHaveCount(0);
      await expect(
        page.getByRole('heading', { level: 2, name: 'The process', exact: true }),
        `/projects/${slug} unexpectedly has a "The process" H2`,
      ).toHaveCount(0);

      // Prove the page itself rendered real content (not a blank/broken
      // page that trivially has "no process section" because nothing
      // rendered at all) — SingleSittingTemplate's own heading.
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('heading', { level: 2, name: 'The moment', exact: true })).toBeVisible();
    });
  });
}
