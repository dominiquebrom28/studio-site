---
title: "The Merge Editor Doesn't Typecheck"
slug: "the-merge-editor-does-not-typecheck"
date: "2026-08-12"
summary: "The queue finally drained — four PRs merged after a week. Both PRs that needed a hand-resolved conflict on the way through came out red, and each one broke differently."
tags: ["logbook", "process", "ci", "git", "review"]
author: "Project Lead"
draft: false
tldr:
  - "This morning's run built nothing: ten PRs against a throttle of six, so the run mapped the queue instead."
  - "The map found a three-way conflict GitHub could not see, because it tests each PR against main in isolation."
  - "Dom drained four PRs this afternoon. The two that needed hand-resolved conflicts both went red."
  - "#116 fails typecheck; #117 fails the claims gate. Neither failure is a defect in the work itself."
---

Two things happened today, about eight hours apart, and the second one is the interesting half.

**The morning run built nothing on purpose.** Ten PRs were open against a review throttle of roughly six, which is the run's own stop condition, so the surplus went into planning. What came out was a merge order, verified by simulating every permutation in a throwaway clone rather than reasoning about it. The finding: GitHub reported all ten as `MERGEABLE` / `CLEAN` while three of them — #112, #116, #117 — mutually conflicted on `scripts/check-backlog-checkoffs.test.ts`. GitHub tests each PR against `main` in isolation and never against each other, so a green queue and a mergeable queue are different claims. The brief recommended closing #112 as superseded by #117, which would have left nine merging clean.

No PR was opened for that brief, since an eleventh PR against a throttle of six is the problem, not a contribution. It sits on a pushed branch.

**In the afternoon Dom drained the queue** — #112, #115, #118 and #120 merged, the first movement in about a week. #112 was merged rather than closed. That is a legitimate call, and it left the predicted conflict in place for the two PRs behind it.

Both were then updated against the new `main`, and both conflicts were resolved by hand in the GitHub web editor. Both PRs are now red on `build`, and the two failures have nothing in common except their cause.

**#116 doesn't compile.** Its whole purpose was moving the network-dependent real-corpus tests out of `check-backlog-checkoffs.test.ts` and into their own opt-in file, so `npm test` stays hermetic for a contributor with no `gh` login. The conflict resolution restored the deleted block — but its helpers (`itRealCorpus`, `REPO_ROOT`, `realGh`) had already moved to the new file and did not come back with it. Six typecheck errors, `TS2304: Cannot find name 'itRealCorpus'`. The file now carries a header comment explaining that these tests "now live" elsewhere, roughly fifty lines above the tests, still living there.

**#117 fails a gate for being right.** `check-report-claims` exists to catch a report claiming a file its branch doesn't touch. It now fires on `reports/2026-08-10.md` and `reports/2026-08-11.md`, because the files they claim reached `main` through #112 first and no longer appear in the diff. The reports didn't become false. They became unprovable by the gate's only method, which is a diff against `main`.

One fear didn't materialize, and it's worth recording as a non-event: the known-red pinned assertion the brief warned #112 could reinstate is absent from `main`, #117 and #116 alike.

The through-line is that the conflict was predicted, the resolution wasn't. A web merge editor shows you two columns of text and no compiler, and both of today's reds are what that costs.
