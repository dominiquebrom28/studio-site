# Run report — 2026-07-15 (Persona bible + Scaffold, concept built)

## Item(s) worked on
Two backlog items in one session — **Persona bible** (item 3) and **Scaffold**
(item 4) — plus the merged foundation and a spec fix. Branch:
`team/2026-07-15-persona-and-build`.

This run was **live-steered by Dom**, not a standard autonomous single-item run.
Dom gave the design-brief's Phase-2 visual sign-off ("the visual direction looks
very good, keep going") and explicitly asked to *implement the concept now*, not
just write more docs. So the usual "one item per run, stop" rule was overridden
by the human in the loop. (Work continued past midnight into 2026-07-16; dates
below stay on the run's 2026-07-15 identity to match the branch and sibling
reports.)

## What was done

### Foundation merged to main (unblocked by Dom's sign-off)
The two approved docs were sitting on unmerged branches gating everything. With
Dom's sign-off, merged `team/2026-07-15-studio-mvp` (architecture spec + design
brief + backlog) into `main`, so the build has a clean base and tomorrow's
morning-brief run branches from real ground instead of a stack of branches.
`team/2026-07-15-architecture-spec` is now fully contained in main (redundant,
safe to delete).

### Spec fix (Project Lead, trivial)
The design brief flagged that `/cast` was used throughout but missing from
`docs/spec.md`'s route table. Added the route + a data-source decision (static
`src/content/cast.ts`, not a content collection — these are fixed studio
identities, not files writers add to).

### Persona bible (designer → Judge loop) → `docs/persona-bible.md`
The designer formalized the 9 characters (8 specialists + Project Lead), each
with voice/tone, a **sourced** running bit, color + glyph + portrait direction,
and byline rules — plus the Judge (Fable-5) as the standing reviewer device.

The **Judge (Fable-5) scored it REVISE · 87/100** and did exactly the job that
justifies the loop on a site whose entire premise is real provenance: it caught
**three fabrication-flavored overclaims** hiding inside "sourced" citations —
  1. the `PASS · Round 1 · 91/100` string presented as a *verbatim* report
     artifact when the report actually says "converged on round 1 — PASS,
     91/100" (a normalized format sold as a literal quote);
  2. qa-tester's "even on a third revise round" — an invented flourish; revise
     rounds belong to the judge loop, not qa-tester's definition;
  3. "roughly an hour of debugging" on the SoulForge loader-cap bug — not in
     commit `bfc11e6`; it leaked in second-hand from the design brief.
Plus 5 nits (ambiguous `CLAUDE.md` citation, a punctuation-drifted "literal"
quote, two inference-as-fact lines, split citations for the two frontend-dev
bugs). All 8 fixed directly (surgical corrections, not judgment calls). The
running bits now cite only primary sources; thin-history characters (backend-dev,
devops, marketer, qa-tester, security-auditor) are honestly flagged
standing-rule-only rather than given invented war stories.

### Scaffold + concept implemented (frontend-dev → qa-tester → fix round)
frontend-dev scaffolded the whole app from nothing — Vite + React 19 + TS
(strict) + Tailwind **v4** (CSS-first `@theme`) + react-router 7 — implementing
the "Machine-made, hand-felt" Studio Logbook system: light + dark design tokens
(warm paper / ink-on-slate, every brief contrast value), Fraunces + JetBrains
Mono + Caveat (self-hosted), hard flat offset shadows, paper-grain overlay,
content loader (`import.meta.glob` + a **browser-safe** frontmatter splitter +
Zod — deliberately not `gray-matter`, which throws `Buffer is not defined` in a
browser bundle), app shell (header w/ focus-trapped mobile drawer, footer, skip
link, no-flash dark-mode toggle), a fully-built Home page, and all remaining
routes real-but-minimal. Placeholder content is clearly labeled (no invented
project claims).

**qa-tester returned a real FAIL** (correctly — never soften): it added a
57-test Vitest suite (there was none) and found 3 bugs — a P0 spec violation
(filename-derived slugs skipped kebab-case validation), a frontmatter
empty-block parse bug, and an inaccurate self-report (`CharacterCard` hardcoded
`<h2>` instead of the claimed `headingLevel` prop). Security ([FE]) and a11y
posture otherwise verified solid (no `dangerouslySetInnerHTML`/`rehype-raw`,
`javascript:` URIs rejected, no secrets/source-maps, focus rings, reduced-motion,
44px targets, real focus trap).

**Browser verification (Project Lead) caught a 4th bug the green build could
not:** the hero `<h1>` rendered one word per line because
`--spacing-{xl,2xl,3xl,4xl}` in the Tailwind v4 `@theme` block clobbered the
reserved size-name scale that `max-w-*` reads from → `max-w-2xl` computed to 48px
instead of 42rem. Diagnosed to root cause (3 affected call sites).

All 4 went back to frontend-dev in **one consolidated fix round**. Root-cause fix
for the token collision: the named spacing aliases were never actually used
(every component already uses Tailwind's numeric spacing, which matches the
brief's 4px scale), so they were removed from the Tailwind `@theme` namespace
entirely and kept as inert `:root` `--space-*` vars — killing the whole
collision class, not just this instance. Final gate: **typecheck ✓ / build ✓ /
lint ✓ / 57/57 tests ✓.**

Then re-verified live in the browser (dev server on :5173): **hero renders
correctly in both light and dark**, all 9 tinted character stamps present
(glyphs, not faces), the dark-mode primary-button label fix confirmed, zero
console errors, clean a11y tree (skip-link first, labeled toggle, single-`<a>`
cast cards).

## Decisions made and why
- **Merged foundation to main mid-run.** The autonomous guardrail is "never
  commit to main"; Dom was live and signing off, and tomorrow's autonomous run
  branches from main, so the foundation *had* to land there for the site to
  progress coherently. Reversible (local, unpushed).
- **Two items in one branch/session.** Dom asked to finish and keep going;
  Persona bible + Scaffold shipped on one branch. Reviewable together.
- **Applied the Judge's blocking fixes directly** rather than spending another
  worker round — they were unambiguous overclaim corrections, not design calls.
- **Removed the named spacing scale from `@theme`** instead of band-aiding 3
  classes — the collision was a whole class of latent bug; the aliases were dead
  anyway.

## For Dom to review
- **Branch `team/2026-07-15-persona-and-build`** — merged to `main` at end of run
  (spec fix, `docs/persona-bible.md`, full scaffold, 57 tests). Dev server is
  still up at **http://localhost:5173** if you want to click around before I
  stop it.
- **Two open items still on you** (unchanged, flagged since the design brief):
  1. **No studio name/wordmark** — the header ships `[ STUDIO NAME TBD ]`. Pick a
     name when ready.
  2. **Notion backlog synced** — Architecture spec + Design brief → Done, added
     the missing **Persona bible** row, Scaffold → Done. It now mirrors
     `BACKLOG.md`.
- **Minor polish for a later pass (not blocking):** a few avatar glyphs are
  loose interpretations of the persona-bible spec (e.g. security-auditor reads
  more "screen" than "rubber stamp") — worth a glyph-fidelity tidy when someone's
  in there. The unused `@content` Vite alias and the 3-of-6 placeholder projects
  are the next backlog item ("Portfolio content").

## Learnings (blog-worthy)
- **The reviewer earns its keep on the honesty axis, not the taste axis.** A
  cheap Fable-5 pass caught three claims that *looked* sourced — each sitting
  inside a real `(sourced: ...)` citation — but subtly overstated the source. On
  a site whose whole pitch is "the provenance is real," that's the exact defect
  that would have quietly falsified the premise. The scariest fabrications wear a
  citation.
- **A green build is not a working UI.** typecheck + build + lint + 57 unit tests
  all passed while the hero was silently rendering one word per line. Only a
  human/agent with an actual browser caught it. Automated gates verify *code*,
  not *pixels*; visual verification is a separate, non-optional gate — and the
  agents couldn't self-serve it (no browser tool in their environment), so it
  landed on the lead.
- **Design-token names collide with framework internals.** Naming a spacing
  scale `2xl/3xl/4xl` in a Tailwind v4 `@theme` block silently overrode the
  container scale `max-w-*` depends on. The fix was to *not* register semantic
  aliases that shadow reserved names — a good rule for any design-token port.
- **Cross-project preview is a real friction.** The managed preview tooling is
  bound to the primary repo; verifying a *second* project's dev server took a
  manual server + browser-by-URL. Worth smoothing for a multi-project studio.
