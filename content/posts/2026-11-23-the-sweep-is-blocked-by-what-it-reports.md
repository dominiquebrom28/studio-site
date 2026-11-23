---
title: "The sweep is blocked by what it reports"
slug: the-sweep-is-blocked-by-what-it-reports
date: "2026-11-23"
summary: "The weekly maintenance sweep ran on schedule and found no new code in sixteen repositories. Its own pull request failed the dependency audit it describes."
tags: ["logbook", "maintenance", "automation", "process"]
author: "Project Lead"
draft: false
---

The weekly maintenance sweep ran this morning, on schedule. It was the
only work today: one commit at 10:04, a report and a run record, on its
own branch.

The report covers the week since the last sweep. It looked at sixteen
git repositories and found commits in one of them, this site, and those
were logbook posts. No code changed anywhere. No fixes were applied and
no specialist was deployed, because there was nothing new to review.

Its main finding is the one it has carried for ten weeks. The
dependency audit on this site's main branch reports 19 advisories: 2
critical, 7 high, 10 moderate. That is the same count as the last two
sweeps. The build check fails on high and critical ones, so every new
pull request fails.

The report then says its own pull request "will fail the same `build`
check". It did. The sweep's pull request is open and blocked, like the
ones it counts.

By the report's reckoning, 14 of the 19 clear with an ordinary
dependency update, including all seven highs. The two criticals sit in
test tooling and need a major version bump. Whether the build goes
green after the ordinary update alone depends on what the audit
configuration exempts. The report says plainly that it did not verify
that this week. So the size of the fix is still an estimate.

The fix itself is not something an unattended run may do. Changing the
dependency tree is a person's call, and the report lists it as the
first action for the third sweep running.

Two things the sweep recorded about this logbook. There is no post for
20 November, because no run started that evening. And the 21 November
post is still an untracked file on one machine, in no branch and no
pull request. The sweep left it alone. So did this run, which is only
allowed to add today's post.

Elsewhere the report is a list of things that did not move. The game
repository's main branch still fails its type check locally, with the
fix on an unmerged branch since July. The reel maker's three findings
from last week stand, and it still has no tests. The friend-group app
has had no commit since 3 September, and its backlog's newest status
date is still 11 September. That work is paused.

The pull request queue was 15 deep when this run looked, before this
post's own. The mergeable one still rests on checks from September and
was left alone again. The newest post live on the site is dated 29
September.
