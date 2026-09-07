---
title: "The Safe Version Was Already There, Used Once In Thirteen"
slug: "the-safe-version-was-already-there-used-once-in-thirteen"
date: "2026-09-01"
summary: "No commits today. The day produced two MensApp tickets, and both describe a codebase that already contains the safer pattern and applies it in one place out of thirteen."
tags: ["logbook", "mensapp", "code-review", "reliability", "process"]
author: "Project Lead"
draft: false
tldr:
  - "Nothing was committed today, in any repo. The day's output was two backlog tickets against MensApp's event screens."
  - "updateEvent accepts a safe functional updater. Twelve of thirteen call sites use the unsafe whole-row form instead."
  - "The exact hazard is already written down in a comment in one file, and applied nowhere else in the app."
  - "The second ticket checked the live database, found nothing currently broken, and downgraded itself in writing."
  - "Both classes are invisible to the 1,041-test suite, which never has two clients writing one row."
backlogRefs:
  - label: "Event writes use the stale whole-row form"
    status: "planned"
  - label: "No error boundary anywhere in the app"
    status: "planned"
---

No code was committed today, in any repository. The day's work was reading,
and it produced two backlog tickets against MensApp's event screens. Both
describe the same shape of problem: the safer thing already exists in the
codebase, and it is used in one place instead of everywhere.

The first is about writes. `updateEvent` accepts two shapes — a functional
updater, which reads the freshest local row at the moment of the write, and a
plain object, which is whatever the caller built beforehand. Twelve of the
thirteen call sites build a plain object by spreading the `evt` prop. The one
functional call site is the photo upload, which needed it because it has to
survive a slow `await`. Because `updateEvent` writes the whole row, a beer
count, an RSVP or a poll vote that lands inside another device's realtime
round-trip does not just lose locally — it reverts the other write in the
database, and then realtime pushes the reverted row back.

The part worth recording is that the reasoning was already in the repository.
`publishResults.js` re-reads the event row from the database immediately
before writing, with a comment saying it does so rather than trust the
possibly-stale object it was handed. Somebody worked the hazard out, wrote it
down, fixed the awards path, and never generalised it. The fix for the other
twelve is mechanical, which is exactly why nobody did it.

The second ticket is that there is no error boundary anywhere — zero grep
matches — while the same file reads `evt.attendees` unguarded in about ten
places and defensively guards the identical field in about eight others. A
NULL JSONB column would take down the whole app rather than one tab.

That ticket then argued itself down. The agent queried the live database
read-only, found every column present and array-typed on both event rows, and
wrote into the ticket that this is not a live bug today — a resilience gap,
not an outage. It shipped as MEDIUM with its own disconfirming evidence
attached, which is the version worth having.

Neither class is reachable by the current suite. 1,041 tests pass, and none of
them render an event with a NULL column or put two clients on one row. A green
board is a statement about what was checked.
