# Project Detail Page v2 — Design Spec

Status: draft for Dom's visual sign-off · Author: designer (Vera)
Extends `docs/design-brief.md` §5 (Project detail layout) and §6 (component
inventory). Proposes schema additions to `docs/spec.md` §3.1.

**Revision note:** this is a mid-flight rewrite. Dom relaxed the no-invention rule
for narrative content and made scroll-driven motion the headline ask ("feel like
framer-animated webpages"). Both changes are folded in.

Source material: `docs/research/project-dossiers.md` (git archaeology across all
six repos) and `docs/research/commit-bursts.md` (verified commit data).

---

## 0. The two rules that replaced the old one

The old brief said "never invent." Dom withdrew that for narrative content, on his
own six projects, because he can steer what's wrong and would rather have a richer
page than a hedged one. The new line is narrower but still real:

1. **Interpretation is free.** What the project was probably solving, what the
   likely reasoning was, why an approach was probably dropped, how a stalled repo
   probably felt from the inside — all fair game to dramatize, as long as it is
   framed as a reading, not a record.
2. **Checkable artifacts are not.** No invented commit hashes, dates, counts,
   quotes, file names, or scores. Those are the six things Dom cannot eyeball-check
   across six repos, and a wrong one on his own portfolio is the failure mode he
   explicitly named.

Everything downstream exists to keep those two rules visibly distinct **on the
page**, not merely true in the content files.

---

## 1. The recorded/inferred convention

Dom asked for something an editor could glance at, not a disclaimer on every
paragraph. Three layered mechanisms, so frequency matches how often each block
type appears:

### A. A three-value provenance tag, used sparingly (2–3 times a page)

Extend the existing `Badge` with two tones rather than inventing a new primitive:

| Tone | Label | Visual (existing tokens only) |
|---|---|---|
| `logged` | "LOGGED" | `Badge` muted — `--ink-muted` text, `--hairline` border |
| `read` | "OUR READ" | `Badge` with `--marker-700` at the 12% tint wash already used for character tints — the accent already reserved for links/active states, so "this is us talking" borrows the same ink as "click this" |
| `not-stated` | "NOT STATED" | `Badge` muted at 60% opacity — the quietest tag, for honest silence |

`ProvenanceTag({ source })` is a thin wrapper over `Badge`, not a new component.
It sits in the eyebrow slot on exactly two blocks per page: **Why** and **The
Brief**. Not on Process (see C), not sprinkled through body prose.

### B. Italic vs. roman as the body-level signal

Add one row to design-brief §3's serif table — same typeface, no new font:

| Role | Size (desktop/mobile) | Line-height | Weight | Style |
|---|---|---|---|---|
| Body — reading (interpretive) | 18px / 16px | 1.65 | 400 | *italic* |

Prose whose provenance is `read` sets italic; `logged` sets roman. Once a reader
learns "slanted = us guessing," it reads at a glance for the rest of the site's
life with zero added chrome per paragraph. **This is the load-bearing mechanism** —
it is what scales to a Process section with six or eight phase captions without
nagging. Keep italic passages short (1–3 sentences); italic is harder to read at
length, which is a natural discipline on how much we editorialize.

### C. One honest line of page furniture, in the Process section only

Directly under the Process H2, one mono caption (13px, `--ink-muted`):

> Commit dates and counts below are logged straight from git history. Anything
> written as "probably" or "likely" is our reading of them, in italics — not
> verified fact. Tell us where it's wrong.

Appears exactly once per page. The only place the convention is spelled out in
full sentences.

**Taste call for Dom:** wording is illustrative, not final copy — but the
*mechanism* (tag + italic + one furniture line) is the recommendation.

---

## 2. The process visualization — centrepiece

### 2.1 Recorded scaffold, dramatized layer

The timeline's **scaffold is always recorded**: commit dates, counts per day, and
real elapsed time between them, taken from `docs/research/commit-bursts.md`.
Nothing about *when* things happened is invented, even under the relaxed rule —
dates and counts are exactly the checkable-artifact category.

Riding on top: short "here's probably what was going on" captions attached to date
ranges, in the italic `read` voice. A caption may say *"this cluster reads like
getting the world walkable in one sitting"* — interpretation of a recorded fact
(nine commits, one day), not a fabricated one.

### 2.2 Component: `BuildTimeline`

**Scaffold (logged, roman, graphic is `aria-hidden`):**

- One rule — horizontal on desktop, vertical on mobile — spanning first commit to
  last (or to "today" with an explicit "→ still open" terminus when
  `status: in-progress`, rather than silently stopping the line).
- **Position along the rule is real elapsed time, linear** — not evenly spaced
  ticks. SoulForge's nine-commit day collapses into a dense knot; the month of
  silence after it is a genuinely empty stretch of ruled line. This is the
  meaningful void Dom asked for, and it is **honest by construction**: the void is
  exactly as wide, proportionally, as the silence was long.
- **Burst handling:** when commits land at sub-pixel spacing, collapse to one
  larger tick with a mono count badge ("×9") rather than forcing artificial
  spacing — an honest density technique, not a fudge.
- **Gap labeling:** any gap ≥14 days gets its duration stamped mid-void, mono,
  `--ink-muted` ("31 days").
- **The July 16 cleanup sweep gets its own tick style.** Five of the six repos each
  got one commit that day, within ~30 seconds, landing weeks of stalled
  working-tree changes. That is a genuine cross-project fact. A small mono
  "cleanup sweep" flag (same visual family as `BacklogChip`) turns what would look
  like five unrelated sparse timelines into one legible thread: *the day five
  stalled repos got rescued at once.* True, and the best detail available.
  **Portfolio's second burst is NOT the sweep** — it is the sticky-nav fix, real
  work. Do not flag it.

**Narrative layer (read, italic, real in-flow text, NOT `aria-hidden`):**

- Phase captions anchor to a date range, 1–3 sentences. Desktop: alternating
  above/below the rule, connected to their anchor by the same thin hand-drawn SVG
  connector design-brief §6 specifies for `MarginNote` — reuse that device.
  Mobile: inline below their anchor on the vertical rule; never overlaps, never a
  separate tab stop.
- Phase count scales down gracefully: MensApp might carry 4–5 phases; Portfolio
  one or two.

**Accessibility — binding, not optional:**

- Below the graphic, a `<details>` disclosure, "Show the commit log" (real
  `<summary>`, ≥44px, keyboard-operable). Expanded, it lists every burst as plain
  text: date · count · sweep flag. This is the screen-reader equivalent **and**
  doubles as Dom's fact-check surface — if a caption contradicts the raw log, the
  log is right there.
- SVG rule, ticks and connectors are `aria-hidden="true"`. Phase captions are
  always real, readable content.
- Only the `<details>` toggle and real links are tab stops. Decorative ticks are not.

**Motion (Framer Motion `useScroll` + `useTransform`):**

- The rule draws in as the section scrolls into view, scroll-**linked** not
  scroll-**triggered** — it advances and reverses with scroll direction, which is
  the specific "framer" feeling Dom named.
  `useScroll({ target: sectionRef, offset: ["start 0.8", "end 0.3"] })`.
- Ticks light up (opacity 0→1, scale 0.6→1, 200ms ease-out) as the drawing line
  passes them — commits appear to arrive in chronological order as you scroll.
- Phase captions fade+rise (16px, 350ms ease-out) via `whileInView` once their
  anchor is drawn past — naturally staggered by scroll position, no artificial
  delay.
- Gap labels get a slower, delayed reveal (500ms, ~150ms after the void begins) —
  a deliberate beat of dwelling in the empty space rather than rushing past it.
- **Reduced motion:** entire scaffold renders fully drawn at first paint, all ticks
  at full opacity, zero progressive reveal. Captions keep `whileInView` but
  opacity-only, effectively instant, via `useReducedMotion()`.

### 2.3 Both extremes

**24 commits (MensApp):** an uneven cluster over the first five days (dense knot,
several burst badges), a long clean stretch, a visible 72-day collapse, then a
single cleanup-sweep flag. Reads as *rough start, real momentum, then quiet, then
rescued* — in four seconds instead of two paragraphs.

**1 commit (Chart Token Playground):** **does not get this component at all.** See
§2.4.

### 2.4 The Single-Sitting template (first-class, not a fallback)

For projects with nothing to put a scaffold on — currently only Chart Token
Playground, `template: "single-sitting"` — the Process section is replaced by
`SingleSittingStamp`:

- A large stamped card (radius-sm, `shadow-card`, index-card corner language): a
  big mono numeral ("1"), the label "COMMIT," rotated -2deg like the
  projects-index empty-state stamp.
- One honest logged line beneath, roman: the real commit date and repo-creation
  date.
- Where file-timestamp evidence exists (CTP: work spanning late June, committed
  16 July), it renders as a small annex line **explicitly labeled as a weaker,
  different source** ("from file timestamps, not commits") — never merged into the
  same visual language as a real commit tick.
- No timeline graphic, no `<details>` (nothing to disclose beyond the two dates).
  Why/Brief/Process flatten into one short paragraph, then straight to media. The
  page is short on purpose.

**Editorial rule:** `template` is a human flag in frontmatter, **not** an
auto-computed commit-count threshold. Portfolio and PizzaParty are also
single-afternoon builds but have 4–5 real commits — enough for a genuinely
interesting tight-cluster-then-silence timeline. Reserve the short template for
where a timeline is *literally impossible*, not merely short.

---

## 3. Goal/Why + Brief blocks

One shared `NarrativeBlock` (eyebrow + `ProvenanceTag` + H2 + prose), used twice:

- **Why this exists** — 1–3 sentences on probable motivation. For MensApp this can
  genuinely be `logged` (real event history, a named friend group) — roman. For
  the other five it is `read` — italic.
- **The Brief** — reuses `TLDRBlock`'s bordered-card grammar (radius-sm,
  `--paper-raised`, `--hairline`, `shadow-card`, riso-dot bullets) with different
  content: 2–4 bullets stating the shape of the problem as if it were a brief
  handed to a builder. Mostly `read` — there was no literal client brief for any of
  these. One line may honestly be `not-stated` where a project has no discernible
  brief beyond "make the fun part work" (PizzaParty is the clean case) — say so
  plainly rather than padding.

**Authoring load:** none of this exists in `content/projects/*.md` today. All six
need `goal` and `brief` written fresh. Raw material sits in each project's existing
body prose and in `docs/research/project-dossiers.md` — a distillation pass, not
research from scratch.

---

## 4. Media — the charming, high-end treatment

### 4.1 What is cheap about `MediaGallery` today

- Uniform 2-column grid; a hero screenshot and a footnote mobile capture get
  identical visual weight.
- No distinction between desktop and mobile captures beyond a tiny mono label.
- Zero motion, zero personality — it reads as a build-artifact dump, not something
  anyone arranged.
- **The empty state is invisible** — the component returns `null`, so four of six
  pages look like the gallery was never built rather than like an edition note.
  That is "not shown in a charming way" in its purest form: absence with no
  acknowledgement.

### 4.2 The upgrade (click-to-play model unchanged)

- **Scatter, not grid, on desktop.** A loose, deliberately imperfect composition —
  alternating rotation (-2deg / +1.5deg / -1deg, never more), mild overlap between
  neighbours (z-index staggered, hard shadow only, never blur) — like snapshots
  clipped into a logbook rather than tiles in an app. Mobile drops the overlap
  (touch targets must not compete) but keeps the rotation.
- **Device framing without skeuomorphism.** Mobile captures get a narrower card
  with a visible `--hairline` inset and the mono "Mobile" label promoted from
  caption to a tag on the card — enough to tell desktop from mobile at a glance.
  No literal phone bezel; that is the stock cliché this system avoids.
- **The persistent Play/Stop control is untouched** — same never-unmounted button,
  poster-first, no autoplay, same focus retention. Charm comes from the frame, not
  from touching the interaction model.
- **One motion allowance:** the play glyph may pulse once (scale 1→1.06→1, 400ms)
  the first time an item enters the viewport. Never loops, never repeats. An
  invitation, not ambient motion.
- **Scroll reveal:** fade+rise 24px, 300ms, 80ms stagger, once.
- **The empty state becomes a real designed thing**, not `null`: a single stamped
  card, mono badge, rotated -2deg, same family as the projects-index empty state —
  *"No screens logged — this one's process-only."* Four of six pages will show
  this, and it must look like an edition choice.

**Taste call for Dom:** the scatter/overlap layout is the higher-risk, higher-reward
call. If it reads too scrapbook-y once built, the fallback keeps the same
ingredients (rotation, device framing, motion) in a simple non-overlapping row.
Recommend building scatter first and pulling back if it fights the ~6/10 analog dial.

---

## 5. Motion system

### 5.1 Recommendation: adopt Framer Motion, scoped to this route only

Dom named the reference directly, and two effects he wants — hero parallax and the
timeline draw — need continuous scroll tracking (`useScroll`/`useTransform`), not
just "has this entered the viewport." That is precisely the gap between
`IntersectionObserver` and what Framer Motion is built for.

**Cost:** roughly 30–40kb gzipped for the full surface; the restricted
prop-driven surface is a fraction. Verify the tree-shaken number at build time
rather than trusting this estimate. Because route components are already
lazy-loaded, **this lands only on `/projects/:slug`'s chunk** — home, blog and cast
are unaffected. Acceptable and well-scoped.

- `useScroll` + `useTransform`: exactly two places — hero parallax, timeline draw.
- `whileInView` fade/rise: everything else. Cheaper, and it covers most of the page.

**CSS `animation-timeline: view()` — considered, not adopted.** Zero JS and zero
bundle, but Chromium-only at time of writing; Safari visitors would see nothing.
Framer Motion is the reliable baseline; CSS scroll-driven animation is a possible
`@supports`-gated enhancement later, not in v1.

**Known hazard, from Dom's own repo:** `a5ed8f0` in the portfolio reads *"Drop
AnimatePresence exit phase (froze under rAF throttling); keep entrance fade."* He
has already been bitten by Framer exit animations under rAF throttling. **Avoid
exit animations on scroll-driven elements**; entrance-only is both safer and
consistent with the `{ once: true }` philosophy below.

### 5.2 Motion table

| Interaction | Motion | Duration / easing | Reduced motion |
|---|---|---|---|
| Hero cover arrival | scale 1.04→1, translateY 4px→0. **Opacity stays 1 — never animated** (LCP) | 700ms `cubic-bezier(0.16,1,0.3,1)` | Instant, final state |
| Hero title/eyebrow | fade+rise 16px, eyebrow 40ms before title | 350ms ease-out | Opacity-only, instant |
| Status/stack chips | scale 1.15→1 + rotate settle (-6deg→-2deg), 40ms stagger | 350ms back-ease `[0.34,1.56,0.64,1]` | Final position, no stagger |
| Hero cover parallax | translateY at 0.15–0.2× scroll, clamped ±40px | continuous, scroll-linked | Disabled — static |
| Why/Brief entrance | fade+rise 20px, eyebrow 60ms before body | 400ms ease-out, once | Opacity-only, instant |
| Timeline rule draw | scroll-linked progressive reveal | tied to scroll position | Fully drawn at first paint |
| Timeline tick | opacity 0→1, scale 0.6→1, gated to draw progress | 200ms ease-out | All visible immediately |
| Phase caption | fade+rise 16px | 350ms ease-out, once | Opacity-only, instant |
| Gap label | fade in, delayed | 500ms, ~150ms delay | Opacity-only, instant |
| Media item | fade+rise 24px, 80ms stagger | 300ms ease-out, once | Opacity-only, no stagger |
| Play-glyph pulse (first view only) | scale 1→1.06→1, once | 400ms ease-out | Disabled entirely |
| Single-sitting stamp | scale 1.1→1 + rotate settle to -2deg | 400ms back-ease | Final position, instant |

All `whileInView` uses `{ once: true }` — nothing re-animates on scroll-back,
consistent with design-brief §8's "ink settling, never flashy."

**Taste call:** deliberately restrained — no page wipes, no per-section background
shifts, no shared-element morph. That last one (a `layoutId` transition from
`ProjectCard` cover to `ProjectHero` cover) is the most on-brand trick available
and is flagged as a strong **v1.1** candidate — it touches routing/measurement
complexity the rest of this spec does not, so prototype it after, not during.

### 5.3 Non-negotiables, per component

- **Hero cover:** never animate `opacity` — only `scale`/`translateY`. This is the
  likely LCP element; an opacity fade delays when the browser counts it painted.
  Transform-only affects neither LCP timing nor CLS.
- **Timeline:** decorative graphic `aria-hidden`; captions and the `<details>` log
  are always real content. Motion changes presentation, never removes content from
  the DOM or the a11y tree.
- **Media:** click-to-play untouched — poster-first, one persistent control, GIF
  `src` never rendered until explicit activation. The pulse is decorative
  micro-feedback and never touches the media source.
- **No animation may gate readability:** every animated element's un-animated state
  is the same content, static. No `opacity: 0` baked into CSS that only JS clears.

---

## 6. Page anatomy

### 6.1 Standard template (SoulForge, LoveDiary, MensApp, PizzaParty, Portfolio)

1. `Header` (unchanged, sticky)
2. Back-link "← All projects" (part of the hero entrance group)
3. **Hero** (`ProjectHero`) — eyebrow row ("SOLO BUILD · NO AGENT TEAM" chip +
   status badge + date, stamped in) → H1 → stack chips → repo/live links → cover,
   full-bleed within the column, parallax + scale-settle
4. **Why this exists** (`NarrativeBlock`) — eyebrow + tag + H2 + 1–3 sentences
5. **The Brief** (`NarrativeBlock` card variant) — 2–4 bullets
6. **The Process** — H2 + furniture line (§1C) + `BuildTimeline` + commit-log
   disclosure
7. **Media** (`MediaGallery` v2) — scatter/device-framed, or the empty-state stamp
8. **Body prose** (kept, `Markdown` + ruled background) — existing write-up,
   substance unchanged
9. "More projects" mini-list + "← All projects"
10. `Footer`

**Mobile:** same order. The sticky rail collapses to the existing inline meta
block, now positioned right after the hero rather than mid-body. Timeline rotates
vertical; media drops overlap, keeps rotation.

**Kept:** `Container`, `Chip`, `Markdown`/`Prose` body rendering, more-projects
nav, `MediaGallery`'s click-to-play internals.
**Changed:** cover becomes an animated arrival; three sections inserted between
hero and media; media moves to just before body prose (matching Dom's stated order
— brief → thinking process → media) and is restyled; the page gains a scroll-motion
layer; a second template exists.

### 6.2 Single-Sitting template (Chart Token Playground)

1. `Header`, back-link
2. **Hero** — same component, eyebrow reads "ONE SITTING · SOLO BUILD"
3. **The Moment** — one short paragraph (why + what, flattened) +
   `SingleSittingStamp`
4. **Media** — shown larger and more generously; no long prose competing for room
5. **Body prose** (kept, shorter)
6. Next-project nav, `Footer`

---

## 7. Component specs

**`ProvenanceTag`** — wraps `Badge`. `{ source: 'logged' | 'read' | 'not-stated' }`.
Two new `Badge` tones, no new visual system. Static; no interactive states.

**`NarrativeBlock`** — `{ eyebrow, source, heading, children, variant?: 'prose' | 'card' }`.
`prose` renders eyebrow+tag+H2+paragraph; `card` renders the same header over a
`TLDRBlock`-style bordered card with bullets. Body renders italic when
`source === 'read'`, roman otherwise.

**`BuildTimeline`** — `{ commits: CommitBurst[]; phases: ProcessPhase[]; status }`.
Full spec §2.2. Display component; the one interactive child (`<details>`) uses
native disclosure states plus the standard focus ring.

**`SingleSittingStamp`** — `{ commitDate, repoCreatedDate?, sessionsNote? }`.
Static card, rotate -2deg, one entrance animation.

**`ProjectHero`** — `{ project }`. Wraps the cover/H1/status/stack/links markup
currently inline in `ProjectDetail.tsx` so hero motion lives in exactly one place,
shared by both templates. States: cover present / absent (the existing placeholder
box — same never-animate-opacity rule, since it becomes the LCP element on
cover-less pages).

**`MediaGallery` v2** — same props. No longer returns `null` when empty (renders
the stamp). Scatter layout, device framing, entrance/pulse motion added.
`GalleryItem`, play/stop glyphs, `isPlaying`, the persistent button — **all
unchanged.** This is a layout upgrade, not an interaction-model change.

**Reused as-is:** `Container`, `Chip`, `Prose` (ruled, body prose only —
Why/Brief/Process are not ruled; they read as distinct bands, not more notebook
page), `TLDRBlock`'s visual grammar, `MarginNote`'s connector device.

**Explicitly NOT reused: `CharacterAvatar`, `ProvenanceStrip`, `Byline`.** These
six projects are Dom's solo work, not agent-team output; pulling in the cast system
built for the blog would misattribute authorship. The "SOLO BUILD · NO AGENT TEAM"
hero chip exists to keep that boundary visible. **This is a load-bearing honesty
call, not taste — Dom should confirm it explicitly.**

---

## 8. Accessibility

- **One `<h1>`** (project title, in `ProjectHero`); order H1→H2. Eyebrows are mono
  labels, not headings — only true section headings get H2.
- **The process visualization has a full text alternative**: the `<details>`
  commit-log disclosure. Never a graphic-only fact. Phase captions are always real
  in-flow prose regardless of motion state.
- **Target size:** `<details>` summary ≥44px; Play/Stop unchanged at 44×44; links
  keep `min-h-11`.
- **Focus:** unchanged — `2px solid var(--marker-700)`, 2px offset, never
  shadow-only.
- **Motion:** every row in §5.2 has an explicit reduced-motion fallback, executed
  via `useReducedMotion()` rather than Tailwind's `motion-reduce:` variant, because
  this route's animations are JS-driven.
- **Contrast:** italic `read` text uses the same `--ink` on `--paper` pairing as
  roman — italicizing does not touch color, so existing ratios hold. "OUR READ"
  reuses an already-verified `--marker-700` pairing.
- **Semantics:** `NarrativeBlock`, `BuildTimeline`, `SingleSittingStamp` are plain
  content in document flow — no new landmarks, mirroring `SectionByline`'s
  don't-add-landmarks discipline.

---

## 9. What I deliberately did not specify

- **Exact copy** for headings, the furniture line, and each project's
  Why/Brief/phase text — an authoring pass, not a layout decision. Placeholder copy
  shows tone, not final wording.
- **Shared-element card→detail morph** — most on-brand trick available, genuinely
  more complex across routes. v1.1 prototype, not this pass.
- **CSS `animation-timeline` progressive enhancement** — future zero-cost layer
  once support broadens.
- **A per-project "confidence score"** for how much of a page is read vs logged —
  not asked for, and it risks becoming exactly the padded, quantified artifact the
  original brief warned against. The tag/italic/furniture system is legible without one.
- **A 4th riso-offset use for the timeline rule** — design-brief §4 caps riso-offset
  at three uses "never spread past." Deliberately not recommending it by default;
  if Dom wants the flourish it is a one-line change. Safer default: plain ink rule
  with marker-600 ticks.

  *Cross-doc note, 2026-07-29 (not rewriting the above — it's what this spec's*
  *author actually proposed, at the time she proposed it):* the "three uses" cap
  cited here was itself a documentation error in design-brief §4, corrected
  2026-07-28 (`docs/design-brief.md`, "dead-field cleanup") — riso-offset has
  only ever shipped in one real place, the provenance-strip icon backing; the
  other two of the claimed "three" were never actually built. §4 now caps it at
  *one* confirmed use. That correction doesn't change this section's verdict —
  a 4th use was declined then and stays declined by default now — it only means
  "4th" is off by however many of the original "three" never existed. See
  `docs/design-brief.md` §4 for the current, accurate count.
- **A CMS for the new frontmatter** — six hand-edited markdown files is right-sized.
- **Cross-project comparison views** — real v2 idea, out of scope.

---

## 10. Proposed schema additions

```ts
export const ProvenanceSchema = z.enum(['logged', 'read', 'not-stated']);

export const NarrativeFieldSchema = z.object({
  text: z.string().min(1),
  source: ProvenanceSchema,
});

export const ProcessPhaseSchema = z.object({
  from: isoDate,
  to: isoDate.optional(),              // omit for a single-point event
  title: z.string().min(1),
  narrative: z.string().min(1),        // the italic "read" caption
  tone: z.enum(['build', 'silence', 'pivot', 'cleanup', 'reactivation']),
});

export const CommitBurstSchema = z.object({
  date: isoDate,                       // real, from git log — day granularity
  count: z.number().int().positive(),
  isCleanupSweep: z.boolean().default(false),
  commitUrl: urlOrEmpty,
});

export const ProjectProcessSchema = z.object({
  commits: z.array(CommitBurstSchema).min(1),
  phases: z.array(ProcessPhaseSchema).default([]),
  sessionsNote: z.string().optional(), // file-timestamp evidence, e.g. CTP
});

// Additions to ProjectFrontmatterSchema:
goal: NarrativeFieldSchema.optional(),
brief: NarrativeFieldSchema.optional(),
process: ProjectProcessSchema.optional(),
template: z.enum(['standard', 'single-sitting']).default('standard'),
```

**`commits` data is already extracted** and verified in
`docs/research/commit-bursts.md`. Transcribe from there — do not re-derive, do not
estimate.

---

## Summary for Dom's sign-off

Two templates: a standard long-form page for five projects, and a first-class
short "single-sitting" template for Chart Token Playground. Both built around a
scroll-driven `BuildTimeline` that draws itself as you scroll — real commit dates
and gaps as the scaffold, italic "our read" narrative riding on top, one honest
furniture line explaining the split. Media gets a scatter/device-framed upgrade
inside the existing click-to-play constraint, with a deliberate (not blank) empty
state for the four projects without screenshots. Framer Motion, scoped to this one
route, is the recommended engine.

**Flagged for your call:** the exact provenance wording; whether to extend
riso-offset to the timeline rule (declined by default — see §9's note, and its
2026-07-29 cross-doc addendum on the since-corrected use count); the "SOLO
BUILD" framing chip (recommended strongly, not merely tasted); and the
shared-element transition as a v1.1 follow-up.
