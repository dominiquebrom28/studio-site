# `buildMode` tail — decision assessment

**Branch:** `team/2026-07-19-project-page-v2` @ `26c0d1c` · **Written:** 2026-08-05
**Backlog:** HIGH, open since 2026-07-21 with "Dom's call" as its only next step

**Method.** architect read the tail's 11 files at the branch tip against `main`'s
current versions. Claims are tagged **[read]** (verified by reading both files),
**[measured]** (verified in a real browser at 1280px against the built `dist/`),
or **[inferred]**. Where git cannot answer, it says **[not reconstructable]**
rather than guessing.

---

## TL;DR — recommendation: split it three ways

Do not merge the tail, and do not delete it wholesale.

1. **Recover the layout fix only** — because **`main` still has a live,
   user-visible caption-overlap bug, and the site already published a post
   saying it was fixed.** That is an honesty defect on the honesty site, and it
   is the only urgent thing here. **[measured]** Half a day.
2. **Drop the `buildMode` feature as superseded.** `main` shipped `soloBuild` on
   2026-07-24 solving the same reader-facing problem, now load-bearing across 24
   files and a published post. Merging `buildMode` now is a re-design, not a
   merge — and there are still zero team-built projects to justify it.
3. **Keep `docs/team-rebuild-model.md`** as reference-only, with a corrected
   status header. Its §3–§4 is the best thinking in the tail and addresses a
   decision the studio will actually face.

Cost of full recovery (option a): **2–4 days**, most of it re-litigating a
decision `main` already made. Cost of full deletion (option b): you ship a live
layout bug and leave a published claim false.

---

## 1. What the feature is

Two separate things got tangled into one branch tail, and they are worth judging
separately.

### 1a. `buildMode` — "who was building at this point in the story"

**[read]** The reader-facing behaviour is small:

- Each timeline phase gains `mode: 'solo' | 'team'`, defaulting to `solo`.
- The project's label — `solo`, `team`, or `solo-to-team` — is **derived** from
  those phases in the loader, never authored separately.
- `/projects` cards get a chip: "Solo build" / "Team build" / "Solo → Team".
- The project hero eyebrow reads "SOLO BUILD · NO AGENT TEAM" / "BUILT WITH THE
  TEAM" / "SOLO BUILD → THE TEAM JOINED".
- On the timeline, where solo phases give way to team phases, a marker reads
  **"The team joins"** and the rule changes colour from that point on.

One sentence of product: *a project can start solo and have the team join
partway through, and the page shows where.* **[read]** For all six all-solo
projects, everything renders exactly as before.

### 1b. The 459-line doc, and which half of it is dead

**[read]** `docs/team-rebuild-model.md` contains **two designs, and says so in a
banner at the top of the file.**

**The rejected design** (§2, §5's `rebuild` key, §6.1, §6.2, §8): a team rebuild
would be a *second* project entry pointing at its ancestor via `rebuild.of`, with
lineage chips, reciprocal links, a `RebuildPanel`, an `outcome` enum and a
required `soloDidBetter` field. The doc's own banner says: *"Do not implement §2,
§5's `rebuild` key, §6.1, §6.2 or §8 as written."*

**The adopted design.** Dom overruled it, verbatim in the doc — one project, one
timeline, one continuous story. That is §1a, and that is what the code
implements.

**The part that survives both and is still unbuilt.** §3 and §4 are the doc's
real contribution and have nothing to do with `buildMode`:

- **§3, evidence asymmetry.** Solo projects' process data was reconstructed from
  git after the fact. Team builds will have run reports, reviewer names, Judge
  verdicts, token counts. Render both in the same grammar and a reader cannot
  distinguish *"this build had less rigour"* from *"this build had less
  telemetry."* The sharpest of its four rules: a fact may appear in a comparison
  only if obtainable **by the same method on both sides**.
- **§4, no scoreboard.** A solo-vs-team comparison view is a trap — the
  "controlled variable" is a fiction (the rebuild starts from a working reference
  implementation), and *"a comparison view is a shape that demands a winner."*

**[inferred]** §3–§4 will matter the first time the studio ships a project it
actually built. Nothing on `main` covers this ground.

**Why the tail was abandoned: [not reconstructable].** No run report for that
session, no PR, no message. Two commits say "Supersede…", but that supersedes the
*doc's* §2, not the branch.

---

## 2. Is it finished?

Roughly PR-ready as code; **not** finished against this repo's actual bar.

**Genuinely good. [read]** Matches house style closely — derived-not-authored
(same pattern as `normalizePost`), additive schema with defaults so all six
content files parse byte-identically, DOM-free logic in `timeline.ts`, dense
"why" comments, and an all-solo project rendering pixel-identically
(`buildRuleSegments([])` returns one full-width solo segment on purpose).

**What the 255 new test lines cover. [read]** `findHandoffs` (none for all-solo,
none for all-team, one at midpoint, order-independent, multiple on toggle),
`buildRuleSegments` (empty, one, multiple out-of-order),
`numberPhasesChronologically` (the exact MensApp shape, tie-breaking, zero
phases), and `deriveBuildMode` across solo/team/mixed in both array orders.

**What they don't.**

- **No component test anywhere.** Nothing renders `BuildTimeline`, `ProjectCard`
  or `ProjectHero` and asserts "The team joins" appears or that the chip reads
  "Solo → Team". The entire UI half — every string in `buildMode.ts` — is
  untested.
- **`ProcessPhaseSchema`'s `mode` default is untested. [read]**
  `schemas.test.ts` is not among the 11 changed files.
- **One test's name overclaims what it asserts. [read]** `loader.test.ts:386` is
  named *"the six real project frontmatter files all normalize to `buildMode:
  "solo"`"* — it does not read the six files. It loops three `status` values over
  a synthetic `rawProject()`. In a repo whose own logbook has a post about a gate
  covering a ninth of what it claimed, this is the same defect class.

**Dead code: none. [read]** `mode` → `deriveBuildMode` → `buildMode` →
chip/eyebrow/marker is wired end to end — clean on the `cover`/`liveUrl`/
provenance-strip worry. But the flip side: **no content file sets `mode: 'team'`,
so every path added here is unexercised by real data.** The feature is complete
and invisible.

**Gates it never passed. [read]** `buildMode.ts`'s own header says it: *"Every
string this file exports is PUBLIC-FACING COPY … has not had Dom's sign-off."*
No QA pass. And **no amendment to `docs/project-page-v2.md`**, despite both
`BuildTimeline.tsx` and `timeline.ts` carrying comments claiming the deviation is
*"noted there for Dom to reconcile the spec."* It was never noted there.

---

## 3. Does it still apply? How far has `main` moved?

**Substantially. A cherry-pick is not clean on any of the five source files.**

| File | Divergence | Outcome |
|---|---|---|
| `ProjectCard.tsx` | **[read]** `main` renders `{project.soloBuild && <Chip>{soloBuildLabel(project.template)}</Chip>}` **in the exact DOM slot** the tail puts its `<Badge>{buildModeChipLabel[project.buildMode]}</Badge>`. | Hard conflict. Two competing answers in one `<div>`. |
| `ProjectHero.tsx` | **[read]** `main`: `soloBuildLabel(project.template)` gated on `project.soloBuild`. Tail: a `buildMode`-keyed lookup, rendered unconditionally. | Hard conflict, same three lines. |
| `ProjectsIndex.tsx` | **[read]** Both add an explanatory paragraph in the same position, with different copy. | Hard conflict — and a **copy** decision, not a code one. |
| `loader.ts` | **[read]** The tail's anchor is `buildCollection(…, 'project')` at line 92; `main`'s is `buildCollection(…, 'project', provenanceArtifact)` at line 204, with ~112 lines inserted above it. `main` has no `normalizeProject` at all. | Conflict; the normalize step must be re-inserted against a rewritten file. |
| `schemas.ts` | **[read]** `main` gained `soloBuild: z.boolean().default(true)` with a 22-line rationale. The tail adds `mode` to `ProcessPhaseSchema` plus a derived `buildMode`. | Textually mergeable; **semantically contradictory** — two fields for one fact. |
| `BuildTimeline.tsx` | **[read]** `main` unchanged in structure since PR #25. The tail rewrote the desktop layout wholesale (~150 lines) and interleaved handoff rendering through both paths. | Not a conflict — a replacement. See §5. |

**[read]** One easy-to-miss non-problem: `main`'s
`src/smoke/motion-resting-state.smoke.test.tsx` already loops over
`[data-timeline-rule="base"]`, so the tail's multi-segment rule would not break
it.

**Assessment:** for the `buildMode` half this is **re-authoring, not rebasing.**
Every conflicting hunk is a *decision* — "which of two competing labels does this
slot show?" — that no merge tool can resolve and no developer can resolve without
Dom.

---

## 4. Conflicts with decisions since made

### The decisive one: `soloBuild` shipped, `buildMode` did not

**[read]** On 2026-07-24 `main` shipped an authored `soloBuild: z.boolean()
.default(true)`. It is load-bearing across **24 files** — all 7 project content
files, `soloBuild.ts` + its test, `ProjectHero`, `ProjectCard`, `ProjectsIndex`,
`ProjectDetail`, assertions in four component test files — plus a published post,
`2026-07-24-true-by-accident.md`.

|  | `soloBuild` (shipped) | `buildMode` (the tail) |
|---|---|---|
| Source | Authored boolean in frontmatter | Derived from `process.phases[].mode` |
| Granularity | Whole project, permanent | Per phase, chronological |
| Forget it → | under-claims the team (deliberate, documented) | phases default `solo` |
| Can express "team joined later" | **No** | **Yes** — its whole point |

**[inferred]** The tail's design is, on the repo's own stated principles, the
better one — `main`'s own `schemas.ts` comment argues for `soloBuild` being
explicit content rather than "an unstated global assumption", and
derived-from-phases is *more* explicit still, with no second source of truth.
But `soloBuild` is shipped, tested, content-authored and publicly described.
**`buildMode` is not a merge candidate; it is a proposal to replace a shipped
subsystem, and should be judged as one — when a team-built project exists to
justify it.** There is not one today.

### The doc's §7.2 recommendation already shipped independently

**[read]** §7.2 argued the provenance strip must be labelled **"About this
write-up"** so a reader never confuses "who wrote this page" with "who built this
software". `main`'s `ProjectDetail.tsx` now renders exactly that. The advice was
taken; it did not need this branch.

### The one thing that did *not* ship — and this is the finding

**[read]** `main`'s `content/posts/2026-07-19-three-tries-at-the-same-overlap.md`
is published (`draft: false`) and describes captions leaving absolute positioning
to become an ordered list *"where overlap is structurally impossible rather than
merely tested against."*

**[read] That fix is not on `main`.** `main`'s `BuildTimeline.tsx` still renders
`DesktopPhaseCaption` — absolutely-positioned `w-56` boxes, alternating
above/below. The ordered-list rewrite exists **only** in the tail's `ba799f8`.

**[measured] And the bug is live.** Verified in a real browser at 1280px against
the built `dist/`, not computed:

| Route | Phases | Overlap |
|---|---|---|
| `/projects/mensapp` | 5 | **Yes — 196.3px (above row), 182.5px (below row)** |
| `/projects/studio-site` | 5 | **Yes — 76.7px (above row), 60.4px (below row)** |
| pizzaparty, lovediary, soulforge, portfolio | 2–3 | No |
| chart-token-playground | 0 | N/A (no process section) |

Measured rule width is **720px**, not the 800px the original arithmetic assumed;
the position math cancels out and the mensapp predictions still landed within
~4px. **The overlap is genuinely unreadable** — italic caption text interleaved
character-for-character in both rows, confirmed by screenshot, not a
transparent-padding box artifact. Scope is exactly the two projects with 5 phases
whose dates cluster early in a long domain.

So: **the site publishes a first-person account of a fix that was never merged,
describing a bug still on screen — including on `/projects/studio-site`, its own
portfolio entry.** For a studio whose positioning is honest provenance, that
outranks the `buildMode` question entirely.

**[measured] One claim in the tail does NOT reproduce.** The sixth commit
(`26c0d1c`, "Fix commit-log disclosure overlapping the last phase item by 7px")
fixes something that is **not broken on `main`**: the commit-log `<details>` sits
~404px clear of the last caption on both affected pages, because `main`'s
existing `pt-[22rem] pb-[22rem]` headroom already covers it. That commit is
therefore **out of scope for the port** — a useful correction, since the original
assessment recommended recovering it.

---

## 5. Recommendation

### 5a. Recover the layout fix — do this

**Scope:** from `BuildTimeline.tsx`, take `DesktopTimeline`'s ordered-list
rewrite (`DesktopPhaseNumberMarker` + `DesktopPhaseListItem`, and the fixed
`py-9` padding replacing `pt-[22rem] pb-[22rem]`). From `timeline.ts`, take
`phaseAnchorPosition` and `numberPhasesChronologically` + `NumberedPhase`. From
`timeline.test.ts`, take the `numberPhasesChronologically` block including the
MensApp-shape case. **Strip everything mode-related**: `findHandoffs`,
`buildRuleSegments`, `RuleSegment`, `TimelineHandoff`, `DesktopHandoffMarker`,
`MobileHandoffRow`, `phaseToneLabel`'s `showModeTag` parameter, and the segment
loop in `TimelineRule`. **Skip `CommitLog`'s `mt-8`** — §4 measured that bug as
already absent on `main`.

**This is not a cherry-pick.** `ba799f8` sits on top of `6cd7a54`, which
introduced the handoff code the layout code is interleaved with. It is a **manual
port of ~150 lines with the handoff parts removed.**

**Also required, or it isn't done:**

- One paragraph in `docs/project-page-v2.md` §2.2 replacing "alternating captions
  + `MarginNote` connectors" with the ordered list. The tail's code comments
  claim this was done; it wasn't.
- **A real-browser check at 1280px on mensapp and studio-site, before and after.**
  This bug escaped a green suite four times. `npm test` proves nothing here.
- Consider a Playwright assertion in the existing `e2e/` lane pinning
  no-same-row-caption-overlap, so the fifth escape is the last.

**Cost: half a day.** Zero content changes, zero schema changes, no conflict with
`soloBuild`.

### 5b. Drop `buildMode` as superseded — not as bad work

Say so explicitly, with the reason: *`main` shipped `soloBuild` on 2026-07-24 for
the same purpose; there are zero team-built projects; re-opening this is a design
decision, not a merge.* Revisit when the first team-built project exists — at
which point `buildMode`'s phase-level derivation is the better model and this
branch is a working reference implementation of it.

### 5c. Keep the doc

Land `docs/team-rebuild-model.md` as a doc-only commit with a corrected header:
status `not implemented — reference only`, a note that the `buildMode` code was
written and not merged, and a pointer to the archive tag. §3–§4 are ~200 lines of
reasoning about a decision the studio will face, cheap to keep and expensive to
re-derive. §2/§5/§6/§8 are already banner-marked superseded — leave them as the
record of the rejected alternative.

### Cost of the alternatives, honestly

- **(a) full recovery: 2–4 days.** Half a day of code; the rest deciding
  `soloBuild` vs `buildMode` with Dom, migrating 7 content files, updating 5 test
  files, rewriting two paragraphs of public copy, getting sign-off on 12 untested
  public strings, and amending three docs — to deliver a feature no current
  project uses.
- **(b) delete everything: zero effort, two real costs.** You keep a live,
  measured caption overlap on two project pages, and a published post describing
  its fix. If you take (b) you must also correct the post, which is more awkward
  than doing 5a.

---

## 6. Commands

### Step 0 — already done

`archive/2026-07-19-buildmode-tail` was created at `26c0d1c` on 2026-08-05. A tag
is a permanent ref: these commits can now never be garbage-collected, and every
option below is reversible for free. The branch also still exists on `origin`.

```bash
git -C <repo> tag -n1 -l 'archive/*'
```

Pushing the tag (`git push origin archive/2026-07-19-buildmode-tail`) is Dom's
call — it is currently local-only.

### Path A (recommended) — port the layout fix

```bash
git checkout main && git pull
git checkout -b team/YYYY-MM-DD-timeline-caption-overlap

# Read the tail's versions while porting — do NOT copy wholesale; strip
# findHandoffs / buildRuleSegments / handoff markers / showModeTag:
git show 26c0d1c:src/components/BuildTimeline.tsx
git show 26c0d1c:src/lib/timeline.ts
git show 26c0d1c:src/lib/timeline.test.ts
```

Land the doc separately so the two decisions stay reviewable apart:

```bash
git checkout main
git checkout -b team/YYYY-MM-DD-rebuild-model-doc
git checkout 26c0d1c -- docs/team-rebuild-model.md
# edit the status header per §5c before committing
```

Verification — the test suite alone is **not** sufficient:

```bash
npm run build && npm run preview
# check /projects/mensapp and /projects/studio-site at 1280px
```

### Path B — retire the branch

Only after confirming the archive tag exists.

```bash
git -C <repo> branch -D team/2026-07-19-project-page-v2
# and, if you also want it gone from GitHub:
# git -C <repo> push origin --delete team/2026-07-19-project-page-v2
```

### What each command actually destroys

| Command | Destroys | Does **not** destroy |
|---|---|---|
| `git worktree remove <path>` | The checked-out directory and its admin entry; any **uncommitted** changes in it (refuses without `--force`). | The branch, the ref, or any commit. |
| `git branch -D <branch>` | The ref **and that branch's reflog** (immediately). | The commits — they become *unreachable*, not deleted. |
| `git gc --prune=now` | Unreachable objects, immediately. Default `gc.pruneExpire` is 2 weeks. | Anything reachable from a branch **or tag**. |

**Consequence:** after `git branch -D` alone, recovery means `git fsck
--lost-found` (the reflog is gone) and only until gc runs. **With the Step 0 tag
in place none of this applies** — the commits stay permanently reachable and
Path B costs nothing but the directory.

---

## 7. Backlog outcome

Close the HIGH item either way, replacing it with two smaller ones so nothing
re-strands:

- **HIGH — Desktop `BuildTimeline` phase captions overlap on `/projects/mensapp`
  and `/projects/studio-site`, and the published post
  `2026-07-19-three-tries-at-the-same-overlap` describes a fix that was never
  merged.** Measured 2026-08-05. Port from `archive/2026-07-19-buildmode-tail`
  per §5a; amend `docs/project-page-v2.md` §2.2; verify in a real browser at
  1280px; skip the `CommitLog` commit (§4).
- **LOW — `buildMode` / team-rebuild model: parked as superseded by `soloBuild`
  (2026-07-24).** Revisit when the first team-built project exists. Reference
  implementation at tag `archive/2026-07-19-buildmode-tail`; reasoning in
  `docs/team-rebuild-model.md` §3–§4.
