# The `reports/` surface

**Status:** draft for Dom's review · **Author:** architect (Theo) · **Backlog item:** MEDIUM — "No on-site surface for the run reports (spec first)"
**Amends:** `docs/spec.md` §2 (routing) and §3 (content model). **Serves:** PROJECT-BRIEF goal 3. **Depends on:** `docs/provenance-model.md` (the artifact this reuses).
**Requires before implementation:** a designer pass (the backlog item asks for one) — see §6 PR 3.

---

## 1. Is this worth building at all?

**Yes, but not the thing the item's title implies.** Reports should not be published on the
site. A `/reports` *index* should be, because there is exactly one fact about the reports that
the site can show and GitHub cannot: **which run produced which post.**

### 1.1 What a run report actually is, measured

I read four in full (`2026-07-29`, `2026-07-21-review`, `2026-07-18-evening`,
`maintenance-2026-07-20`) and skimmed the rest. Twenty-one files. A representative report is
roughly:

| Section | Reader-facing? |
|---|---|
| `## Learnings (blog-worthy)` | **Yes** — genuinely good writing |
| `## Decisions made` | Mostly yes |
| `## What was done` | Partly — assumes you know the PR numbers |
| `## For Dom to review` | **No** — a to-do list addressed to one person |
| `## Notion mirror` | **No** — bookkeeping ("1 status heal, 1 corrupted field repaired") |
| `## What's left / blocked` | **No** — `SMOKE_URL is still unset`, `gh variable set …` |
| `## Token spend` | Marginal — a self-reported estimate |
| `## Provenance blocks` | **No** — machine input |

Call it 30–40% reader-facing prose wrapped in 60% operations. And the reader-facing 30% is
*precisely* what the logbook already distills: `reports/2026-07-29.md`'s learnings about
measurement-vs-reasoning are the same material as the posts. Fourteen posts exist (none
drafts); twenty-one reports exist; the posts are the edited version.

So: **a raw run report reads as exhaust with good bits in it, and the good bits already have a
home.** Publishing all twenty-one as pages would double the site's page count with unedited
internal prose that competes with the edited version of itself. That is the opposite of
right-sizing.

### 1.2 What the reader is actually missing today

Not the reports — those are one click away and always have been (footer "Run reports",
`BacklogChip`, and every `ProvenanceStrip` run chip). What is missing is the **join**:

- `src/content/provenance.generated.json` already records that
  `content/posts/2026-07-20-red-is-not-self-justifying.md` came from `reports/2026-07-20.md`,
  at commit `991e075`. The strip shows this **one post at a time**.
- Nowhere does the site show the ledger: 21 runs, 8 of which produced content that shipped,
  13 of which produced no recorded output at all.

That ledger *is* goal 3 ("the site's own git history and run reports ARE content"), it is
falsifiable, it is already generated, and it is the one view GitHub's file listing cannot give
you. That is the thing worth building.

### 1.3 The honest counter-argument

An index page whose links all leave the site is a thin deliverable, and this repo has a
standing allergy to devices that point *at* evidence without showing it (see the 2026-07-21
review's "declared but not delivered" through-line). I accept that framing and reject the
conclusion: the strip's run chip links to GitHub **on purpose** — `docs/provenance-model.md`
§6: "the run link is how a reader checks the original wording." Rehosting the wording on the
site would not make it more verifiable; it would add a second copy that can drift from the
primary source. Linking to the primary record is the honest move, not the lazy one. What makes
the page substantive is the join, not the links.

---

## 2. Recommended shape

**Option (a), sharpened: one static route `/reports`, an index of all 21 runs, each row
carrying date + verbatim title + kind + what that run produced (in-site links) + an outbound
link to the report on GitHub. No per-report routes.**

Costing the alternatives, explicitly:

| Option | Cost | Verdict |
|---|---|---|
| **(a) index only** | 1 route, 1 build-time artifact (~4KB), ~1 page component, 4 registry edits (§5). No new prose is published. | **Chosen.** |
| **(b) index + `/reports/:date` routes** | 21 new routes; +21 sitemap URLs; +21 route-smoke mounts (the suite mounts *every* route with no sampling — see its own header comment); ~180KB of report prose into a route chunk; a markdown pipeline pointed at documents never written for a reader (fenced `yaml provenance` blocks render as noisy code blocks; `## Notion mirror` renders as a section heading). Publishes the 60% that is operations. | Rejected. Doubles the site with unedited internal prose that competes with the posts distilled from it. Revisitable later — §7. |
| **(c) "run record" partial view** (provenance block + headings only) | Similar route cost to (b), plus a bespoke renderer. **13 of 21 reports have no `yaml provenance` block at all**, so most rows would render a heading list with nothing behind it. | Rejected, and specifically: a page that shows a document's *table of contents* while withholding the document is a teaser. It reads as "declared, not delivered" — the exact pattern the 2026-07-21 review named as this site's characteristic failure. |
| **(d) fold into the logbook as a tag/filter** | Cheapest to build. | Rejected on principle. It would place raw work logs in the same list, and the same RSS feed, as edited posts — collapsing the distilled/raw distinction the site's credibility rests on. Also incompatible with the content model: `/blog` is a Zod-validated frontmatter collection, reports have none. |

### 2.1 What one row shows

```
2026-07-20 · run report
Run report — 2026-07-20
produced → "Red is not self-justifying"  ·  commit 991e075  ·  read the report ↗
```

and, for the majority case:

```
2026-07-24 · run report
Run report — 2026-07-24
no recorded output for this run  ·  read the report ↗
```

The second state is deliberately visible, muted, non-linked — identical posture and vocabulary
to `ProvenanceStrip`'s "no run record for this entry" (provenance-model §6). It says **no
recorded output**, never "produced nothing": the absence of a `yaml provenance` block is not
evidence a run shipped nothing.

Page header copy states plainly what these are (internal work logs, written for Dom, not
edited for publication) and that the blog is the edited version. That copy is a Dom checkpoint
(§6).

---

## 3. Content model — reports have no frontmatter

The central technical fact. Three candidate sources of metadata, and what I recommend:

| Field | Source | Why |
|---|---|---|
| **date** | **Filename**, regex `/(\d{4}-\d{2}-\d{2})/` | All 21 filenames match — `2026-07-29.md`, `2026-07-21-review.md`, `maintenance-2026-07-20.md`. Verified against every file on disk. Never parse the date from the H1: `2026-07-19-evening.md`'s H1 ends `— BACKFILLED 2026-07-21`, so H1-parsing would date that run two days late. |
| **title** | **First H1, verbatim** | All 21 files open with an H1 on line 1. They are already good, human-written titles: `Run report — 2026-07-29`, `Critical review — the whole team + the Judge — 2026-07-21`, `Maintenance sweep — 2026-07-20`, `Hire report — visual-media agent (2026-07-18 evening)`. Rendered verbatim, never rewritten or truncated. |
| **kind** | Allowlist on the H1 prefix before the first `—` | Exactly four values occur: `Run report`, `Critical review`, `Maintenance sweep`, `Hire report`. Map to a chip label; an **unrecognised prefix renders no chip** and does not fail the build (cosmetic field, honest degrade). |
| **summary** | **None. Do not derive one.** | See §3.1. |
| **produced** | The **existing** `provenance.generated.json`, reversed | Zero new authoring. §3.2. |

**No new frontmatter, and no new report-format requirement.** The report format has already
been changed once (the `yaml provenance` block) and provenance-model §11 names "report-block
discipline decays" as the most likely failure mode of that change. Adding a second per-report
authoring obligation doubles that risk to buy metadata we can derive mechanically from what is
already there. Backfilling 21 files by hand is also 21 chances to mistype a date that the
filename already states correctly.

### 3.1 Why there is no summary field

Deriving a one-line summary from report prose is the same class of error `provenance-model.md`
§2.2 rejected for verdicts, and the first paragraphs prove it — they are structurally
incompatible: `Scheduled run. Dom's review queue was **empty** at start…` /
`**Items worked on:** six, across five parallel branches…` / `Dom asked for a full critical
review: "judge where things are lacking…"` / `First sweep; no prior maintenance-*.md exists…`.
Truncating any of these mid-sentence produces a distorted quotation on a page about honesty.
Title + date + produced-outputs is a complete row. If Dom later wants summaries, the additive
path is an **optional** `summary:` frontmatter on *new* reports only, never backfilled, absent
= renders nothing.

### 3.2 The join, and the build-time artifact

A new generated file `src/content/runs.generated.json`, written by the **existing**
`scripts/provenance/generate.mjs` (which already walks `reports/*.md`, already writes a
committed artifact, already has a CI drift gate and a Vercel-shallow-clone fallback). One row
per report:

```json
{ "runId": "2026-07-20", "reportPath": "reports/2026-07-20.md",
  "title": "Run report — 2026-07-20", "date": "2026-07-20", "kind": "run-report" }
```

Validated by a new `RunsArtifactSchema` in `src/content/provenance-schema.ts`.

**Why an artifact rather than `import.meta.glob('/reports/*.md', { query: '?raw' })`:** the
glob would pull ~180KB of report prose into the bundle to read line 1 of each file. Even
code-split into the `/reports` chunk that is pure waste on a site that already has an open
HIGH CLS finding and a written performance budget. The artifact is ~4KB.

Generator failure modes, matching the existing fail-loud posture (provenance-model §5.2):

| Condition | Outcome |
|---|---|
| Filename contains no `YYYY-MM-DD` | **Build fails**, naming the file. Never silently excluded — a silently-dropped run is a hole in a completeness claim. |
| First non-blank line is not an H1 | **Build fails**, naming the file. |
| H1 prefix not in the kind allowlist | Kind omitted. Build succeeds. |
| A report has no `yaml provenance` block | Row renders "no recorded output". Build succeeds. Expected for 13 of 21 files today. |

**The join is computed in code, not stored.** `src/content/runs.ts` groups the already-resolved
provenance artifact by `reportPath`, then resolves each `produced` key to the live
`Post`/`Project` for its title and slug. Titles therefore have exactly one source
(`content/**` frontmatter) and cannot drift into the artifact. This requires `loader.ts` to
export its resolved `provenanceArtifact` (it is currently a module-local const) — one export,
not a second glob and second failure path.

`maintenance-*.md` reports are **included**, labelled `maintenance sweep`, with one line of
page copy noting these sweep all of Dom's repos rather than just this one. Excluding them
would make a completeness claim false to save a paragraph of explanation.

---

## 4. Bidirectional links

**Recommendation: change nothing about `ProvenanceStrip`.** Under option (a) there is no
in-site destination that shows the report's wording, so repointing the run chip at
`/reports#2026-07-20` would swap a link to the primary record for a link to a summary of it —
strictly worse verification, on the device whose entire justification is verification. The
strip keeps pointing at `${REPO_BASE}/blob/main/${reportPath}`.

Links flow the other way instead: `/reports` rows link **in-site** to `/blog/:slug` and
`/projects/:slug`. Those hrefs are built from `Post.slug`/`Project.slug` — schema-validated
kebab-case from the content collection, never a string read out of a report. The injection
closure documented in provenance-model §4.3/§7 is untouched.

### 4.1 If Dom later chooses option (b), here is the precise change and its hazard

Do **not** simply swap the `href` in `ProvenanceStrip.tsx`. Two things must happen first, and
one of them is a live latent defect:

1. **`runId` and `reportPath` are unconstrained today.** `src/content/provenance-schema.ts`
   declares `runId: z.string()` and `reportPath: z.string()`. `reportPath` is *already*
   interpolated into an `href` in `ProvenanceStrip.tsx` (`runField`). It is safe in practice
   only because `generate.mjs` writes that value from the filesystem rather than from block
   content — an invariant enforced nowhere in the schema. Before either value becomes a route
   segment, pin them:
   `runId: z.string().regex(/^(maintenance-)?\d{4}-\d{2}-\d{2}(-[a-z0-9-]+)?$/)` and
   `reportPath: z.string().regex(/^reports\/[A-Za-z0-9._-]+\.md$/)`. **This hardening is worth
   doing regardless of which option ships (§6 PR 0).**
2. **Centralise, don't scatter.** The in-site path is built in `src/lib/githubLinks.ts`
   alongside `STUDIO_SITE_REPORTS_URL` (or a sibling `siteLinks.ts`), as
   `runPath(runId) => '/reports/' + runId`, and `ProvenanceStrip` imports it. The rule that
   survives the change: **a URL is never read from content; it is constructed from a
   hardcoded base plus a regex-validated identifier.** Repointing must not be an excuse to
   start trusting a content-supplied string.

What breaks if this is done casually: the strip's run chip becomes a same-tab in-site link
while keeping `target="_blank" rel="noreferrer"` (wrong for internal navigation, and it
bypasses React Router — a full page reload on an SPA); the route-smoke suite's
`isKnownInternalPath` check starts failing on every `/reports/...` href unless `KNOWN_PATHS`
is extended; and `ProvenanceStrip.test.tsx` + `ProjectDetail.test.tsx` both assert the literal
GitHub URL (`.../blob/main/reports/2026-07-16.md`) and will go red.

---

## 5. Risks and what breaks

- **Route registries are hand-synced in four places.** Adding `/reports` requires edits to:
  `src/router.tsx`; `STATIC_ROUTES` in `src/lib/seo/xml.ts` (its own comment says "Keep in
  sync with `src/router.tsx` by hand"); the hardcoded list in
  `scripts/check-deployed-routes.mjs`; and `KNOWN_PATHS` in `src/smoke/routes.smoke.test.tsx`.
  Miss one and you get either a route missing from the sitemap or a smoke failure. This is a
  known, accepted design (introspecting `RouteObject[]` needs React at build time) — call it
  out in the PR description, don't "fix" it here.
- **Sitemap: +1 URL, correct.** `/reports` is a real, public, static page and belongs there.
  Per-report URLs would be +21 and are not being built.
- **RSS: reports must NOT enter the feed. N/A by argument, not omission.** Three reasons:
  (i) the feed's subscriber contract is "edited posts," and reports are the unedited source
  of those same posts — subscribers would receive both versions of every story; (ii) reports
  are **mutated after publication** — the provenance backfill appended blocks to eight
  existing reports days later, and `2026-07-19-evening.md` is titled "BACKFILLED 2026-07-21" —
  so feed items would carry wrong or re-firing `pubDate`s; (iii) `buildFeedItems(posts)` takes
  the `Post[]` type, and reports have none of its required fields. Add a one-line comment in
  `src/lib/seo/xml.ts` recording this decision so a future run doesn't "helpfully" add them.
- **Content-validation gate.** `validate:content` (`vitest.content.config.ts`, promoted into
  the required `build` job by PR #36) must gain a runs-artifact test: one row per file in
  `reports/`, no orphan rows, every `date` parses, every `title` non-empty, and every
  `reportPath` in `provenance.generated.json` resolves to a known run. Without this, a deleted
  or renamed report silently produces a dangling row.
- **Route smoke suite** mounts every route with no sampling. `/reports` gets one case. It
  asserts exactly one `<h1>`, that every internal `href="/…"` is a known path (the produced-
  output links — fine, they are real slugs), and **zero `console.error` during mount**. With
  21 rows and nested lists, watch for React key warnings; they fail this suite.
- **Perf / CLS.** `/reports` is text-only, no images — it adds no *new* CLS source. But it is
  another lazy route behind `withSuspense`'s `RouteFallback`, so it inherits the site-wide
  CLS ≈ 0.39 finding from PR #73 verbatim, and `e2e/perf-budget.spec.ts` enumerates routes.
  Sequence this after the HIGH CLS fix, or expect a new red measurement that is not this
  feature's fault and will be misattributed to it.
- **Auto-merge path guard.** `.github/workflows/auto-merge.yml` allowlists
  `content/**`, `docs/**`, `reports/**`, root `*.md`, `**/*.test.ts(x)`. A committed
  `src/content/runs.generated.json` means **every run's own report PR now also touches
  `src/`**, stripping `safe-auto` from routine bookkeeping PRs. (This is already half-true for
  `provenance.generated.json` since the 2026-07-27 commit-the-artifact reversal; the runs
  artifact makes it universal.) Recommended fix, one line: allowlist
  `src/content/*.generated.json`. Defensible on security grounds — it is generated, Zod-
  validated, non-executable JSON whose freshness is proven by the CI drift gate *in the same
  PR*. Do not allowlist anything else under `src/`.
- **Sensitive content — checked, and the answer is no.** I grepped the corpus for
  absolute paths, `.env`, and credential-shaped strings. Reports contain: repo-relative file
  paths (no `/Users/...` anywhere), branch names, PR numbers, self-reported token estimates,
  one `http://localhost:5173`, and `gh variable set SMOKE_URL --body "https://doms-ai-studio.
  vercel.app"` — a `variable`, not a `secret`, and a public URL. No keys, no PII, no
  customer data. The sharpest item is `maintenance-2026-07-20.md`'s writeup of a permissive
  `create policy "anon all"` RLS snippet in SoulForce-V2, including the exact SQL and the
  explicit note that the table does not exist and nothing is exposed. All of this is already
  public in a public repo, so **the index publishes no new information whatsoever** — which is
  a further, unglamorous argument for option (a): it is the only option that adds a surface
  without changing what is disclosed or how findable it is. If option (b) is ever revisited,
  re-run this check per file, and default to excluding `maintenance-*` (they assess repos that
  are not this one).

---

## 6. PR-sized decomposition, dependency order

| # | PR | Scope | Depends on | Owner |
|---|---|---|---|---|
| **0** | **Schema hardening** | Tighten `runId` / `reportPath` regexes in `provenance-schema.ts`; tests. Fixes a latent looseness on a value already used in an `href`. Independent of everything below — ship it either way. | — | backend-dev |
| **1** | **Runs artifact** | `RunsArtifactSchema`; extend `scripts/provenance/generate.mjs` to emit `src/content/runs.generated.json`; wire into the CI drift gate; add `src/content/*.generated.json` to the auto-merge allowlist. Tests must cover all three filename shapes (`2026-07-29.md`, `2026-07-21-review.md`, `maintenance-2026-07-20.md`), the no-date and no-H1 hard failures, and the unknown-kind soft degrade. **No consumers; nothing visible.** | 0 (soft) | backend-dev |
| **2** | **Runs API** | Export `provenanceArtifact` from `loader.ts`; new `src/content/runs.ts` — `getAllRuns()` (date desc, filename-stem ascending tie-break, matching `sortPosts`'s final rule) and the reverse join to `Post`/`Project`. Tests, including a run with no recorded output. **No UI change.** | 1 | frontend-dev |
| **3** | **STOP — Dom checkpoint** | **Designer pass** on the `/reports` index (the backlog item requires one) **and sign-off on the page's public copy** — specifically the sentence framing what a run report is and why it links off-site, plus the "no recorded output" wording. Nothing public ships before this. | 2 | designer → Dom |
| **4** | **STOP — Dom checkpoint (new public surface)** · `/reports` route | Page component; route registration; the four registry edits in §5; sitemap; smoke case; a11y (single `h1`, `<ol>`, 44px targets on links); the `xml.ts` "reports are not in the feed" comment. **Introduces a new public route and repoints the footer's "Run reports" entry from GitHub to `/reports`** (pending Q3). | 3 | frontend-dev → qa-tester |
| **5** | Backlog hygiene | Close the item; record the (b)/(c)/(d) rejections in `BACKLOG.md` so a future run doesn't re-propose them. | 4 | lead |

PRs 0 and 1 are parallelizable with nothing; 2 is strictly after 1; 3 gates 4 absolutely.
Nothing user-visible exists before PR 4, so the item can be abandoned after any of 0–2 with no
public residue.

---

## 7. Out of scope

Per-report routes and any rendering of report prose; report search or filtering; per-agent or
per-run statistics; a cost-over-time chart; RSS entries for runs; new report frontmatter;
backfilling summaries; any change to `ProvenanceStrip`'s outbound links; fixing the hand-synced
route registries. Full report routes stay *revisitable* (§2, and §4.1 specifies the link change
they would need) — but they need a reason beyond "the data is there," and the reason would have
to survive the argument in §1.1.

---

## 8. Open questions for Dom

1. **Index-only, or full `/reports/:date` pages?**
   *Recommended default:* **index-only.** The reports are internal work logs; the blog is their
   edited version; the index adds the one view GitHub can't give (which run made which post).
   Worth knowing: there is no analytics on this site, so "ship the index and see if people
   click" is not measurable — this is a decision on principle, not something to A/B.
2. **No summaries on the index rows — title + date + what it produced only?**
   *Recommended default:* **yes, none.** Report first-paragraphs are structurally
   incompatible with truncation, and a distorted one-liner on the honesty page is worse than
   no one-liner. Optional `summary:` frontmatter on future reports stays available later.
3. **Nav placement.** *Recommended default:* **repoint the existing footer "Run reports" entry
   to `/reports`** (one entry, no duplicate), keep the outbound GitHub link on the page itself,
   and **do not add a header nav item** — a fourth top-level entry for internal work logs
   overweights them against Projects/Blog/Cast.
4. **Commit `runs.generated.json` and widen the auto-merge allowlist to
   `src/content/*.generated.json`?** *Recommended default:* **yes to both** — it matches the
   2026-07-27 commit-the-artifact reversal, keeps Vercel's shallow clone working, and without
   the allowlist line every future run's own report PR loses `safe-auto`.
