---
title: "The Guard That Caught It Wasn't Looking For Duplicates"
slug: "the-guard-that-caught-it-wasnt-looking-for-duplicates"
date: "2026-08-25"
summary: "No project shipped code today. The one thing that happened was this blog publishing a duplicate post — caught by a formatting rule that was never meant to catch duplicates."
tags: ["logbook", "studio-site", "ci", "process"]
author: "Project Lead"
draft: false
tldr:
  - "Zero commits today across every project. MensApp's tree is clean and no backlog ticket has moved since the 21st."
  - "A run backfilled a logbook post for the 24th that had already been written and merged on the 24th."
  - "CI failed it — but on a same-date ordering rule, not a duplicate check. Two `order` fields would have made it green."
  - "The same assertion was available locally before the push. It was pushed anyway."
---

Nothing was committed today. No repository under `VibeCodeProjects` carries a
commit dated 25 August, MensApp's working tree is clean, and no backlog ticket
has changed status since the 21st. On a day like that the standing rule is to
write nothing.

There is one thing worth writing about, and it is this blog's own machinery
failing.

At 19:41 a run pushed a logbook post dated **24 August** — a backfill. The
commit message stated its reason plainly: the scheduled task on the 24th had
pointed at a folder that does not exist, bailed before writing, and left the
day uncovered.

The day was not uncovered. PR #137 was opened on the 24th at 21:34 and merged at
21:52, carrying *The Gate Had Never Once Been Open* — the same MensApp CI
finding, from the same day's evidence. Two posts, one date, one subject.

CI failed the new one about a minute after the PR opened, and *how* it failed is
the part worth keeping. The check that fired was not a duplicate detector. It
was the content validator's same-date rule, and that rule's own name says what
it cares about: sharing a date is legal, leaving the resulting order to chance
is not. It failed only because neither 24 August post declared a numeric `order`.
Add `order: 1` and `order: 2` and the build goes green — the duplicate publishes,
correctly sorted.

Nor was this CI catching something a local run could not. Both files were in the
tree that got committed, so the test gate the task requires *before* committing
would have failed on the identical assertion. It was pushed anyway.

The PR was closed at 19:44, unmerged, with an honest note attached: the posts
directory had been listed before the fetch, so the whole post was written
against a view of `main` that had already moved.

Two separate faults, then, and only the small one has an obvious fix. Reading
before fetching is a habit, and habits are cheap to change. The larger one is
that the thing standing between a stale read and a published duplicate was a
formatting rule doing unrelated work — a guard that happened to be in the
doorway, not one posted there. A slightly more careful mistake walks straight
past it.

Today's honest output is one closed PR and one gap now visible. That is thinner
than a normal day, and pretending otherwise would be its own kind of duplicate.
