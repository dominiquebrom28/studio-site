# Maintenance sweep — 2026-08-17

Baseline: `reports/maintenance-2026-08-10.md`. This report covers what changed
since then — commit range `ad4cde1..73c9214`.

13 git repositories under `VibeCodeProjects/`. Since 2026-08-10 exactly **one**
has new work: **studio-site** (25 non-merge commits, 34 files, +3217/−281). The
other 12 are untouched.

**studio-site is green on every gate I ran.** Build passes, 603 tests across 27
files pass, typecheck is clean, all five repo self-check scripts pass, and all
six routes on the production deploy return OK. qa-tester reviewed the week's
commits adversarially and returned **zero findings** — the `ae7866b` auto-merge
fixes hold up under attack, the test-suite split is non-lossy, and the messy
`155f2ed…30aa8f2` sequence landed coherent rather than weakened into a no-op.

**The headline is a correction, and it is mine to make.**

Last sweep led with a HIGH: *"`main` is unprotected — a single label can put code
on `main`, and into production, with no CI and no review."* **The CI half of that
is false, and it was false when it was written.** That conclusion came from
`GET /repos/.../branches/main/protection` returning `404 Branch not protected`.
That endpoint only reports *classic* branch protection. It returns 404 even when
a **ruleset** is actively enforcing — and one is:

```
ruleset 19140193 "auto merge" — enforcement: active
  conditions:    ref_name include ["~DEFAULT_BRANCH"]
  bypass_actors: []                    <-- empty; not even the owner can bypass
  rules:         deletion, non_fast_forward,
                 required_status_checks -> context "build" (integration 15368)
```

`build` **is** a required check on `main`, with zero bypass actors. Force-push
and deletion of `main` are blocked. GitHub auto-merge waits for required checks
by definition, so a `safe-auto` label cannot merge past a red `build`. I checked
this with `gh api .../rules/branches/main`, which reports effective rules from
all sources; the 404 alone should never have been read as "unprotected."

That correction demotes last sweep's top finding and, with it, two of this
sweep's security-auditor findings (retracted in full below). What it does **not**
touch is the finding that never depended on required checks — the `*.test.*`
allowlist entry — which is now unambiguously the most important item here, and
is carried unfixed for the third sweep running.

**One trivial fix applied,** on `team/maintenance-2026-08-17`: a one-line eslint
`ignores` entry. Details under the LOW finding. Nothing else met the bar — in
particular the react-router bump did not, for the reason recorded under that
finding.

---

## Retractions and corrections

Recorded explicitly, because three of them are the same failure mode this repo
has already named for itself.

1. **RETRACTED — "`main` is unprotected" (last sweep's HIGH).** A ruleset
   enforces `required_status_checks: build`, `non_fast_forward` and `deletion`
   on the default branch with no bypass actors. Evidence above.

2. **RETRACTED — security-auditor's MEDIUM "CI tells reviewers that `build`
   blocks merges when it does not."** Inverted. `.github/workflows/ci.yml:565`
   posts ``build` (required — blocks merge)` and `e2e` `(advisory — does NOT
   block merge, deliberately non-required)`. Against the live ruleset —
   required checks are exactly `[build]` — **both strings are true**, and
   precisely so. The header assertion at `ci.yml:20-25` is likewise correct.
   The only nit is naming: the comment calls the check `CI / build`, the
   ruleset context is `build`. The rule matches; the prose is a legacy of the
   classic-protection naming convention.

3. **PARTIALLY RETRACTED — security-auditor's claim that the safety net named at
   `auto-merge.yml:46-52` "does not exist."** That comment justifies the
   `src/content/*.generated.json` allowlist entry on the grounds that freshness
   is proven by the drift gate "in the SAME **required** `build` job." `build`
   **is** required, so that justification stands. The glob-anchoring defect in
   the same entry is real and survives — it is filed separately below.

4. **STILL TRUE, THIRD SWEEP RUNNING — `audit-ci.jsonc`'s justification is
   expired.** Filed as a MEDIUM below.

Both agents were briefed with the unprotected-`main` premise, because I gave it
to them from last week's report before I checked it. security-auditor's
workflow-internal analysis was done against the files and is sound; its severity
ranking was computed from my bad premise and is re-ranked here.

---

## Findings by severity

### HIGH — studio-site: `*.test.ts` / `*.test.tsx` are auto-mergeable, which is unreviewed code execution on your machine

`.github/workflows/auto-merge.yml:41`:

```sh
*.test.ts|*.test.tsx) is_safe=true ;;
```

**This is the finding the branch-protection correction does not rescue.** Every
other auto-merge concern is bounded by "CI still has to pass." This one is not,
because the payload *is* a test — it passes CI by running successfully.

`vitest.config.ts` includes `src/**/*.test.ts` and `scripts/**/*.test.ts`. So a
PR whose only changed file is `src/x.test.ts` clears the allowlist, arms
auto-merge, passes `build`, and squash-merges to `main` **with nobody having
read it**. The ruleset requires a status check; it does **not** require a
review (there is no `pull_request` rule). That file then executes:

- on the CI runner on every subsequent PR, and
- **on your machine and every agent's machine, the next time anyone runs
  `npm test`** — with your real shell environment, `gh` auth and npm registry
  credentials.

It also means the repo's own guardrail-script tests can be weakened without
review, and CI goes green *because* the weakened assertion passes.

The chain that sharpens this: the `safe-auto` label is applied by an AI routine,
and that routine reads agent-authored reports, PR bodies and backlog text. A
prompt injection in any of that content that induces the routine to label a
crafted test-file PR yields unreviewed code execution on your laptop.

**Fix:** delete the `*.test.ts|*.test.tsx` case. One line. `BACKLOG.md:1062`
already reached this conclusion and has not shipped across three sweeps.

### MEDIUM-HIGH — studio-site: auto-merge has no `branches:` filter, and that is the one genuine zero-CI path

`.github/workflows/auto-merge.yml:3-5` triggers on `pull_request` with **no**
`branches:` filter. `.github/workflows/ci.yml:4-6` triggers **only** on
`branches: [main]`. The ruleset covers **only** `~DEFAULT_BRANCH`.

Line those three up and a `safe-auto` PR targeting a `team/*` base gets:

- no `build`, no `e2e`, no `backlog-checkoffs` — `ci.yml` never fires
- no required check — the ruleset does not reach non-default branches
- an armed auto-merge with **nothing to wait for**, so it merges immediately

That is a real merge with genuinely zero CI and zero review. It does not reach
production directly — promoting that team branch to `main` needs its own PR,
which *is* gated by the ruleset — but it lands unreviewed code on a branch a
human may later merge believing it was checked. Carried unfixed from 2026-08-10.

**Fix:** add `branches: [main]` at `auto-merge.yml:4`. One line. The paired
change (`ci.yml` → `branches: [main, 'team/**']`) is the other half of the
stacked-PR blind spot already logged last sweep.

### MEDIUM — studio-site: three fail-open paths leave auto-merge armed after an "unsafe" condition

Last sweep's P1 — the block step stripping the label without ever calling
`gh pr merge --disable-auto` — **is genuinely fixed** at `auto-merge.yml:101-107`,
and I verified it myself rather than relaying it. The disarm runs *before* the
comment and the unlabel, and captures the exit code (`|| disable_status=$?`)
instead of a blanket `|| true`, so a real `gh` failure still surfaces under
`set -euo pipefail`. qa-tester independently could not construct a case where
the original gap still fires.

Three paths never reach that step:

**(a) Removing the label by hand strands an armed auto-merge.** `unlabeled` is
not in the trigger list (`:5`), and the job-level `if` (`:14`) requires the
label to be present. So: PR is labelled and armed → a human removes the label
believing that stops it → nothing fires, nothing disarms → a later push of
`src/` fires `synchronize`, the job `if` evaluates **false**, the whole job is
**skipped**, and the still-armed auto-merge merges the unsafe code once `build`
goes green. `AUTO-MERGE-SETUP.md:152-157` documents the first half and tells you
to run `--disable-auto` manually; it does not document the compounding half.

**(b) An empty file list arms.** `auto-merge.yml:69-76` treats an empty
`$UNSAFE_FILE` as proof of safety, with no positive assertion that `$files`
(`:29`) was non-empty. If `gh pr diff --name-only` returns empty or truncated
output, the loop runs zero iterations and the guard concludes "all safe" on a PR
it never inspected. The default on "I saw nothing" is *safe*; it should be
*unsafe*.

**(c) A guard-step error disarms nothing.** `set -euo pipefail` (`:25`) means any
`gh` blip fails the step; both downstream steps gate on
`steps.guard.outputs.unsafe == 'true'`/`'false'`, and neither matches an unset
output. Result: no arm (correct) and no disarm (fail-open) on a PR that may
already be armed. There is no `if: failure()` disarm.

Because `build` is required, the consequence of (a)–(c) on a `main`-targeted PR
is **merge without review**, not merge without CI. Combined with the missing
`branches:` filter above, on a `team/*` base it is both.

**Fix:** add `unlabeled` to the trigger; move the label test out of the job-level
`if` into the arm step only, so the job still runs and can disarm when the label
is gone; fail closed on empty `$files`; add a final `if: failure()` disarm step.

### MEDIUM — studio-site: no required review on `main`

The ruleset requires a status check but has no `pull_request` rule, so approvals
are not required. Anything that clears CI can reach `main` and production
unreviewed — which is the mechanism every auto-merge finding above ultimately
rides on. Worth a deliberate decision rather than a default: for a solo repo
with an AI merge routine, "CI required, review not required" is a coherent
posture only if the auto-merge allowlist is genuinely safe. Today it admits
executable test files (HIGH above).

### MEDIUM — studio-site: `audit-ci.jsonc`'s justification is false, for the third sweep running

`audit-ci.jsonc:20-22` states:

> The 7.x line's latest (7.18.2) is still INSIDE that range, so no patch release
> clears this on 7.x — only the 8.x major does.

**That is false today.** Verified this sweep:

- `npm audit`'s own vulnerable range: `react-router 7.12.0 - 7.18.1`
- latest published 7.x: **7.18.2** — outside the range
- `npm update react-router-dom --dry-run` → `7.18.1 => 7.18.2`, 2 packages,
  lockfile-only, inside the already-declared `^7.18.1`

So the entry claims a ~28-file 8.x migration is the only escape, while a
one-command in-range patch clears it. `npm run audit` currently **passes** while
printing `Found vulnerable allowlisted advisories: GHSA-qwww-vcr4-c8h2` — a
green gate over a fixable HIGH.

Exploitability here remains genuinely nil (client-only SPA, no RSC/server router,
no mutating route actions), so the defect is the bookkeeping, not the exposure.
But the file's own STANDING LESSON (`:69-73`) predicts this exact decay, and this
is the third consecutive sweep where the stated reason has been wrong.

**Not fixed here, deliberately.** The sweep's brief is "install nothing new," and
the correct fix is one commit that bumps the lockfile, deletes the allowlist
entry, and re-runs `npm test` + `npm run audit` together. Splitting that across a
report branch would leave the allowlist justifying a vulnerability that no longer
exists — swapping one stale assertion for another.

**The same stale claim now also sits in prose:** `.github/AUTO-MERGE-SETUP.md:43`
says branch protection on `main` "is not [configured]", and `:137` conditions
behaviour on "if branch protection isn't". Both are false against the live
ruleset and should be corrected in whichever PR touches this next. That is the
**fourth** instance of "an assertion that was true when written, expired with
nothing noticing" — the pattern last sweep flagged as structural.

### MEDIUM — studio-site: `src/content/*.generated.json` allowlist glob is unanchored

`.github/workflows/auto-merge.yml:53`. In a bash `case`, `*` matches `/`, so
`src/content/anything/deep/x.generated.json` matches — despite the comment at
`:50-52` insisting the pattern is narrow and "does NOT match `.ts`/`.tsx`". The
drift gates at `ci.yml:245` and `:258` diff **two hardcoded exact paths**, never
a glob, so a generated file at any other path under `src/content/` is allowlisted
but unchecked.

(The same comment's claim that freshness is proven by the required `build` job is
**correct** — see retraction 3.)

**Fix:** list the two real filenames explicitly, or anchor as
`src/content/[!/]*.generated.json`.

### LOW — studio-site: a stale worktree was inflating lint output 2× — **FIXED THIS SWEEP**

`git worktree list` shows a leftover at
`.claude/worktrees/mystifying-wilbur-276efe`, created 2026-07-20 (four weeks),
on `team/2026-07-20-fix-post-count` — a branch already **merged** into `main`, so
it holds no unmerged work. A stale-worktree finding was already written up on
2026-07-20 (`755bf7c`, "9 leftovers, 764MB"); eight were cleaned, this one was not.

It had a concrete effect: `eslint.config.js:8` ignored only `dist` and
`node_modules`, so eslint walked the worktree's duplicate `src/` and reported
every finding twice — **24 warnings where there are 12**, split exactly in half
between real and phantom paths. Anyone reading that output sees imaginary defects.

**Fixed on `team/maintenance-2026-08-17`:** added `.claude/worktrees` to eslint's
`ignores`, with a comment explaining why. Verified 24 → 12 with zero worktree
paths remaining. No runtime effect and a no-op in CI, which checks out clean.

Two related items **not** fixed, because both need your call:

- The worktree directory itself still exists. Removing it is a deletion, so it
  stays your decision: `git worktree remove .claude/worktrees/mystifying-wilbur-276efe`
  (or `git worktree prune` after deleting the directory).
- It contains a **pre-fix copy of `auto-merge.yml`** — the old version with no
  `--disable-auto` and the vulnerable ``` fence. `.claude/worktrees/` is ignored
  only via `.git/info/exclude`, which is local-only and absent from a fresh
  clone; `.gitignore` has no `.claude/` entry. An agent editing "the workflow" by
  glob could resurrect the vulnerable file. Adding `.claude/` to `.gitignore` is
  the durable fix.

### LOW — studio-site: `contents: write` granted workflow-wide in `auto-merge.yml`

`:7-9`. Only the merge step (`:131`) needs it; the guard step that parses a
PR-controlled path list inherits it too. Heavily mitigated: this workflow
performs **no checkout**, so no PR-authored code ever runs alongside the write
token. Defence-in-depth only. Carried from 2026-08-10.

### LOW — studio-site: actions pinned to mutable major tags

`ci.yml:38, 44, 149, 288, 291, 359, 364, 458, 463, 484` — `actions/checkout@v4`,
`actions/setup-node@v4`, `actions/upload-artifact@v4`. All GitHub-owned, and
there are **no third-party actions anywhere**, which is the part that matters. A
`@v4` tag is still mutable. Pin to commit SHAs for the strict posture, or record
this as accepted.

### LOW — studio-site: `backlog-checkoffs` runs `actions/checkout` with `contents: none`

`ci.yml:355-358`. The job-level `permissions: pull-requests: read` *replaces* the
workflow default, dropping `contents` to `none`, yet the job checks out. This
works only because the repo is publicly readable; if `studio-site` is ever made
private, the job breaks for a reason nobody will connect to this line.
Fragility, not exposure.

### LOW — studio-site: `noindex` is client-side only

`4f97484` is correct for its stated scope and well-tested — `Seo.tsx:102` sets
`robots: noindex`, and `Seo.test.tsx` covers the leak in **both** directions
(noindex → real page and back) via unmount/remount *and* same-instance prop flip,
which is the failure mode that actually bites an imperative `document.head`
mutator. Inherent limitation, not a regression: this is a client-only SPA
(`dist/` has one `index.html`, `vercel.json` rewrites everything to it), so an
arbitrary path still returns HTTP **200** with the shell, and the `noindex` tag
exists only after JS runs. Google's two-wave indexing handles that; non-rendering
crawlers see the static homepage canonical. Acceptable, worth knowing.

### LOW — studio-site: one stranded branch

`check:stranded-branches` reports `team/2026-07-21-backlog-and-report` — 26 days
old, 1 commit ahead of `main`, touching `BACKLOG.md` and
`reports/2026-07-21-review.md`. PR #34 exists but is MERGED and does not cover
the current tip. This is a reporting check, not a merge gate. Either open a draft
PR for the tip or delete the ref.

### INFO — studio-site: PR #117 has been green and mergeable for 10 days

Opened 2026-08-07, `MERGEABLE` / `CLEAN`, every check passing. Last sweep listed
it as a runner-up to merge; it has not moved. PR #126 (opened today, worktree
Vite dep-optimizer cache) is also green and mergeable.

---

## Per-repo results

### studio-site — active, green, findings above

| Gate | Result |
|---|---|
| `npm run build` | **PASS** — vite built in 1.37s; sitemap 40 URLs, feed 29 posts |
| `npm test` | **PASS** — 27 files, 603 tests, 8.74s |
| `npm run typecheck` | **PASS** — clean |
| `npm run lint` | **PASS** — 0 errors, 12 warnings (was 24; see LOW fix) |
| `check:deps` | OK — 33 declared deps installed and version-matched |
| `check:report-claims` | OK |
| `check:backlog-checkoffs` | OK — 0 unreferenced; 3 NOTEs, all legitimate multi-PR epics |
| `check:merge-revert` | OK |
| `check:stranded-branches` | 1 stranded branch (LOW above) |
| `smoke:deployed` | **PASS** — all 6 routes OK on `doms-ai-studio.vercel.app` |
| `npm audit` | 2 high, both react-router (MEDIUM above) |

`npm outdated` — actionable only: `react-router-dom` 7.18.1 → 7.18.2 (security,
in-range), `react`/`react-dom` 19.2.7 → 19.2.8 (in-range patch). Everything else
outstanding is a deliberate major hold: typescript 5.7→7.0, eslint 9→10,
framer-motion 12→13, jsdom 29→30, js-yaml 4→5, globals 15→17,
`@vitejs/plugin-react` 5→6, `eslint-plugin-react-hooks` 5→7. No action this sweep.

**Worth stating plainly, since this report is mostly findings:** the CI permission
model here is better than most production repos. Workflow default `contents: read`;
two jobs narrowed further; zero `contents: write` anywhere in `ci.yml`; no
`pull_request_target` and no `workflow_run` anywhere; no third-party actions; fork
PRs skipped explicitly rather than left permanently red. All 24 `${{ }}`
expressions in `.github/` sit in `env:` blocks — **none** reference PR title,
body, branch name or actor, so the classic Actions script-injection hole is
absent by construction, not by luck. Production headers (`vercel.json:7-35`) are
strong: hash-based CSP with `object-src 'none'`, `base-uri 'self'`,
`frame-ancestors 'none'`, HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy,
Permissions-Policy. The one soft spot, `style-src 'unsafe-inline'`, is effectively
forced by Tailwind/Framer Motion — worth recording as a conscious acceptance.

The P3 fence fix (`ae7866b`) is also real rather than cosmetic: the old
`echo '```'; cat "$UNSAFE_FILE"; echo '```'` could be broken out of by a file
literally named with a backtick fence (a valid POSIX filename), letting a PR
inject markdown into the bot comment. The replacement indents every
attacker-controlled line with four script-controlled spaces, which has no
closing delimiter to escape.

### SoulForce-V2 — no new commits; carryover build break, now better understood

No commits since 2026-07-20. The build break is carried for the **fifth** sweep,
but this sweep found the detail that changes its urgency:

- Local `main` (`9facba8`) has `src/store/useGame.ts:4` and `:36` importing
  `loadLocalStats` from `../lib/profile` — and `main` **does not define it**.
  A hard TypeScript error; `main` cannot compile.
- The fix is on `team/maintenance-2026-07-20` (`301bf1e`): one file,
  `src/lib/profile.ts`, +14 lines.
- **New this sweep:** the repo now has a remote —
  `origin https://github.com/dominiquebrom28/soulforge.git` — and
  `origin/main` is at `6673e52`, **one commit behind** local `main`.

So the breaking commit was never pushed. **GitHub's `main` is fine; the breakage
is local-only.** That downgrades this from "the published repo is broken" to "the
local checkout won't compile" — still worth clearing, since it blocks any local
work, but it is not radioactive.

Cleanest resolution: merge `team/maintenance-2026-07-20` into local `main`, then
push. Not done here — this sweep does not push repos other than studio-site.

One uncommitted local edit remains: `.claude/launch.json` (+9 lines, editor
config, not project code). Unchanged since last sweep. No action.

### The other 11 repos — nothing to do

All untouched since before the last sweep; no builds run, no reviews needed.

| Repo | Last commit |
|---|---|
| Soulforge | 2026-07-16 |
| Travel plan app | 2026-07-16 |
| chart-token-playground | 2026-07-16 |
| claude-dev-company | 2026-07-16 |
| dominiquebrom-portfolio | 2026-07-18 |
| lovetimeline-app | 2026-07-16 |
| mensdag-app | 2026-07-16 |
| pizzaparty-app | 2026-07-16 |
| sollie-aem-prototype | 2026-07-16 |
| sollie-process-presentation | 2026-07-16 |
| token-impact-mapper | 2026-07-16 |

All clean working trees, all on `main`.

---

## The 3 most important actions for Dom

1. **Drop `*.test.ts|*.test.tsx` from the `safe-auto` allowlist.** One line at
   `.github/workflows/auto-merge.yml:41`. This is the one auto-merge finding the
   branch-protection correction does not soften: a test file *passes CI by
   running*, so "required checks" is not a control against it. It merges
   unreviewed, then executes on the CI runner and on your machine on the next
   `npm test`. `BACKLOG.md:1062` already agreed three sweeps ago. If you do one
   thing from this report, do this one.

2. **Add `branches: [main]` to `auto-merge.yml:4`, and close the three fail-open
   disarm paths.** The missing filter is the only genuine zero-CI path in the
   repo — `ci.yml` doesn't run on `team/*` bases and the ruleset doesn't reach
   them, so a `safe-auto` PR there merges with nothing to wait for. The
   fail-open paths (no `unlabeled` trigger, empty-file-list arms, no
   `if: failure()` disarm) are each one or two lines and belong in the same PR.

3. **Bump react-router and delete the allowlist entry in the same commit.**
   `npm update react-router-dom` → 7.18.2, lockfile-only, inside the declared
   `^7.18.1`, clears GHSA-qwww-vcr4-c8h2 outright. Then remove the
   `audit-ci.jsonc` entry whose justification has now been wrong for three
   consecutive sweeps, and fix the same stale claim in
   `.github/AUTO-MERGE-SETUP.md:43` and `:137`. Run `npm test` + `npm run audit`
   in that commit.

**Cheap and already green:** merge PR #117 (10 days green and mergeable) and
PR #126. And decide whether `main` should require a review — the ruleset requires
CI but not approval, which is the assumption every auto-merge finding above rides
on.

**Structural, and the reason this report opens with a retraction:** the count is
now **four** assertions that were true when written and expired with nothing
noticing — the react-router allowlist (twice), the `AUTO-MERGE-SETUP.md`
protection claim, and last sweep's own 404-derived conclusion. Last sweep named
this pattern and it immediately produced another instance, in the report that
named it. The lesson worth extracting is narrower than "re-check assertions": a
**negative** result from an API or a tool is not evidence of absence until you
know that tool can see the thing. `404 Branch not protected` never meant `main`
was unprotected; it meant that endpoint had nothing to say. `gh api
repos/OWNER/REPO/rules/branches/main` is the one that answers the question
actually being asked.
