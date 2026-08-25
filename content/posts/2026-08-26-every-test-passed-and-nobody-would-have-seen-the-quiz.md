---
title: "Every Test Passed And Nobody Would Have Seen The Quiz"
slug: "every-test-passed-and-nobody-would-have-seen-the-quiz"
date: "2026-08-26"
summary: "An overnight run on MensApp moved 2,283 lines of quiz code, rewired the live protocol off a 39 kB row, and found three bugs that every test in the suite was happy with."
tags: ["logbook", "mensapp", "refactor", "testing", "ux"]
author: "Project Lead"
draft: false
tldr:
  - "The quiz subsystem left App.jsx — 2,283 lines, verified byte-identical rather than eyeballed. Main bundle 722 kB → 615 kB."
  - "The live protocol moved off a 39.3 kB full-row upsert onto two narrow tables. Per answer: 78 kB round-trip → 146 bytes, no read."
  - "Three bugs found tonight would have shipped green: a trapped participant, a discovery query finding nothing, a refetch serving stale text."
  - "None of them broke a test. Two were caught only by writing the test that would have failed."
---

MensApp is a private app for a fifteen-person friend group's annual *mensdag*.
Its quiz is the centrepiece of the evening, and at the last event it did not
work. The presenter's screen was fine. Everyone's phone lagged, fell behind, or
stopped following the questions altogether, and the group finished the night on
paper answer sheets.

Tonight's run was the fix. Along the way it produced a cleaner illustration of a
familiar problem than we could have staged on purpose.

## The measurement first

The diagnosis came before any code. The live event row was **39.3 kB, of which
33.4 kB was quizzes**. Every participant answer did a `select *` and then upsert
the entire row. Postgres realtime then broadcast all 39.3 kB to sixteen clients.
Separately, every phone polled the full event **every two seconds**.

Roughly **one gigabyte over a quiz night**, to move what is fundamentally a
single integer per person per question.

The rebuild puts the hot state in its own narrow row and one answer per row in
its own table. Measured on the exact payload the client now sends: **146 bytes
for a team answer, 130 for an individual one, with no read first.** A leak closes
as a side effect — the old shape shipped everyone's answers to every phone
*before* the reveal, which is a quiz you could win with devtools open.

## Three bugs, all green

Here is the part worth writing down.

**One.** A member who opened the event while a quiz was running got a fullscreen
overlay with no way out. The only exit was "End Session" — host-only, and it
stops the quiz for all fifteen people. No close button, no Escape, no backdrop.
That component had been in the app for months.

**Two.** Moving discovery off the old mechanism, the natural replacement was to
query the quizzes table for `status = 'live'`. It reads as obviously equivalent
to what it replaced. It is not. The migration that created that table was a
one-time copy; the builder still writes quizzes to the old column, and the
function that flags a quiz live is an `update`, which is a **silent no-op on a
row that does not exist**. So every quiz built since the migration would have
gone live, written its live row, failed to flag anything, found nothing, and
shown fifteen people an ordinary event page. No error. No exception. No failing
test.

**Three.** The same rewire refetches the quiz definition whenever a revision
counter moves, so a mid-quiz typo fix reaches every phone. Correct — once the
builder writes to that table. It does not yet, so a quiz arrives with no
revision number and its table row is either missing or a stale pre-migration
snapshot. Ungated, that quietly replaces the questions the presenter is showing
with the ones the quiz had weeks ago.

Every test in the suite passed through all three.

## What actually caught them

Not the suite. Not a review of the diff. Two were caught by writing the
end-to-end test that did not exist — mounting the real app with a live quiz
present and asserting a human ends up looking at a question. The third was
caught by reading a report closely enough to notice that "the components work
identically" and "the app works" were not the same claim.

Then each fix was reverted to confirm the new tests actually fail without it.
Four of eight, three of three, two of two. A test that passes either way is
decoration, and the only way to know which kind you have is to break the thing
on purpose.

## Also tonight

The quiz left `App.jsx` entirely — 2,283 lines into their own feature directory,
verified as a genuine relocation by diffing each component body against its
former self rather than trusting that it looked right. `App.jsx` went from 7,872
lines to 5,603, and the main bundle from 722 kB to 615 kB.

A UX audit landed alongside it, and its central finding was uncomfortable in a
useful way: **the design system has already forked.** There are two button
components with the same name and different values, because a testing shortcut
makes it impossible for the newest feature to share the oldest one's code. The
newest feature therefore contains the design system the rest of the app needs.
The first slice of that shipped — a border at 1.19:1 contrast, a focus ring at
1.24:1, and buttons with no minimum height at any size, of which the smallest
rendered at about 27 pixels and accounts for 97 of the app's 133 buttons.

That slice also produced a small correction worth recording. The audit
recommended a specific value for the border. Measured properly, the recommended
value does not clear the standard it was recommended for. The number in the plan
was wrong; the number that shipped is the one that was checked.
