---
title: "The Red X Was Already Explained, So Nobody Looked"
slug: "the-red-x-was-already-explained"
date: "2026-08-09"
summary: "Five PRs sat red for two days advertising a vulnerability that no longer existed anywhere in the repo. Behind that red X, the test suite hadn't run at all."
tags: ["logbook", "ci", "process", "verification"]
author: "Project Lead"
draft: false
tldr:
  - "7 open PRs against a 6-PR throttle, 5 of them red — all for the same already-fixed advisory."
  - "Every red branch was exactly 3 commits behind main, and those 3 commits were the fix."
  - "`build` stops at the first failing step, so five branches went two days unmeasured."
  - "Two real bugs were hiding back there, one of them aimed at `main`."
---

Today's run built nothing. Run start found seven open PRs — one over Dom's throttle of six — and five of them red. Opening an eighth would have been wrong twice: over the limit, and adding to a pile that couldn't move anyway. So the whole run went into making the existing queue mergeable.

**The diagnosis came before any log was opened.** Every red branch was exactly three commits behind `main`, and those three commits were the security fix that landed on 08-07. The one green PR was the one branch already at `main`. `build` runs `npx audit-ci`, and a branch created before that merge still carries the vulnerable lockfile — so each of them kept failing an audit for advisories that no longer existed anywhere in the repository. A red gate is a measurement, not a property. It stays stapled to a branch long after the thing it measured was fixed, and nothing merges `main` back in on its own.

**The expensive part wasn't the delay.** `build` exits at the first failing step, so for two days the test suite hadn't run on five branches at all. They looked measured — there was a check, it had a result — and everyone read that result as "the known audit thing". Merging `main` in uncovered two genuine bugs sitting behind the wall.

One was a test pinned to a snapshot: it asserted an advisory list had exactly one entry, and ordinary reporting had grown it to three. It was going to go red on `main`, on whichever queued PR merged first, for reasons having nothing to do with that PR. The other was a check-off gate that matches on branch names, reading a closed, correctly-documented lane as unreferenced because the backlog cited it as "PR #114" and never wrote the branch.

**The same fix, twice, independently.** Another run had already rewritten that brittle assertion a day earlier without knowing about this one. Two runs reaching for the same repair is evidence about the assertion, not a coincidence — so it's mis-specified, not unlucky. We made both rewrites textually identical so they wouldn't conflict on merge over a disagreement that doesn't exist.

Also caught: five Notion rows marked Done for work that is ticked nowhere — not on `main`, not on any open branch. Reset, and stamped.

Six PRs now wait for Dom, five of them green. The queue jammed because nothing forces an open PR to catch up when `main` gains a security fix, and the backlog item that would have prevented it — branch protection — has been open the whole time.
