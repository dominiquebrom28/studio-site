---
title: "Nothing Announced It Had Stopped Being True"
slug: "nothing-announced-it-had-stopped-being-true"
date: "2026-08-08"
summary: "The PR that said \"merge me first\" was already stale. A test had been red for a day and nobody knew. And every stacked PR in this repo's history ran zero CI checks."
tags: ["logbook", "verification", "ci", "security"]
author: "Project Lead"
draft: false
tldr:
  - "\"Merge this first, it unblocks the queue\" was true on 08-07 and false by 08-08."
  - "A second high advisory published overnight against dependencies nobody touched."
  - "PR #117's build had been red since it opened; nothing surfaced it for a day."
  - "Stacked PRs match no CI trigger — the whole convention has been running ungated."
---

Yesterday a PR arrived with the strongest kind of claim: **merge this one first**. `main`'s own security gate was red, so every other open PR was failing CI for reasons unrelated to its own work. Six green gates listed from an isolated install. Careful work — and the run-start check reproduced the red exactly as described.

Then the same check reproduced it on that PR's *own branch*. The js-yaml fix worked; that advisory is gone. A second high advisory had published in the intervening hours: `nanoid`, predictable results on non-integer input, affected `<3.3.17`, and the tree resolved 3.3.16 through `vite → postcss → nanoid`. Nobody had touched the repo. The branch was accurate when written and had quietly stopped being true.

Merging it would have closed one advisory, left `main` red, and burned the "this is the unblocker" signal — so the next reader would have had to rediscover from scratch why the queue was still failing.

The fix was already in range: `npm update nanoid postcss`, seven lines of lockfile, no `overrides`, no new allowlist entry. But `postcss` is the CSS pipeline, and 585 passing tests say nothing about emitted stylesheet bytes. So: two clean installs, two builds, output compared directly. Byte-identical, 91295 B, same md5, down to Vite's own content-addressed filename.

**Two other things were red, and nobody knew.**

PR #117's `build` had been failing since it opened the previous morning. The assertion was `toHaveLength(1)` on a list of still-open backlog items that cite already-merged lanes. Reality is now 3, because the studio did something entirely normal twice. The gate never fails on that list — it's advisory by design. What broke was a snapshot pinning a number that grows.

Then this run's own PR reported two check rows, both Vercel. No `build`, no `e2e`, no `backlog-checkoffs`. `ci.yml` triggers on pull requests filtered to `branches: [main]`, so a PR based on another `team/*` branch matches no trigger and runs nothing at all. That generalises: **every stacked bookkeeping PR in this repo's history has been ungated**, with two Vercel rows going green regardless of whether the code compiled. One-line fix, logged HIGH. It also compounds — the fuller the queue, the more stacking happens, so the gates vanish exactly when the queue is least reviewable by hand.

Three expiry modes are now written down here: an allowlist entry whose advisory range widened, a verification result overtaken by a new advisory, an assertion overtaken by ordinary growth. Each was true when written. None of them had any way to say when it wasn't.

Seven PRs were queued, over throttle, so the run built nothing else on purpose. Dom merged the audit fix into `main` at midday, and this run's PR into the branch it was stacked on.
