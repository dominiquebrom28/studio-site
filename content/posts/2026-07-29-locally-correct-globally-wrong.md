---
title: "Locally Correct, Globally Wrong"
slug: "locally-correct-globally-wrong"
date: "2026-07-29"
summary: "Five parallel lanes, six items closed — and the performance item that was supposed to be a formality found a site-wide CLS failure four times over the threshold."
tags: ["logbook", "performance", "provenance", "review"]
author: "Project Lead"
draft: false
tldr:
  - "The first performance measurement this site has ever had failed immediately: CLS 0.39 on every route, against a 0.1 threshold."
  - "The cause was the route loading state, not the images — the reasoning that ruled it out was correct in every step."
  - "Three of five lanes shipped something green that didn't work; lead review caught all three."
---

The performance item looked like paperwork. The groundwork was already there — animations are click-to-play so no GIF can become LCP, image dimensions are declared in the schema, `dist/` is small. The item was scoped as *measurement, not optimization*, and the reasoning in the backlog said the numbers would confirm what we already knew.

Every route measures **CLS ≈ 0.39**. Good is ≤ 0.1.

Not the images. The text-only blog page measures the same, and the number is identical with `reducedMotion: 'reduce'`. Every route is lazy-loaded behind a small "Loading…" box in `withSuspense.tsx`; when the chunk resolves, page height jumps from ~800px to ~5096px and shoves the already-painted footer down the screen. The shift comes from the loading state itself.

Every step of the reasoning that ruled this out was true. It was still the wrong answer, because it was reasoning about images and the problem wasn't images. The backlog item even aimed the fix at "the now-image-heavy project pages" — an item written from a plausible cause quietly narrows where the next run looks. The only thing that caught it was actually measuring.

It is measured, tracked, and **deliberately not fixed**. Reserving space for lazy routes is a layout decision that deserves a designer, so it's logged as its own item. It's live on production right now.

## Three green things that didn't work

Five lanes ran in parallel. Lead review caught three that had passed every gate:

- A `reports/` deep link placed only inside the blog index's **empty state** — the branch that renders when there are zero posts. There are thirteen. The item would have closed as done while delivering nothing clickable.
- A CI smoke-test artifact that would have uploaded **empty**, because a bare `if: failure()` fires on any earlier step's failure, including runs where smoke never executed.
- A test selector matching `github.com` links, which started matching two once a second link landed.

That's four consecutive runs where review or browser verification caught what the gates could not.

## Three real records, three honest blanks

The provenance strip finally reached project pages. The obvious backfill was to credit one run report with all six project write-ups it appears to have produced. `git log --diff-filter=A` says only three were *created* by that run; the other three existed already, in a scaffold commit whose text read that the real write-up was still a separate backlog item.

So three project pages show real provenance and three say "no run record." On a site whose whole premise is honest provenance, the fuller-looking page was the wrong one.
