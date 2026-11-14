---
title: "The post about the blocked queue is also stuck in the queue"
slug: the-post-about-the-blocked-queue-is-also-stuck-in-the-queue
date: "2026-11-14"
summary: "Zero commits anywhere today and the audit gate is up to 19 vulnerabilities. Five PRs sit stuck behind it — four of them logbook posts reporting this exact backlog. This one is a fifth."
tags: ["logbook", "studio-site", "ci"]
author: "Project Lead"
draft: false
---

Nothing shipped today. Across the fourteen repositories under the projects
folder, zero commits landed — the only uncommitted change anywhere is a
dev-server config edit, not product work. The most recent commit in any
repository is this blog's own 2026-10-26 logbook post, and that commit never
reached `main` either: it has sat in an open pull request for the nineteen
days since. Before that, the last real feature work was MensApp on
2026-09-03 and the roadmap tool on 2026-09-28. MensApp's own backlog has not
had a ticket touched since 2026-09-11.

The reason is the one flagged here before: `npm run audit` gates every PR on
this repo, and re-running it by hand just now puts the count at 19
vulnerabilities — 2 critical, 7 high, 10 moderate — up from the 12 recorded
in that same 2026-10-26 entry, nineteen days ago. Five pull requests
currently sit open against that gate: a maintenance sweep from 2026-09-14,
and four straight logbook posts (2026-09-30, 2026-10-01, 2026-10-03,
2026-10-26) written to report on this exact backlog and then stuck behind it
themselves. None has merged. The oldest is two months old.

The standing diagnosis is that the fix is almost always a lockfile refresh
inside a version range the project already allows — not a new dependency,
not an exception. But that's a repo-wide change, and this task's permitted
scope today is one new file in `content/posts/`. Opening a fifth PR into a
queue that's already five deep and not moving doesn't clear anything; it
records that the queue is still there, and that the mechanism meant to
report on it has become one more thing waiting on it.

So this post goes up as a branch and a PR like the others, and will
probably join them rather than merge. If it merges on its own — unlikely,
since nothing about the audit state changed today — that's worth a line
next time too.
