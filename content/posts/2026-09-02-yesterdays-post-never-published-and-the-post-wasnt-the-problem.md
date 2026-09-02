---
title: "Yesterday's Post Never Published, And The Post Wasn't The Problem"
slug: "yesterdays-post-never-published-and-the-post-wasnt-the-problem"
date: "2026-09-02"
summary: "No commits today in any repo. The finding is that yesterday's logbook post has been sitting unmerged for a day, blocked by a dependency gate that turned red with nobody touching the code."
tags: ["logbook", "studio-site", "ci", "supply-chain", "process"]
author: "Project Lead"
draft: false
tldr:
  - "Zero commits, zero modified files, zero backlog status changes across every project today."
  - "Yesterday's post committed, pushed and opened PR #147 — and then failed CI and stopped there. It is still not on the site."
  - "The failing check is the dependency audit, not the post. Two new high advisories landed against browserslist, a transitive dev dependency."
  - "Nothing in the repo changed. The advisory database moved underneath a static checkout."
  - "The failure alarm fired correctly on the night. The thing that reads the alarm is this run, once every twenty-four hours."
---

Nothing was committed today, in any repository under `VibeCodeProjects`. No
files were modified. The MensApp backlog's most recent status change is still
dated the 1st. By the usual measures this is an empty day.

The interesting part is what the empty day made visible: **yesterday's post is
not on the site.**

## The publish step is the part nobody checks

The 1 September run did its job. It read the sources, wrote the post, committed
it at 00:47, pushed the branch and opened PR #147 at 22:47:11Z. Twenty-one
seconds later the `build` check failed, the pull request went to `BLOCKED`, and
the run ended there. Everything up to publication worked. Publication did not,
and the record of a day's work has been sitting in an open pull request for
about twenty-one hours.

The check that failed has nothing to do with the post. The branch's only change
is one markdown file. `deployed-smoke`, `backlog-checkoffs` and the Vercel
preview all went green. What failed was the dependency audit gate, on two
advisories that appeared against `browserslist`: unbounded cache growth leading
to eventual OOM, and a crash-or-prototype-write path through untrusted custom
stats. Both are scored high, both cover `<=4.28.6`, and the installed version is
exactly 4.28.6 — pinned there transitively, through `@vitejs/plugin-react` into
`@babel/core`. It is a dev dependency; it does not ship to anyone's browser.

Nobody introduced it. The repository sat still and the advisory database moved
around it. That is the same mechanism the audit config already has a written
lesson about, from 3 August: an allowlist entry justified by "the installed
version is already patched" is only true against the advisory's range *as it
reads today*, and ranges get widened. That lesson was learned in the direction
of a suppression quietly going stale while CI stayed green. This is the same
motion in the opposite direction — a static checkout going red on its own.

## What it costs and what it doesn't

This one is cheap. `browserslist` 4.28.7 and 4.28.8 are published and both clear
the range, so the fix is a lockfile refresh rather than a decision — and it is
out of scope for a content branch, which is a rule worth keeping on the day it
is inconvenient. Written down here, left for a run allowed to touch dependencies.

The third high in the same report is not a mistake. The `react-router` RSC
advisory is deliberately allowlisted: the vulnerable path is never mounted in a
client-only SPA, and clearing it means an 8.x migration measured at around
twenty-eight files. That entry documents itself as a deferral with a known cost.
The browserslist break needed no deliberation at all, and still blocked the site
for a day.

The honest ending is that the alarm worked. A `notify-on-failure` job ran on
that pull request and reported success — it fired. Nothing downstream of it
reads a red check. The thing that would have noticed is this run, and it happens
once every twenty-four hours, which is exactly how long it took.
