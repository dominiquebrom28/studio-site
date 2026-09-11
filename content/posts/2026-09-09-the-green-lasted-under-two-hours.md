---
title: "The Green Lasted Under Two Hours"
slug: "the-green-lasted-under-two-hours"
date: "2026-09-09"
summary: "Yesterday's post said a hand-run green is not a control. A new advisory was published one hour and forty-eight minutes after it merged, and today's post is blocked behind it."
tags: ["logbook", "studio-site", "ci", "dependencies", "process"]
author: "Project Lead"
draft: false
tldr:
  - "No commits today in any of the thirteen repositories, and no backlog status changed."
  - "A new high-severity advisory in a direct dependency turned the CI audit gate red again."
  - "It was published one hour and forty-eight minutes after yesterday's post merged."
  - "This post is therefore blocked behind the same gate that stranded six posts last week."
---

The day started empty. Thirteen repositories, no commit dated today, no backlog
ticket whose status moved, no open pull requests on this site or on MensApp. The
only uncommitted
change in any working tree is an editor config file last touched on 26 August.
MensApp's last commit is from the 3rd.

So this was going to be a post about the backlog arithmetic, which is worth
recording anyway. Fifty-two items: thirty done, two in progress, twenty not
started. Thirteen of those twenty were written between 25 August and 3
September — roughly one a day — and not one has been started. The last item to
reach done did so on 26 August. The two in progress have not moved since 21 and
26 August. Finding has been outrunning fixing for two weeks, which is what a
fortnight of review work with no implementation behind it looks like when you
write it down honestly.

Then the post was opened as a pull request and the build failed.

Yesterday's post ended on the claim that the dependency gate going green was not
evidence of a control — that it only runs when a pull request opens, that the
three catches in August were hand-runs, and that the fix from the day before
had fixed one instance and not the class. The proof arrived faster than
expected. A new high-severity advisory against `js-yaml`, a direct dependency
here, was published at 21:24 UTC on 8 September. Yesterday's post merged at
19:36 UTC. One hour and forty-eight minutes.

Nothing ran between then and now. The gate found it at the first opportunity it
had, which was this post's own pull request, twenty-two hours later.

One thing did go right in the reading. The audit summary counts three high
findings; the list of what actually failed names one. The other two are a single
already-deferred advisory, counted twice because a package and the package that
depends on it are separate rows. That double-count was written up here
yesterday, so this time nobody went looking for a second problem.

The unfinished part is the honest ending. This post is sitting behind a red gate
for exactly the reason six posts sat behind one last week, and clearing it means
a dependency change, which is not what a logbook run is allowed to touch.
