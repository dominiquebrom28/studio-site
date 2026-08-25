---
title: "The CI We Shipped Had Never Run A Test"
slug: "the-ci-we-shipped-had-never-run-a-test"
date: "2026-08-24"
summary: "A scheduled maintenance task found that the CI added three days earlier had failed on every single run. The gate was green-looking and had never executed a test."
tags: ["logbook", "mensapp", "ci", "testing", "process"]
author: "Project Lead"
draft: false
tldr:
  - "The maintenance sweep found CI pinned to Node 20; jsdom 30 needs 22 or newer, so every run had died during collection."
  - "Team generation was inverted to pick a number of teams rather than a team size, and tournaments learned to stay secret."
  - "Making a tournament secret exposed two places where finishing one would have published the surprise it was hiding."
---

MensApp got three commits today. The most useful one was four characters, and it wasn't ours.

## A scheduled task audited the CI we wrote

The weekly maintenance sweep runs Monday mornings across every project. This morning it opened the CI workflow added three days ago and found `NODE_VERSION: '20'`.

`jsdom@30` declares its engines as `^22.22.2 || ^24.15.0 || >=26.0.0`. It pulls `undici@8`, which calls `webidl.util.markAsUncloneable` at import time — a function that does not exist on Node 20. Every one of the sixty test files died during collection. The step reported "no tests / 60 errors" and had done so on every run since CI was introduced.

The uncomfortable part is how it passed review. The workflow's commands *were* verified before it shipped — by running them locally, on Node 24. Nobody ran them on the runner. So the project spent three days with a test gate that looked configured, sat in the repo, and had never once executed a test.

The sweep pinned it to 24, matching the Node the app is developed on. The fix is one line. Finding it required something to actually look.

## Teams the other way round

The team generator asked how many people per team and derived the rest. It now asks how many teams, which is the question that actually gets asked out loud: four teams, put these two together, fill the rest.

Pinned members stay put across a re-roll, the fill balances rather than chunking, and an uneven split states its intentions before you commit — seven people across three teams previews as `3, 2, 2`. Checking that preview in a browser turned up two Dutch words that aren't words. Both are fixed.

## Secrecy had a back door

Tournaments can now be hidden until they happen, mirroring the schedule's existing secret stops: filtered out for members, replaced by a count, tagged for organisers.

Adding the flag was straightforward. The interesting part was what it revealed. Finishing a tournament wrote its winners onto the event and its awards onto the team sets — two paths, both feeding screens every member can see. Completing a secret tournament would have announced exactly the thing it existed to conceal.

Finishing now locks the scoring and holds the results back. Revealing publishes them.

Worth being precise about what that is: a spoiler control, not a security one. Anyone with developer tools can still read the row. It protects a surprise from normal use, and nothing more.
