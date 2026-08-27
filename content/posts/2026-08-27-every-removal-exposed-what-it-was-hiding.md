---
title: "Every Removal Exposed What It Was Hiding"
slug: "every-removal-exposed-what-it-was-hiding"
date: "2026-08-27"
summary: "Quiz, Teams and Mens-Games left the MensApp event page. Each thing taken off it turned out to be holding something up — including one gap the removal itself created."
tags: ["logbook", "mensapp", "refactor", "testing", "ux"]
author: "Project Lead"
draft: false
tldr:
  - "Three tools left the event page. Six tabs remain, and the main bundle went down rather than up: 629.10 kB → 626.12 kB."
  - "One removal shipped a gap the commit named out loud, and closed it five hours later."
  - "The brief I wrote for the quiz-linking work had the fault line in the wrong place. Reading the code moved it."
  - "The end-to-end tests celebrated in yesterday's post were flaky on CI. Both got fixed at 22:13 and 22:17."
---

A note on the date: this covers the back half of **26 August**. The previous
post went out at 01:47 that morning and the day ran to 22:17, so a full
working day sat unrecorded.

The spine of it was subtraction. Quiz, Teams and Mens-Games came off the
MensApp event page and became top-level tools. Six tabs remain, and `TeamsTab`
plus two mount-point files went with them. The main bundle went **down**,
629.10 kB to 626.12 kB, because two lazy entry points stopped existing.

Subtraction turned out to be the interesting part, because almost everything
removed was quietly holding something up.

## The gap the removal made

Taking the tabs off assumed you could see a tournament's event history from
the tool instead. That view did not exist. The commit said so plainly rather
than implying the move was complete — *"the removal shipped, the history never
existed, so for a few hours that information was visible nowhere at all."* It
was built five hours later: each tournament row now names its event and
filters the list to it.

Deleting the quiz's inline team builder had the same shape. Right deletion,
and it stranded every pre-existing quiz with teams that now live nowhere —
unable to award a team trophy or feed a tournament, which was the whole point
of one shared team concept. The repair is offered, never automatic: opening a
quiz writes nothing until you have seen what would be created. A quiz that has
already run gets a link and nothing else, so the result it recorded cannot
move. Removing that guard makes its test fail.

## Where I was wrong

The brief I wrote for linking a quiz to an event framed it as easy-versus-hard:
a table-backed quiz is one field, a legacy one is structural. Reading the
dashboard showed the real fault line is whether the quiz is *physically
embedded* in some event's array — which the binary framing missed for quizzes
dual-written this week. Patching the obvious field on one of those would have
left the old event still able to present its own copy: a click that appears to
work and changes nothing where it counts.

Two smaller lessons. A gate that lives only in the button that opens a thing
stops being a gate the moment a second way in exists. And the button component
forked a third time — the copy taken during last week's move predates the
tap-target fix, so its small buttons stayed about 27px while the other two
forks got 36/44/48.

## Two honest footnotes

Two agents were editing the same checkout, and `git add <path>` staged a
correct line under a commit message that does not mention it. Reviewed after
the fact, recorded here rather than rewritten mid-flight.

And the end-to-end tests yesterday's post celebrated? Both were flaky. They
waited for a title, then asserted on the body with a bare expect — fine
locally, a lost race on a slower runner. Fixed at 22:13 and 22:17, each
confirmed still load-bearing by breaking the thing it guards. A test that
passes either way is decoration; so is one that fails for reasons that have
nothing to do with the code.
