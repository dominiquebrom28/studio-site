# Blog format v2 — layered, scannable, multi-voice

Status: draft for Dom's sign-off · Author: designer (Vera) · Backlog item: **DOM-2**

Extends `docs/design-brief.md` §5 (Blog post layout) and §6 (component inventory) —
does not replace them. Consistent with `docs/spec.md` §3.2 (post frontmatter) and
`docs/persona-bible.md` v2 (names, byline format, citation rule). Depends on DOM-1
(cast names), already merged.

## 0. What Dom asked for, and how this spec answers it

> "a loooot of text… bullets, visuals, layered information; labels on which backlog
> items got worked on or completed; let multiple team members tell the part of the
> story that's their expertise."

Four literal asks, four literal answers:

| Ask | Answer |
|---|---|
| Bullets, visuals, layered information | New **TL;DR block**, **Callout**, and the existing (formalized) **PullQuote** — see §1–2 |
| Labels on which backlog items got worked on / completed | New **BacklogChip** — see §2, §3 |
| Multiple team members tell their part | New **multi-author** frontmatter + **SectionByline** — see §2, §3 |
| Guardrail: banter free, events real | Unchanged studio rule, reapplied explicitly to every new surface — see §3, §4, §6 |

**Guardrail, restated for this feature specifically:** `tldr` bullets, callout text, and
section attributions are all still subject to the persona-bible's binding rule — "a
name licenses *characteristically*, not *said*." A `Callout` can be written in a
character's voice; it cannot report a fact, a score, or an incident that didn't
happen. A `SectionByline` credits who actually wrote/owns a section's expertise —
it never implies a quote or a direct statement from that character.

---

## 1. Post anatomy (extends design-brief §5)

Nothing below replaces the current blog-post layout — it inserts new elements into it
and upgrades one (byline → optionally multi-author). Everything not listed as **[NEW]**
or **[CHANGED]** is exactly what design-brief §5 and `BlogPost.tsx` already ship today.

### Mobile / tablet (main column only — no rail below `lg`)

1. Back-link "← Logbook" *(unchanged)*
2. H1 *(unchanged — still exactly one per page)*
3. Byline row — **[CHANGED]** renders `Byline` (existing) when the post has one
   author, or the new `BylineGroup` when it has 2+ (§2)
4. Provenance strip — **[CHANGED]** "Written by" field now joins multiple names (§2, §3)
5. **[NEW] Backlog-chip row** — only rendered if the post declares `backlogRefs`;
   omitted entirely otherwise (no empty-state chip, no placeholder)
6. Tag chips *(unchanged)*
7. Optional cover image *(unchanged)*
8. **[NEW] TL;DR block** — only rendered if the post declares `tldr`; sits directly
   above the body, after cover, so it's the last thing a skimmer sees before either
   committing to the full read or bailing
9. `Markdown` body (notebook-ruled, unchanged renderer) — now may contain, authored
   inline by whoever writes the post:
   - **[NEW]** `SectionByline` directly under any `##` heading
   - **[NEW]** `Callout` (a specially-labeled blockquote)
   - **[FORMALIZED, not new]** `PullQuote` = any ordinary (unlabeled) blockquote —
     this is the existing `.prose-studio blockquote` treatment, now named and
     specified as a component in its own right (§2)
10. Signature block *(unchanged mechanism, **[CHANGED]** whom it credits — always
    signs as `authors[0]`, the primary/compiling voice, never a joint signature —
    see §3 rationale)*
11. Prev/next post nav *(unchanged)*
12. Share row *(unchanged)*

### Desktop (≥1024px, 68/32 split)

Main column: H1 → tags → cover → **[NEW] TL;DR** → body (with inline
`SectionByline`/`Callout`/`PullQuote`) → signature → prev/next → share. Byline and
provenance move to the rail, exactly as today.

Sticky rail (`aside`, unchanged position): `BylineGroup`/`Byline` + `ProvenanceStrip`
card → **[NEW] backlog-chip row** (same chips as mobile, rendered once here instead —
see the duplication caution below) → table of contents (unchanged, gated on 3+ H2s).

**Build caution — do not render backlog chips twice.** `Byline`/`ProvenanceStrip`
already follow a `lg:hidden` (mobile block) / `hidden lg:block` (rail) split in
`BlogPost.tsx` specifically to avoid the exact bug QA caught on 2026-07-18 (a
duplicated "Written by" sentence visible at 1280px). Backlog chips must follow the
same split — one instance total, conditionally shown in the mobile block *or* the
rail depending on breakpoint, never both mounted visibly at once.

**TOC parity note:** the TL;DR block is frontmatter-driven, not body markdown, so it
never appears in `scanH2Headings`'s scan and can never pollute the auto-generated
table of contents with a phantom "TL;DR" entry. This is a deliberate consequence of
§3's design, not an incidental fact.

---

## 2. Component specs

### TLDRBlock — new

**Purpose:** the scannable entry point Dom asked for — 2–5 bullets, always at a fixed
position, always structured (not freeform prose), so a reader can get the shape of
the post in five seconds.

**Props:**
```
{ bullets: string[] }   // 2–5 items, plain text only (see §4 — no inline markdown)
```

**Visual treatment (existing tokens only):** a bordered card, `radius-sm`,
`background: var(--paper-raised)`, `border: 1px solid var(--hairline)`,
`box-shadow: var(--shadow-card)`, padding `var(--space-lg)`. Eyebrow label "TL;DR" —
mono, 11px, uppercase, `0.06em` tracking, `color: var(--marker-700)` (this is the one
eyebrow in the system allowed the accent color instead of `--ink-muted`, because it's
functionally a call-out to skim, not routine metadata — matches the emphasis role
`--marker-700` already plays for links/active states). Bullets: serif body, `18px/16px`
per the existing type scale, bullet marker in `--marker-600` (a small riso-style dot,
not the browser default disc) at 55% opacity, echoing the riso-offset accent already
used sparingly elsewhere (design-brief §4) rather than inventing a new mark.

**States:** static content, no interactive states.

**Mobile behaviour:** full width of the prose column at all breakpoints; no
collapsing, no "read more" truncation — a TL;DR that itself needs truncating has
defeated its own purpose.

**Semantics:** `<section aria-label="TL;DR">` wrapping a `<ul>`. Not a heading element
(see §5) — the visible "TL;DR" label is a styled `<p>`, not an `<h2>`/`<h3>`, so it
never enters the document's heading outline or the H2-based TOC scan.

**Reuse called out:** none of the existing primitives fit directly (`Badge`/`Chip` are
pill-shaped inline tags, wrong shape for a multi-line block); this is a genuinely new
container, but its shadow/radius/border language is 100% existing tokens — zero new
visual vocabulary.

---

### Callout — new

**Purpose:** an inline, visually distinct aside inside the body — "layered
information" that isn't part of the main argument's throughline but is worth
flagging: a note, a shipped win, or a risk/watch-out.

**Authoring mechanism:** not a new component a writer inserts explicitly — it's how
`Markdown.tsx`'s `blockquote` renderer classifies a blockquote whose first line is
bold and matches one of exactly three recognized labels (§4). Props below describe
what the renderer produces, not something an author writes directly.

**Props (internal, derived by the renderer):**
```
{ tone: 'note' | 'win' | 'watch-out'; children: ReactNode }
```

**Visual treatment (existing tokens only, one tone token each):**
- `note` — `border-left: 3px solid var(--ink-muted)`, background
  `var(--paper-raised)`, label "Note" in `--ink-muted`.
- `win` — `border-left: 3px solid var(--success)`, background
  `color-mix(in srgb, var(--success) 8%, var(--paper-raised))` (same `color-mix`
  pattern `Badge`'s tint wash already uses — reuse, not a new mechanism), label "Win"
  in `--success`.
- `watch-out` — same pattern with `--warning`, label "Watch-out".

All three: `radius-sm`, padding `var(--space-md)`, label as a mono 11px uppercase
eyebrow above the content (same type role as every other eyebrow in the system —
design-brief §3's H4-eyebrow pattern, reused here rather than invented fresh).

**States:** static, no interactive states.

**Mobile behaviour:** full prose-column width; no layout change at any breakpoint.

**Semantics:** `<aside aria-label="{Note|Win|Watch-out}">`. Binding rule (mirrors the
existing `MarginNote` rule verbatim, design-brief §6/§9): **a Callout is never the sole
carrier of a fact the post depends on.** If a callout states something, the plain body
prose must already contain (or go on to state) the same fact in ordinary reading
order — the callout highlights, it doesn't hide.

**Reuse called out:** the label-eyebrow typography is `Badge`'s type role (mono,
11px, uppercase, 0.06em tracking) applied to a block instead of a pill — no new type
spec needed.

---

### PullQuote — formalized, not new

**Purpose:** rhetorical emphasis — restating something already true in the body, in a
larger, quieter voice. This is **exactly** today's default `.prose-studio blockquote`
(italic, plain `--marker-600` left border — not the riso-offset accent, which is
the provenance-strip icon backing only; see design-brief §4) — this spec's only
job is to name it as a first-class component and draw the line against `Callout`.

**Authoring mechanism:** any ordinary GFM blockquote (`>`) whose first line is *not* a
recognized bold callout label (§4). No frontmatter, no props beyond the markdown itself.

**Visual treatment:** unchanged from current `index.css` (`.prose-studio blockquote`)
— italic, `--marker-600` left bar, 22px/20px pull-quote type role (design-brief §3).

**States:** static.

**Semantics:** plain `<blockquote>`. Never attributed with a fake `<cite>` — pull-quotes
here restate the post's own claim, they don't quote a third party, so no attribution
line is added.

**Distinguishing rule from Callout (binding):** the *first line's shape* is the only
signal. Bold text matching `Note:`, `Win:`, or `Watch-out:` (case-insensitive) →
Callout. Anything else → PullQuote. This means a writer can never "break" a quote into
an accidental callout except by literally starting it with one of three exact words —
low collision risk, and even a false match just recolors a blockquote; it never fails
a build.

---

### SectionByline — new

**Purpose:** the "let multiple team members tell their part" mechanism — a compact
credit line directly under an `##` heading, naming whose expertise that section
speaks from.

**Authoring mechanism:** a single line in the body markdown, directly after an `##`
heading, matching `*Section by: {Name}*` (or a comma-separated list for a jointly
written section). Parsed the same way the codebase already parses heading structure
for the TOC (`headingIdsByLine`/`scanH2Headings` in `content/toc.ts`) — a pure,
line-based scan of the raw source string, not a new remark plugin. `Markdown.tsx`
strips the matched line from normal paragraph rendering and renders `SectionByline`
in its place, immediately under the `<h2>`.

**Props:**
```
{ names: string[] }   // resolved against cast.ts via getCastMemberByName per name
```

**Visual treatment:** one line, mono 13px, `color: var(--ink-muted)` — same role as
`Byline`'s secondary line. `CharacterAvatar` reused at `size="inline"` (24px, no
`interactiveTilt`) immediately before the text. Format: `{firstName}, {name}` per
name (persona-bible's binding byline format, reused verbatim), joined with " & " for
two names or ", " + "& " for three. No "Written by" prefix (that phrase is
`ProvenanceStrip`'s alone, per `Byline.tsx`'s own existing doc-comment rule).

**States:** static. **Recommendation: no link to `/cast`** — keep it plain text to
avoid adding N extra tab stops to a single post (a post with 5 attributed sections
would otherwise add 5 more links before reaching the body's real content, which
actively works against scannability).

**Mobile behaviour:** identical at every breakpoint — it's already compact.

**Semantics — the noise-machine guardrail (binding):** `SectionByline` is **inline
reading-order content, not a landmark.** It renders as a plain paragraph-level element
directly under its `<h2>`, in normal document flow — **no `role="note"`, no `<aside>`,
no new landmark per section.** A post with six `##` sections and six section bylines
must not add six new items to a screen-reader user's landmarks list; it should read
exactly the way a sighted user sees it — a dateline-style credit, encountered once per
section in the normal reading order, nothing more.

**Graceful degradation:** an unresolved name (typo, or a name that isn't one of the
ten cast members) renders as plain text with no avatar and no styling flourish — same
pattern `Byline.tsx` already implements for "Dom." A line that doesn't match the
`Section by:` pattern at all is never stripped — it just renders as an ordinary
italic paragraph. **Nothing about this mechanism can fail a build**, only silently
under-render, which is the correct failure mode for optional decorative metadata.

**Reuse called out:** `CharacterAvatar` (inline size), the `{firstName}, {name}`
format string, and the mono/`ink-muted` type role are all lifted directly from
`Byline.tsx` — this component is genuinely 80% "smaller Byline," not new visual
vocabulary.

---

### BacklogChip / BacklogChipRow — new

**Purpose:** the literal ask — "labels on which backlog items got worked on or
completed," linking the narrative back to the real backlog.

**Props:**
```
{ label: string; status: 'completed' | 'in-progress' | 'planned' }
```
`BacklogChipRow` takes `refs: BacklogChipRef[]` (the frontmatter array, §3) and an
eyebrow label "Worked on this entry" (mono, matches every other section eyebrow).

**Visual treatment — reuses `Badge` directly, does not fork it.** `Badge`'s existing
`tone` prop already covers exactly the three states needed:
- `completed` → `tone="success"` (existing `--success` wash + `--ink` text)
- `in-progress` → `tone="warning"` (existing `--warning` wash + `--ink` text)
- `planned` → `tone="muted"` (existing `--paper-raised`/`--hairline`/`--ink-muted`)

Label text: `"{label} · {status label}"` with a small `✓` glyph prepended only for
`completed`, `aria-hidden="true"` (the word "completed" already carries the fact —
the checkmark is decoration, per the same rule the signature block already applies
to its Caveat mark).

**Behaviour — the one deviation from plain `Badge` usage:** each chip is a real link
to the backlog source (`BACKLOG.md` on GitHub — see §6 for why not a deep-anchored
line link). Because it's interactive, **it does not qualify for the Badge/Chip
"informational, exempt from the 44px floor" carve-out** in design-brief §9 — that
section's own text already anticipates this exact case: *"if a chip is ever made
clickable... it must grow to the 44px floor."* `BacklogChip` must render with
`min-height: 44px` and enough horizontal padding to clear 44px, not the default
Badge's slim pill sizing. Treat it as a `Button`-tier tap target wearing `Badge`
visual skin, not a `Badge` with an `onClick` bolted on.

**States:** default / hover (underline appears, never color-only, matching the
existing inline-link rule) / focus (`2px solid var(--marker-700)`, `2px` offset) /
active (translate + shadow-flatten, same as `Button` active state). No disabled state
— a chip either exists or doesn't render.

**Mobile behaviour:** horizontally-scrollable row if it overflows, reusing the exact
pattern design-brief §5 already specifies for project-detail's "status badge +
horizontally-scrollable stack chips" — same mechanism, not a new one.

**Empty state:** if `backlogRefs` is absent or empty, the entire row (eyebrow
included) is omitted — never a "no backlog items" placeholder.

---

### BylineGroup — new (multi-author byline)

**Purpose:** the top-of-post byline when a post has 2+ authors.

**Props:**
```
{ authors: CharacterEntry[] | string[]; date: string }
```

**Visual treatment:** reuses the exact "passport stamps" motif design-brief §5
already specifies for the Home hero's avatar cluster (overlapping `CharacterAvatar`s
at a slight rotation) — same idea, smaller scale (`size="byline"`, 56px, ~30%
overlap). Names below, joined "X and Y" (2 authors) or "X, Y, and Z" (3+, Oxford
comma, mono register). Cap the visible stamp cluster at 3 with a "+N" text suffix if
more (same "+N" overflow convention `ProjectCard`'s stack chips already use).

**Semantics:** `<ul role="list">` of individually-linked `<li>` avatars (each keeping
its own `aria-label` per the existing `CharacterAvatar` pattern) wrapped in one
`<div>` with a single accessible group label, e.g. `aria-label="Written by Vera and
Milo"` — one group label plus N individually-reachable links, not one giant unlabeled
cluster and not N redundant announcements of "Written by."

**States:** each avatar-link mirrors `CharacterAvatar`'s existing states. No new
interaction model.

**Reuse called out:** 100% `CharacterAvatar` + the Home hero's existing overlap
composition — no new visual mechanism introduced for multi-author.

---

## 3. Frontmatter schema change

**Backward compatibility, stated exactly:** all five existing posts have only
`author: "..."` (a single string) and nothing else new below. Every field this
section adds is **optional**. None of the five files need to change.

```
PostFrontmatterSchema (additions to docs/spec.md §3.2, in prose/Zod-shape):

  author:  z.string().min(1).optional()
           // UNCHANGED in spirit. Still valid indefinitely for single-author posts.

  authors: z.array(z.string().min(1)).min(1).max(4).optional()
           // NEW. Ordered list, credit order = array order. First element is the
           // "primary voice" that signs the post (see signature-block rule below).

  tldr:    z.array(z.string().min(1).max(140)).min(2).max(5).optional()
           // NEW. Plain text only — no inline markdown/links (see §4 for why).

  backlogRefs: z.array(z.object({
                 label:  z.string().min(1),
                 status: z.enum(['completed', 'in-progress', 'planned']),
               })).max(6).optional()
           // NEW.

  // schema-level guard: reject a post that sets BOTH `author` and `authors` —
  // ambiguous provenance is exactly the kind of thing this site's honesty
  // premise can't tolerate. One or the other, never both.
  .refine(fm => !(fm.author && fm.authors),
          '`author` and `authors` are mutually exclusive — pick one')
```

**Normalization (loader-level, not schema-level):** `src/content/loader.ts` derives a
single always-populated field on the `Post` type:

```
post.authors: string[] =
  frontmatter.authors ?? (frontmatter.author ? [frontmatter.author] : ['Dom'])

post.author: string = post.authors[0]
// `author` stays on the type, always equal to authors[0], so every existing
// component that reads `post.author` (Byline, ProvenanceStrip, BlogPost's
// castMember lookup) keeps compiling and behaving correctly for single-author
// posts with ZERO code changes at the component level. Only BlogPost.tsx needs
// new branching: render Byline/ProvenanceStrip when authors.length === 1,
// BylineGroup when authors.length > 1.
```

This is the same "derive a normalized field once, let every consumer read the derived
field" shape the codebase already uses for `slug` (frontmatter override or filename
stem, per `docs/spec.md` §3.3) — same pattern, not a new one.

**Why `backlogRefs.label` is a free string, not an enum/id:** `BACKLOG.md` has no
stable per-item identifier today (no anchors, no IDs beyond the ad hoc "DOM-1..5"
labels Dom added himself this week) — see §6 for why this spec deliberately does not
propose adding one.

**Signature-block rule, restated as a schema consequence:** the post signs off as
`authors[0]` only, never a joint signature. A multi-author post narrated by Nora
(Project Lead) with a section from Milo still ends "Signed, Nora, Project Lead" — the
compiling/primary voice, not a list.

**`tldr` and `backlogRefs` are additive, not required on old posts, forever.** There
is no migration deadline implied by this spec.

---

## 4. Markdown authoring syntax

**Design principle stated up front:** every mechanism below is either (a) a
frontmatter field, already Zod-validated at build time, or (b) a line-based
convention layered on top of *plain, valid GFM markdown that already renders sensibly
without any of our styling*. Nothing here requires a new remark/rehype plugin.

### Why not directive syntax (`:::callout{tone=warning}` via `remark-directive`)?

Considered and rejected. Three concrete reasons:

1. **New dependency, wider trust surface.** `docs/spec.md` §6 already rejected MDX
   specifically because "arbitrary components/expressions in content... widens the
   XSS/trust surface for no current benefit," and kept the plugin list to essentially
   `remark-gfm` alone. A directive plugin is safer than MDX but is still a new parser
   surface for a feature three callout tones and a bullet list don't need.
2. **Breaks on GitHub.** Every post in this repo is also read directly on GitHub (PR
   review, `git blame`, browsing `content/posts/`). `:::callout` renders as inert
   literal text there. A labeled blockquote (`> **Note:** ...`) still renders as a
   normal, legible blockquote on GitHub with zero tooling — degrades gracefully
   everywhere, not just on the deployed site.
3. **No new escaping/nesting rules to learn.** Directive syntax has its own edge cases
   (attribute quoting, nested `:::` fences). A labeled-blockquote convention is just
   markdown a human or an agent would write anyway.

The frontmatter route for `TL;DR` was chosen over an in-body `## TL;DR` section for a
parallel reason: a body heading would (a) enter the H2 scanner and pollute the
auto-generated TOC with a non-content entry, and (b) have no build-time shape
validation (bullet count, length) the way a Zod-checked frontmatter array does.

### The five authoring surfaces

**1. TL;DR** (frontmatter):
```yaml
tldr:
  - "The loop catches lies that look like proof; it misses ones no gate can see."
  - "Two 'verified' contrast claims were wrong — the Judge caught them by recomputing."
  - "Green builds shipped two real UI bugs only a human in a browser caught."
```
Plain text only, 2–5 bullets, ≤140 chars each. No bold/italics/links inside a bullet —
if a fact needs a citation link, it belongs in the body, not the TL;DR.

**2. Section byline** (inline, directly under an `##` heading, in the body):
```markdown
## The scariest bugs wear a citation
*Section by: designer*

The design brief run is the clearest example...
```
Multiple voices in one section:
```markdown
*Section by: designer, frontend-dev*
```
Case-insensitive on "Section by:". Must be the first non-blank line after the heading
— anywhere else in the section, it's just an italic sentence, not parsed.

**3. Callout** (a specially-labeled blockquote — exactly three recognized labels,
case-insensitive, bold, followed by a colon):
```markdown
> **Watch-out:** Both bugs shipped past every automated gate — green means "the code
> matches the tests," not "the page looks right."
```
```markdown
> **Win:** The 57-test suite genuinely caught three other real bugs the same run.
```
```markdown
> **Note:** No studio-site audit has run yet — this is standing-rule-only, stated
> honestly rather than invented.
```

**4. Pull-quote** (any ordinary blockquote — no label):
```markdown
> More output was never a tokens problem. It's a review-capacity problem, and the
> only real fix is shrinking what needs a human, not speeding up the human.
```

**5. Backlog chips** (frontmatter):
```yaml
backlogRefs:
  - label: "Blog engine"
    status: "completed"
  - label: "Auto-merge infrastructure"
    status: "completed"
```

### Cross-cutting rule: nothing here can fail a build

An unmatched `*Section by:*` line renders as an ordinary italic paragraph. An
unrecognized callout label renders as an ordinary pull-quote. A missing `tldr` or
`backlogRefs` field simply omits that block. **Every one of these mechanisms degrades
to already-valid, already-rendered markdown when it isn't recognized** — there is no
new failure mode a writer (human or agent) can introduce by getting the convention
slightly wrong. The only things that actually throw at build time are the existing
Zod-validated frontmatter fields (`tldr` length/count, `backlogRefs.status` enum, the
`author`/`authors` mutual-exclusion refine) — same enforcement boundary the site
already has today.

---

## 5. Accessibility

- **Heading hierarchy stays exactly as it is today — one `<h1>` per page, no skipped
  levels.** Nothing in this spec adds a second `<h1>` or an `<h2>` that isn't real
  body content. `TLDRBlock`'s "TL;DR" label is a styled `<p>`, never a heading element
  — this is load-bearing, not stylistic: it's what keeps the TL;DR out of the H2
  scanner and out of the page's heading outline.
- **TOC parity is preserved by construction, not by a new check.** `tldr` lives in
  frontmatter, never in the body string `scanH2Headings` scans — there is no code path
  by which it could appear in the table of contents. Section bylines are stripped from
  paragraph rendering but never touch heading text itself, so heading ids
  (`headingIdsByLine`) are computed exactly as they are today.
- **`Callout` uses `<aside aria-label="{tone label}">`.** Binding rule (mirrors
  `MarginNote` verbatim): a callout is never the sole carrier of a fact the reader
  needs — the same fact must also exist in ordinary body prose.
- **`PullQuote` uses plain `<blockquote>`**, unchanged from today.
- **`SectionByline` is deliberately NOT a landmark and NOT `role="note"`.** This is
  the direct answer to the "must not become a screen-reader noise machine" requirement:
  it's plain inline reading-order content directly under its heading, encountered once
  per section, in document order — a post with six attributed sections adds zero new
  items to the landmarks list, not six.
- **`BylineGroup` gets one group-level `aria-label`** ("Written by X and Y") plus
  individually reachable, individually labeled avatar links per author.
- **`BacklogChip` is a real link and therefore does NOT get the Badge/Chip
  "informational, exempt from 44px" carve-out** design-brief §9 grants to static chips
  — it must hit the 44×44px floor, full stop, because it's interactive. This is the one
  place in this spec where an existing exemption explicitly does not apply, and it must
  be called out to frontend-dev exactly this bluntly or it will ship as an undersized
  tap target by default (`Badge`'s current padding is a slim pill, not a 44px target).
- **Focus:** every new interactive element uses the system's one focus treatment —
  `2px solid var(--marker-700)`, `2px` outline-offset, never color-only.
- **Contrast:** every tone used by `Callout`/`BacklogChip` (`--success`, `--warning`,
  `--ink-muted`) is an existing, already-verified token from design-brief §2 — no new
  color pairing needs re-verification. The checkmark glyph is `aria-hidden` and purely
  decorative, so it carries no contrast obligation of its own.
- **Motion:** none of the five new components introduce any animation. No
  `prefers-reduced-motion` handling is required because nothing here moves.

---

## 6. What I deliberately did NOT specify, and why

- **No `/backlog` route or rendered backlog page.** `docs/spec.md` §8 already rules out
  a CMS/admin surface for this site; a backlog page would be exactly that. Chips link
  to `BACKLOG.md` on GitHub instead — the same "link to the real source of truth"
  pattern `ProvenanceStrip`'s commit-hash link already establishes.
- **No stable per-item ID/anchor system inside `BACKLOG.md`.** Deep-linking to a
  specific line is fragile the moment the backlog is reordered or reworded (which it
  is, constantly). Chips link to the file, not a line anchor. This is an accepted
  imprecision, not an oversight: exact-line linking would need either a line-number
  lookup that breaks on every reorder, or a new ID convention retrofitted onto months
  of existing entries — both are bigger asks than "labels on backlog items."
- **No build-time check that a `backlogRefs.label` matches a real `BACKLOG.md`
  entry.** Right-sized for now: a mismatched label degrades to "a chip that links to
  the file but whose text doesn't exactly match an item" — annoying, not broken. If
  this becomes a recurring content bug, it's a natural extension of the already-logged
  "HIGH — Content-validation gate in CI" item, not a new gate invented here.
- **No sentence- or paragraph-level voice attribution.** `SectionByline` operates at
  `##` granularity only. At finer granularity it would make the raw markdown source
  close to unreadable and would genuinely become the screen-reader noise machine the
  brief warns against. A section is the practical unit.
- **No automatic inference of who wrote what** (e.g. scraping a `reports/` file to
  auto-populate `authors`/`SectionByline`). Every attribution here is manually authored
  by whoever compiles the post — consistent with the persona bible's existing
  discipline that every citation is deliberately placed, never generated.
- **No fourth callout tone.** Three tones (`note`/`win`/`watch-out`) cover everything
  in the posts seen so far. A ship/no-ship-flavored fourth tone reusing `--error` is a
  small additive change later — not a reason to over-build the palette now.
- **No re-litigating the "graded-paper PASS/round/score" badge** `BlogPost.tsx` already
  deliberately omits from the rail — that's the separate, already-logged "HIGH —
  Provenance content model" item. This spec doesn't touch that decision.
- **No editor/live-preview tooling.** Writers still author raw `.md` and trust the
  documented convention — a live preview is editor/CMS territory, explicitly out of
  scope per `docs/spec.md` §8.
- **No retrofit of the five existing posts.** Backward compatibility means zero
  required edits to ship this schema change. Adding `tldr`/`backlogRefs`/section
  bylines to existing posts is optional future content work, prioritized separately.
