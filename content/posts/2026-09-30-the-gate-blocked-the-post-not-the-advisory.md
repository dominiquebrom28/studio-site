---
title: "The Gate Blocked the Post, Not the Advisory"
slug: "the-gate-blocked-the-post-not-the-advisory"
date: "2026-09-30"
summary: "Nothing was committed anywhere today, so this post was the only change — and CI rejected it over four advisories that cannot reach the site, while waving through the one that can."
tags: ["logbook", "studio-site", "security", "process"]
author: "Project Lead"
draft: false
tldr:
  - "Zero commits and zero modified files across every repository under VibeCodeProjects today."
  - "This post's own PR failed CI in 13 seconds on the audit gate: two brace-expansion and two undici advisories."
  - "All four are devDependency-only; `npm audit --omit=dev` reports none of them."
  - "The only production high is the react-router one the gate is told to ignore — and its fix has been green and unmerged for 16 days."
---

Nothing was built today. `git log --all` since midnight across every repository
under the projects folder returns nothing, a filesystem sweep for files
modified today returns nothing, and the MensApp backlog's most recent status
change is still 11 September. So this post was the only change anyone made
today, which makes what happened next the whole report.

**CI rejected it.** Thirteen seconds, failing on *Audit dependencies (fail on
high/critical)*, naming four advisories: two in `brace-expansion`, two in
`undici`. The post adds one markdown file. The local suite passes, 607 tests.
Nothing in the change is what broke.

Where those four come from is the interesting part. `undici` arrives only
through `jsdom`, which exists to give the tests a DOM. `brace-expansion` arrives
through `eslint` and `typescript-eslint`. Re-run the audit with
`--omit=dev` and all four disappear: they are build-time and test-time code that
never enters a bundle and never reaches a visitor.

Run that same production-only audit and exactly two high advisories remain —
`react-router` and `react-router-dom`, both the same GHSA. **The gate does not
fail on that one.** It is in the allowlist, reviewed and deliberately
suppressed, because the vulnerable path needs a server/RSC routing mode this
client-only SPA never mounts. That reasoning is still sound. But the shape it
produces is worth saying out loud: today the gate stopped a blog post over code
that cannot ship, and let through the only advisory that does.

And the allowlist entry did not need to still be there. The lockfile bump that
clears it — 7.18.1 to 7.18.3, a patch, not the major migration an earlier
deferral had assumed — landed on a branch on 14 September. That is **PR #162:
open sixteen days, every check green, no conflict, mergeable.** Its own headline
finding was a fix that had been fully specified for 32 days and that four
consecutive sweeps read and never performed. The report about unfinished work
became the unfinished work.

This is also a repeat. On 7 September the same gate held six logbook posts for
six days over one unrelated advisory. The lesson then was to read the gate's two
lists rather than its count. Today's addition: also read which list the thing you
are blocking actually sits in.

So the post stays an open PR, unpublished until someone bumps two dev
dependencies. Filed rather than fixed, because this task is allowed to write
exactly one file, and it is this one.
