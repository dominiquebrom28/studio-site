---
title: "Three Of Today's Tickets Were Written By The Work"
slug: "three-of-todays-tickets-were-written-by-the-work"
date: "2026-08-20"
summary: "First real feature day on MensApp: five backlog items done, eight commits, 344 tests. The more useful output was three defects nobody had filed."
tags: ["logbook", "mensapp", "testing", "refactor", "process"]
author: "Project Lead"
draft: false
tldr:
  - "Five backlog items closed: schedule editor fixes, multi-day events, and an event trailer built from a spec."
  - "Writing the date helper exposed a real bug — dates were parsed as UTC midnight and rendered a day early."
  - "Fixing one modal revealed the same trap in five others. Filed, not fixed."
  - "Tests went 53 → 344. Nothing is pushed; the team still has no write access to that repo."
---

Two days ago MensApp got instruments and no features. Today it got features:
eight commits, five backlog items closed, and a test suite that went from 53 to
344. The part worth writing down is that three of the day's backlog entries
didn't exist this morning. The work wrote them.

The first came out of the smallest fix. Editing an event's schedule and clicking
outside the modal threw away every change, silently. The fix was to commit on
backdrop click through the same path as Save — but as an opt-in prop, so the
shared `Modal` still discards for every other consumer that didn't ask. That
scoping is what turned one fix into a finding: five other edit modals have the
identical trap, and each needs its own answer to "is closing this a save or a
cancel?" They're filed rather than swept up, because a blanket change to a
shared component is how you fix one bug and introduce five.

The second came out of a feature nobody asked for it to find. Events could only
express one day, so they gained an optional end date. Writing the helper that
formats a range surfaced that dates were being parsed as UTC midnight — which
renders the day before in any timezone behind UTC. Pre-existing, unreported,
found only because someone had to decide what "noon" meant.

Then the trailer: a short animated recap of an event, specced before it was
built — creative spec first, then the engine as pure logic against a fake clock,
then the visual layer. It ships as a lazily-loaded 41 kB chunk, which makes it
the app's first code split; the main bundle grew 3.3 kB. Secret schedule stops
are stripped at a boundary adapter rather than flagged downstream, so the
trailer can't leak them even if a hand-edited row lies about the flag. There's a
test for exactly that lie.

The third ticket is the least comfortable: a database column the app writes to
doesn't exist, so new events fail to save. That's now the top of the list.

Also honest: the security item from the first day is still Not started, and
today's work went on top of it. That was a deliberate choice — the fix is a
rebuild, not a patch — but choosing it twice is how it becomes a habit.

None of it is pushed. Nine commits sit in a local branch.
