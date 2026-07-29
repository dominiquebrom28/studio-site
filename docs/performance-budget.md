# Performance budget

Status: baseline established 2026-07-29 · Enforced by `e2e/perf-budget.spec.ts` (Playwright, `vite preview` against `dist/`)

## Why this exists

DOM-4 put GIFs and static PNG hero images on project pages that were
previously text-only markdown — the first time this site's performance
profile changed. No measurement of any kind (page weight, LCP, CLS, INP) had
ever been taken for this site before this pass. This document is the
baseline, the budget derived from it, and the reasoning per threshold.

**This is measurement and a guardrail, not optimization work.** The
groundwork already existed before this pass:
- Click-to-play means a GIF never renders its real `src` until a reader
  explicitly activates it (`MediaGallery.tsx`'s `showRealSrc`) — confirmed
  below, no GIF is ever the LCP element on any measured route.
- Every gallery image has `width`/`height` declared and its wrapper reserves
  `aspect-ratio` space.
- `dist/` output is small (see gate numbers in the PR body).

## How this was measured

`npm run build` → `vite preview` (Playwright's managed `webServer`, per
`playwright.config.ts`) → a fresh Chromium `browser.newContext()` per route
(cold cache, no state shared across routes) → `page.goto(route, { waitUntil:
'networkidle' })` → wait out the route's Suspense fallback → 500ms settle →
read accumulators. Desktop viewport pinned to 1280×800 (`VIEWPORTS.desktop`
in `e2e/viewports.ts`) for every measurement — **not** Playwright's `Desktop
Chrome` device preset's default 1280×720, which measures a meaningfully
different (larger) CLS for the identical DOM shift, since CLS's impact
fraction is shifted-area ÷ viewport-area. Falsified for real while wiring
this up (see below).

Dates: all numbers below taken 2026-07-29 on the machine this repo's e2e lane
already runs on locally (see `playwright.config.ts` header for the general
"why `vite preview`, not dev server" rationale, which applies here
unchanged).

## Measured baseline (2026-07-29)

| Route | Page weight (KB, transferred) | LCP (ms, local render path) | CLS |
|---|---:|---:|---:|
| `/` | 2247.7 | ~380–500 | 0.3955 |
| `/blog/red-is-not-self-justifying` | 1047.1 | ~380–420 | 0.3905 |
| `/projects/lovediary` | 2520.7 | ~370–420 | 0.3901 |
| `/projects/soulforge` | 2431.7 | ~370–390 | 0.3901 |
| `/projects/portfolio` | 2457.4 | ~370–390 | 0.3901 |
| `/projects/pizzaparty` | 1584.3 | ~370–390 | 0.3901 |

LCP is reported as an observed range (repeated local runs; loopback jitter,
not real network variance — see caveat below), not a single point value.

**`/` is not a clean text-only control.** It was picked as one on the
assumption that only the project detail pages changed with DOM-4. Measurement
found the home page already loads three featured-project cover PNGs via
`ProjectCard` (soulforge-hero-desktop.png 453KB, portfolio-hero-desktop.png
885KB, ctp-hero-desktop.png 190KB) — `loading="lazy"`, but within the 800px
initial viewport, so the browser fetches them immediately regardless of the
`lazy` hint. That predates DOM-4 and is a genuine, separate finding (see
"Findings beyond scope" below). `/blog/red-is-not-self-justifying` is the
only true text-only control in this baseline.

## Budget and reasoning per threshold

### Page weight (transferred bytes) — the primary, most defensible metric

Set from measured reality with ~20% headroom, per route (not one blanket
number — a single shared ceiling across routes this different in weight would
either be too loose for the light control page or born-failing for the
heaviest one):

| Route | Ceiling | Headroom over measured |
|---|---:|---:|
| `/` | 2700 KB | ~20% |
| `/blog/red-is-not-self-justifying` | 1300 KB | ~24% |
| `/projects/lovediary` | 3000 KB | ~19% |
| `/projects/soulforge` | 2900 KB | ~19% |
| `/projects/portfolio` | 2950 KB | ~20% |
| `/projects/pizzaparty` | 1900 KB | ~20% |

Why bytes, not a "score": byte counts are exact and deterministic (confirmed
by repeated runs — identical to the byte across two separate measurement
passes). Everything else in this document carries a caveat; this one doesn't.

### CLS — Core Web Vitals "good" threshold: **0.1**

This is the honest target. It is **not met by any route measured** — see
"Real violation found" below, which is why `e2e/perf-budget.spec.ts` tracks
each route's real value explicitly (`KNOWN_CLS_VIOLATIONS`) instead of
raising the threshold to 0.4+ to make the suite green. The threshold constant
in the test stays `0.1`; only routes with a tracked, explained violation get
an exception, and that exception must be deleted (not renumbered) the moment
a route's real CLS drops under 0.1.

### LCP — Core Web Vitals "good" threshold: **2.5s**

**Explicit caveat, not an overclaim:** this lane measures `vite preview` over
`localhost` loopback, in CI on a shared runner or locally on a dev machine.
That proves the RENDER path this app controls (JS/CSS/image weight as
actually shipped, no dev-server HMR overhead) doesn't regress against 2.5s —
every measured route is currently 370–500ms, comfortably under. It does
**not** and **cannot** prove a real-world field LCP: no network latency, no
cellular RTT, no real device CPU/thermal throttling, no cold CDN cache are
represented by a loopback hit. A green result here means "this build didn't
regress its own render path." It does not mean "field LCP is under 2.5s" —
that requires field data (Vercel Speed Insights / CrUX), which is out of this
lane's scope entirely.

### INP — deliberately **not** asserted against the real 200ms field threshold

INP (Interaction to Next Paint) is defined as a session-level p98 over real
users' real interactions on real devices under real conditions. It is
structurally impossible to produce a real INP number in a lab/CI run — there
is no session, no p98 over N>1 interactions, and this loopback environment
has none of the device/thermal/background-tab variance INP exists to
capture. Pretending a single local number is INP is exactly the "green but
covering nothing" failure mode this repo has been burned by before
(`e2e/contrast.spec.ts`'s own header references this class of problem).

What `e2e/perf-budget.spec.ts` measures instead is a **synthetic
interaction-latency proxy**, explicitly labeled as such in the test file: one
measured click on `MediaGallery`'s "Play animation" control (the one real,
stateful click interaction on a DOM-4 media-heavy page), timed in-page from
the click event to two frames later, asserted only against a generous 300ms
"catches a gross main-thread stall" ceiling — not the 200ms INP field
threshold, and never reported as INP.

## Findings beyond this task's scope, reported honestly

### Real violation found: app-wide CLS from the route-level Suspense fallback

Every route measured has a real ~0.39–0.40 CLS, dominated by ONE cause, not
image weight:

`src/lib/withSuspense.tsx`'s route fallback (`<p>Loading…</p>`) renders
inside `RootLayout.tsx`'s `flex min-h-screen flex-col` shell, above the
persistent `<Footer />`. `document.documentElement.scrollHeight` jumps from
~800px (the fallback) to ~5096px the instant the real route chunk resolves —
the already-painted `<Footer>` gets shoved from just below a two-line loading
message down to the bottom of the real page. That is a textbook Layout
Instability API shift (an already-rendered element's box moves, with no user
input).

Confirmed NOT image-related and NOT animation-related:
- Identical (to the 4th decimal) with `reducedMotion: 'reduce'` — none of
  this app's transform-only entrance animations (ProjectHero, MediaGallery,
  BackLink) contribute measurable CLS. Their own code comments claim
  `initial` styles apply synchronously pre-paint, with no observable
  "before" frame — this measurement corroborates that claim empirically.
- Present on the text-only blog-post control at essentially the same
  magnitude as the heaviest project page (0.3905 vs 0.3901–0.3955) — page
  content size barely moves the number, because the shift is dominated by
  the fallback→real-content jump, not by what's in the real content.
- `MediaGallery`'s images never contribute to this measurement window at all:
  they're `loading="lazy"` and sit below the fold at 1280×800 without
  scrolling, so the browser never fetches them before the 500ms settle
  window closes. Falsified for real: removing `width`/`height` and the
  `aspectRatio` wrapper style from every gallery item and re-running the CLS
  suite produced **zero change** — proof this lane's CLS measurement cannot
  see a below-the-fold lazy-image regression. Documented as an explicit gap,
  not silently trusted (see "What this does not cover" below).
- Removing `ProjectHero`'s `aspect-[16/9]` reservation on the (eager,
  above-the-fold) cover image DID move the number — `/projects/lovediary`
  jumped from 0.3901 to 0.4709, correctly failing its
  `KNOWN_CLS_VIOLATIONS` assertion (ceiling 0.4101). This is the
  falsification evidence that the CLS assertion mechanism itself works; it
  was reverted immediately after.

A fix (matching skeleton height to real content, moving the fallback outside
the flex shell, or a route-level static height reservation) is an
application/routing change, out of scope for this measurement-only task. It
is tracked in `e2e/perf-budget.spec.ts`'s `KNOWN_CLS_VIOLATIONS` with an
explicit instruction to delete each entry (not renumber it) once its route's
real CLS drops under 0.1.

### Home page is not a clean text-only control

See "Measured baseline" above — `/` loads ~1.5MB of featured-project cover
PNGs that predate DOM-4. Not a new regression, but worth a maintainer's
attention independent of this task: those `ProjectCard` covers have the same
un-downsized-PNG profile as the project-detail hero images, on a page that
was assumed to be lightweight.

### Real budget violation found, NOT fixed this run (by design)

`public/images/projects/portfolio/portfolio-hero-desktop.png` (885KB) and
`public/images/projects/lovediary/lovediary-hero-desktop.png` (844KB) are the
two heaviest single assets on the site — both PNGs of photographic content,
both prime recompression/format candidates (WebP/AVIF would very likely cut
each by 70%+). **Not touched this run**: `pngquant`/`oxipng`/`cwebp` are not
installed on this machine, and a half-measure recompression without the real
tooling was explicitly out of scope. The page-weight ceilings above are set
to accommodate these files as they exist today; they are not "budgeted away"
or hidden, they're the reason `/projects/lovediary` and `/projects/portfolio`
have the highest ceilings of the six routes.

## What this deliberately does NOT cover

- **Real field data.** Nothing here is Vercel Speed Insights, CrUX, or any
  aggregation over real users. Every number in this document is a lab/CI
  number from one machine hitting `localhost`.
- **Real INP.** See "INP" above — a synthetic single-click proxy is measured
  and clearly labeled; it is not INP and is not asserted against the INP
  threshold.
- **Below-the-fold lazy-loaded image CLS.** This lane never scrolls, so a
  regression that only shows up once `MediaGallery` images are scrolled into
  view (e.g. a gallery item's `aspect-ratio` being silently dropped) would
  not be caught. Falsified and documented above, not silently assumed safe.
- **Response headers** (CSP, HSTS, caching, compression). `vite preview`
  doesn't apply `vercel.json`'s headers — same caveat `playwright.config.ts`
  already documents for the rest of this lane. Not this file's territory.
- **Mobile-viewport LCP/CLS.** All measurements here are desktop 1280×800,
  matching this file's routes' hero images (`cover` is a single non-
  responsive image at every viewport — see `ProjectHero.tsx` — so a mobile
  measurement would currently show the *same* image weight, not a smaller
  one; that itself is arguably a separate finding but is not remeasured here
  to keep this pass to its stated scope).
- **Image recompression.** See "Real budget violation found" above.
