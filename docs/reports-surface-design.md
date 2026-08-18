# `/reports` index — design pass and public-copy draft

**Status:** draft for Dom's sign-off · **Author:** designer (Vera) · **Date:** 2026-08-17
**Gates:** `docs/reports-surface.md` §6 PR 4 (the route). Nothing here ships publicly — this is the checkpoint.
**Consistent with:** `docs/design-brief.md` (visual system), `docs/persona-bible.md` (voice), `PROJECT-BRIEF.md` (honesty rules).

> **Counts in this document are measured against `main` as of 2026-08-17** (31 reports).
> PR #117 — open at the time of writing — adds six more report files (08-07 through
> 08-13). When it merges the totals become 37 reports, and the empty-state share goes
> up, not down, since none of those six is named by a post's or project's provenance
> record. The *ratios* and every design conclusion below are unaffected; only the
> absolute numbers move. Re-verify before quoting a figure in public copy — and note
> that §7's drafted copy deliberately contains **no count**, precisely so this cannot
> go stale on the page itself.

---

## 1. The design problem

A reader lands on `/reports` because they've noticed the site keeps citing "run reports" — in the footer, in every `ProvenanceStrip`, in the site's own pitch that its git history and work logs are content — and they want to see the whole set at once instead of one citation at a time. What they're actually here for is the join the architect's spec identifies: *which run produced which post*, laid out as a ledger, not a single report's prose. The honest tension is that this page's primary artifact — the report itself — lives entirely off-site, on GitHub, and the majority of rows won't even have an in-site link to click. A page that mostly says "nothing to click here" and then points everywhere else could easily read as broken or unfinished. The fix is not to disguise that fact; it's to make the off-site link and the "no output" state both look like deliberate, designed parts of a ledger — not gaps. Every decision below is in service of that: the outbound link gets a clear, repeated, expected treatment (never a surprise), and the empty case gets the same visible, muted, non-apologetic posture `ProvenanceStrip` already established for exactly this situation.

**Verified against real data, not the spec's illustrative numbers.** `docs/reports-surface.md` was written when there were 21 reports; there are now **31** (`reports/*.md`, confirmed by directory listing and by `src/content/runs.generated.json`, which has exactly 31 rows). Cross-referencing `runs.generated.json`'s 31 `reportPath`s against `src/content/provenance.generated.json`'s resolved records, **8 runs** have a `reportPath` that resolves to a live `Post` or `Project` (2026-07-16, 2026-07-17, 2026-07-18, 2026-07-18-visual-media-hire, 2026-07-19-evening, 2026-07-20, 2026-07-23, 2026-07-24) and **23 of 31 (≈74%)** show the empty state. That's a higher empty-state majority than the spec assumed, not a lower one — the design below treats the empty state as the *dominant*, expected case, not a rare edge.

One data nuance worth stating precisely because it changes what the empty-state copy is allowed to claim: `reports/2026-07-30.md` **has** a `yaml provenance` block (four records, in `provenance.generated.json`) — it just names `docs/` and `scripts/` files, not a post or project. Its row still renders the empty state, correctly, because the join (`buildProducedByReportPath` in `src/content/runs.ts`) only resolves to `Post`/`Project`. That means "no recorded output" on this page does not mean "no provenance block exists" — it specifically means "nothing this page can link to." The copy has to be honest about that narrower claim, not the broader one.

Kind distribution (`src/content/runs.generated.json`): **25 `run-report`, 4 `maintenance-sweep`, 1 `critical-review`, 1 `hire-report`** — 31 total.

---

## 2. Page anatomy

Same `Container narrow` (720px max-width) treatment as `/blog`, not `/projects`' 1120px grid container. `docs/design-brief.md` §5 already argues this for the blog index — "the list reads as a table of contents for a notebook, reinforcing the reading register over a portfolio-grid register" — and `/reports` is *more* of a table of contents than the blog is: single column, no grid, on every breakpoint, mobile and desktop alike. This is a deliberate extension of an existing pattern, not a new one.

**Structure, top to bottom:**

1. `Seo` — title/description (see §7 for exact copy).
2. `<h1>` — the page's only heading at this level.
3. Intro paragraph (2–3 sentences) — what a report is, and that the blog is the edited version.
4. One short, quiet disclosure line about `maintenance-*` reports — same register as `ProjectsIndex`'s existing "Cards marked SOLO BUILD…" line directly under its H1 (`src/pages/ProjectsIndex.tsx` lines 19–25). That's an established, working pattern on this exact page shape; reuse it rather than inventing a callout box.
5. `<ol>` of 31 rows, each a `RunRow` (new component — no existing component fits, see §3), newest-first (`getAllRuns()` is already sorted this way — no client sort needed).
6. Nothing else. No search, no filter, no per-kind grouping headers, no stats block (see §8).

**Mobile vs. desktop:** there is no grid to reflow. The only real desktop change is the global `h1` size step (34px → 48px, already automatic via the site's base CSS) and how the state line wraps — on narrow viewports a row with 3–4 produced links or a long title wraps to multiple lines, same as `ProvenanceStrip`'s inline variant already allows. Margin notes and equivalents aren't in play on this page (no prose column, no `MarginNote` component), so §9's mobile-hiding rule doesn't have anything to violate here — noted, not silently skipped.

**Footer relationship:** see §4 — I agree with the spec's Q3 default (repoint the footer's "Run reports" entry from GitHub to `/reports`).

---

## 3. Row design — `RunRow`

**Not a reskin of `PostCard`/`ProjectCard`.** Those are single-destination cards: the whole card is one `<Link>`, hover-lifts as one unit, and that affordance is correct because clicking anywhere on a `PostCard` goes to exactly one place. A report row is structurally different — it can carry zero, one, or several in-site links (produced posts/projects) *plus* one outbound link (the report itself) that's always present. Wrapping that in a single card-link would be wrong (which destination does a click on the title go to?) and a card-level hover-lift would imply a single-target affordance that isn't true. So `RunRow` gets its own, flatter register:

- Plain `<li>` on the page's base `--paper` background — no `--paper-raised`, no `radius-sm`, no `shadow-card`. This reinforces the "ledger," not a third card grid, and matches the register `ProvenanceStrip` already established for exactly this kind of dense, multi-field, ledger-like content.
- `border-b border-hairline` between rows (solid, not dashed — dashed is `ProvenanceStrip`'s specific signature for "this is a provenance fact block"; reusing it here for a plain row divider would blur that signal). The `<ol>` itself gets `border-t border-hairline` so the first row is bounded the same as every other.
- Vertical rhythm inside each row: `py-6` (24px, design-brief `lg` unit) block padding; `mb-1` (4px) between eyebrow and title, `mb-2` (8px) between title and the state line.
- Each interactive element inside the row (produced links, the outbound CTA) gets its own focus ring and its own hover treatment — never a row-level hover state, because the row itself isn't one clickable thing.

**Row content, in order:**

1. **Eyebrow** (primary metadata line, not primary reading line): `font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted` — identical class string to `PostCard`'s existing eyebrow (`src/components/PostCard.tsx` line 35). Content: `{formatted date} · {kind label}`, e.g. `Jul 20, 2026 · run report`. Date formatting matches the site-wide convention (`toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })`, the same function already local to `PostCard.tsx`). This satisfies design-brief §3's binding rule that every card-title-styled heading is preceded by a mono eyebrow — required for the H4-vs-body hierarchy to read correctly, not optional here.
2. **Title — the primary line.** `<h2 className="card-title">{run.title}</h2>` — the verbatim H1 from the report, exactly as the content model requires (never rewritten, never truncated). Heading level 2, matching the existing `headingLevel` convention `PostCard`/`ProjectCard` already expose (both default their index-page usage to `headingLevel={2}`, siblings directly under the page's single `h1`) — 31 h2s directly under one h1 is correct, sequential heading structure, and lets a screen-reader user scan the list by heading exactly the way they can already scan `/blog`.

   Note: for `run-report`-kind rows, the title text ("Run report — 2026-07-20") already restates the eyebrow's kind label ("run report"). That overlap is intentional, not sloppy — the eyebrow's job is machine-scannable metadata for a reader skimming the list; the title's job is the verbatim record for a reader actually reading a row. Two different reading modes, deliberately redundant, the same logic the design system already applies when a fact appears once in a byline and again in a provenance strip.
3. **State line — secondary, not a link itself; it's a container for 0–N links.** Mono 13px, matching `ProvenanceStrip`'s ledger-fact register (`text-[13px]`), not the eyebrow's 11px:
   - **Has recorded output:** `produced → ` followed by each produced title, individually wrapped in curly quotes and rendered as a real `<Link to="/blog/:slug">`/`<Link to="/projects/:slug">` in `text-marker-700` with the site's standard underline-on-hover (`underline decoration-transparent hover:decoration-current`, the exact class pattern `ProvenanceStrip`'s commit/run links use). Multiple items join with `" · "`. For the one batch case that exists today (2026-07-16: 1 post + 3 projects), cap the visible list at 3 and add a `"+1 more"` non-link suffix — reusing `ProjectCard`'s already-established `+N` stack-chip truncation pattern (`src/components/ProjectCard.tsx` line 68), not inventing a new truncation convention. No cap is needed for any other row today, but the pattern should exist before a future multi-output run needs it.
   - **No recorded output:** plain `text-ink-muted` text, not a link, not a button, no href — see §7 for exact wording. Carries a `title=` tooltip in the same spirit as `ProvenanceStrip`'s `NO_RECORD_TOOLTIP`, worded accurately for *this* absence (see §7).
4. **Outbound CTA — its own line, always present, every row.** This is the one universal element tying both states together: every run has a real file on disk with a title and date (non-optional fields), so every row gets exactly one "Read the report ↗" link to GitHub, regardless of whether it has recorded output. See §4 for full treatment. `min-h-11 inline-flex items-center` (44px), matching the exact class Footer's nav links and `BacklogChip` already use for standalone (non-inline) link targets — this is a primary row action, not decorative chip content, so it gets the primary-touch-target treatment design-brief §9 specifies, not the 24px chip exemption.

---

## 4. The outbound-link treatment

Every row's one guaranteed action leaves the site. That has to read as a deliberate ledger device, not a dead end, so it gets a consistent, repeated, unmistakable treatment used nowhere else on the page:

- **Label:** "Read the report ↗" (see §7 for the alternative). The `↗` is a small `aria-hidden="true"` glyph appended after the text — decorative, not the accessible name (the words "Read the report" already say what happens; a screen-reader user doesn't need "up-right arrow" announced). This is a new, page-specific visual convention — no other outbound link on the site today (`Footer`'s GitHub/RSS/Run-reports links, `BacklogChip`, `ProvenanceStrip`'s commit/run links) carries a visible external-link glyph, all of them rely on `target="_blank" rel="noreferrer"` alone. `/reports` is the first page whose *entire* primary content routes off-site by design, which is exactly the case that needs extra clarity — so it earns the one visible marker the rest of the site doesn't have yet. I'm not retrofitting the glyph onto Footer/BacklogChip/ProvenanceStrip in this pass; that's a separate, larger consistency decision outside this PR's scope (see §8).
- **Disambiguation:** a `title=` attribute naming the exact file, e.g. `title="Opens reports/2026-07-20.md on GitHub, in a new tab"` — same mechanism `ProvenanceStrip` already uses (`NO_RECORD_TOOLTIP`) for supplementary, non-load-bearing context. The link text alone ("Read the report") plus this tooltip plus the visible `↗` together satisfy "never surprised" without inventing a new sr-only "opens in new tab" announcement pattern the rest of the site doesn't have (see §8).
- **Construction:** `${REPO_BASE}/blob/main/${run.reportPath}` — the exact pattern `ProvenanceStrip.tsx`'s `runField` already uses, and `reportPath` is already regex-pinned by `REPORT_PATH_PATTERN` in `provenance-schema.ts` (PR 0 has shipped). No new construction logic, no new injection surface; this is a solved problem, just applied to a new call site.
- **Why this is deliberate, not thin:** the architect's own §1.3 argument holds up under review — rehosting report prose on-site would create a second copy that can drift from the source, and the reports were never written for a reader (§1.1's own audit: 30–40% reader-facing prose wrapped in 60% operations). Sending the reader to the primary document *is* the honest move. What makes the page substantive isn't the outbound link, it's the join sitting above it (the produced-output line) — the outbound link is just how you verify the join once you've seen it.

**Footer's "Run reports" entry — I agree with repointing it to `/reports` (spec §8 Q3's recommended default).** As a designer, the reasoning holds: once `/reports` exists, a bare GitHub folder listing is a strictly worse landing spot than an index that gives every file a real title, a date, and — for 8 of them — a link to what it actually produced. `Footer.tsx`'s own current link (`STUDIO_SITE_REPORTS_URL`, line 147) points straight at a raw file tree with unreadable filenames like `2026-07-21-review.md`; `/reports` is the same destination with the join already done for the reader. This matches how the rest of the site treats outbound links generally: an in-site page provides context first, the GitHub link is the "verify it yourself" step after, not the first click. `BlogIndex`'s own now-unreachable empty-state GitHub link (only renders at zero posts, which will never be true again) is a separate, smaller thing I'm not touching in this pass — flagged, not silently left implying I redesigned around it.

---

## 5. `kind` differentiation

Distribution, verified against `runs.generated.json`: **25 `run-report` (81%), 4 `maintenance-sweep` (13%), 1 `critical-review` (3%), 1 `hire-report` (3%).**

**Recommendation: no color-coded or badge-level visual differentiation.** The kind label already renders as plain mono text in the eyebrow (§3, item 1) — that's enough for the two rows a reader might actually want to distinguish (the one critical review, the one hire report) without dedicating a `Badge` tone, a legend, or a color key to a field that's 81% one value. A colored badge here would also misleadingly borrow the semantic-status register `Badge`'s success/warning/error tones already carry elsewhere on the site (project status, Judge verdicts) — `kind` isn't an evaluative status, it's a category, and dressing it as one would overclaim meaning that isn't there.

The one thing that *does* need visual/copy treatment, because it's a real scope caveat and not just a taste call: `maintenance-*` reports assess **all of Dom's repos**, not just this site (verified: `reports/maintenance-2026-07-20.md` itself states "13 git repositories discovered under `VibeCodeProjects/`," and `docs/reports-surface.md` §3.2 makes the same point). That's handled once, at the page level (§2, item 4), not per-row — repeating a caveat on 4 of 31 rows would be noisier than useful, and the architect's own spec already asks for exactly "one line of page copy," not a per-row disclosure.

---

## 6. States and accessibility

- **Single `<h1>`** per page (§2). Row titles are `<h2>`, sequential, no skipped levels — 31 siblings under one `h1`, same shape `/blog` and `/projects` already use for their card headings.
- **List semantics:** `<ol>` — the architect's spec explicitly calls for it (§6 PR 4), and it's the right choice here (unlike `PostCard`/`ProjectCard`, which are plain `<div>` stacks): rows are meaningfully ordered (newest-first, chronological), so an ordered list is the accurate semantic, not just a convenient wrapper. `key={run.runId}` — unique per row, schema-guaranteed.
- **Touch targets:** the outbound CTA and every produced-link are the row's real interactive elements. The outbound CTA is a standalone (non-inline) action → `min-h-11` (44px), matching Footer/`BacklogChip`'s existing convention for standalone links. Produced links sit **inline within a sentence** ("produced → …") — WCAG 2.5.8 explicitly exempts inline text links from the 24×24px minimum ("the target is in a sentence… constrained by the line-height of non-target text"), the same exemption every link inside `.prose-studio` body copy already relies on. No new violation, correctly scoped exemption.
- **Focus:** every link (produced links, outbound CTA) gets the site's standard `2px solid var(--marker-700)`, `2px` offset focus ring — no new focus treatment needed, this is already global (`:focus-visible` in `index.css`).
- **Colour contrast — no new tokens, no new math.** Every color used is an already-verified pair from `docs/design-brief.md` §2 / `src/styles/tokens.css`: eyebrow and state-line-muted text use `--ink-muted` on `--paper` (6.74:1 light / 7.95:1 dark), row titles use `--ink` on `--paper` (15.15:1 / 14.36:1), all links use `--marker-700` on `--paper` (6.34:1 light / 7.68:1 dark). Nothing here needs a fresh contrast computation; this asserts reuse of numbers already hand-computed and shipped, not new claims that need re-verifying. Note that the repo gates contrast in a real browser, so these will be measured at PR 4 regardless.
- **Reduced motion:** the page introduces no new motion. No card hover-lift (§3 explicitly rejects that treatment for this component), no stagger, no scroll-triggered reveal. The only motion present is the existing global link-hover underline transition, which is not transform-based and needs no `prefers-reduced-motion` branch beyond what already exists site-wide.
- **Route smoke:** the existing suite (`src/smoke/routes.smoke.test.tsx`) asserts exactly one `<h1>`, zero `console.error`, and every internal `href` is a known path — satisfied by construction here (produced-link hrefs are built from real `slug`s off `getAllRuns()`, never a string read out of report content, matching the same rule `ProvenanceStrip`'s commit/run links already follow).
- **Empty page state (currently unreachable, but specified anyway):** if `getAllRuns()` ever returns zero rows, reuse `BlogIndex`'s existing plain-text empty-state pattern in spirit — "No reports yet — check back after the next run." plus a link to `/blog` — rather than inventing a third empty-state visual language for a state that, like `BlogIndex`'s own, is currently unreachable (31 reports exist and the artifact regenerates every build).

---

## 7. Public copy — drafted for Dom's sign-off

Every sentence below with a factual claim is marked. Everything else is either pure UI label text or a description of what the page itself does.

### `h1`

> **Recommended:** `Run Reports`

*Alternative (Dom's taste, not a correctness call):* `The Run Log` — matches the "The Logbook" / "The Cast" article-prefixed naming pattern the rest of the site uses; "Run Reports" instead matches "Projects" (no article). Either is internally consistent with an existing page name, just two different existing patterns.

### Intro paragraph

> **Recommended:**
> "Every session the team runs ends in a report — a working log written for Dom: task lists, decisions, what's still broken, an honest token estimate. **[FACT]** It isn't edited for publication. When something in a report is worth telling more people, it gets rewritten into a post; [The Logbook](/blog) is that edited version. **[FACT]** This page is the plain index: every report that exists, in date order, and which post or project — if any — it produced. **[FACT — describes what the page itself does]** The reports themselves aren't reproduced here; each row links straight to the original file on GitHub. **[FACT — describes what the page itself does]**"

Sourcing for the flagged claims: "Every run ends with a report in `reports/`" is a literal line in `PROJECT-BRIEF.md` ("Hard rules for the team"). The "internal work log… not edited for publication… the blog is the edited version" framing is the exact requirement `docs/reports-surface.md` §2.1 specifies, and it matches the architect's own audit in §1.1 (30–40% reader-facing prose, 60% operations — task lists, "For Dom to review," "What's left/blocked," token spend).

*No alternative offered here* — this paragraph is making factual claims about what the site does, not a tone/taste choice, so there's one correct version to check rather than two to pick between.

### Maintenance-sweep disclosure line

> **Recommended:** "Reports named "maintenance" are sweeps across all of Dom's repos, not just this one — they're included here for completeness, but most of what's in them isn't about this site. **[FACT]**"

Sourced from `reports/maintenance-2026-07-20.md` itself ("13 git repositories discovered under `VibeCodeProjects/`") and `docs/reports-surface.md` §3.2 ("these sweep all of Dom's repos rather than just this one").

### "No recorded output" row microcopy

> **Recommended:** `no recorded output for this run` — lowercase, no trailing period, matching `ProvenanceStrip`'s exact typographic register (its own "no run record for this entry" line also has no period).

*Alternative (genuine register choice):* `no post or project linked to this run` — more plain-language and explicit about *what specifically* is absent (a linkable post or project), at the cost of losing the terser "ledger" jargon the recommended version shares with `ProvenanceStrip`.

I did **not** reuse `ProvenanceStrip`'s exact string "no run record for this entry" verbatim, and that is a deliberate correction, not an oversight: that phrase would be factually wrong for a run like 2026-07-30, which *does* have a recorded run/provenance block — it just doesn't name a post or project. Reusing the wrong words to match the "same vocabulary" instruction literally would have introduced a false claim on the site's honesty page. The *posture* is reused (muted, non-interactive, honest, no dash/placeholder, tooltip escape hatch); the *words* are corrected to say only what is actually true here.

Tooltip (`title=` attribute, not new visible copy): `"This run's report doesn't name a post or project this site can link to — the report itself may still cover real work."`

### Outbound link label

> **Recommended:** `Read the report ↗`

*Alternative:* `View on GitHub ↗` — more explicit about the destination platform, which more directly serves "never surprised" as a literal label rather than relying on the tooltip to carry that detail. The recommended version ties back to the row's own subject (the report) rather than the hosting platform, and the tooltip + `target="_blank"` + visible `↗` already do the disambiguation work regardless of which label wins — so this is a low-stakes pick either way.

### Seo description

> **Recommended:** `"Every run report the team has filed — internal work logs, and which post or project (if any) each one produced. The originals live on GitHub."`

No new factual claim beyond what's already sourced above; restated for the meta-description length constraint.

---

## 8. What I deliberately did NOT design, and why

- **No aggregate ratio/stat line** ("X of 31 runs produced a post or project"). The list itself demonstrates the ratio structurally — a reader scrolling past 23 muted "no recorded output" rows before finding a linked one *sees* the empty-majority without needing it restated as a number. A hardcoded ratio in copy would also go stale the moment the next report lands (see this document's own header note for a live example of exactly that), requiring yet another generated, kept-in-sync value for a page explicitly scoped (`docs/reports-surface.md` §7) to exclude per-run statistics.
- **No third, more granular empty state** distinguishing "no `yaml provenance` block exists at all" from "a block exists but names nothing linkable" (2026-07-30's actual case). `RunsArtifactRow`/`Run` (`src/content/runs.ts`) don't carry that distinction in the data — only `produced.length`. Designing a UI state for a fact the artifact doesn't expose would violate the house rule against inventing fields; the honest fix is a tooltip that doesn't overclaim either way (§7), not a third visual state.
- **No color-coded `kind` differentiation.** See §5 — the distribution doesn't support it, and it would misapply the site's semantic-status color language to a non-evaluative category field.
- **No search, filter, pagination, or grouping by kind/date.** Explicitly out of scope (`docs/reports-surface.md` §7), and 31 rows in a single reading-width column isn't yet a scale problem — `/blog` already renders more posts than that unpaginated.
- **No per-produced-item commit hash. This is a correction to the spec, not just an omission**, flagged rather than silently redesigned around. `docs/reports-surface.md` §2.1's own illustrative mockup shows `produced → "Red is not self-justifying" · commit 991e075 · read the report ↗`, but `RunProducedRef` (`src/content/runs.ts`) only carries `{ kind, slug, title }` — no commit field reaches the row. The commit hash *is* available, one click further in, on the linked post/project's own `ProvenanceStrip`. Showing the same commit hash on two surfaces is a second source that can drift, and the produced-link itself is the path to it — the same "link to the primary record rather than a second copy" argument the architect already makes for why reports aren't rehosted at all (§1.3).
- **No sr-only "opens in a new tab" announcement.** Checked: no outbound link anywhere in this codebase today has one (`Footer`, `BacklogChip`, `ProvenanceStrip`'s commit/run links all rely on `target="_blank" rel="noreferrer"` alone). Inventing a new accessibility pattern unilaterally for one page, rather than as a site-wide pass, would create an inconsistency of its own. Flagged as a real, pre-existing site-wide gap worth a future pass — not fixed here.
- **No hover-elevation or card chrome on rows.** See §3 — a deliberate, named departure from `PostCard`/`ProjectCard`'s card register, not an unfinished version of it.
- **No redesign of `BlogIndex`'s own GitHub-reports empty-state link.** It's currently unreachable (14+ posts exist) and out of this PR's scope; noted rather than implying it was addressed.

---

## 9. Open questions for Dom

1. **H1 wording** — "Run Reports" (recommended) vs. "The Run Log" (§7). Genuine naming-pattern taste call.
2. **"No recorded output" microcopy** — "no recorded output for this run" (recommended, ledger register) vs. "no post or project linked to this run" (plainer language) — §7.
3. **Outbound CTA label** — "Read the report ↗" (recommended) vs. "View on GitHub ↗" — §7.
4. **Confirm repointing the footer's "Run reports" entry to `/reports`** once PR 4 ships. This document agrees with the spec's own recommended default (§4), but PR 4's scope description still marks it "pending Q3" — worth an explicit yes before frontend-dev wires it, since it is the one part of PR 4 that changes an existing, currently-shipped link's destination.
