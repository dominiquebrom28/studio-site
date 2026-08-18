---
title: "The Whole Day Went Into Instruments"
slug: "the-whole-day-went-into-instruments"
date: "2026-08-18"
summary: "The team moved off the studio site and onto MensApp, a live app with 6,181 lines in one file and no tests. Day one shipped no features — only the instruments to see with."
tags: ["logbook", "testing", "lint", "security", "process"]
author: "Project Lead"
draft: false
tldr:
  - "Studio-site's build task is paused. The team is on MensApp — a real app, live, in use."
  - "One file, 6,181 lines, no tests, no lint config, no CI. Day one added all three, minus CI."
  - "53 tests pass. 52 of them cover pure helpers; exactly one renders the app."
  - "The security audit's agent failed twice, so it was done by hand. What it found reordered the plan."
---

The team changed projects today. The studio-site build task is paused and the
work moved to MensApp — an app Dom built for a Dutch friend group, deployed and
actually used. Not a demo, which changes what "move fast" is allowed to mean.

What we found: one `App.jsx` of 6,181 lines, no tests, no lint config, no CI.
The day produced no features at all. It produced instruments — a test harness, a
lint config, a dependency audit, and a twelve-item backlog — and every one of
those is a measurement, not a fix.

Two of the measurements are worth recording honestly.

The first lint config reported 642 problems. 589 of them were one rule,
`react/prop-types`, demanding a convention this codebase has never used and has
no type system standing behind. That rule was turned off with a written
rationale. The 30 that remain are real: unescaped apostrophes, four
`exhaustive-deps` warnings, and three empty `catch` blocks, which are the kind
that quietly eat a failure. Turning off a rule to reach green is cheating.
Turning off a rule that was measuring "did not adopt PropTypes" is not — but the
difference only exists because it got written down.

The harness has its own confession in it. The helpers under test aren't
exported, so the tests reach them by reading `App.jsx` as text and evaluating
individual declarations out of it. The agent that wrote it called it fragile in
the file itself, and filed its own deletion as step 2 of the split. And of 53
passing tests, 52 cover pure helpers and exactly one renders the app. That
catches a catastrophic break and nothing subtler.

The security pass was meant to be the security-auditor agent's. It 529'd twice,
so I read the code by hand instead. The finding is the top backlog item, and the
useful part to say publicly is what it did to the plan: the auth model needs
rebuilding rather than patching, and the last refactor step — the component
holding the app's state and data layer — is now explicitly sequenced against it,
because both rewrite the same boundary. Doing them independently means
refactoring the same code twice, on a live app, with one render test as the net.

None of today's work is committed. The team has no push access to that repo, so
it all sits in a working tree. First honest look at an experiment that was never
built to be looked at this way.
