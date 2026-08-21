---
title: "Six Hundred Tests And The Grid Was Off The Screen"
slug: "six-hundred-tests-and-the-grid-was-off-the-screen"
date: "2026-08-21"
summary: "Twenty-one commits on MensApp, the local branch finally pushed, and a first browser render that found what 618 green tests could not."
tags: ["logbook", "mensapp", "testing", "ci", "process"]
author: "Project Lead"
draft: false
tldr:
  - "Yesterday's nine local commits became a merged PR — which then merged a snapshot, not the branch."
  - "The trailer specced and built yesterday was deleted this morning: Dom made a real video."
  - "618 tests were green when the first browser render showed a roster grid bleeding off both edges of a phone."
  - "Lint went 30 to 0, and one of the thirty was a live bug."
---

Yesterday's entry ended with "None of it is pushed. Nine commits sit in a local
branch." Today it pushed: PR #1 merged at 10:04. It also merged the branch as it
stood at its *first* push. The second half of the work — eleven commits — arrived
after that and had to be reconciled in a separate merge. A pull request against a
branch still being written merges a snapshot, and nothing says so at the time.

The first thing after the merge was a deletion. The trailer specced, built and
tested yesterday — beat engine, timeline, rAF clock, media preloader, dual-layer
audio — is gone, because Dom made an actual video. The feature dropped from 2,571
lines to 541 and its lazy chunk from 41 kB to 13 kB. A day-old working feature,
deleted because the premise underneath it changed. The music licensing question
went with it.

What went in instead was mens-games: an architecture spec, then a pure engine with
173 tests and no UI at all, then tournaments, rounds, live scoreboards and
standings, plus a team library so team sets stop being baggage attached to one
event. Finishing a tournament now writes winners into the Hall of Fame instead of
vanishing. It is built for where it actually gets used — a phone, one-handed, in a
bar: steppers instead of number inputs, arrows instead of drag-and-drop.

The useful part is the instrumentation. CI landed at 13:27; until then nothing ran
the tests except a person. Lint went from 30 findings to zero, and one of the
thirty was a real bug — a countdown that listed only the date in its dependencies,
so editing an event's start time left it counting down to the old one. And no
Supabase write in this app had ever checked whether it succeeded, which is exactly
how a missing database column went unnoticed for four months.

Then the browser. 618 tests green, and the first time any of this rendered on a
phone, the trailer's end card put a 684px roster grid inside a 375px viewport —
bleeding off both edges, no scrollbar, two of nine avatars unreachable on the one
beat whose entire job is showing who is coming. jsdom has no layout engine. Six
hundred assertions cannot see a thing that is off the side of the screen.

Left unfinished on purpose: the bracket view is cut to a second phase, and
mens-games ships locked behind an admin switch because its migration has not been
run — a switch is a better greeting than a database error. The security item from
the first day is still Not started, for the third day running.
