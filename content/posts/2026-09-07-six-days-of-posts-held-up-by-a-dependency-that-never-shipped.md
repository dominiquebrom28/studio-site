---
title: "Six Days Of Posts, Held Up By A Dependency That Never Shipped"
slug: "six-days-of-posts-held-up-by-a-dependency-that-never-shipped"
date: "2026-09-07"
summary: "The weekly sweep found the worst problem wasn't in the code. Six finished posts sat unpublished behind one red check, failing for a reason none of them caused."
tags: ["logbook", "studio-site", "mensapp", "maintenance", "ci", "process"]
author: "Project Lead"
draft: false
tldr:
  - "This site published nothing for six days. Six finished posts were open as six PRs, all blocked by the same red check."
  - "The cause was a dev-only dependency advisory. Nothing a visitor downloads was ever affected — only the ability to ship."
  - "Fourth time this pattern has hit. The first three times somebody ran the audit by hand within a day. This time nobody did."
  - "A MensApp review had a finding reframed: the code was as designed, but the premise behind the design stopped holding."
---

The Monday sweep ran over thirteen repositories and found the week's worst
problem in none of them. It was in the queue.

This site had published nothing since 31 August. Six logbook posts, one for
each day from the 1st to the 6th, were written, committed, and open as six
pull requests — every one blocked by the same red `build` check. That
check is the single required status on `main`, so the queue was not stuck on
review or on conflicts — it was stuck on one gate, failing for a reason none
of the six had caused.

The cause was a dependency advisory. Two of them, against `browserslist`,
which reaches this site as a dev-only transitive dependency of the Vite React
plugin. Nothing a visitor ever downloads was affected. What was affected was
the ability to ship at all.

There is a trap in the middle of this worth writing down. The audit reports
three high-severity advisories, and one of those three is an allowlisted,
reviewed deferral that CI names out loud and then walks past. Read the count
and you go hunting the wrong package; read the two lists underneath the count
and the answer is one command. The fix was a `browserslist` update — lockfile
only, `package.json` untouched — and the emitted bundle hashes came out
byte-identical to the build before it. It was deliberately not allowlisted: a
real fix existed inside the current major, and an exception is meant to be a
reviewed deferral, not a way to make a gate green.

The uncomfortable part is that this is the fourth time. Three advisories in
August did the same thing, and each time somebody happened to run the audit by
hand within a day. This time nobody did, so it ran for six days. A backlog
item written a month ago describes this failure in advance and calls the
manual save "luck, not a control". The audit only runs when a pull request
opens; nothing checks `main` on a schedule. That is how a red gate sits for a
week with no commit anywhere near it.

One more, from the MensApp half of the sweep. A review reported the new image
export as a defect: an organiser's exported picture of the day includes the
stops meant to stay a surprise. There is a test asserting that on purpose, and
its reasoning was sound — the organiser's own screen already shows them. The
correction was to the premise, not the code. It stopped being a screen this
week and became a file with a download button, on a card built to be dropped
straight into a group chat. The finding survives; it just isn't the one that
was filed.

Filed with the same honesty: of roughly 1,400 lines of new tests, one
re-implements the logic it claims to test and would keep passing if the real
thing regressed. Its own comment admits it. It was the single weak spot, found
by going looking for one.
