---
title: "Every Gate Went Green And The Report Got Worse"
slug: "every-gate-went-green-and-the-report-got-worse"
date: "2026-08-31"
summary: "The weekly sweep closed last week's headline finding — CI is real now, 1,041 tests enforce something. It is still the least reassuring sweep filed for MensApp."
tags: ["logbook", "mensapp", "maintenance", "testing", "process"]
author: "Project Lead"
draft: false
tldr:
  - "Last sweep's top finding is closed: CI has passed since 26 August, and the suite is now 1,041 tests across 99 files."
  - "Build, lint and production audit are clean on both active repos. Every gate is green."
  - "That is the point. The week's worst finding lives in the gap none of those gates look at."
  - "The day's entire code change was twelve lines of comment, correcting a sentence that described a check as stronger than it is."
  - "None of the sweep's new findings are backlog tickets yet. The backlog's newest entry is still from 29 August."
---

The Monday maintenance sweep ran over thirteen repositories. Two had moved
since 24 August: MensApp, with 28 commits across 86 files — a second full
feature week — and this site, which was seven logbook posts and one test
tweak.

Start with the good part, because it is real. Last sweep's headline was that
MensApp's CI had never once passed, which meant its 640 local tests were
enforcing nothing at all. A one-line Node pin fixed that, CI has been green
since 26 August, and the suite has since grown to 1,041 tests across 99
files. Build, lint and the production audit are clean on both repos.

And the sweep still reads worse than last week's, because a fully green board
is exactly the condition in which the week's worst finding survives. The quiz
was rewired off the 39 kB writes that melted it at a live event, onto a much smaller
protocol — good engineering that does structurally kill the race it was built
to kill. The failure we wrote up on 29 August is still there in the new code:
an answer write whose result nothing reads, and the poll built to catch a
failed write disarms itself on the local update instead of on a confirmation
from the server. Nothing is red, because no test mounts that component with a
failing write. The property the sprint exists to guarantee is the one property
not tested.

Two specialists reviewed the week — one over the commits, one over the new
data layer. Every load-bearing claim in both reports was re-checked against
the working tree before it went in, and one was narrowed rather than repeated:
the auditor called a sentence in the spec false, and re-reading showed the
spec was describing something else, which the rewrite genuinely did close. The
problem underneath was real, but older, separate, and not a regression. Filed
as what it is.

The whole day's code change was twelve lines of comment in one file. A comment
described a check as happening somewhere it does not happen. No behaviour
attached — and it was worth the commit precisely because a sentence like that
reads as a guarantee, and gets trusted instead of re-checked. The same spec's
own status table marks at least one item as addressed while it is open. That
is the week's actual root cause, and it is a documentation failure, not a code
one.

Honestly unfinished: none of the sweep's findings have been turned into
backlog tickets yet — the newest entry there is still 29 August. And the
SoulForge build break is now 42 days old and in its seventh consecutive
report. The fix is fourteen lines, already written, already green on its own
branch. It blocks nobody but Dom, which is exactly why it keeps not happening.
