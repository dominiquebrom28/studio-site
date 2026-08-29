---
title: "The Confirmation Was Green Before The Write Came Back"
slug: "the-confirmation-was-green-before-the-write-came-back"
date: "2026-08-29"
summary: "No commits today. A read of the MensApp quiz participant view produced two tickets, and 1,041 passing tests had nothing to say about either of them."
tags: ["logbook", "mensapp", "quiz", "testing", "ux"]
author: "Project Lead"
draft: false
tldr:
  - "Zero commits in any repo today. The day's output was two backlog tickets."
  - "A failed answer write still renders \"✓ Answer locked in\". The participant is scored as no-answer and finds out at the reveal."
  - "The most destructive control in the quiz has no confirmation and roughly a 21px tap target, next to a near-identical harmless one."
  - "The suite is green — 1,041 tests, 99 files — because both tests assert what renders, not what happens next."
---

Second quiet day in a row on commits: nothing landed in any repo. What did
happen was a read of the MensApp quiz participant view, and it produced two
tickets. Both are in code that shipped last week behind a fully green suite —
1,041 tests across 99 files, all passing on `main` at `25b019c`. I re-ran it
tonight to be sure. It is still green, and it is still blind to both of these.

## The app confirms something it has not verified

When a participant taps an option, the view sets its local "submitted" flag
and fires the write. It never looks at what the write returns. The data layer
is careful here — it catches the error, logs it, and hands back a failure
result — and the caller discards that result. A failed write and a successful
one are indistinguishable at the UI, so the phone shows a green **"✓ Answer
locked in"** either way.

There is a safety poll that could catch this, and it has already retired by
then: it stops as soon as the local tap sets "submitted", not when the server
confirms a row. So one dropped request loses the answer silently. The
presenter never sees a row, the participant is scored as no-answer, and
nobody learns about it until the reveal, when it is too late to fix. On a
phone in a bar this is the likeliest failure the quiz has.

Every other write in that data layer returns a success/failure pair for
exactly this reason. This is the one consumer that throws it away.

## The dangerous button is the small one

The live overlay header carries a destructive **End Session** control. One tap
ends the session and deletes the answers for the whole quiz. There is no
confirmation and no undo.

It sits directly beside a benign **Hide** button — same ✕ prefix, same font
size, same padding, same radius. Hide declares a 32px minimum height. End
Session declares none, which puts it around 21px: under the WCAG 24px floor,
and less than half the app's own 44px bar, for the most destructive control in
the product.

The codebase already disagrees with itself about this. Six other destructive
actions — deleting a round, a match, a tournament, a team set, removing a
user, unlocking a round — all gate on a confirmation, and every one of them
destroys less.

## Why the tests didn't help

The pattern is the same in both. The answer path has a test proving the data
layer *reports* failure, and no test of a caller ignoring it. The End Session
path has a test asserting the host *sees* both buttons — it never clicks
either one. Presence, not consequence.

Neither is fixed. Both are written down with line references and a suggested
shape, which on a day with no commits is the honest output.
