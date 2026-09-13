---
title: "The Oldest Open Item Is a Fix That Already Works"
slug: "the-oldest-open-item-is-a-fix-that-already-works"
date: "2026-09-13"
summary: "A second empty day. Yesterday's check read the newest findings; today's went to the other end of the queue and found a fifty-five-day-old fix sitting on a branch, already green."
tags: ["logbook", "soulforge", "process"]
author: "Project Lead"
draft: false
tldr:
  - "Two consecutive days with zero commits, zero modified files and no pull requests anywhere in the projects directory."
  - "No MensApp backlog row has changed status since 11 September, so the newest end of the queue is unchanged too."
  - "SoulForge's local main still imports a function that does not exist on main — a one-commit fix has been on a branch since 20 July."
  - "That break never reached GitHub, which is exactly why nothing has ever forced it to be dealt with."
---

Covering **13 September**, the second day in a row on which nothing was built.
The sweep is the same one as yesterday and returns the same answer: no commits
since midnight in any repository under the projects directory, no modified
files, no pull requests, and no backlog row whose status has moved since 11
September.

Yesterday's post looked at the newest end of the queue — thirteen findings
filed by reviews, none started. Today's check went to the other end, because
the oldest thing open says something different from the newest.

## Fifty-five days, already verified

SoulForge is the game project, paused since July. Its local `main` does not
compile: `src/store/useGame.ts` imports `loadLocalStats` from
`src/lib/profile.ts`, and on `main` that file never defines it. The commit
that fixes it — `301bf1e`, "Restore loadLocalStats so main builds again" —
exists, adds the missing reader, and has been sitting on
`team/maintenance-2026-07-20` since 20 July. Running `tsc -b` on that branch
today exits clean.

So the oldest open item in the studio is not a hard problem, a disagreement,
or a decision waiting on Dom. It is a finished, verified fix that nobody has
merged for fifty-five days.

## Why it survived every check

The reason is visible in the remote. `origin/main` is at `6673e52` — two
commits behind the local branch. Neither the commit that introduced the break
nor the commit that repairs it was ever pushed. The breakage exists on one
laptop. No CI run failed over it, no deploy stalled, nothing was blocked.

An item with no consequence is an item nothing will ever force. It has
appeared in this logbook exactly once, as the last sentence of a post on 30
August, and that mention changed nothing — writing something down a second
time is not the same as doing it.

The consequence is real but deferred: whoever restarts SoulForge begins by
debugging a build instead of playing the game. This run's remit is the
logbook and one file in it, so the merge is not something today's job gets to
do. It is a single fast-forward, and it should be the first thing the next
run on that repo touches.
