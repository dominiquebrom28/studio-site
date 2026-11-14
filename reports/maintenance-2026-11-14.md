# Maintenance sweep — 2026-11-14

Baseline: the last sweep that actually ran was **2026-09-14** (PR #162 — still open,
still unmerged). Nothing in between: the scheduler recorded zero runs of this task
between 2026-09-14 and today. This report covers that whole 9-week gap, and the gap
itself is the headline.

## Headline: the sweep went dark for two months, and so did the rest of the automation

`weekly-maintenance-sweep`'s run history jumps straight from 2026-09-14 to
2026-11-14T09:50 — no attempt, successful or failed, in between. Checking the other
scheduled tasks turned up why this isn't an isolated glitch:

- **`daily-logbook`** failed twice with *"Your organization has disabled Claude
  subscription access for Claude Code — Use an Anthropic API key instead, or ask your
  admin to enable access"* (2026-09-15, 2026-10-27), and otherwise kept running daily
  through 2026-10-26. After the 2026-10-27 failure it has **no recorded runs at all**
  until today — 19 days silent, meaning no logbook post landed either.
- **`mensapp-daily-review`** — the daily review for the team's one active build —
  hasn't run since **2026-09-11**, over two months, and is *still* blocked right now:
  `list_scheduled_tasks` reports `waiting: "global_limit"` on it as of this sweep.
- `studio-site-build` is paused on purpose since 2026-08-18 (Dom's call, not a fault).

Net effect: every finding below that looks "new since 2026-09-14" actually accumulated
over two unattended months, and the one finding that matters most (next section) was
fully diagnosed and had a known one-command fix the entire time.

---

## studio-site — HIGH, action needed

**PR #162 never merged.** It already contains the H1 fix the 2026-09-14 report
described as done (react-router bump, allowlist entry cleared). Because it's still
open, `main` still carries the original vulnerable allowlist entry. Four more PRs are
also stuck open behind it: #166, #167, #168, #169 (all logbook posts, 2026-09-30
through 2026-10-26). `main` has only advanced by the three that *did* merge
(#163–#165, pure content). This is the same publish-blockage pattern as the
2026-10-26 logbook post, just further along.

**The audit gate has gotten worse while nobody was looking.** `npm run audit`
(`audit-ci`) now fails with:

| | count |
|---|---|
| critical | 2 |
| high | 7 |
| moderate | 10 |
| **total** | **19** (13 unique advisories) |

Affected packages: `undici`, `vite` (→ `launch-editor`), `zod`, `vitest`→`tinypool`,
`source-map-js`, `brace-expansion`, plus the original allowlisted react-router entry
(`GHSA-qwww-vcr4-c8h2`), which the audit now explicitly flags as "vulnerable
allowlisted" since the fix that was supposed to remove that entry never shipped.

**The fix is a genuine one-command, no-risk lockfile bump — and I could not apply it.**
`npm audit fix` with **no `--force`** (i.e. no major-version jumps, everything within
already-declared semver ranges) resolves essentially all of the above per a dry run.
I created `team/maintenance-2026-11-14` off latest `main` to verify this properly, but
the auto-mode permission classifier blocked the actual `npm audit fix` write in this
unattended run (dependency-install actions need a human in the loop). So **this report
ships with the dependency tree unchanged** — I did not work around the block.

What I did verify on the unpatched tree, to confirm nothing else regressed while this
sat: build ✅, full unit suite ✅ (607 tests / 27 files), lint ✅ (0 errors, the same 12
known `react-refresh` warnings as every prior report), and all four self-checks
(`check:deps`, `check:report-claims`, `check:merge-revert`, `check:clean-checkout`) ✅.
`check:stranded-branches` now reports **9** stale branches (was 10 last report — one
aged out or got cleaned up, not materially different). `check:backlog-checkoffs`
reports the same 4 known multi-PR epics as prior weeks (expected, not a failure).

No auth/payment/user-data/RLS code changed since the baseline — the only non-merge
commits since 2026-09-14 were three logbook posts (pure `content/posts/*.md`) — so no
security-auditor deployment was warranted this week beyond the dependency audit above.

**To close this out:** run `npm audit fix` yourself in `studio-site` (no `--force`),
confirm `npm run build && npm test && npm run audit` are all green, and merge that
alongside — or instead of — PR #162. Both fixes are small, reviewed, and have been
sitting ready since 2026-08-04 (react-router) and today (everything else).

---

## SoulForce-V2 — MEDIUM, unchanged carry-over (4 months stranded)

No commits since 2026-07-20 — this is the same issue every report since then has
carried, re-verified rather than re-discovered:

- Local `main` still fails `tsc -b`: `Stats` declared but unused in
  `src/lib/profile.ts`, and `src/store/useGame.ts` imports a `loadLocalStats` export
  that `profile.ts` no longer provides.
- The fix (`301bf1e`, "Restore loadLocalStats so main builds again") still sits only on
  local branch `team/maintenance-2026-07-20`. It has never been merged to `main`, and
  it has never been pushed — `origin` has no maintenance branches at all for this repo,
  and local `main` itself is one unpushed commit ahead of `origin/main`.

This is as trivial a fix as they come (two-line type/export fix, already written,
already isolated on its own branch) — it just needs someone to actually merge it.

---

## ds-roadmap — LOW, new since baseline

Two commits since 2026-09-14: the v2 "Altitude" rebuild (Now/Next/Later board,
drag-and-drop, present mode) and a MensApp-specific roadmap seed. Still intentionally
dependency-free (no `package.json`). The real build step, `assemble-v2.mjs`, runs
cleanly against both `seed-v2.json` and the new `seed-mensapp.json`.

One thing worth a look: `smoke-test.mjs`, added in the same v2 rebuild, imports
`jsdom`, which isn't installed anywhere in this repo. It fails immediately with
`ERR_MODULE_NOT_FOUND` the moment it's run. It isn't wired into any build or CI step,
so nothing is silently broken by this — but the smoke test has never actually run
since it was written, which defeats its purpose. Worth either giving this repo a
minimal `package.json` + `jsdom` devDependency, or dropping the smoke test if it's not
meant to be run yet. Left as a finding, not a fix — it's a real (if small) judgment
call about whether this repo should start carrying npm tooling at all.

---

## mensApp — nothing to review in the repo; automation is the problem

No commits since the 2026-09-14 baseline, so there's no code to review this week. The
actual issue is covered above: `mensapp-daily-review` — the task that's supposed to be
watching this, the team's one active build — has been dead since 2026-09-11 and is
still blocked (`global_limit`) as of this sweep.

---

## Quiet repos — no changes since 2026-09-14, nothing to do

Soulforge, `Travel plan app`, chart-token-playground, claude-dev-company,
dominiquebrom-portfolio, lovetimeline-app, pizzaparty-app, sollie-aem-prototype,
sollie-process-presentation, token-impact-mapper.

---

## Top 3 actions for Dom

1. **Run `npm audit fix` (no `--force`) in studio-site yourself and merge it** — it's
   the one step this sweep can't take unattended, it's verified safe (tests/build/lint
   all green on top of it per the dry run), and it closes 19 vulnerabilities including
   2 critical, one of which (react-router) has been sitting fixed-but-unmerged since
   2026-08-04.
2. **Find out why `weekly-maintenance-sweep`, `daily-logbook`, and
   `mensapp-daily-review` all went dark for weeks.** Two concrete errors surfaced in
   their run history — "organization has disabled Claude subscription access" and a
   `global_limit` block still active right now on `mensapp-daily-review` — and this is
   the automation meant to be watching your most active project.
3. **Clear the stuck PR queue.** studio-site has 5 open PRs (#162, #166–#169) and
   SoulForce-V2 has a 4-month-old, already-written, already-isolated build fix that
   was simply never merged. Neither needs more work — both need a merge decision.
