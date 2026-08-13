# Maintenance sweep — 2026-08-10

Baseline: `reports/maintenance-2026-08-03.md`. This report covers only what
changed since then — commit range `7291fc0..ad4cde1`.

13 git repositories under `VibeCodeProjects/`. Since 2026-08-03 exactly **one**
has new work: **studio-site** (32 non-merge commits, 56 files, +10588/−187).
The other 12 are untouched.

**Two headlines this week — one bad, one good.**

**The bad one is a configuration gap, not a bug in anyone's code.** `main` has no
branch protection at all (`404 Branch not protected`) while the repo allows
auto-merge, and the workflow that guards the auto-merge lane can strip a label
but cannot disarm an auto-merge it already armed. Together those mean a single
label can put code on `main`, and into production, with no CI and no review. The
lane happens to be dormant — the label has not been used since 2026-07-18 — so
nothing bad has occurred. It is dormant by habit, though, not by configuration.

**The good one is a correction.** Last sweep concluded that
the react-router advisory could only be cleared by a 28-file migration to the
v8 major. **That is no longer true, and it stopped being true on 2026-08-07.**
The advisory was re-scoped upstream and now has a patch release *on the 7.x
line*. The fix is `npm update react-router-dom` — a lockfile-only change inside
the already-declared `^7.18.1` range. No migration, no `package.json` edit.
Details and evidence in the first finding.

**No fixes were applied this sweep.** Nothing met the "trivial, obviously-safe"
bar — including, deliberately, the react-router bump; the reasoning is recorded
under that finding rather than left implicit.

**This sweep ran in an isolated `git worktree`,** acting on last sweep's own
top structural finding rather than waiting for it to be fixed upstream. The
primary `studio-site` checkout was never switched, never branched in, and never
had its working tree written to. Its `node_modules` was symlinked read-only for
the build; nothing was installed.

---

## Findings by severity

### HIGH — studio-site: `main` is unprotected and the auto-merge lane cannot be disarmed. The guard is advisory, not enforcing.

security-auditor was deployed on the CI privilege surface (the app itself has no
auth, database, payments or user input, so the usual surface is genuinely
absent). It returned one HIGH; I verified the two load-bearing facts myself
against `ad4cde1` rather than relaying them.

**Fact 1 — the block step never disarms auto-merge.**
`.github/workflows/auto-merge.yml` arms GitHub's *server-side* auto-merge at
line 108:

```sh
gh pr merge "$PR_NUMBER" --repo "$REPO" --auto --squash
```

When the guard later detects an unsafe path, the block step (lines 78–98) posts
a comment and runs `gh pr edit --remove-label "safe-auto"` — and nothing else.
Grepped the whole file: **there is no `gh pr merge --disable-auto` anywhere.**
Removing a label does not disarm auto-merge; GitHub disarms it on force-push,
base change, or close — not on an ordinary push or a label change.

So the documented guarantee in `.github/AUTO-MERGE-SETUP.md` ("Auto-merge is
never enabled in this case") is not what the code provides once auto-merge is
already armed. A PR labelled `safe-auto` while touching only `docs/`, then
amended with an ordinary push adding anything at all, has its label stripped and
a comment posted **while remaining armed to merge**.

**Fact 2 — and `main` has no branch protection at all.** Verified directly this
sweep:

```
GET repos/dominiquebrom28/studio-site/branches/main/protection
  → 404 "Branch not protected"
repo settings → allow_auto_merge: true
```

This is the part that turns a latent flaw into a live one. Auto-merge waits for
*required* status checks — and there are none, because there is no protection
rule. So `--auto` on a mergeable PR merges essentially **immediately**, without
waiting for `CI / build` at all. The lane's entire stated premise — "merges only
after green CI" — is enforced by nothing. Prior sweeps flagged this protection
gap on 2026-07-31; it is still open, and it is what makes every other guard in
this workflow advisory.

**Actual current exposure is low, and I want to be accurate about that.** The
`safe-auto` label has been used on exactly four PRs, all on 2026-07-18; the team
has merged through reviewed PRs ever since. The lane is dormant. But it is
dormant by habit, not by configuration — the workflow is live, the label is one
click, and the repo deploys to production on merge to `main`.

**Three supporting MEDIUMs from the same audit, all verified present at `ad4cde1`:**

- **No `branches:` filter on the auto-merge trigger** (`auto-merge.yml:3–5`).
  `ci.yml` restricts itself to `pull_request: branches: [main]`; `auto-merge.yml`
  does not. A `safe-auto` PR targeting any non-`main` branch gets no CI at all
  and no protection rule, so it merges instantly. One-line fix: mirror
  `branches: [main]`.
- **`contents: write` granted workflow-wide** (`auto-merge.yml:7–9`), including
  to the guard step that parses PR-controlled path lists. Only the final merge
  step needs it. Defence-in-depth, not a live bug — but this is precisely the
  workflow whose parsing logic keeps changing.
- **`**/*.test.ts` is auto-mergeable and CI executes it.** `vitest.config.ts:24`
  includes `scripts/**/*.test.ts`, and `ci.yml:74` runs `npm test` in the
  required `build` job with `GH_TOKEN` in scope (`ci.yml:87`). A PR whose only
  file is a new `*.test.ts` containing arbitrary code gets executed on the runner
  and merged unreviewed. The token is `contents: read` and no repository secrets
  are in scope, so the realistic prize is unreviewed code execution in CI plus a
  permanent commit on `main` — a foothold, not production compromise.

**What the audit found clean, recorded so the omissions are decisions:** zero
attacker-controllable interpolation into any `run:` block (every `${{ }}` sits
in an `env:` block and none reference PR title, body, branch name, or actor — the
classic Actions RCE is absent by construction); no `pull_request_target` or
`workflow_run`; no third-party actions at all, only GitHub-owned `actions/*`
(pinned to mutable `@v4` tags — LOW); no secrets echoed, written, or passed
onward; and no `shell: true`, `execSync`, or string-concatenated commands
anywhere under `scripts/` — every git/`gh` call uses `execFileSync` with array
arguments, several with a `--` pathspec terminator. `ci.yml`'s own permissions
model is stricter than most production repos. The single HIGH is a missing
teardown call plus an unconfigured setting, not a design failure.

**One caveat on this audit, resolved.** security-auditor had no shell available
and read the files from the working tree rather than from `ad4cde1`. I checked:
`git diff ad4cde1 -- .github .githooks scripts` is empty apart from
`scripts/check-backlog-checkoffs.test.ts`, which none of its findings rest on.
Every line number and quotation above applies to `ad4cde1` as reported.

### HIGH — studio-site: a patched react-router now exists on 7.x, and the allowlist says it doesn't. Second consecutive expiry of the same entry.

`audit-ci.jsonc` allowlists **GHSA-qwww-vcr4-c8h2**. The entry was corrected on
2026-08-04 and currently asserts, in its own words:

> The 7.x line's latest (7.18.2) is still INSIDE that range, so no patch release
> clears this on 7.x — only the 8.x major does.

**That is now false.** Queried live from the GitHub advisory API during this
sweep — the advisory was **updated 2026-08-07**, three days after that comment
was written, and it no longer carries one range. It carries two:

| Vulnerable range | First patched version |
|---|---|
| `>= 7.12.0, < 7.18.2` | **7.18.2** |
| `>= 8.0.0, < 8.3.0` | 8.3.0 |

`npm audit` agrees independently: it reports the vulnerable range as
`react-router 7.12.0 - 7.18.1` and says *fix available via `npm audit fix`*.

**So the fix is now trivial, and it is not the v8 migration:**

- installed: `react-router-dom@7.18.1` → `react-router@7.18.1`
- declared in `package.json`: `"react-router-dom": "^7.18.1"`
- `react-router-dom@7.18.2` depends on exactly `react-router@7.18.2`
- `^7.18.1` already admits `7.18.2` (verified with `semver.satisfies` → `true`)

The whole remedy is:

```bash
npm update react-router-dom && npm run audit
```

That touches **`package-lock.json` only**. No `package.json` edit, no import
rewrites, none of the 28 files the v8 migration would touch. The allowlist entry
should then be deleted — at which point `npm run audit` passes with no
exceptions at all for this advisory.

**Why I did not just do it.** The bump is small but it is still a dependency
change, and I could not run the test suite against 7.18.2 to prove it green: the
worktree's `node_modules` is a symlink to the primary checkout's, so installing
into it would have mutated the shared tree that another scheduled task also
uses. Shipping an unverified dependency change would also repeat precisely the
mistake this finding is about. It needs one PR that installs, runs `npm test` +
`npm run audit`, and drops the allowlist entry in the same commit.

**The pattern here matters more than the bump.** This is the *second consecutive
sweep* in which this entry's stated justification had silently expired — first
"no fix available" (falsified 2026-08-03), now "no fix on 7.x" (falsified
2026-08-07). The file's own STANDING LESSON, written at the bottom of
`audit-ci.jsonc`, predicts this exactly: *an allowlist entry justified by a
claim about a version range is only true against the range as it reads today.*
The lesson is correct and is being re-learned rather than applied. What is
missing is a mechanism: nothing re-checks a live advisory range against the
comment asserting it. A scheduled job that diffs each allowlisted advisory's
current `vulnerable_version_range` against the installed version would have
caught both expiries on the day they happened, with no human reading required.

Risk in the meantime is genuinely low and unchanged — this is still a
client-only SPA with no RSC/server router and no mutating route actions, so the
advisory remains non-exploitable here. The defect is in the bookkeeping, not the
exposure.

### HIGH — SoulForce-V2: `main` has not compiled for 25 days. Fourth consecutive sweep.

Unchanged since 2026-07-20 and reported for the fourth time. `main` is still
`9facba8`. This sweep **compiled it** rather than re-asserting the finding from
notes — `tsc -b` against `main` in a throwaway worktree:

```
src/lib/profile.ts(3,1): error TS6133: 'Stats' is declared but its value is never read.
src/store/useGame.ts(4,30): error TS2305: Module '"../lib/profile"' has no exported member 'loadLocalStats'.
```

The fix (`301bf1e`, **+14 lines, one file**) still lives only on
`team/maintenance-2026-07-20`; `git merge-base --is-ancestor 301bf1e main` → NO.

**And the fix demonstrably works** — also verified this sweep, not assumed. At
`301bf1e`, `tsc -b` is completely silent and `vite build` succeeds in 471ms.
Merging that one branch turns a 25-day-broken `main` green.

Zero SoulForce commits this week, so nothing regressed further. The repo has no
CI, which is the entire reason a non-compiling `main` can sit untouched for
three and a half weeks without anything objecting.

One uncommitted local edit: `.claude/launch.json` (+9 lines, editor config, not
product code). Left alone.

### MEDIUM — studio-site: the auto-merge allowlist grants unreviewed merge to every gate test in the repo

This is the *scope* half of the finding above — worth its own entry because it
is separately tracked, separately fixable, and would still matter after branch
protection is turned on.

Carried from 2026-08-03 and **still unfixed** on `ad4cde1`.
`.github/workflows/auto-merge.yml:37–53` decides which files may be
auto-squash-merged onto `main` with no human review:

```sh
case "$f" in
  content/*) is_safe=true ;;
  docs/*) is_safe=true ;;
  reports/*) is_safe=true ;;
  *.test.ts|*.test.tsx) is_safe=true ;;
  ...
  src/content/*.generated.json) is_safe=true ;;
```

In a bash `case`, `*` matches `/`. Last sweep flagged this for the
`src/content/*.generated.json` entry. The larger problem is the line above it:
**`*.test.ts` is unanchored, so it matches any test file anywhere in the tree** —
including all 11 of the repo's own guardrail tests:

```
scripts/check-backlog-checkoffs.test.ts   scripts/check-merge-revert.test.ts
scripts/check-deps-drift.test.ts          scripts/check-report-claims.test.ts
scripts/check-stranded-branches.test.ts   scripts/stage-report-artifacts.test.ts
scripts/generate-seo-files.test.ts        scripts/provenance/generate.test.ts
scripts/provenance/parse.test.ts          scripts/provenance/runs.test.ts
scripts/provenance/vercelFullClone.test.ts
```

**Failure scenario:** an agent PR touches only
`scripts/check-merge-revert.test.ts`, relaxing the assertion that catches a
merge silently dropping work. Every file in the diff matches the allowlist, so
`is_safe` stays true; CI is green *because the weakened test passes*; the PR
auto-squash-merges with nobody reading it. The gate scripts' tests are the only
verification those scripts have, so this is the one path where the repo's
guardrails can be loosened without review.

The generated-JSON entry has the same defect and its safety net does not cover
it: the CI drift gate (`ci.yml:236,249`) diffs **two hardcoded exact paths** —
`src/content/provenance.generated.json` and `src/content/runs.generated.json` —
never a glob. So a PR adding `src/content/foo/bar.generated.json` matches the
allowlist, is never content-validated by any CI step, and auto-merges. The file
is internally inconsistent about this: the `content/*`, `docs/*` and `reports/*`
entries above are documented (correctly) as recursive, while the generated-JSON
entry is documented as flat.

This is already known — `BACKLOG.md:1062` carries "drop `*.test.*` from the
auto-merge allowlist" inside an unfinished P2 batch. It has not shipped, and
given that branch protection for this lane was found un-enabled on 2026-07-31,
this path check is currently the only thing standing between an agent-authored
PR and an unreviewed merge.

Fix: drop `*.test.*` from the allowlist entirely (the backlog's own conclusion),
and anchor the generated-content entry — `src/content/[!/]*.generated.json`, or
better, list the two real filenames.

### MEDIUM — studio-site: stacked PRs run no CI at all — logged this week, not yet fixed

`2585abb` ("Log the third finding: stacked PRs run no CI at all") documents the
problem honestly. qa-tester confirmed it is **documented but unfixed** in this
range: `.github/workflows/ci.yml:5–7` still triggers only on

```yaml
on:
  pull_request:
    branches:
      - main
```

No `on:`/`branches:` change appears anywhere in the 32 commits, and the backlog
item remains open with a costed fix already written down
(`branches: [main, 'team/**']`). Any PR whose **base** is a `team/*` branch
therefore gets zero `build`, `e2e`, `backlog-checkoffs`, and `deployed-smoke`
signal — only the two Vercel checks, which go green whether or not the code
compiles.

**Checked rather than assumed: no open PR is currently affected.** All seven open
PRs base on `main` (verified via `gh pr list --json baseRefName`), so the green
checks reported below are real signal, not the hollow kind. This is a live trap
for the *next* stacked bookkeeping PR, not an active misreport today — which is
exactly why it is worth closing while it is cheap.

### MEDIUM — studio-site: the PR queue refills as fast as it is cleared

Last sweep's action #2 was **done** — all six PRs open on 2026-08-03 (#88–#93)
merged on 08-03/08-04. Seven new ones have taken their place, all green, all
waiting on review:

| PR | Title |
|---|---|
| #121 | Logbook: 2026-08-09 |
| #120 | Logbook: 2026-08-08 |
| #118 | Logbook: 2026-08-07 |
| #117 | Backlog reconciliation + 08-07/08-08/08-09 run reports (queue unjam) |
| #116 | Run-start preflight, hermetic npm test, and two docs that lied |
| #115 | Pre-launch review: security audit + design critique, findings fixed |
| #112 | Backlog reconciliation + 2026-08-06 run report |

The queue is not a technical fault and the throttle is working as designed. The
observation worth recording is that **clearing it once did not change the
steady state**: the team generates review-needing PRs faster than review
happens, so "clear the queue" will be an action item every sweep until either
the generation rate drops or some class of PR (logbook posts, say) gets a
standing merge rule. Note #117's title — "queue unjam" — is itself a PR waiting
in the queue it was written to unjam.

**#116 is the one to prioritise**, because it contains the fix for last sweep's
action #3 (below).

### MEDIUM — studio-site: last sweep's worktree-collision fix is written but still unmerged

Last sweep's action #3 was to stop two scheduled tasks writing to one checkout.
Verified this sweep: **no preflight or worktree-lock script exists on `main`.**
The fix appears to be PR #116 ("Run-start preflight"), which is open, green, and
unmerged — so the collision risk is unchanged in practice, since scheduled tasks
run against `main`'s tooling.

`BACKLOG.md:661` also carries a related open LOW: worktree isolation for
studio-site runs is wired to the **wrong repo** (it creates worktrees of the
SoulForge game repo), with a proven manual workaround — `git worktree add` plus
a symlinked `node_modules` under the scratchpad. That is exactly the workaround
this sweep used, and it worked cleanly. Worth promoting from workaround to
default for scheduled runs.

### LOW–MEDIUM — studio-site: one gate test can still go quietly silent in CI, and the repo already knows why that is bad

`scripts/check-stranded-branches.test.ts:472` uses

```js
const maybeIt = ghAvailable ? it : it.skip;
```

with no CI-aware hard-fail path. Its sibling got exactly this fixed on
2026-08-06 (`4003152`), whose own commit message warns that a plain skip "is how
that happens a fourth time" — but the same fix was not applied here, even though
this file shipped the identical pattern a day earlier.

**Failure scenario:** `gh` becomes unreachable in CI (token scope change, auth
regression, rate limit). `check-backlog-checkoffs`'s real-corpus tests hard-fail
loudly and name the remedy; `check-stranded-branches`'s three real-corpus tests
silently vanish from the run and `npm test` stays green — hiding the fact that a
regression check stopped running. That is precisely the "green means nothing"
failure class this repo has now logged three separate times.

The fix exists on the unmerged branch behind PR #116, not on `main`. One more
reason to merge that PR ahead of the logbook posts.

### LOW — studio-site: dependency drift, now with two-major gaps on core tooling

Build, tests, lint and the audit gate are all green on current pins, so nothing
here is urgent. But the majors have not moved since last sweep and TypeScript is
still two behind:

| Package | Current | Latest |
|---|---|---|
| typescript | 5.7.3 | **7.0.2** |
| vite | 7.3.6 | 8.2.1 |
| vitest | 3.2.7 | 4.1.10 |
| eslint / @eslint/js | 9.39.5 | 10.8.1 / 10.0.1 |
| eslint-plugin-react-hooks | 5.2.0 | 7.1.1 |
| framer-motion | 12.42.2 | 13.0.0 |
| jsdom | 29.1.1 | 30.0.1 |
| js-yaml | 4.3.1 | 5.2.3 |
| globals | 15.15.0 | 17.9.0 |
| @vitejs/plugin-react | 5.2.0 | 6.0.5 |

Safe patch/minor drift that could go in one batch: react + react-dom
19.2.7→19.2.8, tailwindcss + @tailwindcss/vite 4.3.2→4.3.3, @playwright/test
1.61.1→1.62.1, typescript-eslint 8.64.0→8.66.0, axe-core 4.12.1→4.13.0,
@types/node, @types/react, @types/react-dom, and the three fontsource packages.

`npm run lint` reports **0 errors, 12 warnings**, all
`react-refresh/only-export-components` in `src/lib/withSuspense.tsx` and one
component-registry file. Pre-existing, cosmetic, not worth a PR on its own.

### NOTE — studio-site: analytics is a proposal, not an installation

`docs/analytics-options.md` landed this week recommending Vercel Web Analytics.
Confirmed it is **doc-only**: no analytics dependency exists in `package.json`
on `ad4cde1`, and nothing is mounted. It is explicitly marked "draft for Dom's
decision" (Open Decision D1), and correctly notes that "install nothing" is a
legitimate answer. Flagging only so it is not mistaken for shipped behaviour —
it collects no visitor data today. Whenever it does ship, it becomes the first
thing in this repo that touches visitor data, and should get a security and
privacy pass at that point rather than after.

---

## Verification actually performed (studio-site)

Run at `ad4cde1` in an isolated worktree, `node_modules` symlinked read-only
from the primary checkout (nothing installed, per the sweep's own constraint).

| Check | Result |
|---|---|
| `npm run build` | **pass** — `tsc -b` + vite build 1.38s; sitemap 34 URLs, feed 23 posts |
| `npm test` | **pass** — 585/585 across 26 files (was 390/19 last sweep) |
| `npm run audit` (the real CI gate) | **pass** |
| `npm audit` (raw) | 2 high, both the allowlisted react-router advisory — **down from 3** |
| `npm outdated` | recorded above |
| `npm run lint` | 0 errors, 12 warnings |

**The brace-expansion advisory is genuinely gone, and it was fixed properly
rather than re-allowlisted.** Last sweep's raw `npm audit` showed 3 highs;
it now shows 2. The `overrides` moved from `brace-expansion@1: ^1.1.12` /
`@5: ^5.0.8` to `^1.1.18` / `^5.0.9`, and the allowlist entry was deleted with a
long comment explaining that the old entry had been suppressing a real finding
after the advisory range widened. `js-yaml` moved `^4.1.0`→`^4.3.1` and an
`undici: ^7.29.0` override was added. This is the correct handling of an expired
exception, and it is worth naming as such — it is the same failure mode the
react-router entry is currently in, resolved well.

### Line-level review of all 32 commits (qa-tester)

Weighted toward `.github/workflows/`, `scripts/` gate logic, and test files.
Two commits were reviewed specifically on the suspicion that they had weakened
gates to clear red CI. **Both held up as legitimate fixes:**

- **`155f2ed`** ("Unpin the real-corpus check-off test from a corpus snapshot")
  replaced `expect(result.referencedButOpen).toHaveLength(1)` with a
  `toContainEqual(objectContaining(...))`. The list it had been pinned to is the
  gate's explicitly *advisory* output, which never auto-fails; the blocking
  assertion `expect(result.unreferenced).toEqual([])` is untouched. This trades a
  snapshot-pinned test for an invariant-pinned one — a real improvement, not a
  loosening.
- **`d2bc683`** ("Unblock the claims gate on a citation it read as a claim")
  edited only `BACKLOG.md` and `reports/2026-08-08.md`, splitting one prose
  paragraph in two. `scripts/check-report-claims.mjs` is byte-for-byte unchanged
  in this range — no regex widened, no scope relaxed. The gate still fires on a
  genuine claim/diff mismatch.

**Checked and clean** (recording what was examined, not only what failed): no
`.only` or vacuous-skip patterns beyond the one named above; no
`dangerouslySetInnerHTML`, `eval`, `new Function`, or shell-interpolated
`exec`/`execSync` anywhere in the diff — every new git/`gh` invocation uses
`execFileSync` with array arguments and no shell; the new `ci.yml` `env:` wiring
(including `MERGE_REVERT_HEAD_SHA`) passes values as environment variables
rather than interpolating PR-controlled data into `run:` blocks; the four new
gate scripts keep correct exit-code discipline (0/1/2, never silently green when
a ref fails to resolve) and the `--diff-filter=ACMRD` filter is consistent
between the pre-commit hook and its node counterpart; `e2e/timeline-overlap.spec.ts`
carries genuine anti-vacuous-pass design (route-discovery tripwire,
positive-count assertions, an explicit absence control).

**Not covered, so it is not implied:** `BuildTimeline.tsx`/`timeline.ts` were not
read line-by-line beyond the 0/1-phase gap the commit message already discloses;
`src/content/runs.ts` was confirmed client-only and read-only but not audited for
correctness; the prose accuracy of the new `docs/` files was not checked.

---

## Quiet repos — nothing to do

Twelve repositories have zero commits since the 2026-08-03 baseline and clean
working trees. Each was assessed cheaply (`git log`, `git status`) and skipped.

- **SoulForce-V2** — no new commits. Not quiet in health: see the HIGH finding.
  One uncommitted `.claude/launch.json` edit (editor config).
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

1. **Turn on branch protection for `main`, or turn off the auto-merge lane.**
   Right now `main` accepts merges with no required checks (`404 Branch not
   protected`) while `allow_auto_merge` is `true`, and the guard workflow has no
   way to disarm an auto-merge it has already armed. That combination means a
   single `safe-auto` label can put code on `main` — and into production —
   without CI and without review. The lane is dormant in practice, which is
   luck, not configuration. Cheapest correct fix is both halves: enable
   protection requiring `CI / build`, and add `gh pr merge --disable-auto` to
   the block step plus `branches: [main]` to the trigger. If the lane is not
   actually wanted any more, deleting the workflow closes all of it at once.

2. **Bump react-router — it is now a one-line fix, not a migration.**
   `npm update react-router-dom` moves 7.18.1 → 7.18.2 inside the existing
   `^7.18.1` range, clears GHSA-qwww-vcr4-c8h2 outright, and lets the
   `audit-ci.jsonc` allowlist entry be deleted rather than re-justified. Last
   sweep told you this needed 28 files of v8 migration; the advisory changed on
   2026-08-07 and that is no longer true. One PR: update, run `npm test` +
   `npm run audit`, drop the allowlist entry.

3. **Merge the SoulForce-V2 build fix.** `team/maintenance-2026-07-20` → `main`.
   Fourteen lines, one file. This sweep compiled both sides: `main` fails with
   two TypeScript errors, the fix commit compiles silently and builds in 471ms.
   Fourth sweep running; the only reason it keeps recurring is that the repo has
   no CI to force it.

**Runners-up, both cheap:** merge studio-site **PR #116** ahead of the logbook
posts — it carries the run-start preflight that fixes last sweep's
worktree-collision finding *and* the CI hard-fail guard that stops
`check-stranded-branches`'s real-corpus tests from silently skipping, both of
which are live defects on `main` today. And close the auto-merge allowlist gap:
drop `*.test.*` (already written down at `BACKLOG.md:1062`) and anchor the
generated-JSON glob — a two-line change to one `case` block.

**Worth considering, structurally:** three of this sweep's findings are the same
shape — an assertion that was true when written and expired without anything
noticing (the react-router allowlist, twice; the `*.test.*` allowlist entry; a
skipped test that reports green). The repo has good instincts about this and
even writes the lesson down. What it lacks is anything that re-checks a stated
justification against reality on a schedule. A small job that re-queries each
allowlisted advisory's live range would have caught two of the three on the day
they broke.
