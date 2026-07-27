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
