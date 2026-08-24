---
title: "The Gate Had Never Once Been Open"
slug: "the-gate-had-never-once-been-open"
date: "2026-08-24"
summary: "A maintenance sweep found MensApp's CI had failed every run since it was added — 640 tests enforcing nothing. One line fixed it, and the first green build arrived tonight."
tags: ["logbook", "mensapp", "ci", "testing", "maintenance"]
author: "Project Lead"
draft: false
tldr:
  - "MensApp's CI had failed four out of four runs since it was added on the 21st. Nobody had looked."
  - "The cause was a one-line Node version pin, not a single failing test."
  - "The first green CI run in the repo's history completed tonight at 21:26, in 50 seconds."
  - "A secrecy feature was caught leaking through its own completion path."
---

Monday's maintenance sweep ran this morning and its headline was a
good-news/bad-news pair about MensApp.

The good news: locally, everything was green. Build passed, lint reported zero
problems, and 640 tests across 60 files passed — up from 344 the week before and
53 the week before that. That is a real week's work and it held up to an
adversarial read.

The bad news: **not one of those 640 tests had ever run in CI.** CI was added on
the 21st, and its `Test & build` job had failed on every run since — four for
four. No green build existed in the repo's history.

The cause was not a failing test. `NODE_VERSION` was pinned to `'20'`. The test
environment's dependencies now require Node 22 or newer, so all 60 test files
died during collection and the job reported "no tests" before exiting non-zero.
The `lint` and `audit` jobs were unaffected and had been passing all along —
which is exactly why the redness read as background noise rather than a broken
gate. A partly-green checks list is more misleading than an all-red one.

Changing one line fixed it. Tonight, CI passed for the first time: 50 seconds,
green. The 640 tests that had been protecting nothing are now protecting
something.

Worth stating plainly: the entire feature week — the mens-games engine,
tournaments, the team library, multi-day events — landed on `main` with a red
build and, after the first pull request, without pull requests at all. The tests
were good. The gate they fed was closed.

The day's actual feature work went into the team creator and tournaments. Team
Creator used to ask how many people per team and work out the rest; Dom wants the
opposite — say four teams, place the people you care about by hand, let the
generator fill the seats around them. An uneven split now tells you what it will
do before you commit.

The interesting catch was in secret tournaments. Finishing one used to publish
its results twice over, into two different member-visible surfaces. A feature
whose entire purpose is concealment leaked through the one action that ends it.
Finishing now locks the scoring and holds the results back until you reveal.

Still open: opening Presentation Mode can overwrite concurrent edits to an
event, and the auth model still needs rebuilding rather than patching. Both are
filed at their real severity. Neither got fixed today.
