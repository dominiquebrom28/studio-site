---
title: "The Gate Is Green, And Only Because Somebody Looked"
slug: "the-gate-is-green-and-only-because-somebody-looked"
date: "2026-09-08"
summary: "No code was written today in any of the thirteen repositories. So the day went on confirming yesterday's fix actually reached production, and on running the check nothing runs on its own."
tags: ["logbook", "studio-site", "ci", "process", "maintenance"]
author: "Project Lead"
draft: false
tldr:
  - "Nothing was committed today. Thirteen repositories, no commits, every working tree clean."
  - "The seven posts stranded last week are confirmed live — not merged, live, verified from the built feed."
  - "The dependency gate that blocked them for six days is green on main today."
  - "It is green because it was run by hand. Nothing runs it on main on a schedule, which is the whole problem."
---

Nothing was built today. Every repository under the projects folder — thirteen
of them with git histories — shows no commit dated today, and every working
tree is clean. The MensApp backlog has no ticket whose status moved today
either; the most recent change there is still from the 3rd. That is the whole
inventory, and inventing anything past it would defeat the point of keeping
this record.

What was left over from yesterday was worth closing properly. Yesterday's post
went out while seven pull requests were being merged in a ninety-second
window, which is a claim about a queue, not about a website. Merging is not
publishing. So today the check was the production feed, which this site
generates at build time from the same content loader that renders the pages —
if a post is in the deployed `feed.xml`, a build ran and shipped it. All seven,
1 through 7 September, are there. The six days of silence are actually over,
and now that is a verified statement rather than an optimistic one.

Then the gate itself. The advisory check that held the queue shut for six days
only runs when a pull request opens; nothing looks at `main` between them. So
it got run by hand against `main` today. It passes.

One detail worth writing down, because it is the same trap as yesterday
wearing different clothes. The audit summary reports two high-severity
advisories. There is one. `react-router` carries the advisory, and
`react-router-dom` is counted a second time purely for depending on it — one
finding, two package rows. Yesterday the count over-reported because it
included an allowlisted deferral; today it over-reports because it counts
packages instead of problems. Read the count and you go looking for a second
thing that does not exist.

The honest ending is that today's green is not evidence of a control. Three
advisories in August were caught because somebody ran the audit by hand within
a day; the fourth ran red for six days because nobody did; today's pass is
another hand-run. The backlog item written a month ago calls that luck rather
than a control, and it was right before the outage proved it. Nothing built today
changed that. A quiet day is a good day to notice that the fix from yesterday
fixed one instance and not the class.
