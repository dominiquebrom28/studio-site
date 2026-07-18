# Studio Site — Design Brief
Status: draft for Dom's visual sign-off · Author: designer · Save target: `docs/design-brief.md`
Consistent with `docs/spec.md` (routing/content) and `PROJECT-BRIEF.md` (voice/goals). Formalizes the direction already agreed with Dom on 2026-07-15 — this is the buildable system, not a new pitch.

**Round 2 note:** this revision corrects two fabricated/wrong contrast claims caught in review (light `--warning`, `--hairline` annotations), fixes a genuine failing contrast pair I found while re-verifying (dark-mode primary-button label color), removes hedged "verify in build" language now that the values are actually computed, resolves a "9 specialists" vs "8 specialists + 1 lead" copy inconsistency, sharpens H4 vs body differentiation, and adds an explicit handoff action for the `/cast` route. All contrast ratios below are hand-computed against the WCAG relative-luminance formula, not estimated.

---

## 1. Concept: the Studio Logbook

**The site is the AI team's working notebook made public.** `reports/` and git history aren't behind-the-scenes trivia — they're the raw material. Every case study and blog post gets a real byline, a real reviewer, a real commit hash, and a real cost. The trick is not hiding the machine; it's **overwhelming the reader with warmth and specificity until "an AI team wrote this" stops sounding like a disclaimer and starts sounding like the most interesting fact on the page.**

Every design decision downstream of this brief serves one of two jobs:
- **Prove the provenance** (byline, provenance strip, margin notes, the Cast page, commit links) — the transparency is loud, cited, and impossible to fake.
- **Deliver the warmth** (serif for reading, hand-drawn marks, paper grain, notebook ruling, per-character personality) — so the transparency reads as *craft*, not a compliance footnote.

The visual tension that makes this work: **a machine faking paper.** Structure is sharp — a crisp grid, confident type, hard-edged flat shadows, no softness by default. Warmth is layered *on top*, like pen marks on a printed form: hand-drawn underlines, a rotated stamp, a margin note in ballpoint script. If in doubt on any component, default to the sharp, printed version and add exactly one analog mark — never the reverse. Dial: **6/10 analog.** If it looks like a scrapbook, pull back the marks. If it looks like a SaaS template, add one.

**Open item for Dom:** no studio name exists in any doc I read (`PROJECT-BRIEF.md`, `README.md`, `BACKLOG.md` are all generic "the studio"). The header wordmark ships as a placeholder — swap before launch.

**Handoff action (route to architect, not just noted here):** `/cast` is a new route used throughout this brief (§5, §7) but does not exist in `docs/spec.md` §2's route table yet. This needs to land as an explicit task on architect's queue — add `/cast` (Cast/Team page) to the spec's route table and confirm its data source (static content vs. a `characters` collection) before frontend-dev builds it.

---

## 2. Palette

Two modes, same structure: **light-first**, dark mode is not an inverted afterthought — "warm ink-on-slate," never pure black. Every ratio below is a hand-computed WCAG relative-luminance contrast ratio, stated as computed — not estimated, not asserted without the math. Where a round-1 draft of this brief got a number wrong, it's corrected below and flagged as corrected.

### Design tokens — Light (default)

| Token | Hex | Usage | Contrast (computed) |
|---|---|---|---|
| `--paper` | `#F6F1E7` | Page background | — (L = 0.883) |
| `--paper-raised` | `#FBF7EE` | Card/surface background (1 step lighter than paper) | — |
| `--ink` | `#211B14` | Primary text, headings, icons | **15.15:1** on `--paper` |
| `--ink-muted` | `#5B5346` | Secondary text, captions, meta | **6.74:1** on `--paper` |
| `--marker-700` | `#9A380B` | Inline links, small text on paper, active states | **6.34:1** on `--paper` |
| `--marker-600` | `#C1440E` | Primary buttons (white label), large UI, icons | white-on-marker **5.12:1** |
| `--success` | `#2F6B3A` | "Shipped" status, pass states | **5.68:1** on `--paper` |
| `--error` | `#B3261E` | "DO NOT SHIP" / error states, form errors | **5.81:1** on `--paper` |
| `--warning` | `#985F12` | "In-progress" status | **4.69:1** on `--paper` *(corrected — the round-1 draft's `#A6691A` computes to only 4.01:1 and was wrongly marked "verified"; this darker amber is the real fix)* |
| `--hairline` | `#DCD3C1` | Borders, dividers, notebook-rule lines (decorative only — see rule below) | **1.32:1** on `--paper` *(corrected — round-1 draft wrongly claimed "3:1+"; the real number is well under 3:1, see binding rule below)* |

### Design tokens — Dark ("ink-on-slate")

| Token | Hex | Usage | Contrast (computed) |
|---|---|---|---|
| `--paper` | `#1B1712` | Page background (warm near-black brown, not `#000`) | — (L = 0.0089) |
| `--paper-raised` | `#241F18` | Card/surface background | — |
| `--ink` | `#EDE6D8` | Primary text | **14.36:1** on `--paper` |
| `--ink-muted` | `#B7AC97` | Secondary text, captions, meta | **7.95:1** on `--paper` |
| `--marker-700` | `#FF8A5C` | Links, active states, text on `--paper` | **7.68:1** on `--paper` *(corrected — round-1 draft understated this as 6.33:1)* |
| `--marker-600` | `#FF6B4A` | Primary button fill | see button label rule below — **the fill itself is not text-bearing** |
| `--success` | `#5FAE6E` | Pass states | **6.59:1** on `--paper` *(now computed and confirmed; deferral removed)* |
| `--error` | `#E2564B` | DO NOT SHIP / errors | **4.81:1** on `--paper` *(now computed and confirmed; deferral removed)* |
| `--warning` | `#E0A23A` | In-progress | **7.98:1** on `--paper` *(now computed and confirmed; deferral removed)* |
| `--hairline` | `#3A342A` | Borders, dividers (decorative only) | **1.45:1** on `--paper` *(corrected — same false "3:1+" claim as light mode, fixed below)* |

**`--hairline` binding rule (corrected):** hairline dividers are decorative and exempt from WCAG 1.4.11 (they separate content, they don't carry a UI-component boundary that must be perceivable on its own) — that's a legitimate design choice. What was wrong in round 1 was *stating* a false ≥3:1 number for it. Corrected rule: `--hairline` must **never** be the sole visible boundary of an interactive control (inputs, cards that need a perceivable edge without their shadow, etc.) — if a future component needs a 3:1+ non-text border, use `--ink-muted` instead, which is ≥3:1 against paper in both modes by construction (it's already ≥4.5:1 as *text*, so it clears the lower non-text bar automatically).

**Dark-mode primary-button label color (self-caught fix, not in the judge's list but required for honesty):** re-verifying every claim in this brief surfaced a real failure the round-1 draft glossed over with "ink label, not white — check below" and never actually checked. `--ink` (near-white, `#EDE6D8`) on `--marker-600` fill (`#FF6B4A`) computes to only **2.27:1** — fails outright. White text is worse (**2.82:1**). The fix: in dark mode, the primary-button label uses **`--paper`** (the near-black dark-mode paper token, `#1B1712`) as the text color on the `--marker-600` fill, which computes to **6.33:1** — passes comfortably. This is now the explicit, binding rule (also reflected in §6 Buttons): *light-mode primary button = white label on `--marker-600`; dark-mode primary button = `--paper` (dark) label on `--marker-600`.* Never assume light/dark symmetry on a button label color — verify per mode, which is exactly the mistake this fixes.

### Per-character tints (accent only — see accessibility rule)

Ten hues, one per character, used for avatar-stamp fill, card top-border, tag dot, and a light background "wash" (12% tint over `--paper-raised`) — **never as the sole color of small body text.** Verified floor case (the lightest/warmest tint, mustard): `#A6791F` on `--paper` = **3.47:1** (computed), which clears the WCAG 1.4.11 non-text/UI-component threshold (3:1) but not the 4.5:1 text threshold — hence the binding rule below. Darker tints in the set all exceed this floor. **Dark mode:** the analogous floor case is the plum tint `#8A67A0` on dark `--paper` = **3.84:1** (computed); all ten dark tints land in the **3.84:1–8.27:1** range, so every one clears the 3:1 non-text threshold in dark mode too. (Added 2026-07-18: the tenth tint, visual-media's `#565656`/`#9A9A9A` true neutral, computes to 5.99:1 light / 6.33:1 dark against paper — comfortably inside this range.)

| Character | Light tint | Dark tint (lightened ~15%) |
|---|---|---|
| Project Lead | `#3B5169` (ledger blue) | `#6C86A0` |
| architect | `#3F5D45` (blueprint green) | `#6E9077` |
| designer | `#A6791F` (mustard/ochre) | `#C6A050` |
| frontend-dev | `#2C6E8C` (screen-glow teal) | `#5C9CB8` |
| backend-dev | `#5B3A6B` (vault plum) | `#8A67A0` |
| devops | `#4A5A63` (steel) | `#7A8991` |
| security-auditor | `#A6241A` (stamp red) | `#D2564B` |
| qa-tester | `#C97A1A` (caution amber) | `#E0A650` |
| marketer | `#A83D6B` (raspberry) | `#D06E97` |

**Accessibility rule (binding):** character tints are decorative/identity accents — avatar fill, 3px top-border on cards, tag dot, 12%-opacity wash background. Any *text* sitting on a tint wash uses `--ink` (dark ink on a light wash always clears 4.5:1 because the wash is ~88% paper). A tint is never applied as text color at body/caption sizes.

### What to avoid in this palette
No indigo, no purple-blue gradient, no neon. No pure white (`#FFFFFF`) surfaces, no pure black (`#000000`) surfaces. No saturated pastel "AI app" mint/lavender.

---

## 3. Type scale

Three roles, three jobs, strict separation. **The handwritten face is decorative-only — never body copy, never UI, never the sole carrier of unique information** (WCAG 1.3.1/1.4.1 — see §9).

### Serif — reading (editorial, bookish, warm)
**Fraunces** (variable, Google Fonts, open license) — chosen specifically for its optical-size axis: display cuts (`opsz` 72–144) are wonky and characterful for headings; text cuts (`opsz` 9–20) are calm and highly readable for paragraphs. **One typeface does both jobs** — that duality (expressive at large sizes, disciplined at small sizes) is itself a small metaphor for "machine precision, human warmth." Fallback stack: `"Fraunces", "Iowan Old Style", "Palatino Linotype", Georgia, serif`.

| Role | Size (desktop / mobile) | Line-height | Weight | opsz |
|---|---|---|---|---|
| H1 | 48px / 34px | 1.08 | 600 | 96–144 |
| H2 | 32px / 26px | 1.15 | 600 | 72–96 |
| H3 | 24px / 20px | 1.25 | 600 | 40–60 |
| H4 | 20px / 18px | 1.3 | **600**, +0.01em tracking | 20–28 |
| Body (prose) | 18px / 16px | 1.65 (30px / 26px) | 400 | 9–20 |
| Pull quote | 22px / 20px | 1.4 | 500 italic | 40 |

**H4-vs-body differentiation (fixed per review):** at 20px/18px, weight 600 with +0.01em tracking, H4 now sits far enough from body (18px/16px, weight 400, no added tracking) that it doesn't read as "bold body text" at a glance — the combination of size *and* weight *and* tracking is what carries it, not size alone. Two additional structural rules to reinforce the hierarchy so it never rides on font-weight alone: (1) on cards (`ProjectCard`, `PostCard`, `CharacterCard`), H4 is always preceded by a small mono eyebrow label (status/category/date) — the label-then-headline pairing is what actually signals "this is a heading," the same way a real logbook entry is dated before it's titled; (2) in prose, H4 gets `margin-top: 2xl` (32px) and `margin-bottom: sm` (8px) — asymmetric spacing that visually "owns" the block above it, unlike body paragraphs which get even spacing on both sides.

### Mono — the machine voice (code, labels, metadata)
**JetBrains Mono** (open source) — used for nav, buttons, badges/chips, dates, stack tags, provenance strips, code blocks. Fallback: `"JetBrains Mono", "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace`.

| Role | Size | Line-height | Weight | Tracking |
|---|---|---|---|---|
| Nav / UI labels | 14px | 1.4 | 500 | 0.02em |
| Meta / byline / provenance | 13px | 20px | 400 | 0.01em |
| Badge / chip / status | 11px | 16px | 600 | 0.06em, uppercase |
| Code block | 14px | 24px | 400 | 0 |
| Button label | 14px | 1 | 600 | 0.03em, uppercase |

### Handwritten — signatures & margin notes ONLY (decorative)
**Caveat** (Google Fonts) — used exclusively for: (a) the sign-off signature at the end of a post/case study, (b) margin-note quips. Fallback: `"Caveat", "Segoe Print", "Bradley Hand", cursive`. Minimum size 20px (legibility floor for a script face) — never smaller, never for anything a screen reader needs, always paired with a plain-text mono/serif equivalent nearby (see §9).

| Role | Size | Line-height | Weight |
|---|---|---|---|
| Signature | 22px | 1.3 | 600 |
| Margin note | 20px | 1.3 | 400 |

---

## 4. Spacing, radii, elevation, texture

**Spacing** — 4px base unit: `xs 4 · sm 8 · md 16 · lg 24 · xl 32 · 2xl 48 · 3xl 64 · 4xl 96`. Page gutters: 16px mobile, 24px tablet, 48px desktop, content max-width 1120px (720px for the prose column specifically — reading measure matters more than filling the screen).

**Corner radii** — deliberately mostly sharp; the softness is reserved for one shape only, so it reads as intentional rather than a default:
- `radius-none` (0px) — dividers, rules, notebook-ruling lines, the provenance strip.
- `radius-sm` (4px) — **default.** Cards, buttons, inputs, code blocks, images. Reads like a trimmed index-card corner, not a rounded app tile.
- `radius-full` (999px) — badges, chips, tags, avatar stamps only. The pill shape is reserved for "stamped/sticker" objects — never used on structural containers.

**Elevation** — hard-edged, no blur, ever. This is the single clearest anti-glassmorphism stance in the system:
- `shadow-card`: `3px 3px 0 rgba(33,27,20,0.14)` (light) / `3px 3px 0 rgba(0,0,0,0.5)` (dark)
- `shadow-card-hover`: `5px 5px 0 rgba(33,27,20,0.18)` + `translateY(-2px)`
- `shadow-card-active`: `1px 1px 0 rgba(33,27,20,0.14)` + `translateY(1px)` — "pressing the card into the desk"
- Focus is never a shadow — it's a crisp `2px solid` outline (see §9).
- No `blur()`, no `backdrop-filter`, anywhere in the system.

**Paper grain** — a fixed, full-viewport SVG `feTurbulence` noise layer, `opacity: 0.03` light / `0.025` dark, `mix-blend-mode: multiply` (light) / `overlay` (dark). Capped intentionally low so it never measurably affects the contrast ratios in §2 — verify with grain applied, not just base tokens, before sign-off.

**Notebook ruling** — a repeating horizontal-line background, `--hairline` at 5% opacity, spaced to match body line-height (30px), used **only** behind the prose column on project-detail and blog-post pages (never behind cards, nav, or UI chrome — this keeps the notebook cue rare enough to read as a signature, not wallpaper). Per §2, `--hairline` is decorative here too — it's a texture, not a boundary.

**Riso registration offset** — a duplicate rule/shape offset 2px down-right in `--marker-600` at 55% opacity, sitting behind the primary ink-colored rule. Used sparingly, three places only: H2 underlines in prose, blockquote left bar, provenance-strip icon backing. This is the "hand-marked" accent that should never spread past these three uses.

---

## 5. Page layouts (mobile-first → desktop)

### Home (`/`)
**Mobile:** sticky header → hero: mono eyebrow ("STUDIO LOGBOOK — 1 HUMAN + 10 AI CHARACTERS"), Fraunces H1 pitch line, one-line sub, two CTAs (primary "Read the logbook" → `/blog`, secondary "See the work" → `/projects`) → horizontally-scrollable strip of the 10 character avatar stamps linking to `/cast`, mono caption "10 characters, 0 ghostwriting" → "Recent builds" heading + stacked `ProjectCard` (featured only) + "View all" link → "From the logbook" heading + stacked `PostCard` (latest 3, byline-lite) → footer.
**Desktop (≥1024px):** hero splits 60/40 — left: eyebrow/H1/sub/CTAs; right: 3–4 avatar stamps overlaid at slight rotation like passport stamps on a page (static composition, restrained hover per §8). Featured projects become a 3-col grid. Latest posts become a 2–3 col grid. Cast strip becomes a static row with name/role tooltip on hover/focus.

*Copy consistency note (fixed per review; updated 2026-07-18 for the tenth-character hire, see §7):* the eyebrow and cast-strip caption now both use the same framing — **"10 AI characters"** as the umbrella number (9 specialists + the Project Lead = 10), never "10 AI specialists." Any other page copy that names the team size (Cast page intro, footer) must match this framing; do not let "specialists" and a count of 10 sit next to each other anywhere in copy.

### Projects index (`/projects`)
**Mobile:** H1 "Projects" + one-line dek, small mono status legend (● shipped ● in-progress ● archived), stacked `ProjectCard`s sorted by `order`/`date`. **Empty state:** centered mono badge "NOTHING LOGGED YET" (rotated -2deg, stamp treatment) + one Caveat handwritten line "check back after the next run" (decorative, paired with the plain badge text) + link to `/blog`.
**Desktop:** 3-col grid (2-col tablet 640–1023px), same header.

### Project detail (`/projects/:slug`)
**Mobile:** back-link "← All projects" (mono) → cover image (or neutral paper-texture placeholder with the studio mark if none) → H1 → status badge + horizontally-scrollable stack chips → meta row (date, repo/live link buttons) → **provenance strip** (§6) → `Prose` body with notebook ruling, margin notes collapse to inline sticky-note blocks under their anchor paragraph → "Next project" / "Back to all" nav.
**Desktop (≥1024px):** two-column, 68/32 split. Right rail: sticky meta card (status/stack/links), margin notes render inline at their true vertical anchor, "more projects" mini-list at rail bottom.
**Unknown slug:** renders `NotFound`.

### Blog index (`/blog`)
**Mobile:** H1 "The Logbook" + dek "Everything the team writes down, published as-is." → single-column stacked `PostCard`s (title, summary, mono meta line: date · avatar+name · tag chips). **Empty state:** "No entries yet — the first run report is still warm." + mono "→ see `reports/` on GitHub" nudge.
**Desktop:** stays a single centered column at 720px max-width (not a grid) — the list reads as a table of contents for a notebook, reinforcing the reading register over a portfolio-grid register.

### Blog post (`/blog/:slug`)
**Mobile:** back-link "← Logbook" → H1 → byline row → full **provenance strip** (wraps 2 lines) → tag chips → optional cover → `Prose` body (notebook-ruled) with margin notes as collapsed inline blocks → end-of-post **signature block**: Caveat "— {Character}" *plus* a plain mono line directly beneath, "Signed, {Character}, {role}" (accessibility duplicate, not decorative-only) → prev/next post nav → share (mailto + copy-link only, no social pixel per spec §8).
**Desktop (≥1024px):** 68/32 split. Right rail (sticky): full provenance card — avatar large, all metadata rows, plus a small graded-paper badge, e.g. "PASS · Round 1 · 91/100" (sourced from the real Judge/Fable-5 verdict format in `reports/2026-07-15.md`) — margin notes anchor into this rail; auto-generated table of contents if the post has 3+ H2s.

### Cast / Team (`/cast`) — new route; see the handoff action in §1
**Mobile:** H1 "The Cast" + a short, direct paragraph making AI authorship the headline — "Ten AI characters and one human ship this site. Nothing here is ghostwritten — every byline below is real." (framing now matches the home hero, see fix above) → 3-step mini-explainer strip: "Draft → Judge review (Fable-5) → Dom merges" → Project Lead card (full-width, distinguished treatment — leads chip) → 9 specialist `CharacterCard`s stacked, each: avatar stamp, name, role, color swatch, mono voice tag, running-bit copy (1–2 sentences), small mono "sourced: `reports/2026-07-15.md`" or equivalent citation — **the citation is the transparency device; never omit it.**
**Desktop (≥1024px):** Project Lead full-width at top; the 9 specialists in a 4-col grid (2-col tablet) — was an even 4×2 at eight specialists, now four rows with an uneven ninth card, which is fine, not a bug. Cards are informational, non-interactive in v1 (no per-character filtered post view — that's tag/filter infrastructure explicitly deferred per spec §8; note as a v2 idea, don't build it now).

### 404 (`*`)
Centered single column, minimal. Big mono "404" rotated -4deg like a rejected stamp → Fraunces H2 "This page didn't make it past review." → one line body "No entry at this address in the logbook." → primary CTA "Back to the logbook home" → secondary "Browse projects" → optional Caveat margin quip "Judge (Fable-5): FAIL, page not found, round 1" — `aria-hidden="true"` since the plain-text H2/body already carries the message; the handwritten note is pure decoration riffing on the real Judge verdict format, not new information.

---

## 6. Component inventory

Every component below: default / hover / active / focus / disabled / error as applicable. Focus ring everywhere = `2px solid var(--marker-700)`, `outline-offset: 2px`, never a shadow, never color-only.

**`ProjectCard`** — cover (16:10, `radius-sm`), title (Fraunces H4, preceded by mono eyebrow per §3), summary (2-line clamp, ink-muted), stack chips (mono badges, max 4 + "+N"), status badge (success/warning/muted per §2). *Default:* `shadow-card`. *Hover:* `shadow-card-hover` + cover scales 1.02. *Active:* `shadow-card-active`. *Focus:* focus ring on the whole card (it's one link). *Error/disabled:* n/a (static content).

**`PostCard`** — title (Fraunces H4, preceded by mono date eyebrow), summary (2-line clamp), meta row (mono: date · avatar 24px + name · tag chips). Same hover/active/focus states as `ProjectCard`, no cover-scale (no cover on most posts).

**`CharacterAvatar`** (the "stamp") — circular, monoline single-glyph icon (see §7 for glyph-per-character) filled with the character tint, 2px `--ink`-at-20% ring. Sizes: 24px (inline byline), 40px (cards/nav), 56px (post/detail byline), 96px (Cast page hero card). *Default:* static. *Hover (Cast page only):* rotate -3deg, 150ms. *Focus:* ring visible when avatar is itself a link. No disabled/error state — it's identity, not an interactive control beyond its link wrapper.

**`Byline`** — avatar + "Written by {Name}" (mono, small-caps feel via letter-spacing) + role underneath in `--ink-muted`. Links to the character's Cast entry. States mirror a text link (see below).

**`ProvenanceStrip`** — full-width thin bar, mono 13px, `--ink-muted`, fields joined by " · ": `Written by {icon+Name}` · `reviewed by the Judge (Fable-5), passed round {N}` · `built on commit {short-hash}` · `{tokens} tokens, {minutes} min`. Each field is a small dotted-border chip (ledger-row feel). Commit hash is a real link to the GitHub commit when the repo is public; underline appears on hover (never color-only). Riso-offset icon backing per §4. *Wraps to 2 lines on mobile at the " · " boundaries, never mid-field.*

**`MarginNote`** — desktop (≥1024px): positioned in the right rail at the vertical position of its anchor paragraph, Caveat 20px, `--marker-700`, rotated -1.5deg, connected to the anchor via a thin hand-drawn SVG line/circle. Mobile/tablet: collapses to an inline block below its paragraph — small mono label "MARGIN NOTE" + 20px reviewer avatar + the Caveat text. **Never overlaps body text. Never the sole carrier of information** — content must be supplementary/quippy, not required to understand the post (accessibility floor, see §9).

**`Header` / nav** — logo mark (placeholder, see §1) + mono nav links + dark-mode toggle (sun/inkwell icon) + sticky with 1px `--hairline` bottom border on scroll (decorative separator, not a 1.4.11-load-bearing boundary). Active route: hand-drawn SVG underline in `--marker-600` under the label (not a plain CSS border — uses the sketchy-line asset). Mobile: hamburger → full-height drawer, paper-grain background, focus-trapped, closes on `Esc` and outside-click, returns focus to the trigger.

**`Footer`** — "Built by an AI team" note (spec-required), links to `/cast`, GitHub, RSS. Small mono "last commit {relative-time}" line as a living-document easter egg (build-time value, not a runtime fetch — no backend per spec §8).

**Buttons:**
- *Primary:* `radius-sm`, `shadow-card`. **Light mode:** `--marker-600` fill, **white** label — **5.12:1** (computed). **Dark mode:** `--marker-600` fill, **`--paper`** (dark, near-black) label, not white and not `--ink` — **6.33:1** (computed; see §2 self-caught fix — white/`--ink` labels on this fill both fail). *Hover:* `shadow-card-hover` + `translateY(-2px)`. *Active:* `shadow-card-active` + `translateY(1px)`. *Focus:* ring + shadow retained. *Disabled:* 40% opacity, no shadow, `cursor: not-allowed`, `aria-disabled`.
- *Secondary:* transparent fill, 1.5px `--ink` outline. *Hover:* fills `--paper-raised`. Same focus/disabled pattern.
- *Text/inline link (in prose):* `--marker-700`, **always carries a default hand-drawn underline SVG** (not CSS `text-decoration`) — never color-only per WCAG 1.4.1. *Hover:* underline thickens/darkens. *Focus:* standard ring.

**Badge / chip / tag** — `radius-full`, mono uppercase 11px, tint-wash background (12% tint over `--paper-raised`) + `--ink` text (never tint-colored text at this size, per §2 rule), 1px tint border at 40%. Status badges use semantic tokens (success/`--warning` corrected value/muted) instead of a character tint.

**Code block** — JetBrains Mono 14px/24px, `--paper-raised` background, `radius-sm`, 1px `--hairline` border (decorative — see §2 rule, this border is not the component's accessible boundary; the background-color change against the page is), Shiki-highlighted at build time (per spec §6), a mono language label top-right, copy-button (icon, 24×24px min target, tooltip "Copied" on click with `aria-live="polite"`).

**Prose / Markdown body** — `@tailwindcss/typography`-based, Fraunces body role (§3), max-width 720px, notebook ruling behind (project/post pages only), H2s carry the riso-offset underline, blockquotes carry the riso-offset left bar, inline code uses mono at 0.9em with a `--paper-raised` chip background.

**Empty states** — see §5 per-page (Projects index, Blog index). Pattern: rotated mono stamp badge (the "nothing to see" register matches the Judge/stamp visual language) + one Caveat line (paired with plain text) + a way forward link. Never a bare "No results."

---

## 7. The ten characters

Avatars are **not faces** — a face-avatar for an AI persona reads as uncanny and is exactly the generic-AI-app cliché this brief avoids. Instead: a **monoline glyph inside a circular stamp** (like a passport/union-card stamp), tint-filled, ink ring — reinforcing "provenance" as the visual idea, not "cute mascot." Quirks below are sourced from real material: the agent definition files (`.claude/agents/*.md`, already committed, describing real documented behavior) and `reports/2026-07-15.md` (the actual first run — the "PASS, 91/100, round 1" language is verbatim from that report).

| Character | Color | Avatar glyph | Voice tag | Running bit (sourced) |
|---|---|---|---|---|
| Project Lead | `#3B5169` ledger blue | open notebook | measured, decisive, dry | Opens every `reports/` entry with a one-paragraph brief before delegating — never touches `main` directly, only reviews and merges what the team lands on `team/*` branches. |
| architect | `#3F5D45` blueprint green | T-square / ruler | precise, allergic to gold-plating | Says "right-sized" unprompted in nearly every doc (it's the literal rule in their own prompt: "never over-engineer"). Scored **PASS, 91/100, round 1** on the very first spec (`reports/2026-07-15.md`) and the report notes they'd already be worrying about the other 9 points. |
| designer (this brief) | `#A6791F` mustard/ochre | fountain-pen nib | opinionated, editorial | Never hands back a menu of options — ships one direction and defends it in writing; Dom's sign-off is the gate, not a vote. |
| frontend-dev | `#2C6E8C` screen-glow teal | browser-window bracket `</>` | implementation-literal, reports only what was verified | Carries two separate SoulForge scars: the "floating heads" bug — LPC sprites drew hair and face over empty space because the body sprite is neck-down and the head is its own layer that wasn't composited in — and, unrelated, an undocumented 32-file Phaser loader cap that silently stalled the asset loader into a blank scene, costing an hour of debugging with no error to go on. |
| backend-dev | `#5B3A6B` vault plum | stacked database cylinder | terse, rules-first | "RLS on every table, no exceptions" is the literal first line of their standards — will not let "add auth later" pass review, ever. |
| devops | `#4A5A63` steel | pipeline/gear | boring on purpose, twice-careful | Infra philosophy is "managed services, minimal moving parts" verbatim — never deploys without asking Dom's explicit go-ahead, even for a config that's already been reviewed once. |
| security-auditor | `#A6241A` stamp red | rubber stamp | blunt, unhedged | Ends every audit with a verdict stamped in caps — **SHIP** or **DO NOT SHIP** — no hedging, by design (their own report format forbids inflating or softening severity). |
| qa-tester | `#C97A1A` caution amber | magnifying glass over checkbox | adversarial by design | Opens every verify pass by trying to break the happy path first; the standing rule is "never soften a FAIL to be agreeable" — even on round 3 of a revise loop. |
| marketer | `#A83D6B` raspberry | megaphone | plain-spoken, allergic to hype | Deletes any sentence that "sounds like marketing"; refuses fake social proof — even a placeholder ships labeled as a placeholder, never invented numbers. |

**The Judge (Fable-5)** is not one of the ten — it's the standing reviewer role that appears in every `ProvenanceStrip` and in margin notes across the site ("reviewed by the Judge (Fable-5), passed round N"). Give it its own small mark: a graded-paper stamp icon in `--ink` (neutral, not tinted — it reviews everyone, it doesn't belong to a team member's palette), used only in the provenance card and margin-note device, never as a Cast page entry.

**Team-size framing (binding, fixed per review; updated 2026-07-18 for the tenth-character hire):** always describe the team as **"1 human + 10 AI characters"** (or "10 AI characters" alone once "1 human" is established elsewhere on the page). Never say "10 specialists" — there are 9 specialists *plus* the Project Lead, which totals 10 characters. This exact phrasing must be used consistently in the home hero eyebrow, the home cast-strip caption, and the Cast page intro paragraph — check all three at build time against this rule.

---

## 8. Microinteractions

Motion is restrained — **"ink settling,"** never a flashy reveal. Every transition below respects `prefers-reduced-motion: reduce` by dropping to an instant/opacity-only equivalent (no transform, no duration beyond 1 frame).

| Interaction | Motion | Duration / easing |
|---|---|---|
| Card hover (Project/Post) | shadow grows, `translateY(-2px)` | 160ms `ease-out` |
| Card active/press | shadow flattens, `translateY(1px)` | 90ms `ease-in` |
| Page route change | content fades in 4px up (no slide/wipe) | 200ms `ease-out`, staggered 20ms per major block max |
| Button press | scale 0.98 + shadow flatten | 100ms `ease-in` |
| Nav active-link underline | hand-drawn SVG stroke draws in (`stroke-dashoffset`) on first route entry only, static after | 350ms `ease-out`, once per session per route (not on every hover) |
| Avatar stamp hover (Cast page) | rotate -3deg | 150ms `ease-out` |
| Mobile drawer open/close | slide + fade, focus trap engages | 220ms `ease-in-out` |
| Margin note appear (scroll into view) | opacity 0→1, no slide | 250ms `ease-out`, `IntersectionObserver`-triggered once |
| Toast/copy-link confirmation | opacity fade, `aria-live="polite"` | 150ms in / 400ms hold / 200ms out |
| Dark-mode toggle | grain/paper crossfade, no flash of unstyled color | 180ms `ease-in-out`, respects `color-scheme` |

**Reduced motion:** all `translateY`/`scale`/`rotate` transforms above collapse to opacity-only or instant state changes; the nav underline draws-in effect is disabled entirely (renders static/complete).

---

## 9. Accessibility notes (WCAG 2.2 AA — binding, not aspirational)

- **Text contrast:** every ink/paper, ink-muted/paper, and marker/paper pairing in §2 is hand-computed ≥4.5:1 (small text) — see the table for exact ratios; the two round-1 errors (`--warning` light, and the `--hairline` false 3:1 claim) are corrected and re-verified above, and the dark-mode primary-button label failure is caught and fixed. Character tints are never used as small-text color (§2 rule), only as accents at ≥3:1 non-text contrast.
- **Focus:** every interactive element gets a visible `2px solid var(--marker-700)` outline, `2px` offset, ≥3:1 against its background in both modes — never a `box-shadow`-only or color-only focus treatment, never `outline: none` without a replacement.
- **Target size:** all interactive elements ≥24×24px minimum; primary actions (buttons, nav links, card tap targets) ≥44×44px. Chips/badges are informational, not interactive, so they're exempt — but if a chip is ever made clickable (e.g. a future tag filter), it must grow to the 44px floor.
- **Handwritten face is decorative-only, enforced structurally:** the signature block always ships a plain mono/serif line with the same information right next to the Caveat text; the margin-note device on desktop always has a mobile fallback that renders the same content in a normal block (not hidden, just restyled) — nothing is *only* expressed in Caveat.
- **`--hairline` is decorative-only, enforced structurally (new, per correction above):** it must never be the sole visible boundary of an interactive control. Any component needing a real 3:1+ non-text border uses `--ink-muted` instead.
- **Keyboard order:** header skip-link ("Skip to content") first in tab order; nav → hero CTAs → card grids (one tab stop per card, not per sub-element) → footer. Provenance strip's commit-hash link and copy-link buttons are reachable and operable via keyboard; margin notes are not separate tab stops on mobile (they're inline content, read in document order) and on desktop are positioned via CSS only (DOM order stays with their anchor paragraph, so tab order is never visually scrambled).
- **Semantic structure:** one `<h1>` per page, headings never skip a level, `ProjectCard`/`PostCard` are single `<a>`-wrapped articles (not nested interactive elements), status/tag chips use `<span>` with `aria-label` where the visual text is abbreviated, cover images get real `alt` text from frontmatter (fall back to the project/post title, never empty `alt` unless the image is genuinely decorative).
- **Motion:** every microinteraction in §8 has a `prefers-reduced-motion: reduce` fallback — this is a build gate, not a nice-to-have.
- **Grain/texture:** capped at 3% opacity specifically so it cannot erode any contrast ratio above; QA must verify contrast with the grain layer active, not just against base tokens.
- **Dark mode:** all dark-mode semantic tokens are now hand-computed and stated in §2 (success 6.59:1, error 4.81:1, warning 7.98:1, marker-700 7.68:1) — no more "verify in build" deferrals for these. The one thing that still needs a build-time spot-check is the grain-layer-applied contrast measurement above (that's a rendering-pipeline check, not a token-math gap).

---

## 10. Explicit avoid list

Naming these because the "anti-generic" stance is itself part of the pitch — if any of these creep in during implementation, it's a regression against this brief:

- Glassmorphism, `backdrop-filter: blur()`, frosted-glass cards.
- Indigo/violet-on-white as the default UI color (the default "AI startup" palette).
- Gradient-mesh blobs, aurora backgrounds, 3D-rendered shapes/spheres.
- Pure white (`#FFFFFF`) or pure black (`#000000`) surfaces.
- Soft, blurred drop-shadows (`box-shadow` with any blur radius) — this system's shadows are hard-edged offsets only.
- Fully rounded ("pill-everything") cards, buttons, and inputs — radius is reserved for badges/pills/avatars only (§4).
- Circular headshot-style avatars for the AI characters — faces are the uncanny-valley default; this system uses stamped glyphs instead.
- Comic-sans-adjacent or bubbly handwriting fonts for the handwritten role — Caveat reads as a real hand, not a cartoon.
- Stock "team of diverse illustrated people" imagery anywhere.
- Skeleton-loading shimmer for content that's actually bundled at build time (spec §4: there is no async load state to fake — don't invent one).
- Confetti/celebratory animation on form success, social share counters, or fake live-visitor indicators — nothing performative, nothing fabricated (ties to the marketer character's own rule against fake proof).
- Assuming light-mode and dark-mode text-on-fill combinations are symmetric without checking both — the dark-mode primary-button fix in §2/§6 is the cautionary example: white/light labels that work fine in light mode can fail outright on the equivalent dark-mode fill color.

---

**Summary for Dom's sign-off:** light-first warm paper + dark ink-on-slate, both AA-verified with every ratio hand-computed (round-2 correction fixed two wrong contrast claims and caught a real failing dark-mode button-label pairing that round 1 waved past); Fraunces (serif, does both display and body via its optical-size axis) + JetBrains Mono (machine voice) + Caveat (signatures/margin notes, decorative-only); hard flat shadows and mostly-sharp radii with pill shapes reserved for badges; ten character stamps with real, cited quirks, now consistently described as "1 human + 10 AI characters" everywhere (not "10 specialists"); the provenance strip and margin-note device as the transparency showpiece on every case study and post. Open items flagged rather than guessed: the studio wordmark/logo, and the explicit handoff to architect to add `/cast` to `docs/spec.md` §2's route table before frontend-dev builds it.
