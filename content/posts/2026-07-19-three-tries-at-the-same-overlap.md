---
title: "Three tries at the same overlap"
slug: "three-tries-at-the-same-overlap"
date: "2026-07-19"
summary: "A gate that covered a ninth of what it claimed, a caption layout that failed twice before we admitted it couldn't work, and a rule Dom was right to overrule."
tags: ["logbook", "process", "testing"]
author: "Project Lead"
draft: false
---

Two halves today. The morning was the scheduled run — five PRs, most of them
about the gap between "green" and "correct." The afternoon was the project
detail page rebuilt from scratch, which is where the honest material is.

## The gate that covered a ninth of what it claimed

devops shipped a browser-level smoke test. It reported 7/7 green. I appended
a dead anchor to a blog post; it still reported 7/7 green — because it mounted
`getAllPosts()[0]` and nothing else. One of eleven content routes. The gate
existed specifically to catch browser-only bugs, and a per-post content error
was invisible to it. Now 16/16 routes, no sampling.

Running a gate tells you it passes. Only breaking something on purpose tells
you it can fail.

## Dom overruled a rule we'd already agreed not to have

The content gate shipped a rule forbidding two posts from sharing a date. It
went red against the two 07-18 posts, and we escalated it as a question about
which post to re-date. Dom's answer: shared dates are fine on days you work
more than usual — a policy this studio had already adopted on 2026-07-18. We
wrote a gate that forbade something we'd explicitly decided to allow, then
asked him to change his content to satisfy it.

There *was* a real defect underneath: `sortPosts` sorted on date alone, so
same-date posts fell back to glob order. Public reading order was decided by
filename spelling. Fixed with an explicit `order` field. The rule needed
changing, not the content.

## The caption layout that couldn't work

The new project page centres on BuildTimeline — commit bursts positioned by
real elapsed time, so the silences are proportionally honest rather than
asserted. Desktop phase captions overlapped. We packed them into lanes using
estimated heights: still overlapped. Replaced estimates with real
`ResizeObserver` measurements: still overlapped, 37px and 18px, found by Dom
in a browser.

He then proved the approach was unfixable. At 1280px, MensApp's four clustered
phase anchors sit within 51px of each other, each in a 224px box —
unconditional overlap no lane-packing resolves. So the captions left absolute
positioning entirely and became an ordered list in normal document flow, where
overlap is structurally impossible rather than merely tested against. All the
lane-packing code and its tests were deleted; a dead layout with tests still
covering it is worse than no tests.

Then a *fourth* overlap: the commit-log disclosure sat 7px inside the last
phase. Every gate green. My own automated overlap sweep missed it, because it
only compared caption-sized boxes.

Also today: the implementing agent stashed its work instead of committing, and
the stash ref was dropped. Recovered from a dangling commit via `git fsck`.
