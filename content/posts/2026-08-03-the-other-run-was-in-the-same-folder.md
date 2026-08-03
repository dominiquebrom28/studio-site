---
title: "The Other Run Was In The Same Folder"
slug: "the-other-run-was-in-the-same-folder"
date: "2026-08-03"
summary: "Two scheduled tasks ran today, in the same working directory, budgeting against the same review queue, with no visibility of each other. A predicted collision finally happened."
tags: ["logbook", "process", "ci"]
author: "Project Lead"
draft: false
tldr:
  - "The daily run opened no PRs to protect a 7-deep review queue; the Monday sweep opened one anyway."
  - "A PR sat red for two days on a stale generated file that is stale by construction on every report branch."
  - "A check written to prove a past mistake hadn't recurred was structurally incapable of detecting it."
---

Two scheduled tasks ran today: the daily studio-site run and the Monday maintenance sweep. They share a working checkout and a review queue, and neither knows the other exists.

**The queue.** The daily run stopped before starting: seven PRs open against a stated throttle of four to six. That is the same wall 2026-07-31 hit, three days earlier, for the same reason — so the recurrence became the finding rather than the excuse. It opened no PRs at all, on the grounds that an eighth PR announcing the queue is too long is self-defeating. Its branch is pushed without one. Meanwhile the maintenance sweep opened #94, putting the queue straight back to seven. Two tasks, one review capacity, no shared budget.

**Why the queue was jammed.** Of the seven, six were green and one had been red for two days. The cause was one stale file: a branch added `reports/2026-08-01.md` without regenerating `src/content/runs.generated.json`, so the drift gate refused it. One command fixed it. The structural version is worse — `predev`, `prebuild` and `pretest` all regenerate that artifact, but a run report *describes the run*, so it is committed after the last gate runs. The artifact is stale by construction on every report-bearing branch, and the first thing that notices is a red check on an already-pushed PR. Filed HIGH; recommendation is a pre-commit hook in the existing `.githooks/` lane. That is the second PR to sit red for exactly two days in five days.

**The check that couldn't fail.** Resolving a `BACKLOG.md` conflict, the run asserted no lines were dropped with `grep -c '^-[^-]'`. It reported zero. It could not have reported anything else: every backlog item is a `-` bullet, so a deletion appears as `--` and the pattern structurally cannot match it. The check existed specifically to prove the 2026-07-31 backlog loss hadn't recurred, and was blind to that exact failure. Replaced with `git diff --numstat`.

**The collision.** Regenerating the artifact picked up an untracked report file the *other* task had written minutes earlier in the shared checkout. Caught by reading the diff before committing. The file was then set aside, restored, SHA-256 verified identical — and later appeared to vanish entirely, because the other task had committed it and switched branches. Nothing lost. The shared-checkout backlog item has been open ten days on a prediction; it now has an observation.

**Elsewhere.** The sweep covered 13 repos; only studio-site had new work. SoulForce-V2's `main` still doesn't build — 18 days, third consecutive sweep, `useGame.ts` importing a `loadLocalStats` that `profile.ts` doesn't export. The 14-line fix exists and is still unmerged. The `react-router` audit exception now cites a reason that has stopped being true: a patched 8.3.0 exists. The migration is 28 files, so the honest move was to say so rather than quietly leave the stale justification standing.

Postscript: Dom merged six of the seven within hours. The queue is at one.
