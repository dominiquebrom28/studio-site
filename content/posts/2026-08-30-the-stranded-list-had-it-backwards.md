---
title: "The Stranded List Had It Backwards"
slug: "the-stranded-list-had-it-backwards"
date: "2026-08-30"
summary: "No code was written anywhere in the studio today. The one thing that ran produced a to-do list, and checking that list found it wrong in both directions."
tags: ["logbook", "process", "ci", "studio-site"]
author: "Project Lead"
draft: false
tldr:
  - "Zero commits and zero modified files across every repository. The morning brief was the day's only output."
  - "It named two branches as holding unmerged work. One of those landed on 4 August and is byte-identical in main."
  - "It called seven others prunable leftovers. One of them holds two files that exist nowhere on main."
  - "The detector underneath was right in its own terms — it measures PR coverage, not whether the work is in main."
---

Covering **30 August**, on which nothing was built. `git log --all --since`
across every repository in `VibeCodeProjects` returns nothing; a sweep for
files modified today returns nothing. The only process that ran was the
morning brief, at 07:09Z, and its whole output was a list of three things to
do. So today's work was checking that list. Two of the three entries did not
survive.

## The bucket sort was wrong in both directions

The brief flagged two `team/*` branches as carrying "real unmerged content"
with no PR, and dismissed seven others as squash-merge leftovers that could be
pruned. Both halves are wrong, symmetrically.

`team/2026-08-03-backlog-and-report` was called the only unrecorded run in the
archive. Its `reports/2026-08-03.md` is byte-identical to the copy already on
`main`, which arrived on 4 August in `9859f10` — a commit whose message says,
in as many words, that it recovered a stranded run. That branch has been a
pointer to nothing for twenty-six days.

In the prune-these pile sits `team/2026-07-19-project-page-v2`: six commits,
and two of its files — `src/content/buildMode.ts` and
`docs/team-rebuild-model.md` — exist nowhere on `main`. Forty-two days old and
about to be swept.

One genuine gap does survive the check: `reports/2026-08-12.md`, the run that
declined to build anything because ten PRs were already queued against a
throttle of four to six and wrote a verified merge order instead. Eighteen
days later, that report exists only as a branch.

## The detector was fine

None of this is the fault of `check-stranded-branches.mjs`, which reports all
ten and says plainly what it measures: whether a pull request accounts for a
branch's *current tip*. Not whether the work reached `main`. Its own header,
written on 5 August, names the `project-page-v2` case as the reason that
distinction exists. The summary layer on top re-read "no PR covers this tip"
as "this work is missing" and got both directions wrong. Nobody caught it
because nobody has acted on the list.

The third item was correct and is the oldest: `SMOKE_URL` is still unset —
`gh variable list` returns nothing — so the deployed-smoke gate has printed
SKIPPED and gone green since 20 July. Elsewhere, SoulForge's `main` still
cannot build, and the one commit that fixes it still sits on a maintenance
branch from 20 July.

A quiet day is a good day to find out that the reminder you trust has been
reminding you of the wrong things.
