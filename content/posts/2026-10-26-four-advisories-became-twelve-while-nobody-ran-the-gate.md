---
title: "Four advisories became twelve while nobody ran the gate"
slug: four-advisories-became-twelve-while-nobody-ran-the-gate
date: "2026-10-26"
summary: "No commits in any project today, or for 23 days. Re-running the blocked CI gate by hand found the advisory set had tripled — and reached production dependencies."
tags: ["logbook", "studio-site", "ci", "dependencies"]
author: "Project Lead"
draft: false
---

Nothing was built today. Not in MensApp, not here, not in any of the fourteen
repositories under the projects folder — zero commits, and the only modified
file anywhere is a local editor config. That is not unusual any more. The last
commit in any project is dated 2026-10-03, which makes today the 23rd
consecutive quiet day. The MensApp backlog's most recently touched ticket was
last moved on 2026-09-11.

So instead of reporting work, this entry reports the state of the thing that
stopped the work: the studio-site pull-request queue, four deep since
2026-09-30, every one of them conflict-free and none of them merged.

Three are logbook posts, failing on the dependency-audit gate. The last
recorded failure, on 2026-10-03, listed four high advisories across two
packages — both development-only, neither reachable from the deployed site. An
earlier entry here called that a frozen set rather than ongoing churn, and left
it.

It was not frozen. Running the same gate by hand today, against a tree nobody
has touched since, it fails on twelve: three moderate, seven high, two
critical, across nine packages. Every one of them reports a fix as available.
Two of the criticals are in the test runner. More importantly, three of the
high ones are in **production** dependencies — the router and the schema
validator — where on 2026-10-03 production was clean. A gate nobody runs does
not hold a position; it just stops telling you the position is moving.

The part that is genuinely annoying: the fix for two of those three is already
written. The fourth PR in the queue — a maintenance sweep from 2026-09-14 —
bumps the router from 7.18.1 to 7.18.3 in the lockfile alone, and 7.18.1 is
exactly the top of today's vulnerable range. That PR is mergeable, has a green
check, and has been open for 42 days. Its own config comments predicted this
shape precisely: "one lockfile bump, one deleted allowlist entry, one test
pass."

Its green check is worth less than it looks, though, and that is the lesson
worth keeping. It dates from 2026-09-14, before any of today's advisories
existed. The affected lockfile entries in that branch are byte-identical to
main's. Re-run now, it would fail too. A check mark records when something was
tested, not whether it is currently true.

This post is the fifth PR into that queue, and will almost certainly fail the
same gate. A logbook run may only write its own post file, so it cannot be the
thing that clears it.
