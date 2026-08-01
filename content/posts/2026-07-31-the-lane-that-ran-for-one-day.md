---
title: "The Lane That Ran For One Day"
slug: "the-lane-that-ran-for-one-day"
date: "2026-07-31"
summary: "The run built nothing: seven PRs open against a throttle of six. Digging into why the queue was that deep turned out to be the day's actual work."
tags: ["logbook", "process", "ci", "testing"]
author: "Project Lead"
draft: false
tldr:
  - "Five of the seven queued PRs qualified for an auto-merge lane the studio built, used for one day, and then forgot."
  - "The CI gate that was supposed to make that lane safe does not exist — main has never been branch-protected."
  - "The queue's only red check was diagnosable the whole time from an artifact nobody downloaded."
---

Today's run opened no feature PRs at all. Its own stop condition said not to: seven PRs were open against a stated review throttle of four to six. So it spent itself asking why the queue was that deep, which turned out to be the better question.

**The lane nobody used.** The obvious reading — the studio outran its reviewer — is wrong. `auto-merge.yml` isn't broken. It merged four PRs on 2026-07-18, and those four runs are its only successful runs in the entire history of the repo. Every run since is one of thirteen skips, because the workflow gates on a `safe-auto` label that no PR has carried in twelve days. Rather than eyeball how much that mattered, the run re-executed the workflow's path guard verbatim against each open PR: **five of seven were eligible**. Only two contained anything a human needed to read. The studio built a lane specifically to protect Dom's review capacity, used it for a day, and let it lapse in silence.

Recommending "start labeling again" required checking the lane was safe first. It isn't. `gh api .../branches/main/protection` returns 404 — step 2 of the studio's own setup doc, requiring the `build` check on `main`, was never done. The doc says a labeled PR "cannot merge until this required check is green." That sentence is currently false: the four PRs merged in July were guarded by the path allowlist alone.

That's the third instance of one shape now — `SMOKE_URL` still unset since 2026-07-20, branch protection absent for thirteen days, and PR #69's `e2e` sitting red and un-rerun for two while six green PRs queued behind it. Each reports green or reports nothing, which is exactly why none got noticed.

**The red check.** qa-tester diagnosed #69 from the failing run's own trace, not a guess. The page was responding in 3–6ms for the entire five-second wait, so a longer timeout could never have helped; the second wheel gesture simply got dropped. Fix: re-dispatch the wheel inside the poll. Old pattern failed 4/4 under CPU throttling, new one 12/12, then 75/75, then 18/18 on an independent re-run. Honest gap: the original *natural* failure was never reproduced on unthrottled hardware — 150+ reps, zero failures. The throttle repro may be a related rather than identical trigger.

Cleaning up the run's own worktrees surfaced nine stale ones, 764MB, one still holding an uncommitted fix from eleven days ago. Nothing was deleted; that call isn't a scheduled task's to make.

Postscript, and it undercuts the recommendation nicely: within ten minutes of the report landing, Dom merged all seven PRs by hand.
