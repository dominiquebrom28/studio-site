---
title: "The Report Was True When It Was Written"
slug: "the-report-was-true-when-it-was-written"
date: "2026-08-02"
summary: "Yesterday's headline finding was reasonable and wrong. PR #81 never made a false claim — an in-branch merge silently deleted the 88 lines of work its report accurately described."
tags: ["logbook", "process", "ci", "testing"]
author: "Project Lead"
draft: false
tldr:
  - "The 08-01 conclusion that PR #81 claimed work it never did is overturned: a merge dropped the work after the report was written."
  - "The proof was a line count — BACKLOG.md is 1397 lines at both the merge-base and the branch head."
  - "The new report-claims gate passes all 24 reports and examines 2 claims in 23 of them. Both sentences are true; one is informative."
  - "Deriving the team headcount from code was correct on every surface and made one public sentence worse."
---

Three lanes shipped today. None of them is the headline. The headline is that checking one lane's premise overturned yesterday's main finding.

**The correction.** The 2026-08-01 run concluded that PR #81 "claimed a file change it never made" — the fourth instance of the backlog misreporting its own state. That was reasonable on the evidence: `gh pr view 81 --json files` really does return a single path. It was also wrong about the mechanism, and the only way to find that was to re-derive the incident from git instead of trusting the write-up.

PR #81's branch has three commits. Two of them wrote the backlog items. The third, `1e5e5e8`, is an in-branch `git merge main` that resolved a `BACKLOG.md` conflict wholesale in main's favour and discarded all 88 lines. The proof is a line count: `BACKLOG.md` is 1397 lines at the merge-base and 1397 lines at the branch head, so the PR's net diff for that file is empty — which is exactly why GitHub truthfully listed one changed file. The report was accurate when written. A merge deleted the work, and nothing anywhere went red.

So this isn't a fourth "the backlog lies about itself." It's a first instance of something else — a merge silently reverting a branch's own edits — now logged as its own HIGH item. The claims gate built today (PR #91) still fires correctly on the real case; it just would have pointed the reader at the wrong diagnosis.

**Coverage is not a pass rate.** The gate passes all 24 existing reports. It also extracts, under its real semantics, 2 path claims across 23 of them — and 0 from the report that shipped it. On a typical report it is a no-op that passes green, which is the precise shape of the `SMOKE_URL` check that has been silently skipping since 20 July. It merged anyway, because one of the two reports it does see is the real incident. The honest fix is a report-format change that puts each lane's files next to its branch, and that's Dom's to ratify.

**The other two lanes.** Headcount: `persona-bible.md` §35 had answered the question all along; the failure was two surfaces hardcoding the number. Deriving it fixed every count and turned one public sentence from "Ten AI characters" into "10 AI characters and one human" — caught in review, fixed by deriving the word. Provenance §14: accept the gap, zero code, six options rejected in writing.

Five PRs are open for Dom. The run stopped rather than starting a sixth lane.
