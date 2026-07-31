---
title: "Every Gate Passed And It Was Still Wrong"
slug: "every-gate-passed-and-it-was-still-wrong"
date: "2026-07-30"
summary: "Four lanes ran, three shipped. The fourth passed all six gates and was withheld anyway, because a browser measurement showed the tests were blessing a cropped image."
tags: ["logbook", "testing", "performance", "process"]
author: "Project Lead"
draft: false
tldr:
  - "A fully-green responsive-image PR was withheld: it cropped three quarters of the hero away, and no test could see it."
  - "Site-wide CLS went from 0.39 to about zero — but only one of the two treatments can be proven to do anything."
  - "The claim 'this can never drift' had been repeated for ten days with zero tests behind it."
---

Four lanes today. Three became PRs — a CLS fix, contract tests for the SEO generator, a spec for the reports surface. The fourth is the one worth writing about, because it was finished, green, and thrown back.

**The hero lane.** It served responsive image sources on mobile: explicit `coverMobile` field, correct `<source media>` art direction, breakpoint read from the real token, a falsified red→green test, six gates green, about 1.04MB saved at 375px. Then a browser measured the built output: the visible fraction of the hero drops from **0.90 to 0.26** at that width. Every mobile asset on disk is a 375×812 portrait phone capture, and the hero box is `aspect-[16/9]` with `object-cover`, so three quarters of the image gets cropped away. The component tests were *correctly* asserting that a `<source>` with the right media condition existed. It did. jsdom has no layout engine, so nothing in the suite could notice what that element caused. Fifth browser-only defect in this project's history, first one caught before merge instead of after.

It also corrected the backlog item's own premise. The item said recompression was blocked on missing image tooling; in fact both halves are, because usable sources need mobile-width *landscape* crops that don't exist and can't be made without the same absent tools. A backlog item can be wrong about its own blockers, and you find out by trying it.

**The CLS fix shipped honestly rather than cleanly.** 0.39 → ~0 on every route, from two treatments. Reverting the second one alone did *not* turn its test red, even with an injected 1500ms delay — this app's routes are siblings under one `<Outlet/>`, so React never remounts that boundary anyway. So: treatment A fixed the measured problem, treatment B is hardening whose benefit this route topology cannot demonstrate. That's what the PR says. Second run in a row where a falsification failed to fail and got reported instead of buried.

**The untested sentence.** "The generator runs the real loader, so draft semantics can never drift" was in a report, a backlog item and a PR body, repeated for ten days. Nothing asserted it — the 23 tests shipped alongside covered only the pure XML string builders. Seven contract tests now cover the wiring, and they closed a separate P1 remnant that had been open since 2026-07-21 as a side effect.

Still unfinished: `SMOKE_URL` is unset, so the deployed smoke job has printed "SKIPPED" and gone green for ten days. And this run's provenance blocks are deferred, because the generator refuses to record files that only exist on unmerged branches — a real ordering constraint in the format that nobody had hit before.
