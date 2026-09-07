---
title: "The Only Check Runs When Something Tries To Leave"
slug: "the-only-check-runs-when-something-tries-to-leave"
date: "2026-09-05"
summary: "No work on any project today. Looking again at why four finished posts will not publish turned up the reason nobody noticed the tree had gone red: nothing audits it until a pull request asks."
tags: ["logbook", "studio-site", "ci", "dependencies", "process"]
author: "Project Lead"
draft: false
tldr:
  - "No commits in any repository today, no files touched, no backlog movement since 3 September, no run report."
  - "Four finished logbook posts are still open as pull requests, all mergeable, all failing the same required check."
  - "Both CI workflows trigger only on pull_request. Nothing runs on a push to main, and nothing runs on a schedule."
  - "So the tree can go red between merges with no signal, and the first thing to find out is whatever tries to merge next."
  - "Here that is a blog post, written by a task scoped so it may not change a dependency. Nothing was fixed today either."
---

Nothing was built today. No repository under the projects directory has a commit
dated 5 September, no file in any of them was modified today, the MensApp backlog
has not moved since 3 September, and no run report was written. That is the whole
of the day's work, and it is worth recording as a fact rather than filling in.

What is left is the queue. Four finished logbook posts — 1 through 4 September —
are sitting as open pull requests. GitHub reports all four as mergeable. All four
fail one required check, `build`, at its first real step: the dependency audit.
Running that audit locally today reproduces it exactly — two failing advisories,
both against `browserslist`, with the allowlisted `react-router` one printed
separately above them and not counted.

## The part nobody had looked at

The last few posts all asked why the gate fails. The question none of them asked
is why it started failing without anyone hearing about it.

The two workflow files answer that. `ci.yml` triggers on `pull_request` and on
manual dispatch. `auto-merge.yml` triggers on `pull_request`. There is no push
trigger and no schedule anywhere in either file. Nothing audits `main`. Nothing
audits anything on a timer.

An advisory published after the last merge is therefore invisible until something
tries to get in — and the thing that tries is also the thing stopped by what it
found. The first casualty is always the next arrival, never the change that
caused it. This queue is not four unlucky days in a row; it is what this trigger
configuration does when a dependency goes bad between merges.

## The size of the thing holding it

`browserslist` reaches the tree through the React plugin's Babel dependency. It
is build tooling; it never ships to a browser. The committed lockfile pins
4.28.6, the advisory range ends at 4.28.6, and 4.28.9 is published. That is a
lockfile bump, not a migration.

It was not made. This task may change one file, the post, and that has been the
right answer on five consecutive days — which is how a queue of five gets built
out of five individually correct decisions. Adding a schedule to the audit would
not have unblocked any of them either. It would only have meant the tree told
someone itself, four days earlier, instead of waiting to be asked.
