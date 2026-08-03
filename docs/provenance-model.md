# Provenance content model

**Status:** draft for Dom's review · **Author:** architect (Theo) · **Backlog item:** HIGH — Provenance content model
**Amends:** `docs/spec.md` §3 (content model) — see §9. **Serves:** PROJECT-BRIEF goal 3, design-brief §5/§6.

---

## 1. Summary

The site's hero device — honest AI provenance — currently renders one field, "Written by X", because no other field exists in the content model. This spec adds the missing data by **deriving it, not authoring it**: each run report gains a small fenced `yaml provenance` block per shipped item, listing the files that run produced and the facts about it (authors, reviewers, Judge verdict, token cost); a build-time generator joins that against `git log` to produce a per-file provenance record. `ProvenanceStrip` renders what exists and visibly says so when nothing does. Zero new frontmatter fields.

---

## 2. Recommendation

**Derive from a structured block in `reports/`, joined with git. Do not hand-author provenance in frontmatter.**

### 2.1 Why

The decisive argument is not upkeep, it is **falsifiability**.

With hand-authored frontmatter, the value being *asserted* and the value being *displayed* are the same string. Nothing in the system can ever disagree with it. A hurried agent that types `judgeScore: 93` into a post that was never judged produces output that is indistinguishable, to every gate this repo has, from the truth. On a site whose entire pitch is "the provenance is real," that is not a small defect — it is the failure mode the studio has already caught itself in twice. `reports/2026-07-15-persona-and-build.md` documents the Judge catching three "fabrication-flavored overclaims *hiding inside* citations", including a normalized `PASS · Round 1 · 91/100` string sold as verbatim. Frontmatter provenance is a machine for producing exactly that class of error, at scale, with a byline attached.

With derived provenance, a wrong number requires a wrong *source*. The report is the studio's own primary record, written for Dom to read, reviewed in the PR that ships the run. Corrupting it to inflate a score means lying in the artifact Dom actually reads — a far higher bar than a typo in a YAML key nobody looks at. The claim and the evidence stay one click apart, and the strip links to the report so a reader can check.

Upkeep favours the same answer. Hand-authored fields rot silently: the score is written once and never revisited, and the file it describes gets edited for a year. Derived fields are recomputed every build from a source that is itself under review.

### 2.2 The parsing risk, and why a structured block is required

Deriving from report **prose** would be the wrong call, and I want to be concrete about why rather than hand-wave it. The nine reports on disk state verdicts in at least four incompatible ways:

- `converged on round 1 — PASS, 91/100, zero blocking issues, 5 nits` (`2026-07-15.md`)
- `converged round 2 — PASS 93/100` plus a markdown round table (`2026-07-15-design-brief.md`)
- `scored it REVISE · 87/100` (`2026-07-15-persona-and-build.md`)
- no verdict at all (`2026-07-16.md`, `2026-07-17.md`, `2026-07-18-evening.md`)

And one outright trap: `2026-07-18.md` contains `qa-tester passed it **88/100**`. That is not the Judge. Any regex loose enough to catch the four Judge formats above catches this one too and attributes a QA score to the Judge on the site's most prominent transparency device. Prose parsing here does not degrade gracefully — it fails by *inventing*, which is the one outcome this whole item exists to prevent.

**So: a change to the report format is part of this spec.** Reports keep their prose exactly as-is — they are written for Dom, not for a parser — and gain one small fenced block per shipped item. Prose is never parsed. If the block is absent, the run has no provenance data and the site says nothing. That is an acceptable, honest, self-correcting outcome; a mis-parse is not.

### 2.3 The rejected alternative, stated fairly

**Hand-authored frontmatter** has real merits I am not dismissing. It ships today with no new tooling, no build step, and no git dependency. It is per-item precise: the author of a post knows exactly which agent wrote it and which run produced it, with no join to get wrong. It has no chicken-and-egg problem with commit hashes. It is visible in the PR diff, so Dom reviews the provenance alongside the copy — a genuine advantage the derived approach gives up (see §5.3). And for a personal logbook with five posts, "just type it in" is a defensible right-sized answer.

I reject it because the one property this feature must have is that a wrong number is hard to ship, and frontmatter provides no mechanism for that at all. The upkeep argument is secondary; the falsifiability argument is decisive.

---

## 3. Field-by-field: what is actually knowable

| Field | Where the truth lives today | Reliably recoverable? | Honest fallback |
|---|---|---|---|
| **commit hash** | git | **Yes — fully mechanical.** `git log --diff-filter=A` for the adding commit. Squash-merges to `main` make this a real, linkable commit. | Omit. Never guess. Distinguish "file not yet committed" (legal, omit) from "git unavailable" (hard build error — see §5.2). |
| **authors** | report prose + existing `author` frontmatter | **Yes**, from the structured block. Already partially present. | Existing `author` field stays authoritative for the byline; the block's `authors` is for the ledger and for DOM-2's future multi-author case. |
| **reviewers** | report prose (`frontend-dev → qa-tester → lead browser verify`, `marketer → lead fact-check`) | **Yes**, once the block records it. Not recoverable by parsing prose reliably. | Omit the chip. |
| **Judge verdict / round / score** | report prose, four formats, plus a QA score that mimics it | **Yes via the block; no via prose.** Critical nuance below. | Three-state, see below. |
| **token cost** | report prose only, already approximate | **Partially, and weakly.** | Run-scoped, marked approximate, or omitted. |

### 3.1 The Judge field needs three states, not two

The Judge reviews *artifacts submitted to the Judge loop* — specs, briefs, the persona bible. **Almost no blog post has ever been through it.** Both 2026-07-18 posts were lead fact-checked, not judged. So for most posts, "no Judge verdict" is not missing data — it is a **fact**, and one worth stating, because "reviewed by the Judge" versus "fact-checked by the lead" is a real difference in rigour that an honest site should show.

Therefore the schema distinguishes:

- `judge: { verdict, round, score }` — reviewed, here is the verdict.
- `judge: null` — **explicitly not Judge-reviewed.** A positive claim.
- key absent — unknown / not recorded.

Rendering differs per state (§6). Collapsing `null` and absent would let "we didn't record it" masquerade as "we did the cheaper review," which is a small lie of the exact species this site exists to avoid.

### 3.2 Token cost is the weakest field — carry it, heavily qualified

The data is self-reported prose estimates: `≈610k subagent tokens across 6 agent runs (devops 20k, frontend-dev 153k + 226k fix round, …)`, `Order of ~750k total`. Two problems:

1. **It is not attributable per item.** That same report gives `marketer 45k + 63k` for *two posts*. Which post cost which is unknowable. Splitting or assigning either number to a specific post would be fabrication.
2. **There is no machine source.** No telemetry is captured; the lead estimates it.

I keep the field because cost transparency is explicitly PROJECT-BRIEF goal 2, and a logbook that hides its own bill is less interesting. But it is carried **run-scoped by default**, always prefixed `~`, always labelled self-reported, and **omitted entirely when the report gives no figure** (2026-07-16 and 2026-07-17 give none). It is the field I would drop first if the strip gets crowded.

**One field I recommend not carrying: `branch`.** It is in every report and trivially recoverable, and it renders as noise next to a commit link that already resolves to the same work. Record it in the block for the join's sake, do not render it.

---

## 4. Data shape

### 4.1 The report block (new report-format requirement)

One fenced block per shipped item, appended to the report. Prose above it is unchanged and never parsed.

````
```yaml provenance
item: second-blog-post
title: Second blog post
branch: team/2026-07-18-second-post
produced:
  - content/posts/2026-07-18-what-the-green-checkmarks-missed.md
authors: ["Project Lead"]
reviewers:
  - by: "Project Lead"
    kind: fact-check
judge: null
tokens: null
```
````

With a Judge verdict and a cost:

```yaml
judge: { verdict: PASS, round: 2, score: 93, outOf: 100 }
tokens: { approx: 173000, scope: run }
```

Rules, binding:

- `produced` lists repo-relative paths of files this run **created**. A path may appear in **at most one** report's `produced` list across all reports. Later edits to a file are not recorded — this is a creation record, not an edit log.
- `judge: null` is a claim ("not Judge-reviewed"). Omit the key only if genuinely unknown.
- `tokens.scope` is `run` or `agent`; `agent` requires `tokens.agent`. Never split a combined figure across items.
- `authors` and `reviewers[].by` must resolve to a cast `name` or the literal `"Dom"`.

### 4.2 Zod schema (`src/content/provenance-schema.ts`)

```ts
const CommitSchema = z.object({
  hash: z.string().regex(/^[0-9a-f]{40}$/),
  short: z.string().regex(/^[0-9a-f]{7,12}$/),
  date: z.string(),                       // ISO, from git
});

const JudgeSchema = z.object({
  verdict: z.enum(['PASS', 'REVISE', 'FAIL']),
  round: z.number().int().min(1).max(3),
  score: z.number().int().min(0).max(100),
  outOf: z.literal(100).default(100),
});

const TokensSchema = z.object({
  approx: z.number().int().positive(),
  scope: z.enum(['run', 'agent']),
  agent: z.string().min(1).optional(),
}).refine(t => t.scope !== 'agent' || !!t.agent);

export const ProvenanceRecordSchema = z.object({
  runId: z.string(),                      // report file stem, e.g. "2026-07-18"
  reportPath: z.string(),                 // "reports/2026-07-18.md"
  item: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  branch: z.string().optional(),
  authors: z.array(z.string().min(1)).min(1),
  reviewers: z.array(z.object({
    by: z.string().min(1),
    kind: z.enum(['fact-check', 'qa', 'browser-verify', 'lead-review', 'security']),
  })).default([]),
  judge: JudgeSchema.nullable().optional(),   // null = explicitly not judged
  tokens: TokensSchema.nullable().optional(),
  commit: CommitSchema.nullable(),            // null = file not yet committed
});

export type ProvenanceRecord = z.infer<typeof ProvenanceRecordSchema>;
```

`Post` and `Project` gain `provenance?: ProvenanceRecord` — optional, because five posts and (pending backfill) six projects legitimately have none. **`undefined` is a supported, designed state, not a bug.**

Note `commit` is `nullable()` but **not** `optional()`: the generator must always make a positive statement about the commit, either a real one or an explicit "none yet." A missing key would be ambiguous.

### 4.3 Type-level guarantees against fabrication

- `score` is `number`, not `string` — no "≈93" or "93ish" can enter.
- `verdict` is an enum — no free-text verdicts.
- `commit.hash` is a strict 40-hex regex.
- **The commit URL is constructed in app code** from a hardcoded repo base + the validated hash. A URL is never read from a report. This is the one genuine injection path in the feature (§7).
- The `~` prefix and the "self-reported" qualifier on tokens are emitted by the render function, not stored in data, so they cannot be edited away in content.

---

## 5. Production, consumption, and drift

### 5.1 Where it is produced and consumed

- **Produced:** `scripts/provenance/generate.mjs`, a Node script. Reads `reports/*.md`, extracts `yaml provenance` blocks, Zod-validates, resolves each `produced` path against `git log --diff-filter=A --format=%H%x00%cI -- <path>` (via `execFile`, array args), and writes `src/content/provenance.generated.json`.
- **Consumed:** `src/content/loader.ts` imports the JSON and attaches records to `Post`/`Project` by path. `ProvenanceStrip` renders. `BlogPost`/`ProjectDetail` pass through.
- **Wired:** `predev`, `prebuild`, and `pretest` npm scripts. The artifact is **gitignored**.

### 5.2 Designing against drift — the artifact is not committed

> **UPDATE 2026-07-27 — this decision was reversed. The artifact IS now committed.**
> The original "never committed, regenerate every build" design (below) made the
> **Vercel deploy build hard-depend on full git history**. Vercel shallow-clones,
> and the `buildCommand` `git fetch --unshallow` mitigation (documented later in
> this section) **did not un-shallow the deploy checkout in production** — so the
> first deploy after the §12 PR 6 backfill shipped real blocks failed in
> `assertGitAvailable`'s shallow guard, taking the whole site's deploy pipeline
> down (`git fetch --unshallow --no-tags || true; npm run build` exited 1).
>
> The fix (`team/2026-07-27-provenance-deploy-fix`): **commit
> `src/content/provenance.generated.json`**, regenerate + **drift-check it in CI**
> (full clone, `fetch-depth: 0` — see `ci.yml`'s "drift gate" step), and have the
> build **fall back to the committed artifact** when git history is unavailable
> (`generate.mjs`'s `main()` catches `ProvenanceGitError` iff a committed artifact
> exists). This does NOT reopen the drift hole the original design closed: the CI
> drift gate makes a stale artifact a red required check, so the committed file is
> provably up to date, and the deploy fallback uses *real, CI-verified* data — more
> correct than the build dying. Fail-loud is preserved for the genuinely-broken case
> (shallow clone **with no committed artifact** still hard-fails; a content defect —
> `ProvenanceValidationError` — still hard-fails everywhere). The `buildCommand`
> unshallow is kept as harmless best-effort (if it ever *does* full-clone, the build
> regenerates identically). The prose below is the superseded original rationale.

Drift between a generated file and its source is the classic failure of this pattern, so the design removes the possibility rather than policing it: **the artifact is regenerated on every dev start, test run, and build, and never committed.** There is no stale copy that can survive a report edit. A report change is reflected on the next build, unconditionally.

Failure modes, each with an explicit and different outcome:

| Condition | Outcome | Why |
|---|---|---|
| A `produced` path does not exist on disk | **Build fails.** Generator exits non-zero. | A dangling citation is a defect. Also caught by a unit test, so it fails in `CI / build` on the PR. |
| Two reports claim the same `produced` path | **Build fails.** | Ambiguous provenance is worse than none. |
| `yaml provenance` block fails Zod | **Build fails**, naming report, item, and field. | Same posture as the existing frontmatter loader. |
| `authors`/`reviewers[].by` doesn't resolve to a cast member or `"Dom"` | **Build fails.** | Prevents provenance attributed to a character that doesn't exist. |
| **`git` command fails** (not installed, shallow clone, not a repo) | **Build fails, loudly.** | Non-negotiable. A silent `commit: null` here is indistinguishable from "this file has no commit yet" — an infrastructure failure would quietly become a factual claim. |
| File exists but has **no commit** (new, uncommitted, or created in this very PR) | `commit: null`. Strip omits the chip. **Build succeeds.** | Legitimate and expected. A post cannot know the hash of the commit that adds it. Self-heals on the next build after merge. |
| A content file appears in **no** report's `produced` list | `provenance: undefined`. **Build succeeds.** Strip degrades per §6. | The five existing posts. Never an error. |
| Generated artifact missing at import time | Loader **throws** with instructions to run the generator. | Matches the existing loader's fail-loud convention; never silently renders a provenance-free site. |

**Two infrastructure requirements this creates, both concrete:**

1. `.github/workflows/ci.yml` must set `actions/checkout@v4` with `fetch-depth: 0`. The default shallow clone breaks `git log --diff-filter=A` and would trip the hard-fail above on every PR. *(Fixed 2026-07-23, PR #44 — `checkout@v4` now sets `fetch-depth: 0`.)*
2. Vercel shallow-clones too. Deploy config must enable full clone, **or** the deploy build must tolerate it — and it must not, per the rule above.

   **Fixed 2026-07-24 (devops, team/2026-07-24-vercel-full-clone), in-repo, no dashboard step required.** `vercel.json`'s `buildCommand` is now:

   ```
   git fetch --unshallow --no-tags || true; npm run build
   ```

   Vercel's Git integration checks out the repo with real `git` (so `.git` is present) but truncated to a shallow clone — the same shape as the pre-fix CI default, just not user-configurable via `fetch-depth` the way `actions/checkout` is. Running `git fetch --unshallow` as the first step of the build command converts that shallow checkout to a full one *before* `npm run build` (and therefore `prebuild` → `generate.mjs` → `assertGitAvailable`) ever runs.

   The trailing `|| true` looks like it could reopen the exact silent-failure hole this section exists to close, so it's worth stating precisely why it doesn't: `--unshallow` errors if the repo is *already* a complete clone ("`--unshallow` on a complete repository does not make sense"), which is a legitimate, harmless outcome that must not fail the build. `|| true` swallows *that* case only. It does **not** swallow "the repo is still shallow" — if the fetch fails for any other reason (network, no `.git`, etc.), the repository remains shallow, and `assertGitAvailable`'s own `git rev-parse --is-shallow-repository` check — run unconditionally moments later inside `npm run build` — still hard-fails the build with the loud, specific error from row 5 of the table above. The `buildCommand` fetch is an optimization/likely-fix, not the enforcement point; `assertGitAvailable` remains the single source of truth for "is history actually complete," so a soft-failing unshallow can never downgrade an infra failure into a false "no commit yet" claim.

   Verified by `scripts/provenance/vercelFullClone.test.ts` (run in default `npm test`): asserts `buildCommand` exists, runs the unshallow before `npm run build`, fails soft (`|| true`) rather than aborting, and that the PR #42 security headers are untouched.

   **Not used, and why:** the `VERCEL_DEEP_CLONE=1` project environment variable is Vercel's own documented lever for this exact problem, but it is a dashboard/project-settings value — it is read by Vercel's checkout step itself, which runs *before* any `vercel.json` `build.env`-scoped variable is available, so it cannot be set from inside this repo. It would be a reasonable *defense-in-depth* addition (skips the extra fetch round-trip entirely) but is not required — the `buildCommand` fix above is sufficient on its own and needs no Dom action to take effect on the next deploy. Documented here as an optional follow-up rather than a blocker.

### 5.3 The downside I am accepting

Because the artifact isn't committed, **Dom cannot see the rendered provenance in a PR diff** — only the report block that feeds it. That is a real loss versus hand-authored frontmatter. Mitigation: `npm run provenance:print` emits a human-readable table (file → author → reviewer → judge → commit → tokens), and CI runs it so the output is in the PR's check log. I judge this cheaper than reintroducing a drift-capable committed artifact.

### 5.4 One repo-specific trap

The artifact and generator must **not** live where they break the existing auto-merge path guard. `.github/workflows/auto-merge.yml` allowlists `content/**`, `docs/**`, `reports/**`, root `*.md`, `**/*.test.ts(x)`. A committed artifact under `src/` would strip the `safe-auto` label from every otherwise-safe content PR. Not committing it sidesteps this entirely — a second reason for that choice. Report blocks live in `reports/**`, already safe.

---

## 6. What `ProvenanceStrip` renders

Format per design-brief §6: full-width thin bar, JetBrains Mono 13px, `--ink-muted`, dotted-border ledger chips joined by `·`, wrapping at `·` boundaries only. Two variants, as today: inline (mobile, under the byline) and the desktop rail card, which is display-exclusive with the inline one.

**Full data (inline):**

```
Written by Sanne, marketer · reviewed by Nora, Project Lead (fact-check)
· Judge (Fable-5): PASS, round 2, 93/100 · built on commit a1b2c3d
· ~173k tokens (self-reported, whole run) · run of 2026-07-18
```

Two chips are links: the commit → the GitHub commit URL (constructed, §4.3); the run → the report file on GitHub. **The Judge chip is not presented as a quotation** — it is a rendered projection of structured fields, and the run link is how a reader checks the original wording. This is a direct response to the persona-bible incident where a normalized verdict string was passed off as verbatim.

**Rail card (desktop, `lg+`):** same fields stacked as labelled rows, plus the design-brief §5 graded-paper badge (`PASS · Round 1 · 91/100`) — now renderable because the data is real. This closes the element omitted on 2026-07-18. The rail additionally renders the `judge: null` state, which the inline strip suppresses:

> **Judge review** — none for this entry; reviewed by Nora, Project Lead (fact-check).

**Partial data:** present chips render, absent chips are simply absent. No `—`, no `n/a`, no greyed placeholder, no "unknown". A missing field leaves no trace, because a visible placeholder is a slot that invites someone to fill it with a plausible guess.

**No data at all** (`provenance === undefined`) — the important case, and where the current component is weakest:

```
Written by Nora, Project Lead · no run record for this entry
```

The second chip is muted, non-linked, and **deliberately visible**. This is the honest-degrade requirement: today's strip renders a single clean byline that reads like a complete, deliberate design, silently implying there was nothing more to say. There was — the record just doesn't exist. Saying so turns a hidden gap into a visible one, which is both more honest and, on a site about process, more interesting. A tooltip/`title` explains: *"This entry predates the provenance model, or its run wasn't recorded."*

Accessibility: unchanged from today — `role="note"`, `aria-label="Provenance"`. The `·` separators stay `aria-hidden`. Chip labels are read as plain sentences, so `~173k tokens (self-reported, whole run)` is spoken in full; no abbreviation carries meaning alone.

---

## 7. Security & trust model

Right-sized: static site, no server, no user input. The §5 model in `docs/spec.md` is unchanged. Two things this feature genuinely adds:

- **Report content becomes render input.** `reports/*.md` is agent-authored, and this feature promotes a slice of it onto every page. The trust boundary is the **allowlisted, tightly-typed block**: only enumerated keys with enum/number/regex types reach the page, and report *prose* is never rendered. Free-text fields (`authors`, `reviewers[].by`) are cross-checked against `cast.ts`, so they cannot carry arbitrary strings. **No URL is ever read from a report** — the one field that becomes an `href` (the commit link) is built from a hardcoded base plus a 40-hex-validated hash. This is the feature's only real injection path and it is closed by construction.
- **Shell safety in the generator.** File paths from reports are passed to git via `execFile` with an argument array — never string-interpolated into a shell. Paths are additionally constrained to repo-relative, no `..`.

Accidental disclosure: reports contain local paths, machine details, and Dom's personal notes. The allowlist means nothing leaks by default — a new field can only appear on the site if someone adds it to the schema, which is a code review.

Everything else on the checklist stays N/A for the reasons already stated in `docs/spec.md` §5 — no auth, no rows, no tenancy, no runtime LLM, no user input.

---

## 8. Migration: the eleven existing files

**Principle: backfill only from what a report actually states. Anything not recoverable stays blank — permanently, if need be.** A blank strip that says "no run record" is a correct output, not a TODO.

**Projects — six files, all recoverable.** `reports/2026-07-16.md` states the full picture: six read-only dossier agents, marketer wrote all six from the dossiers only, Project Lead review caught two errors, `npm test` 57/57 green. One `provenance` block on that report with all six paths in `produced` yields: `authors: [marketer]`, `reviewers: [{ by: "Project Lead", kind: lead-review }]`, `judge: null`, `tokens: null` (that report gives no figure — omit, don't estimate), commits derived. This is genuinely honest provenance for project pages and **resolves the open question Dom was asked on 2026-07-17** ("do you want *any* honest provenance line on project-detail pages?") with real data rather than the fabrication that was correctly refused then. Enabling it is still Dom's call (PR 7).

**Posts — five files, split.**

- `2026-07-18-what-the-green-checkmarks-missed.md` — **recoverable.** `reports/2026-07-18.md` item 3: marketer/Project Lead byline, lead fact-check (it names the corrected error: "four runs" → six). `judge: null`. **`tokens` omitted** — the report gives `marketer 45k + 63k` for two posts and the split is unknowable.
- `2026-07-15-i-gave-claude-a-dev-team.md` — **recoverable.** Same report, item 4, plus the founding-post date correction recorded in BACKLOG. Same `tokens` omission, same reason.
- `2026-07-18-we-hired-someone-to-look-at-the-page.md` — **partially recoverable.** `reports/2026-07-18-evening.md` records PR #16, Sanne's byline, and `Sanne posts 45k+51k` — again two posts, so tokens are omitted. Reviewer is stated obliquely ("reviewing Sanne's draft… made two guardrail violations jump out"); record `lead-review` only if the backfilling run judges that explicit enough, otherwise omit.
- `2026-07-16-the-day-the-repos-got-honest.md` and `2026-07-17-teaching-the-studio-to-merge-itself.md` — **no report entry names either file.** *(Verified 2026-07-19 by the Project Lead: a grep for both slugs across all of `reports/` returns nothing.)* The 07-16 report covers portfolio content; the two 07-17 reports cover projects pages and auto-merge infra. **These two stay blank and render "no run record for this entry."** They are not to be reconstructed from the surrounding runs, however plausible the reconstruction. Two posts visibly carrying a gap is a better advertisement for this site than five posts carrying a uniform, partly-invented ledger.

Commit hashes for all eleven are derived, no backfill needed.

---

## 9. Right-sizing — what I am deliberately not building

This is a personal logbook with eleven content files. Not building:

- **No database, no CMS, no API.** Reports plus git are the record.
- **No runtime GitHub API calls.** Commit links are constructed strings; nothing is fetched.
- **No token metering integration.** Self-reported estimates, labelled as such. Wiring real usage telemetry into the site is a different, much larger project.
- **No `/runs` route, no provenance index, no per-agent stats page, no cost-over-time chart.** All tempting, all scope creep. The strip is the deliverable.
- **No edit history.** Provenance is a *creation* record. A file edited across five runs shows the run that made it. Building a per-file changelog UI duplicates git for no reader benefit.
- **No incremental cache, no watch mode, no parallelism** in the generator. Eleven files and nine reports; a full regenerate is milliseconds.
- **No auto-generation of the report block from telemetry.** The lead writes it, as part of writing the report. That the human-readable artifact and the machine-read artifact are the same file is the honesty mechanism, not a limitation.
- **No multi-author or per-section UI.** The schema takes `authors: string[]` so DOM-2 isn't blocked, but the strip renders the first author plus "+N others" and nothing more until DOM-2's designer spec lands.
- **No provenance for the external project repos themselves.** We record how *the write-up* was produced, not how SoulForge was built.

---

## 10. Key decisions & tradeoffs

**Derived from reports, not authored in frontmatter.** Rejected frontmatter (fairly stated, §2.3). Downside accepted: a build step, a git dependency, and provenance that isn't visible in the PR diff.

**Structured yaml block in reports, not prose parsing.** Rejected prose parsing outright — §2.2 shows it fails by inventing. Downside: the report format changes, and every future run must remember the block. Mitigation is that forgetting it degrades to a visible "no run record", which is self-correcting: the gap shows up on the site.

**Join on `produced:` file paths in the report, not a pointer in frontmatter.** Rejected adding a `run:` frontmatter field. Deriving the join from the side that holds the facts means **zero new frontmatter fields** and no second place to typo. Downside: adding a file to `content/` requires touching the report to give it provenance — which is the correct incentive.

**Artifact generated, never committed.** Rejected a committed generated file with a CI drift check. Not committing eliminates the drift class entirely instead of policing it, and dodges the auto-merge path-guard problem (§5.4). Downside in §5.3.

**Git failure is a hard build error; "no commit yet" is not.** Rejected a uniform `commit: null` fallback, because it would let an infra failure masquerade as a fact.

**`judge: null` is a distinct, renderable state.** Rejected two-state optionality. Costs one extra rail row; buys the difference between "Judge-reviewed" and "lead fact-checked" being visible rather than flattened.

---

## 11. Risks

- **Report-block discipline decays.** Runs stop writing the block; provenance quietly stops appearing on new content. *Most likely failure.* Mitigation: it is visible on the live site (new posts say "no run record"), the format lives in `BACKLOG.md`'s "Run report format" section which every run reads, and two reference examples ship in PR 1. Deliberately no CI gate forcing a block — that would push a run toward inventing one to go green.
- **Shallow clones break the build** in CI or on Vercel. Concrete and near-certain if not pre-empted; §5.2 names both fixes. *(Both fixed: CI via `fetch-depth: 0` (PR #44), Vercel via the `buildCommand` unshallow (2026-07-24) — see §5.2 for the residual "already-shallow-again" risk if a future `vercel.json` edit drops the `buildCommand`, which `vercelFullClone.test.ts` guards against.)*
- **Scope creep into a "runs" section.** The data will look like it wants a dashboard. It doesn't. §9 is the defence.
- **Backfill temptation.** Whoever writes the backfill PR will feel the pull to fill in the two unrecoverable posts and to split the combined token figures. *This is the single highest-risk moment in the item.* PR 6 should be reviewed specifically for what it left blank, and the reviewer should expect blanks.
- **DOM-2 changes `author` to multi-author** while this is in flight. Low impact — the schema already takes an array — but sequence PR 4/5 against DOM-2's schema change if both are live in the same week.

---

## 12. Implementation plan (PR-sized, dependency order)

| # | PR | Scope | Depends on | Owner |
|---|---|---|---|---|
| 1 | **Report block format** | Add the `yaml provenance` spec to `BACKLOG.md` "Run report format", link this doc, add reference blocks to the two most recent reports. Docs/reports only — `safe-auto` eligible. | — | architect / lead |
| 2 | **Schema + block parser** | `src/content/provenance-schema.ts` + `scripts/provenance/parse.mjs`: extract fenced blocks, Zod-validate, cast cross-check, precise error messages. Unit tests. **No consumers.** | 1 | backend-dev |
| 3 | **Git derivation + generator** | `scripts/provenance/generate.mjs`, `predev`/`prebuild`/`pretest` wiring, `.gitignore`, `provenance:print`, CI `fetch-depth: 0`. Emits the artifact; nothing reads it. Includes the duplicate-`produced` and dangling-path failure tests. | 2 | backend-dev |
| 4 | **Loader integration** | `loader.ts` attaches `provenance?` to `Post`/`Project`; loader throws if the artifact is missing. Tests. **No UI change** — site looks identical. | 3 | frontend-dev |
| 5 | **`ProvenanceStrip` v2** | Full / partial / none states, inline + rail variants, the graded-paper badge, the "no run record" degrade, commit URL construction, a11y. Design-brief §5/§6 conformance. | 4 | designer sanity-check → frontend-dev → qa-tester |
| 6 | **Backfill historic reports** | `provenance` blocks appended to `2026-07-16.md`, `2026-07-18.md`, `2026-07-18-evening.md`. Reports only — `safe-auto` eligible. Review focus: what stayed blank. | 3 (parallel with 4–5) | lead |
| 7 | **Enable on project detail** | Renders the strip on `/projects/:slug`, closing the 2026-07-17 open question. **Public copy + a reversed prior decision → Dom checkpoint.** | 5, 6 | lead → Dom |

PRs 4–5 and 6 are parallelizable across two people. PRs 1–3 are strictly sequential. Nothing visible ships before PR 5, so the feature can be abandoned after any of PRs 1–4 with no user-facing residue.

**Also update:** `docs/spec.md` §3 gains a §3.4 pointing here, and §4 gains the generator as a build-step work package. Do it in PR 3, not as a separate PR.

---

## 13. Ordering constraint — a run cannot record its own creations until its PRs merge

**Status:** recommendation written 2026-08-01; adopted as the standing rule pending Dom's ratification (§13.3 changes the format's binding convention, which is his call — same posture as every other decision in this document). **Source:** first observed 2026-07-30 (`reports/2026-07-30.md`, "Provenance blocks — deliberately deferred, and why"); backlog item HIGH — "A run cannot record its own provenance until its PRs merge."

### 13.1 The constraint

A `yaml provenance` block's `produced` list is a **creation record**: `generate.mjs` verifies every produced path exists on disk (§5.2, §4.1) before it will emit a record for it — deliberately, since a dangling citation is exactly the class of fabrication this feature exists to prevent. That check runs against whatever git ref the generator is invoked against.

On a multi-lane run (several agents in parallel worktrees, each on its own branch, each with its own PR), the **report is a separate deliverable from the lanes it describes** — it is written by the lead, synthesizing across lanes only once their outcomes are known, and it is opened as its own PR on its own branch. At the moment that report PR's CI runs, the files the lanes created live on *their* unmerged branches, not on the report branch or on `main`. The claim "this run produced `X`" is therefore not yet true when the report is written, even though it will become true the moment the lane PRs merge. The generator correctly rejects it — this is §5.2's fail-loud property doing its job, not a defect to route around.

This is **structural, not incidental**: it recurs on every run that (a) ships more than one lane in parallel and (b) writes one synthesized report for all of them, which is the run shape this repo's whole pipeline (`architect → designer → dev agents in parallel → qa-tester → security-auditor → lead`) is built around. Expect it every time a run has more than one lane. (§13 is about *timing* — the creation record is true, just not yet. For a run whose deliverable is a **modification**, there is no true creation record to make at all; see §14.)

### 13.2 The options, evaluated

**Option 2 — merge the report PR last, accept transient red CI — is rejected outright.** It reproduces, verbatim, the failure this repo already named and fixed: "a gate people learn to re-run until it's green stops being a gate" (`reports/2026-07-19.md`; fix landed 2026-07-29, `BACKLOG.md` lines ~538–553). A required check that is red for the routine, expected reason "the report always fails until its lane PRs land" trains reviewers to stop reading it. Not considered further.

**Option 3 — relax the generator to accept a produced path that exists on the PR branch but not `main` — is rejected, precisely because of what it would cost.** The report PR's own CI checkout does not contain the other lanes' unmerged files at all (different branch, not fetched); "verify against the PR branch" is therefore not a local filesystem check anymore, it is a claim about a *different*, unfetched ref. Making that claim require either (a) trusting the block's assertion without verifying it — which deletes the one property `generate.mjs` exists to enforce, that a produced path is checked against real bytes on disk, not asserted — or (b) a live cross-branch lookup (a GitHub API call keyed on a report-supplied branch name), which reopens exactly the closed injection path §4.3/§7 are built around ("a URL/identifier is never read from content and used to reach out; it is constructed from a hardcoded base plus a validated value") and trades a deterministic, offline build for one dependent on network availability and a branch that is routinely deleted within minutes of merging. And even if it worked, "existed on the PR branch at generation time" does not imply "exists on `main` at merge time" — the branch can still be force-pushed or the PR closed unmerged — so it would reopen the exact drift gap the 2026-07-27 commit-the-artifact-plus-CI-drift-gate fix (§5.2) was built to close, this time at the point of *creation* rather than staleness. Rejected.

**Option 4 — move the block into the branch that creates the files — does not survive contact with how this repo's reports actually work, and the evidence is concrete, not speculative:**

- `generate.mjs`/`parse.mjs` don't care *which* `reports/*.md` file a block lives in — `readReportFiles` reads every `.md` directly under `reports/` (`scripts/provenance/parse.mjs:156-166`), so nothing in the code stops a block from living in a small file on a lane's own branch instead of the day's narrative report. That much of the idea is mechanically workable.
- But nothing on a lane's branch is a legible report on its own. The lead's report is a synthesis written *after* all lanes are known — `reports/2026-07-30.md`'s "Decisions made," "Learnings," and "Token spend" sections compare and total across all four lanes; they cannot be written until every lane has landed. Moving the block onto each lane's branch would not remove that synthesis step, it would add a second, smaller writing obligation *before* it, on every lane — meaning strictly more files recording the same event, not fewer, and the cross-lane narrative would still need writing (and would still lack its own block, since it produces no files of its own).
- It also breaks the specific transparency mechanism the strip relies on. `ProvenanceStrip`'s run chip links to `reportPath` and displays `runId` as its label (`src/components/ProvenanceStrip.tsx:165-174`) specifically so a reader can check a rendered claim (e.g. a Judge verdict, a reviewer's characterization) against the original prose it was derived from (§6: "The run link is how a reader checks the original wording"). A lane-branch file holding nothing but a fenced block has no prose to check against — the verification path the whole design argues for (§2.1) goes missing for every record built this way.
- It would also corrupt the (currently spec-only, `docs/reports-surface.md`) `/reports` index, which is designed to derive one row per file under `reports/` from the filename date and first-H1 title (`docs/reports-surface.md` §3: "date… **Filename**", "title… **First H1, verbatim**", generator failure mode "First non-blank line is not an H1 → Build fails, naming the file"). A stub file holding only a block, or nothing but a block plus a placeholder H1, would either fail that generator's own fail-loud check or surface as a spurious, content-free "run" row — multiplying the reports surface with fragments never written for a reader, which is precisely what §3 of that spec argues against building.
- Authorship also moves the wrong direction. §9 of this document is explicit that "the lead writes it, as part of writing the report… that the human-readable artifact and the machine-read artifact are the same file is the honesty mechanism, not a limitation." Requiring every specialist branch to carry its own block (or requiring the lead to author N small block-only commits mid-run, on branches under active review by other agents) is a bigger workflow change than an ordering rule, and it is a change in the wrong direction for a feature whose entire premise is that a wrong number should require lying in the one artifact Dom actually reads (§2.1) — scattering authorship across every lane's branch is more surface for exactly that error, not less.

Option 4 is a reasonable-sounding idea that, on inspection of `parse.mjs`, `ProvenanceStrip.tsx`, and `docs/reports-surface.md`, costs more files, a weaker verification link, and a real risk to a second, already-drafted feature — for no reduction in the number of manual steps a run has to remember. **Rejected.**

### 13.3 Recommendation: Option 1, formalized as a standing step

**Always append the deferred blocks in a follow-up commit once the referenced PRs merge — this is now a required, standing step of the run-report workflow, not an ad hoc recovery.** Concretely, add this to `BACKLOG.md`'s "Provenance blocks" convention (§ Run report format) so a future run does not have to re-derive it:

1. If a run's report is opened before every PR it describes has merged, and any `yaml provenance` block's `produced` path is not yet on `main`, **do not include that block in the report PR.** Preserve its exact intended content in prose, under a clearly labelled subsection of the report (as this run did — see "Provenance blocks — deliberately deferred, and why," 2026-07-30) — branch, produced paths, authors, reviewer(s) + kind, `judge`, and `tokens`, verbatim, so nothing is reconstructed from memory later.
2. State plainly in that subsection which PRs the deferral is waiting on.
3. Open (or reuse) a backlog item tracking the deferred append so it is visible and does not silently stay "no run record" forever.
4. **Once every referenced PR merges, append the preserved blocks to the report in a small follow-up commit on a new branch**, run `npm run provenance:generate`, confirm it accepts them, and commit the regenerated `src/content/provenance.generated.json` alongside the report edit (the CI drift gate, §5.2, requires the two to match). Update the deferred-blocks subsection from future to past tense — do not delete the reasoning; it is the record of the constraint for the next run that hits it.
5. This is a routine, expected step on any multi-lane run, not a failure state. Do not treat a report that defers blocks as incomplete or hold it back from merging on that basis — the deferral **is** the fail-loud property working as designed (§5.2).

This keeps the generator's guarantee exactly as strong as it is today (a produced path is only ever a record of a real file on `main`), adds no network dependency, and costs one extra, well-defined commit per multi-lane run — smaller than the cost either rejected alternative would have imposed.

**This changes the format's binding convention** (`BACKLOG.md`'s "Provenance blocks" section) by adding a named step to it. Per this document's own status line, that is Dom's call to ratify, the same as any other change to the format's contract — flagging it here rather than treating the workflow addition as self-ratifying.

## 14. The format records creation only — a run whose deliverable is an edit has no record to make

**Status:** recommendation written 2026-08-02; adopted as the standing rule pending Dom's ratification (§14.7 changes the format's binding convention, which is his call — same posture as §13 and every other decision in this document). **Source:** surfaced 2026-08-01 by the Project Lead on the very first application of §13, on the run that wrote §13. **Backlog item:** MEDIUM — "The provenance format can only record file *creation*, so a run whose deliverable is an edit has nothing it can honestly claim."

§13 is about **timing**: the record is true, just not yet. This section is about **kind**: for an edit, there is no true record to make at all. A run can hit both at once.

### 14.1 The gap, in terms of what the generator actually does

`scripts/provenance/generate.mjs` resolves a `produced` path to exactly one commit, with exactly one query (`generate.mjs:104`):

```js
const output = runGit(gitRunner, repoRoot, ['log', '--diff-filter=A', '--format=%H%x00%cI', '--', relPath], `resolving commit for "${relPath}"`);
```

`--diff-filter=A` selects only commits that **added** the path, and when several exist (added, deleted, re-added) the resolver deliberately takes the *oldest* — its own comment, `generate.mjs:99-102`: "Multiple `--diff-filter=A` hits (added, deleted, re-added) resolve to the OLDEST — the file's original creation — since `git log`'s default order is newest-first, that's the last line", implemented at `generate.mjs:108-110`. The schema says the same thing in the type layer: `produced` "lists repo-relative paths this run CREATED (never edited)" (`src/content/provenance-schema.ts:88-96`) and must be non-empty (`provenance-schema.ts:101`). `BACKLOG.md`'s binding convention says it a third time: "a path may appear in at most one report, ever — this is a creation record, not an edit log".

So a run whose main artifact is a **modification** has, today, exactly three honest moves: omit the block (a real run showing "no run record"), record only the files it incidentally created (true, but it under-describes the run), or say something in prose that the site never renders.

The 2026-08-01 run is the worked example: three of its four lanes shipped edits — §13 into an existing `docs/provenance-model.md`, the `runId`/`reportPath` regex pinning in `src/content/provenance-schema.ts:44-48`, and the `src/content/*.generated.json` allowlist line in `.github/workflows/auto-merge.yml:53`. None of those files was created by that run.

**Two failure modes follow, and the second is the dangerous one.**

1. **Misattribution.** Listing `docs/provenance-model.md` under `produced:` in an 2026-08-01 report would resolve — successfully, silently, with a green build — to the commit that *created* that file weeks earlier, and the strip would then render "run of 2026-08-01" beside a commit link from another run. That is the same error PR #72's archaeology refused when it left three project pages showing "no run record" (`reports/2026-07-29.md`: "3 of 6 project pages show real provenance; 3 honestly show 'no run record.' That is the correct outcome").

2. **Nothing in the code can catch it.** The duplicate-path guard (`generate.mjs:220-241`) only fires when *another report* has already claimed the same path. No report has ever claimed `docs/provenance-model.md`, `src/content/provenance-schema.ts` or any workflow file — verified against all 15 keys in `src/content/provenance.generated.json` and against a grep of `reports/`. The existence check (`generate.mjs:244-248`) passes, the directory check (`generate.mjs:255-258`) passes, `git log` returns a real commit, and the record is written. **The only guard against this class of error is the convention.** That is why it is written down here and made binding in `BACKLOG.md` rather than left to judgement.

### 14.2 What the format actually claims — the frame that decides everything below

Precisely one field in a `ProvenanceRecord` is derived from git: `commit`. `authors`, `reviewers`, `judge` and `tokens` are all *asserted* in the report block and merely **typed** by `ProvenanceBlockSchema`. The falsifiability property §2.1/§4.3 argues for is therefore narrower and sharper than "everything on the strip is derived":

- the one mechanically checkable claim — **this run created this file** — is checked against real bytes on disk and real history, and a false one fails the build;
- every other claim lives in the artifact Dom actually reads, one click away behind the run chip (`ProvenanceStrip.tsx:165-178`), which is the verification path §6 names.

The anchor is the creation check. Remove it and what remains is typed prose promoted onto a public page — which is exactly the machine §2.3 rejected hand-authored frontmatter for building. **Any option that makes an edit *renderable* without a comparably mechanical check does not extend this feature; it inverts it.** That single test disposes of most of §14.3.

### 14.3 The options, costed, each accepted or rejected in writing

#### (A) Loosen `--diff-filter=A` — rejected, and it would not even work

Forbidden by the backlog item, and the item is right, but the mechanical reason is worth recording so nobody re-derives it as clever. `--diff-filter=AM` changes **nothing**: the resolver takes the last line of newest-first output, i.e. the oldest hit, which is still the creation commit (`generate.mjs:108-110`). To make the "loosened" filter do what its proposer wants, you must also flip the line selection to the *newest* hit — at which point every one of the 15 existing records re-points from its creation commit to the file's most recent touch by anyone. `docs/reports-surface.md`'s record (created by the run of 2026-07-30) would silently start crediting the 2026-07-30 run with a commit made by whichever later run edited that doc. The loosening does not add edit records; it converts 15 true creation records into 15 undated "most recent toucher" records. **Rejected on its own merits, independent of the item's instruction.**

#### (B) A `modified:` list in the block, resolved by `--diff-filter=M` — rejected

What it would take: `provenance-schema.ts` gains `modified: string[]` and must relax `produced`'s `.min(1)` (line 101) so a modification-only block is representable; `generate.mjs` gains a second resolver and a second record shape; `ProvenanceArtifactSchema` (line 142) is `z.record(path, record)` — one record per path — so modification records **collide by construction** with creation records for the same path and need either a second artifact or a `path -> record[]` shape change, which then changes `loader.ts:193` and `ProvenanceStrip`'s props.

It fails before any of that, on the resolution itself. **Git cannot answer "which commit did this run make to file Y."** `--diff-filter=M` newest-hit answers "who touched it last," which is a moving target:

- The artifact is committed and drift-gated (`ci.yml:181-182`: `git diff --exit-code src/content/provenance.generated.json`). So the *next* run that edits `docs/provenance-model.md` regenerates the artifact, changes an **older** run's record, and the drift gate forces that changed claim into that PR.
- `docs/**` PRs are `safe-auto` eligible and `src/content/*.generated.json` is on the allowlist (`auto-merge.yml:38-53`). So a rendered provenance claim about run N could change and merge automatically inside run N+5's routine docs PR, with no human ever reading the diff. This is the reverse of the property §5.2's drift design exists to guarantee.
- Date-scoping (`--after`/`--before` around the run date) does not rescue it. Squash-merge lands the commit on the merge date, not the run date — verified in the artifact itself: `content/posts/2026-07-19-three-tries-at-the-same-overlap.md` has `runId: 2026-07-19-evening` and commit date `2026-07-20T21:39:38`. And the corpus has multiple same-day reports (three on 2026-07-15, three on 2026-07-18), so a date is not an identity anyway.

**Rejected.** It produces a rendered claim with no stable referent, and it makes old public claims mutable by unrelated, auto-merged PRs.

#### (C) `modified:` anchored to a PR number — the strongest alternative, rejected on cost

The only variant that keeps falsifiability, so it deserves a fair hearing. Add a required `pr:` integer to any block claiming modifications; the generator resolves the squash commit whose subject ends `(#NN)`, then verifies the claimed path appears in that commit's own diff, and hard-fails otherwise. The claim "PR #NN modified path X" is then content-asserted but **git-checked** — a false claim goes red, which is the bar §14.2 sets. This cannot be rejected on falsifiability. It is rejected on four costs, in descending weight:

1. **It re-introduces prose parsing one layer down.** The anchor is a regex over a *commit message*. `auto-merge.yml:108` proves the automated path squashes (`gh pr merge --auto --squash`), but the Dom-checkpoint PRs — the ones that ship the interesting work — are merged by hand, where both the squash subject and the merge strategy are editable at merge time. Whether the repo *enforces* squash at the settings level is **[not determinable from the repo]**. And `(#72)` legitimately appears in unrelated subjects ("revert #72", "follow-up to #72"), which is precisely §2.2's trap — the regex loose enough to catch the real case also catches the impostor and attributes someone else's commit to your run. Every one of those needs its own fail-loud row.
2. **It contradicts a decision this document already made.** §9: "**No edit history.** Provenance is a *creation* record. A file edited across five runs shows the run that made it. Building a per-file changelog UI duplicates git for no reader benefit." (C) is that changelog, with a schema.
3. **The payoff is currently zero rendered pixels.** `loader.ts:21-31` globs only `/content/projects/*.md` and `/content/posts/*.md`, and joins at `loader.ts:193` by that path — so 4 of the 15 existing records (`docs/cls-fallback-decision.md`, `docs/reports-surface.md`, `scripts/generate-seo-files.d.mts`, `scripts/generate-seo-files.test.ts`) already render nowhere on the site. Every file the 2026-08-01 run *modified* is in that same non-rendering space. The only surface that could ever use edit records is the `/reports` index, which is spec-only (`docs/reports-surface.md` §6 PR 2-4 unbuilt: there is no `src/content/runs.ts`).
4. **Size.** Schema + second artifact + generator resolver + a new failure matrix + drift gate + tests + spec — a multi-PR feature for a bookkeeping edge case with no reader. That fails this document's own §9 rule.

**Rejected — but not permanently.** §14.8 states the conditions under which it becomes the right answer, so a future run can reopen it on evidence rather than on taste.

#### (D) Record only the files the run incidentally created — **partially accepted**

This is what the item calls "under-describes the work," and that is a fair criticism of it as a *complete* answer. It is not a criticism of it as a *rule*: every genuinely created file should still be recorded, exactly as today. What is rejected is **padding** — hunting for a creatable file so the run has a block. A block exists to record a creation, not to give a run a trophy.

One specific padding move is rejected by name, because it is the one a future run will reinvent: **claiming the run's own report file as `produced`.** `reports/2026-07-29.md` already refused it ("reports are the *source* of provenance, not a subject of it"). It would also make "this run has a provenance record" trivially true for every run that ever writes a report, destroying the signal that today distinguishes a run that shipped content from one that did not — and the record would key on `reports/…md`, which `loader.ts` never joins, so it renders nothing anyway. **Rejected.**

#### (E) A ceremonial block: `produced: []` plus a free-text description of the edits — rejected

Requires relaxing `provenance-schema.ts:101`, and then emits **zero** artifact records (a block with no produced paths contributes nothing; `generate.mjs:195-198` already short-circuits the zero-produced-paths case entirely). The output is therefore identical to writing a paragraph, at the cost of a schema change and a fenced block that looks machine-read but is not. Pure ceremony, and actively misleading to the next reader of the format. **Rejected.**

#### (F) A run-scoped record on the runs artifact (`runs.generated.json`) — rejected here, deferred there

Tempting because the honest unit for "this run's deliverable was an edit" is the *run*, not the file, and a runs artifact already exists. But every field it would carry (authors, reviewers, judge, tokens) is asserted, not derived, and it would be rendered — §14.2's test, failed. It also belongs to a different spec: `docs/reports-surface.md` §3 is explicit that the runs surface adds "**No new frontmatter, and no new report-format requirement**" and derives every field mechanically. **Rejected as a provenance-model change.** If run-level authorship is ever wanted, it is an amendment to `docs/reports-surface.md`, argued there, on that spec's own terms.

#### (G) Accept the gap, state it as a property, and formalise the prose convention — **accepted**

Cost: one section here, ~15 lines in `BACKLOG.md`, zero code. Effect on falsifiability: **none** — the creation check is untouched, and nothing unverifiable is promoted onto a page. Effect on the 15 existing records: **none**, so the drift gate stays green. How it can go wrong: the prose is written carelessly, or a future run tries to make it machine-readable (§14.5 forbids the latter explicitly).

### 14.4 Recommendation

**Accept the gap. It is a property of a creation record, not a defect in it — and the honest substitute for a machine record of an edit is prose in the report plus the PR diff, which is where an edit is actually verifiable.**

The reasoning that decides it, in order:

1. **The site's claim is deliberately narrow: "this run created this file."** It is narrow because it is always mechanically checkable. Widening it to "this run improved that file" buys coverage by giving up the property that makes any of it worth displaying (§14.2). A narrow claim that is always checkable beats a broad one that is sometimes not — on a device whose entire justification is falsifiability, that is not a close call.
2. **An edit already has a better verification path than the strip could give it: the PR diff.** A reader who wants to know what a run changed in `docs/provenance-model.md` is served by the PR link, which shows the actual bytes. A chip saying "edited by architect, run of 2026-08-01" shows less and asserts more.
3. **"No run record" is already the site's honest word for this, and it is already correct.** `ProvenanceStrip` renders it deliberately and visibly (§6), and `docs/reports-surface.md` fixes the run-level vocabulary as "**no recorded output** for this run … never 'produced nothing': the absence of a `yaml provenance` block is not evidence a run shipped nothing." The vocabulary for this exact case was already designed. What was missing is not a data structure — it is the *sentence in the report* that says which of the two it is.
4. **The house has already done this twice, well, unprompted.** `reports/2026-07-27.md` ("This run created no new `content/` posts or projects … so per §4.1 it ships no `yaml provenance` block of its own") and `reports/2026-07-29.md` ("**None — deliberately** … Two blocks were drafted and removed on inspection, which is worth recording because both were wrong in ways the format is designed to catch"). Both are better artifacts than any schema field would have produced. The work here is to make the best existing practice binding, not to invent a mechanism.

### 14.5 The non-goal, stated so it is not re-derived

**The generator must never learn to read the prose written under §14.7.** No regex over "Modified, not claimed"; no derived fields; no soft parse "just for the reports index." Report prose is never parsed (§2.2, and `parse.mjs:29-32`'s deliberately narrow `yaml provenance` fence is the only thing in a report the code ever reads). The value of this convention is precisely that it lives *outside* the machine-read surface: it can say true things too nuanced to type, without any of them becoming a rendered claim. A future run that "improves" this by making it parseable would be rebuilding option (B) with extra steps.

### 14.6 What changes, and what does not

| Artifact | Change |
|---|---|
| `scripts/provenance/generate.mjs` | **None.** |
| `scripts/provenance/parse.mjs` | **None.** |
| `src/content/provenance-schema.ts` | **None.** |
| `src/components/ProvenanceStrip.tsx` | **None.** |
| `src/content/provenance.generated.json` | **None** — all 15 records stand; the drift gate stays green. |
| `docs/provenance-model.md` | This section; one cross-reference from §13.1. |
| `BACKLOG.md` | The convention in §14.7 appended to the "Provenance blocks" section. |

**This recommendation is spec-and-convention only. It implies no implementation PR.** The whole change touches `docs/**`, root `*.md` and `reports/**`, so it is `safe-auto` eligible (`auto-merge.yml:38-40`) and needs no dev agent.

### 14.7 The binding convention — effective immediately

Appended to `BACKLOG.md`'s "Provenance blocks" section (§ Run report format), in that section's existing register:

> **Every report gets a `## Provenance blocks` section — including when there is nothing to claim.**
> A `yaml provenance` block is a **creation record**. If a run's deliverable was an *edit*, it has no block to write, and that is the format working, not a gap to fill.
>
> 1. **Never list a file the run edited under `produced:`.** The generator will accept it and resolve an earlier run's creation commit — a green build carrying a false claim. Nothing in CI catches this; the rule is the only guard.
> 2. **Record every file the run genuinely created, and nothing else.** Do not hunt for a creatable file, and never claim the report itself.
> 3. **When a run created nothing (or little) that a block can carry, say so in prose under `## Provenance blocks`**, in one short paragraph: what the run's actual deliverable was, which files it *modified*, and the PR number for each — the PR diff is where an edit is verifiable. Head that list "Modified, not claimed — a `produced` list is a creation record (§14)."
> 4. **This prose is never parsed and must never become parseable.** It is for Dom and for the next run, not for the generator (§14.5).
> 5. A run may hit this **and** §13's ordering constraint at once — deferred creations *and* unclaimable edits. They are separate paragraphs in the same section; do not merge them.
>
> Worked examples: `reports/2026-07-29.md` ("Provenance blocks — **None — deliberately**", including the two drafted blocks it removed and why) and `reports/2026-07-27.md`'s closing line.

**Template for the empty case, copy-paste:**

````markdown
## Provenance blocks

**None — deliberately.** This run's deliverable was [X]. It created no file that a block can
carry, and a `produced` list is a creation record, not an edit log (`docs/provenance-model.md`
§14), so listing what it changed would attribute an earlier run's creation commit to this one.

**Modified, not claimed** — verifiable in the PR diffs, not on the site:

- `path/to/file` — what changed (PR #NN)
- `path/to/other` — what changed (PR #NN)
````

### 14.8 When to reopen this — the trigger, so the door is not nailed shut

Option (C) becomes worth its cost when **all three** hold, and not before:

1. `/reports` has actually shipped (`docs/reports-surface.md` §6 PR 4), so an edit record would have a reader;
2. edit-only runs are the **majority** of runs over a sustained period, so the index's honest "no recorded output" rows stop describing an exception and start describing the studio; and
3. squash-merge with a `(#NN)` subject is **enforced**, not merely customary, so the PR anchor is a guarantee rather than a habit.

Until then, a run that feels the pull to build it should write the paragraph instead. If a future run reopens this, it should argue against §14.2's test explicitly — that is the claim to beat.

### 14.9 Risks of the accepted option

- **The prose section decays into boilerplate.** Same risk §11 names for the block itself, and the same self-correction does *not* apply — a missing paragraph is invisible on the site. Mitigation: the section is required in every report, so its absence is visible in the report PR diff, which Dom reads.
- **Someone reads "no run record" as "this run did nothing."** Real, and partly mitigated already by `docs/reports-surface.md`'s fixed vocabulary ("no *recorded output*") and by the logbook, which is where edit-shaped work becomes publicly visible. If the misreading ever shows up in practice, the cheap fix is one sentence of page copy on `/reports`, not a schema.
- **The trap in §14.1(2) recurs anyway.** A future run lists an edited file under `produced:`, CI goes green, and a false commit link ships. There is no mechanical guard, by design — the check that would catch it (does this path's creation commit belong to this run?) needs exactly the run→commit identity option (C) failed to establish cheaply. The mitigation is review: **when a report PR adds a `produced` path, the reviewer's job is to ask whether that run created it.**
