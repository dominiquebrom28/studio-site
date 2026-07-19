# Team rebuild model

**Status:** draft for Dom's review · **Author:** architect (Theo)
**Amends:** `docs/spec.md` §3 · **Composes with:** `docs/provenance-model.md`, `docs/project-page-v2.md`
**Source:** Dom, 2026-07-19 — *"maybe even make a new version of these current solo-projects with your help… i want the whole team to review these and re-invent them."*

---

## 1. Summary

The studio will take an existing solo project, review it as a team, and build a
second version of the same product. Both versions stay published. This spec makes
the second version **a normal project entry that names its ancestor**, adds a small
required block of honest self-assessment, and — deliberately — **does not build a
solo-vs-team scoreboard**. The comparison is carried as a decision log of what
changed and why, plus one required admission of what the solo version did better.
Six existing project files are untouched, byte for byte.

---

## 2. Structure: peer entries joined by a lineage edge

**Recommendation: a separate project entry per build, with a single directional
`rebuild.of` field on the descendant.** Not versions inside one entry.

### 2.1 Why not one entry with two versions

The versioned-entry model looks tidier and is wrong here, for reasons already
visible in the code on disk:

- **Every field in `ProjectFrontmatterSchema` is singular and would need to fork.**
  `status`, `stack`, `repo`, `liveUrl`, `cover`, `media`, `date`, `summary`, and the
  whole markdown body all differ between builds. A versioned entry is not "one
  project with a version array" — it is two projects sharing a filename.
- **The body is the product.** Each write-up's substance is *this build's* story.
  Two bodies in one file means either in-file tab routing or a synthetic merged
  narrative — and the second is where fabrication gets in.
- **`media` and `cover` are per-build artifacts**, living at
  `public/images/projects/<slug>/`. Two builds need two asset folders, which means
  two slugs anyway.
- **Provenance joins on file paths.** `provenance-model.md` §4.1 binds a `produced:`
  path to at most one report. Two builds in one file means one path carrying two
  production records — which that model explicitly forbids as ambiguous.
- **Names and scope may diverge.** Dom said "re-invent them." A re-invention that
  keeps the same name is a coincidence, not a constraint.

### 2.2 Why the edge lives on the child, and nowhere else

`rebuild.of` points at the **immediate ancestor's slug**. One direction only. The
reverse (`rebuiltBy`) is **derived in the loader, never authored** — two authored
halves of one relationship is two places to typo and one place for them to disagree.
Same argument that put the provenance join on `produced:`.

This gives a chain, which answers both hard cases:

- **Rebuilt twice:** `soulforge` ← `soulforge-team` ← `soulforge-team-2`. Walk the
  chain to render "third build of this product." No schema change. Multiple children
  of one ancestor are also legal (two competing rebuilds) and render as siblings.
- **Abandoned halfway:** nothing structural happens. `status: "archived"`,
  `outcome: "abandoned"`. It stays published. **An abandoned rebuild is the single
  most interesting page this model can produce** and must never be second-class —
  see §4.3.

### 2.3 What this deliberately does not create

No third entity. No "comparison" content type, no `/compare` route, no case-study
record joining two projects. A comparison object would need its own authorship,
provenance and review — and would exist to hold claims *about* two things while
being accountable to neither. The comparison lives in two places that already have
owners: a few fields on the rebuild entry (§4), and a blog post (§8).

---

## 3. Evidence asymmetry — the load-bearing section

**The problem, precisely.** The solo projects' process data was reconstructed by
reading git after the fact. A team rebuild will have run reports, PR numbers, named
agent bylines, Judge verdicts and token figures, logged as the work happened. If
both render in the same visual grammar, the solo side shows fewer facts — and a
reader cannot distinguish *"this build had less rigour"* from *"this build had less
telemetry."* Presenting an instrumentation gap as a quality gap is a measurement
artifact dressed as a judgement, committed by the feature that most loudly
advertises honesty.

**Four binding rules.**

**R1 — Symmetric evidence only, in any comparative surface.** A fact may appear in a
comparison only if obtainable **by the same method on both sides**. In practice that
means **git and nothing else**: first commit, last commit, elapsed span, commit
count, burst shape, stack, status. This is exactly what `BuildTimeline` already
derives, and it works unchanged on a team-built repo.

**R2 — Asymmetric evidence renders only on its own build's page, never as a
comparison row.** Judge verdicts, reviewer chips, agent bylines, run-report links,
token costs appear in the rebuild's own provenance section. They never appear in a
two-column layout, because the solo column would be empty. A row labelled "Judge
verdict" with one side filled is not a missing value; it is an unearned point scored.

**R3 — The instrumentation gap is stated in rendered copy, and that copy is derived,
not authored.** Any surface showing both builds carries one non-removable line,
generated from each build's evidence basis:

> *These two builds were recorded differently. The solo build's process was
> reconstructed from its git history after the fact; the rebuild's was logged as it
> happened. Fewer facts on one side means less was written down, not that less was
> done.*

Derived, because an authored disclaimer is a string someone deletes on the day the
comparison finally looks good.

**R4 — Reuse the recorded/inferred convention; do not invent a second vocabulary.**
`project-page-v2.md` §1 already distinguishes recorded fact from *OUR READ*
inference in italics. Extend it to a page-level `evidenceBasis`
(`'recorded' | 'reconstructed'`), derived — a build is `recorded` iff run reports
are attached, `reconstructed` otherwise.

**What this costs.** The most quotable numbers — cost, review depth, verdicts — can
never go in the comparison. That is the correct outcome: they are unavailable for
the solo side at any price, and a comparison built on one-sided data is not a
comparison.

---

## 4. Is comparison even the point? A genuine opinion

**No head-to-head comparison view. Build a divergence log instead.**

The pull toward a before/after is real — same product, same person, different
process is as close to a controlled variable as a studio ever gets, and it is
literally the thesis. It is still a trap, for three reasons.

**First, the controlled variable is a fiction.** Between the solo build and the
rebuild sit: a year of Dom's own skill growth, better models, hindsight about the
product, an existing codebase to crib from, and — decisively — **the rebuild starts
with a working reference implementation.** It is not "same person, different
process." It is "second attempt at a problem already solved once." Any scoreboard
silently attributes that whole bundle to the team. That is not a small caveat; it is
most of the effect.

**Second, a comparison view is a shape that demands a winner.** Two columns and a row
of metrics is a scoring interface. Whoever fills it in feels the pull toward rows
where the team wins, and the honest rows — *the solo version shipped in 67 minutes;
the rebuild took three runs and is unfinished* — read as apology copy inside a layout
designed for triumph. Layout is not neutral.

**Third, "which is better" is the least interesting question available.** The reader
already believes an AI team can produce software. What they cannot get anywhere else
is: **what did nine reviewers actually change, and were they right?** That is a list
of specific, falsifiable decisions, each interesting whichever way it went. It
survives an unflattering rebuild intact — a rebuild that got worse still produces a
great list.

### 4.1 What replaces it

Three fields on the rebuild, rendered as a `RebuildPanel` on the rebuild's own page:

- **`outcome`** — required enum: `better | mixed | worse | abandoned | too-early-to-say`.
- **`soloDidBetter`** — **required, non-empty prose.** What the original got right
  that the rebuild lost or hasn't matched.
- **`divergences[]`** — up to 12 entries of `{ area, change, why, regression }`. The
  substance.

### 4.2 Mechanisms that make an unflattering page as cheap as a flattering one

Stated concretely, because "we'll be honest" is not a mechanism:

1. **`outcome` is required with no default.** No path where omitting the field yields
   a favourable-looking page. Forced at authoring time, visible in the PR diff, and
   `worse`/`abandoned` cost exactly one word.
2. **`soloDidBetter` is required; `teamDidBetter` is optional.** The asymmetry is
   deliberate: flattering claims get written without encouragement — they are the
   reason anyone builds the page. The self-critical one evaporates unless the schema
   holds a slot open and the build fails without it.
3. **`divergences[].regression` is a boolean, not a sentiment.** A change that made
   something worse sits in the same list, same component, same visual weight,
   differing by one flag. Regressions are not a separate section that can be quietly
   left empty — they interleave with the wins, which is how they actually happened.
4. **Outcome chips are tonally flat.** All five values in the same neutral ink,
   meaning carried by the word, not by green/red. A red `worse` chip is a punishment
   for honesty, and people avoid punishments.
5. **The timeline shows elapsed time on both sides regardless of who it flatters**
   (R1). If the solo build took 67 minutes and the rebuild took three runs across two
   weeks, that renders, because it comes from git and nobody typed it.
6. **`abandoned` is a publishable state, not an error state** (§4.3).

### 4.3 The abandoned case, explicitly

A rebuild that stops halfway must be shippable *as it stands*, with no extra work and
no apology framing:

- `status: "archived"`, `outcome: "abandoned"`, `divergences: []` — all legal.
  `soloDidBetter` is still required, and for an abandoned rebuild it is usually the
  whole story: *"it exists."*
- Nothing in CI, the loader, or the components may require a rebuild to have
  divergences, media, a live URL, or a completed body.
- No "coming soon," no progress bar, no unfilled slots — per `provenance-model.md`
  §6, a visible placeholder is a slot that invites a plausible guess.

---

## 5. Schema

Additive. Everything new is `.optional()` or `.default()`.

```ts
export const RebuildOutcomeSchema = z.enum([
  'better',            // the rebuild is the better product, on balance
  'mixed',             // better in some ways, worse in others
  'worse',             // the original is still the better product
  'abandoned',         // stopped before it was comparable
  'too-early-to-say',  // in progress; no honest verdict yet
]);

export const DivergenceSchema = z.object({
  area: z.enum([
    'scope', 'stack', 'architecture', 'design',
    'process', 'data-model', 'testing', 'other',
  ]),
  change: z.string().min(1).max(240),
  why: z.string().min(1).max(400),
  regression: z.boolean().default(false),
});

export const RebuildSchema = z.object({
  /** Slug of the IMMEDIATE ancestor. Reverse edge derived, never authored. */
  of: z.string().regex(slugPattern),
  outcome: RebuildOutcomeSchema,                        // required, no default
  soloDidBetter: z.string().min(1).max(400),            // REQUIRED
  teamDidBetter: z.string().min(1).max(400).optional(), // deliberately optional
  divergences: z.array(DivergenceSchema).max(12).default([]),
  /** repo-relative `reports/*.md` paths; existence validated at build time. */
  runReports: z.array(z.string().min(1)).default([]),
});
```

On `ProjectFrontmatterSchema`, exactly one new key:

```ts
  rebuild: RebuildSchema.optional(),
```

`rebuild` present does **not** force `buildMode: 'team'` — a solo rebuild of a team
project is coherent, and forbidding it buys nothing.

### 5.1 What happens to the six existing files

**Nothing.** Not "nothing much" — nothing. `rebuild` is optional; the six files set
no `rebuild` key; they parse to identical objects, sort identically, render
identically. No migration, no backfill.

This gets a test: parse all six, assert `rebuild === undefined`, assert
`getRebuildsOf(slug)` returns `[]`, assert the rendered page contains no
rebuild-related node. Its job is to fail loudly the day someone "helpfully" adds a
lineage field before the rebuild exists.

---

## 6. Loader, graph validation, API

### 6.1 Derived helpers

```ts
getRebuildsOf(slug): Project[]      // direct children, date asc
getAncestor(slug): Project | undefined
getLineage(slug): Project[]         // root → … → this
getBuildIndex(slug): number         // 1-based position in the lineage
```

Reverse index computed once at module eval from the forward edges.

### 6.2 Build-time failures — same posture as the rest of the repo

| Condition | Outcome |
|---|---|
| `rebuild.of` names a slug that doesn't exist | **Build error** — dangling ancestor |
| `rebuild.of === slug` | **Build error** |
| Lineage chain contains a cycle | **Build error**, naming the cycle |
| A `runReports` path doesn't exist on disk | **Build error** — a dead citation on an honesty feature is a defect |
| A `runReports` path escapes `reports/` or contains `..` | **Build error** |
| A project has no `rebuild` | Normal. `evidenceBasis: 'reconstructed'` |
| A rebuild has `runReports: []` | Legal — runs may not be written up yet |

### 6.3 Content-validation gate

One policy rule beyond the structural checks:

- **`outcome: 'better'` with an empty `divergences` array fails the gate.** A claim
  that the rebuild is better, with zero specific changes recorded, is an unsupported
  assertion on the site's most reputationally exposed page. `worse`, `mixed`,
  `abandoned` and `too-early-to-say` carry no such requirement — the burden falls
  only on the flattering claim.

*Given the 2026-07-19 lesson that a gate can itself be wrong: this one is opinionated
policy, not a fact check. If it ever blocks something true, suspect the rule.*

---

## 7. Composition with the provenance model

**Three layers, three questions, three components. They must be labelled so a reader
never confuses them.**

| Layer | Question | Applies to | Source | Component |
|---|---|---|---|---|
| **Write-up provenance** | Who wrote *this page*? | Every project, identically | `reports/` + git | `ProvenanceStrip` — unchanged |
| **Build timeline** | When was the *product* built? | Every project, identically | The project repo's git history | `BuildTimeline` — unchanged |
| **Build provenance** | Which studio runs produced this build, at what cost? | **Rebuilds only** | `rebuild.runReports` | `RebuildPanel` — new |

Three consequences:

1. **`provenance-model.md` §9's exclusion still holds and is now load-bearing.** It
   says: *"We record how the write-up was produced, not how SoulForge was built."* A
   rebuild is the first case where the studio built the product too, and the
   temptation will be to extend the generator across repos. **Do not.** Build evidence
   enters as report links plus git-derived timeline facts, and nothing else.
2. **The two provenance surfaces must be visibly distinguished.** Today
   `ProvenanceStrip` would read "Written by Sanne, marketer" and a reader could take
   that as *who built the project*. On a solo project that is confusing; on a team
   rebuild it is a false claim about software authorship. Label the strip
   **"About this write-up"** and the panel **"About this build."** This should land
   *before* the first rebuild page.
3. **Report links reuse the constructed-URL rule** — hardcoded base plus a validated
   repo-relative path. No URL is ever read from content.

---

## 8. Routing and IA

**Peer routes. No nesting.** A rebuild lives at `/projects/<its-own-slug>`. A nested
URL encodes ancestry as identity — it breaks when the rebuild is renamed, breaks
worse when the rebuild becomes canonical, and commits the site to a hierarchy that
`rebuild.of` already expresses in data.

Slug convention `<ancestor>-team` *if the name doesn't diverge*; when it does, the
slug follows the new name and the lineage chip carries the connection. **The slug is
not the relationship.**

**`/projects` shows every build as a peer card**, each carrying its `buildMode` chip,
and a rebuild additionally carrying a small mono lineage chip: `rebuild of SoulForge`.
No grouping or nesting in v1 — six entries becoming seven does not justify a new
taxonomy. Revisit at ~a dozen entries or the first three-build chain.

**On detail pages**, one reciprocal line each way, from the derived index:
`Rebuilt by the team →` on the ancestor, `← Rebuild of SoulForge (solo, 2026)` on the
rebuild.

---

## 9. Dom's decisions, not the architect's

1. **The no-scoreboard stance itself** (§4). If Dom wants a head-to-head view, this is
   the wrong spec and should be rewritten rather than have a table bolted on.
2. **`soloDidBetter` being required** (§4.2.2) — a schema-enforced obligation to
   criticise your own team's work on every rebuild page, forever. Reasonable people
   would call it excessive.
3. **The `outcome: 'better'` gate rule** (§6.3) — CI making the flattering claim more
   expensive to publish than the unflattering one.
4. **Tonally flat outcome chips** versus semantic colour.
5. **Public vocabulary.** "Rebuild" is a working word; "v2," "team edition,"
   "re-invention" (Dom's own word) read differently.
6. **Whether a superseded original gets `status: 'archived'`.** Recommendation: **no**
   by default — archiving the solo version to promote the team version is exactly the
   thumb-on-the-scale this spec exists to prevent.
7. **Enabling `ProvenanceStrip` on project pages** with the "About this write-up"
   label (§7.2), which reverses the 2026-07-17 decision.

---

## 10. Sequencing

The smallest thing that makes a single rebuild representable is **PRs 1–3**. The
comparison apparatus can lag by weeks, and should — it should be written against a
real rebuild rather than an imagined one.

| # | PR | Scope | Depends on | Owner |
|---|---|---|---|---|
| 1 | **This spec + Dom checkpoint** | Resolve §9 items 1–3 before any code. Docs only. | — | architect → Dom |
| 2 | **Schema + graph validation** | `RebuildSchema`, derived reverse index, helpers, §6.2 failures, §6.3 gate. **No UI.** Includes the six-files-unchanged test. | 1, and project-page-v2 merging first | backend-dev |
| 3 | **Lineage affordances** | Lineage chip on `ProjectCard`, reciprocal links on `ProjectDetail`. Renders nothing when no rebuild exists. | 2 | frontend-dev → qa-tester |
| 4 | **First rebuild content file** | One markdown file in whatever state it's actually in. Content only. | 3 | lead |
| 5 | **Write-up vs build labelling** | §7.2 copy change. Small, but must precede `RebuildPanel`. | 3 | frontend-dev → Dom |
| 6 | **`RebuildPanel`** | Outcome chip, soloDidBetter/teamDidBetter, divergence list with regression flag, run-report ledger, derived R3 line, `evidenceBasis` per R4. | 4, 5 | designer → frontend-dev → qa-tester |
| 7 | **Symmetric timeline overlay** *(only if warranted)* | Two `BuildTimeline`s under one scale, git-derived only. Build only when a real rebuild has enough history. | 6 | frontend-dev |
| 8 | **The comparison post** | What nine reviewers changed and whether they were right, as a logbook post in DOM-2's multi-voice format. **The interesting writing goes here; the UI never carries it.** | 6 | marketer + lead → Dom |

Nothing reader-visible ships before PR 3, and PR 3 is inert without content, so the
whole thing can be abandoned after PR 2 with zero public residue.

---

## 11. Deliberately not building

- No comparison route, diff view, side-by-side slider, or before/after wipe.
- **No metrics or scoring** — no LOC, velocity, commits-per-hour, test-count or
  quality-score comparisons. R1 permits git facts on a timeline; it does not permit a
  leaderboard.
- No cross-repo provenance generation.
- No token-cost comparison — the solo side has no figure at any price.
- No "versions" abstraction, no `supersededBy`, no canonical-build flag.
- No project-index grouping, filtering, or lineage tree UI.
- No requirement that a rebuild ever produce a comparison at all.

---

## 12. Risks

- **The comparison stance quietly erodes the day a rebuild looks good.** The most
  likely failure, and a *social* one: someone adds a "highlights" section, then a
  metric, then a table, with the guardrails nominally still in place. §4.2's
  mechanisms are schema- and CI-level rather than convention-level, but it will still
  take a human saying no.
- **Content debt** — a rebuild ships and its page never gets written. Mitigation: PR 4
  ships early and honestly incomplete.
- **The rebuild never happens.** If PR 2 lands and no rebuild follows for two months,
  the repo carries a dormant, tested, invisible field — cheap, and the reason PRs 1–3
  are the recommended stopping point.
- **Reader confusion between "who wrote the page" and "who built the thing."** Real
  today, dangerous once team builds exist. §7.2 is the fix; do not defer it.
- **Someone reconstructs solo process data to "even up" the comparison.** The direct
  analogue of the backfill temptation in `provenance-model.md` §11, and worse here
  because the motive is comparative. The standing answer: an asymmetry that is visible
  is honest; an asymmetry that is filled in is fabrication.
