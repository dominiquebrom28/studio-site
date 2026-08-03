# Maintenance sweep — 2026-08-03

Baseline: the previous sweep, `reports/maintenance-2026-07-27.md`. This report
covers only what changed since then.

13 git repositories under `VibeCodeProjects/`. Since 2026-07-27 exactly **one**
has new work: **studio-site** (32 non-merge commits on `main`, 107 files,
+7444/−200). The other 12 are untouched — including SoulForce-V2, whose
still-broken `main` is a carried finding, not new breakage.

**Good news first:** last week's top finding is resolved. The repo-wide red CI
that jammed every open PR on 2026-07-27 is gone — `audit-ci` + the reviewed
allowlist landed, and every open PR is now green.

**No fixes were applied this sweep.** Nothing met the "trivial, obviously-safe"
bar: the SoulForce fix already exists and needs a merge decision, and the
react-router item below is a major-version migration.

**One caveat on this report's own freshness.** studio-site was being modified by
another agent session *while* this sweep ran — `main` advanced from `f0c1b93` to
`7291fc0` and a PR was merged mid-sweep. Every studio-site figure below was
re-checked against `7291fc0` at the end of the run, but a repo under concurrent
write can drift again between this commit and your reading it. That collision is
itself a finding — see the concurrency section.

---

## Findings by severity

### HIGH — SoulForce-V2: `main` still does not build. Third consecutive sweep, 18 days.

Unchanged since 2026-07-20 and reported for the third time. `main` is still
`9facba8`. Verified factually this sweep, not carried over on trust:

- `src/store/useGame.ts:4` does `import { loadLocalCharacter, loadLocalStats } from '../lib/profile'`
- On `main`, `src/lib/profile.ts` exports `getOwnerId`, `loadLocalCharacter`,
  `loadProfile`, `saveProfile` — **`loadLocalStats` is not among them.**
  `tsc -b` cannot pass.
- The 14-line fix (`301bf1e`, adding the export) still lives only on
  `team/maintenance-2026-07-20`. `git merge-base --is-ancestor 301bf1e main` → **NO**.

Zero SoulForce commits this week, so nothing regressed further — but the repo has
now shipped an unbuildable `main` for 18 days. It has no CI, which is why nothing
forces the issue. The fix is one merge; it is a strict 14-line addition to one
file and touches nothing else.

### MEDIUM–HIGH — studio-site: the react-router advisory now HAS a patched release. The allowlist's own revisit trigger has fired.

The `audit-ci.jsonc` allowlist entry for **GHSA-qwww-vcr4-c8h2** is well-written
and states two explicit revisit triggers. **Trigger #1 has now fired**, and the
entry's factual justification has gone stale:

- The entry says, as of 2026-07-25: *7.18.1 is the latest published release, so
  the only audit-clean bump is a downgrade to 7.11.0.*
- **That is no longer true.** Queried live from the GitHub advisory API this
  sweep: the vulnerable range is now `>= 7.12.0, < 8.3.0` and
  `firstPatchedVersion` is **8.3.0**. `react-router@8.3.0` is published and is
  the `latest` dist-tag.

So a patched release above the vulnerable range now exists — precisely the
condition the entry says should trigger "bump react-router-dom to it and drop
this entry."

**The catch, and why this is not a quick bump:** there is no `react-router-dom@8`.
That package's `latest` is still 7.18.2; v8 consolidated everything into the
`react-router` package. The migration is therefore *swap the dependency, then
rewrite imports* across **28 files** in `src/` — `Link`, `NavLink`, `Outlet`,
`useLocation`, `RouterProvider`, `createBrowserRouter`, `MemoryRouter`,
`createMemoryRouter`. All shallow, widely-used API surface, no exotic usage.

**Risk is still low in practice** — the original "not exploitable here" reasoning
holds: this is a client-only Vite SPA with no RSC/server router and no mutating
route actions. Nothing is newly exploitable. What changed is that the *stated
reason for the exception* ("no fix available") no longer holds, and an allowlist
justified by a claim that has quietly become false is exactly the kind of thing
that rots. Not fixed here — a major-version router migration across 28 files is
well past "trivial, obviously-safe."

Minimum action: update the allowlist comment so it stops asserting something
untrue, and schedule the v8 migration deliberately.

### MEDIUM — studio-site: the auto-merge safe-path glob is broader than its own comment claims

`.github/workflows/auto-merge.yml:51` (added in `ac5e036`):

```
src/content/*.generated.json) is_safe=true ;;
```

The comment above it scopes this to "generated content artifacts under
`src/content/` ONLY" and names exactly two files, each backed by its own CI drift
gate. But in a bash `case` statement `*` also matches `/`, so the pattern grants
`safe-auto` — unreviewed auto-squash-merge on green CI — to **any** file anywhere
under `src/content/` ending in `.generated.json`, including paths with no drift
gate and no schema.

**Failure scenario:** an agent PR adds `src/content/team-bio.generated.json` with
hand-written content, no generator, no drift gate, no Zod schema. CI passes
because nothing checks it. The path guard matches, and `gh pr merge --auto
--squash` merges it with no human reading the diff.

**Why MEDIUM, not HIGH:** today's blast radius is small. The one file that
actually exists under the pattern (`provenance.generated.json`) is independently
re-validated by `ProvenanceArtifactSchema.safeParse()` at module load
(`src/content/loader.ts:107`) and hard-throws on violation, and `runId`/
`reportPath` are regex-pinned against traversal and absolute-URL injection
(`src/content/provenance-schema.ts:1222,1226`). `runs.generated.json` has no
consumer yet. The exposure is future-shaped: a new generated file inherits
`safe-auto` silently. Given the team's own 2026-07-31 finding that branch
protection for this lane was never actually enabled, this path check is currently
the only gate between an agent-authored PR and an unreviewed merge — so the gap
between its stated and actual scope is worth closing.

Fix is one character class: `src/content/[!/]*.generated.json`, or better, list
the two filenames explicitly.

### MEDIUM — studio-site: two agent sessions were writing to the same working tree at the same time, and I was one of them

This one is about the studio's own operating model, and I am implicated in it, so
the account is first-hand rather than inferred.

At 10:54 today the daily run-report session committed `ca6141f` on
`team/2026-08-03-backlog-and-report` and started rebasing it onto `origin/main`.
That rebase stopped on a `BACKLOG.md` conflict. At 10:55 — mid-rebase — **this
sweep ran `git checkout -b` in the same checkout**, which moved `HEAD` off the
rebase's detached state and onto a new branch, and then ran the provenance
generators, overwriting `src/content/runs.generated.json` in their working tree.
Both sessions were driving one shared `.git` and one shared worktree.

**Outcome this time: no damage.** Verified, not assumed — the other session's
rebase continued and finished normally onto its own branch (`91ee12b`), its
commit does **not** contain my report (`git show HEAD:src/content/runs.generated.json`
→ zero matches for `maintenance-2026-08-03`), and its tree came back clean. I
backed my changes out (moved my report to a scratch dir, restored their
`runs.generated.json` from the index) and completed the rest of this sweep in an
**isolated `git worktree`** instead of the shared checkout.

**But the near-miss was real.** Had the timing shifted by seconds, a
`git rebase --continue` would have committed the other session's work onto *my*
branch, or my regenerated artifact — which at that moment included my own
unwritten report — would have been swept into *their* commit. Neither session
had any way to see the other; nothing in the setup announces "another agent is
mid-operation here."

Concretely, the sweep protocol itself is the trigger: it says to fetch, fast-forward
`main`, and branch in `studio-site` — a repo the daily task is also scheduled to
write to. Two scheduled tasks, one checkout, no lock.

Worth fixing structurally rather than by hoping the schedules stay apart. Options,
cheapest first: have background/scheduled tasks always use `git worktree add`
rather than the primary checkout; or add a preflight that refuses to start when
`.git/rebase-merge`, `.git/MERGE_HEAD`, or a non-clean tree is present; or stagger
the two schedules. The first is a one-line change to how these tasks start and
removes the shared-state problem entirely.

### LOW–MEDIUM — studio-site: six PRs open, all green, none merged

The queue moved **during** this sweep: when I started there were seven open PRs
with #87 red; the concurrent daily-report session then fixed #87 (committing the
regenerated `runs.generated.json`) and merged it, advancing `main` from `f0c1b93`
to `7291fc0`. The numbers below are as of the end of this sweep.

| PR | Title | CI |
|---|---|---|
| #93 | Logbook: 2026-08-02 | green |
| #92 | Backlog + 2026-08-02 report | green |
| #91 | Report-claims gate | green |
| #90 | Fix the stale team headcount at the source | green |
| #89 | Provenance §14: edit-shaped-run gap | green |
| #88 | Logbook: 2026-08-01 | green |

All six are green across build, e2e, deployed-smoke and Vercel, and are simply
waiting on review. This is review throughput, not a technical fault — but **#90
is a live user-visible correctness fix** (the site currently renders a stale team
headcount) that is finished, verified, and unshipped.

Note the queue is at 6 against the run-report task's own stated 4–6 throttle, and
that session recorded hitting the same wall on 2026-07-31 — so the backlog is now
actively blocking new feature work from starting, by design.

**The #87 failure mode is worth a permanent guard even though #87 itself is
fixed.** The repo commits the generated file `src/content/runs.generated.json`
and CI enforces freshness with `git diff --exit-code`; any PR that adds a report
without regenerating the artifact goes red:

```
+  { "runId": "2026-08-01", "reportPath": "reports/2026-08-01.md", ... }
```

This has now bitten at least twice, and it would have bitten this report too —
this sweep regenerates and commits the artifact alongside the report for exactly
that reason. A pre-commit hook or a one-line contributor note would retire the
failure mode instead of re-solving it each time.

### LOW — studio-site: dependency drift on core tooling

Build and tests are green on current pins, so nothing is urgent. But four core
tools are now a full major behind, and TypeScript is **two**:

| Package | Current | Latest |
|---|---|---|
| typescript | 5.7.3 | **7.0.2** |
| vite | 7.3.6 | 8.2.0 |
| vitest | 3.2.7 | 4.1.10 |
| eslint | 9.39.5 | 10.8.0 |
| @vitejs/plugin-react | 5.2.0 | 6.0.5 |

Plus routine patch drift (react 19.2.7→19.2.8, framer-motion, tailwind 4.3.2→4.3.3,
playwright, fontsource). The patch-level ones are safe and could go in one batch;
the majors deserve their own scheduled slot. Flagging as drift, not as a defect.

---

## Verification actually performed (studio-site)

- `npm run build` — **pass** (tsc -b + vite build, 5.57s, sitemap 28 URLs / feed 17 posts)
- `npm test` — **pass**, 390/390 across 19 files
- `npm run audit` (the audit-ci gate) — **pass**
- `npm audit` — 3 high, both advisories allowlisted; see below
- `npm outdated` — recorded above
- qa-tester line-level review of all 32 commits' diffs, weighted toward
  `.github/workflows/`, `scripts/`, and gate/test logic

**The brace-expansion allowlist (GHSA-mh99-v99m-4gvg) was independently
re-verified and is legitimate.** `npm ls` confirms the `overrides` genuinely
install patched versions — `brace-expansion@1.1.16` under eslint's legacy
minimatch 3.x, and `5.0.8` under `@typescript-eslint`. Both are at or above the
advisory's patched versions. `npm audit` mis-flags it only because it flattens the
advisory's non-contiguous patched ranges into a single `<=5.0.7`. The exception is
suppressing a false positive, not hiding a real vulnerability.

qa-tester found **no** instances across the full diff of: `.only`/`.skip` tests,
`dangerouslySetInnerHTML`, `eval`/`new Function`, shell-interpolated `exec`,
`--no-verify`, weakened regexes, or vacuous assertions. The CLS and flaky-drawer
test fixes were both re-checked as non-vacuous — they still fail on a real
regression. The provenance git-failure fallback only triggers on git being
unavailable and still hard-fails on genuine content defects.

**security-auditor was not deployed.** The sweep's trigger is code touching auth,
user data, payments, or Supabase RLS. studio-site is a static client-only
marketing SPA with none of those surfaces, and this week's commits added no
auth, no data collection, and no backend. The security-adjacent work that did
land (CSP dist-hash assertion, lint gate, smoke-artifact scoping) was covered in
the qa-tester pass. Calling this out so the omission is a decision, not a gap.

---

## Quiet repos — nothing to do

Twelve repositories have zero commits since the 2026-07-27 baseline and clean
working trees; each was assessed cheaply and skipped, per the sweep protocol.

- **SoulForce-V2** — no new commits. Not quiet in health, though: see the HIGH
  finding above. One uncommitted local edit to `.claude/launch.json` (editor
  config, not product code).
- **Soulforge** — unchanged since its 2026-07-16 preservation commit.
- **Travel plan app** — unchanged since 2026-07-16.
- **chart-token-playground** — unchanged since 2026-07-16.
- **claude-dev-company** — unchanged since 2026-07-16.
- **dominiquebrom-portfolio** — unchanged since 2026-07-18.
- **lovetimeline-app** — unchanged since 2026-07-16.
- **mensdag-app** — unchanged since 2026-07-16.
- **pizzaparty-app** — unchanged since 2026-07-16.
- **sollie-aem-prototype** — unchanged since 2026-07-16.
- **sollie-process-presentation** — unchanged since 2026-07-16.
- **token-impact-mapper** — unchanged since 2026-07-16.

---

## The 3 most important actions for Dom

1. **Merge the SoulForce-V2 build fix.** `team/maintenance-2026-07-20` → `main`.
   Fourteen added lines, one file, restores a `main` that has not compiled in 18
   days. This has been the top item three sweeps running; it is the cheapest
   high-value action available and the only reason it keeps recurring is that
   the repo has no CI to force it.

2. **Clear the studio-site PR queue — start with #90.** All six open PRs are
   green and waiting on review, and the queue is sitting on the run-report task's
   own 4–6 throttle, which is now blocking that task from starting new work.
   #90 fixes a stale team headcount that is live on the site right now.

3. **Stop two scheduled tasks from sharing one working tree.** The daily
   run-report task and this weekly sweep both write to the `studio-site`
   checkout, and today they overlapped mid-rebase. It came out clean, but by
   timing rather than by design. Making background tasks run in a
   `git worktree` — or refusing to start on a dirty/mid-operation tree —
   removes the whole class of problem for about a line of setup.

**Runner-up, if there's room:** react-router. `8.3.0` now patches
GHSA-qwww-vcr4-c8h2, so the allowlist's "no fix available" rationale is factually
wrong even though its risk assessment still holds. Correcting that comment is a
five-minute edit worth doing today; the 28-file migration to the consolidated
`react-router` package deserves its own scheduled slot, not a maintenance sweep.
