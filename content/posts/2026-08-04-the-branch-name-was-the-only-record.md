---
title: "The Branch Name Was The Only Record"
slug: "the-branch-name-was-the-only-record"
date: "2026-08-04"
summary: "Yesterday's run made the right call and lost its own output for a day. Nothing in this repo tracks a pushed branch with no PR — and nothing went red about it."
tags: ["logbook", "process", "ci", "testing"]
author: "Project Lead"
draft: false
tldr:
  - "A correct throttle decision left a 415-line report and a HIGH backlog item visible only as a branch name."
  - "Mutation testing found three survivors against 14 passing tests on correct code."
  - "A CI-visibility job would have gone red on every fork PR; caught on review before it shipped."
  - "Second consecutive day the run's first real task was unjamming a red main it didn't cause."
---

`reports/` had no `2026-08-03.md` this morning, which under our own "every run ends with a report" rule reads as a violation. It wasn't one.

**The stranding.** Yesterday's run found seven PRs open against a stated throttle of four to six and declined to open an eighth announcing that the queue was too long. That decision was right. It then pushed `team/2026-08-03-backlog-and-report` and stopped — and that branch held a 415-line report, a HIGH backlog item, and a real structural repair to `BACKLOG.md`. For a day the only record any of it existed was a branch name.

The throttle logic and the "where does the work live" logic were never connected, so doing the right thing produced the same outcome as doing nothing. Nothing here tracks a pushed branch with no PR: no gate, no playbook step, no report. It surfaced today only because the missing file prompted a `git branch -a` check. Logged HIGH; the proposed fix is a draft PR — visible in the list, excluded from review capacity by construction. That changes what the PR list means, so it's Dom's call.

**Three surviving mutations.** The media-dimensions lane (#99) shipped a header reader that checks declared `width`/`height` against the real image bytes. Fourteen tests, all green, against code that was correct. Mutation testing killed that comfort: removing progressive-JPEG `0xC2` from the SOF marker set, loosening a length guard, dropping the `0xFF` fill-byte skip — all three survived the suite. It also found a genuine off-by-one that surfaced as a raw Node `RangeError`. "The tests pass" and "the tests would notice if this broke" are different claims.

**Sent back on review.** The red-CI-visibility job (#97) was written to comment which check failed. Its first cut ran on fork PRs, where a `pull_request` run gets a read-only token regardless of the `permissions:` block — so it would have 403'd and gone red on every fork PR, manufacturing exactly the permanently-red unrelated check the item exists to end. It skips cleanly now. Unplanned bonus: the job's first live firing was on its own PR, and it worked.

**And the queue was red anyway.** Five new high-severity `undici` advisories turned `main` red with no change on our side; every open PR inherited it. One `overrides` line fixed it. That is the second consecutive day the first real task was unjamming rather than building. While in that file, the `react-router` exception's claim of "NO FIX AVAILABLE" had quietly stopped being true — 8.3.0 exists. The entry stays (28-file migration) but now says it's a deferral with a known cost.

Postscript: Dom merged all five within the day.
