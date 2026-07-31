# Decision: route-Suspense-fallback CLS (~0.39 → target <0.1)

Author: designer, 2026-07-30. Backlog item: "HIGH — Site-wide CLS ≈ 0.39 from
the route Suspense fallback" (added 2026-07-29 by the first perf measurement).

Read: `src/lib/withSuspense.tsx`, `src/router.tsx`, `RootLayout.tsx`,
`Footer.tsx`, `RouteErrorBoundary.tsx`, `e2e/perf-budget.spec.ts`,
`docs/performance-budget.md`, `docs/design-brief.md` §5/§9.

Versions confirmed by reading `node_modules`, not assumed: React 19.2.7,
react-router-dom 7.18.1. Verified in
`node_modules/react-router/dist/development/*` that v7's data router
**unconditionally** wraps navigation state updates in `React.startTransition`.
This was an opt-in v6 future flag (`v7_startTransition`); it is now the
default, so no code change is needed to get it.

## Recommendation — one call, two treatments

This is two distinct bugs sharing one symptom. Cold deep-link loads and in-app
navigations need different fixes.

**A. Cold load** (first paint of any URL — most real traffic, per the backlog
item): reserve space in `RouteFallback` so its content box is
`min-height: 100svh`.

**B. In-app transition** (already-painted route → next route): hoist the
`<Suspense>` boundary so there is exactly ONE instance, wrapping `<Outlet />`
once in `RootLayout`, instead of one fresh instance per route (current:
`withSuspense(<Home/>)`, `withSuspense(<ProjectsIndex/>)`, … — a *different*
element per route). No `min-height` is needed for this case; it is eliminated
at the mechanism level.

## Why these are different problems

Today every route gets its own `<Suspense>` (`router.tsx`'s `withSuspense(...)`
per route). Navigating Home→Projects unmounts Home's whole subtree — Suspense
included — and mounts Projects' subtree fresh. A **freshly-mounted** Suspense
boundary always shows its fallback while pending; whether the update is wrapped
in `startTransition` is irrelevant, because there is no previously-committed
state *of that boundary* to keep showing. That is why the backlog is right that
this fires on "the FIRST load of any deep-linked URL" **and** on ordinary SPA
clicks — same fallback, same shift, both paths.

If the boundary is hoisted to a single stable instance around `<Outlet/>`,
in-app navigation becomes an *update* to an already-mounted boundary. Because
react-router v7 already wraps that update in `startTransition`, React's rule
applies: a transition that suspends keeps showing the last committed UI rather
than falling back to the loading state. The footer stays exactly where it is
(route A's final position) until route B's chunk resolves and commits directly
— no "Loading…" flash and no 800px→full-height jump for this path at all. This
is a structural fix, not a tuning knob, so it needs no per-route numbers and
will not regress as new routes are added.

Cold load has no "previous committed UI" to hold onto — nothing is on screen
yet — so (B) cannot help it. It needs (A).

## A: the exact value, and how it was derived

`docs/performance-budget.md` and the spec file document exactly one measured
before/after pair: `scrollHeight` ~800px (fallback) → ~5096px (resolved
content). That is a single sample, not a table of six route heights, so this
spec will **not** invent five more numbers to match it. The number specified
below is derived from how the Layout Instability API actually scores a shift,
not from guessing a content height.

A layout shift only counts an element if it was **visible in the viewport in
the frame before it moved**. `RootLayout`'s `<Footer>` currently sits at the
bottom of the ~800px fallback box — inside the viewport — so its later jump to
~5096px is fully counted. This is consistent with the observed score: CLS is
~0.39 on *every* route regardless of that route's real content height, because
the shift already exceeds one viewport height everywhere. The distance term
saturates, and what is left is dominated by how much of the footer's
before/after box overlaps the viewport, not by exactly how far it travels.

So: reserve `min-height: 100svh` on the fallback's content region. The header
renders above it (unchanged, not lazy), so the footer's position while loading
becomes *header height + 100svh* — strictly more than one viewport tall in
every case. The footer therefore starts **below the fold** and, as real content
streams in taller still, never re-enters a frame in which it was previously
visible. Per the API's own visibility rule, that shift stops counting.

This does not depend on matching any route's exact final height, generalizes to
future routes automatically, and uses `svh` (not `vh`) so it is correct on
mobile browsers whose chrome collapses on scroll.

Concretely: give `RouteFallback`'s wrapping element `min-h-[100svh]` and centre
the "Loading…" text in it (`flex items-center justify-center`) instead of the
current `py-24`, which merely adds fixed padding near the top and does nothing
for the footer's position. This also improves the loading state visually — a
lone line of text pinned near the top of a mostly-empty screen currently reads
like a bug; centred in a full-viewport block it reads as an intentional loading
screen.

## What must not regress

- **Perceivable on slow connections.** The plain-text "Loading…" stays,
  unchanged in wording, just recentred. Do **not** turn this into a bare blank
  screen — a full-viewport block with nothing legible in it is worse on a slow
  connection than what exists today.
- **§9 a11y.** There is currently no `aria-live`/`role="status"` on
  `RouteFallback` at all, so there is nothing to preserve there — but do not
  let this patch quietly add motion or a spinner without a
  `prefers-reduced-motion` fallback (§8 applies to any new affordance, not only
  existing ones).
- **No new dependency.** Both fixes use React/react-router APIs already
  installed.
- **No visible empty gap on fast connections.** On a fast connection the
  100svh block is genuinely imperceptible in practice — it resolves well inside
  the window before a human registers a blank frame. This is the standard
  tradeoff every "reserve space to avoid CLS" pattern makes, and the same one
  this codebase already relies on for `ProjectHero`'s `aspect-[16/9]` image
  reservation.
- **`RouteErrorBoundary` reset, specifically.** Do NOT key the hoisted boundary
  by pathname (`<RouteErrorBoundary key={pathname}>`) to make its error state
  reset on navigation — a keyed remount remounts the `<Suspense>` nested inside
  it too, silently reintroducing the exact bug (B) fixes. Instead give
  `RouteErrorBoundary` a `resetKey` prop and clear `hasError` in
  `componentDidUpdate` when it changes, without unmounting.

## Rejected options

- **(c) Eagerly load route chunks / drop lazy for the small routes.** Defeats
  the reason `router.tsx` code-splits (explicit in its own comments), grows the
  initial bundle monotonically as posts and projects are added with no dial to
  turn later, and does not even fully solve cold load — it moves the wait to
  before first paint, which is worse for LCP, rather than removing it.
- **Bespoke per-page skeletons matching real layout.** The "correct" long-term
  answer, but expensive (one skeleton per page type, ongoing upkeep as pages
  change) and unnecessary to hit the 0.1 target — the viewport-visibility
  argument above gets there without it. Worth revisiting only if the product
  wants a richer loading state later, not to fix this bug.

## Acceptance criteria (falsifiable in `e2e/perf-budget.spec.ts`)

1. For every route in `KNOWN_CLS_VIOLATIONS`, real measured CLS on a cold
   `page.goto` must drop under `CLS_GOOD_THRESHOLD` (0.1). Delete each route's
   entry per that file's own instruction ("delete the moment a route's real CLS
   drops below threshold"); **do not renumber** — PR #57 precedent.
2. Add one new in-app-transition case: from `/`, `page.click` a nav link to a
   lazy route (e.g. `/projects`) with the same `instrumentPerf` harness
   attached before the click, and assert CLS stays under 0.1 for that
   transition. **This is the test that catches a partial fix** — a change that
   only reserves space but leaves per-route Suspense boundaries in place passes
   criterion 1 and fails this one.
3. Prove the tests would catch a regression, per this repo's existing
   falsification convention: temporarily revert `RouteFallback` to `py-24` with
   no min-height and confirm criterion 1 goes red at ~0.39; temporarily
   re-split the Suspense boundary back to per-route and confirm criterion 2
   goes red. Re-apply both fixes and confirm both go green. Report the
   before/after numbers in the PR the way `reports/2026-07-29.md` already does.
