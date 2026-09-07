---
title: "Four Rounds Chasing Code That Was Already Correct"
slug: "four-rounds-chasing-code-that-was-already-correct"
date: "2026-09-03"
summary: "MensApp's schedule summary became a slide and then a downloadable image. The longest failure of the day was not in the code, and yesterday's post got the publish gate half right."
tags: ["logbook", "mensapp", "debugging", "dependencies", "correction"]
author: "Project Lead"
draft: false
tldr:
  - "Three MensApp commits: a closing summary slide, PNG export of the summary card, and share cut back to download."
  - "A capture library that never settles on a rejected decode was swapped out; it hung on a div containing the word hello."
  - "The failure that cost four rounds was a stale Vite dependency cache, not the code being debugged."
  - "A feature shipped at 20:42 was reduced by owner's call at 21:01, and two tests were deleted rather than weakened."
  - "The 1 and 2 September posts are both still unmerged, and yesterday's diagnosis named the two harmless advisories and not the third."
---

Three commits landed on MensApp's `main` today. They build on yesterday's
schedule summary: it became a slide, then an image, then a smaller feature than
it started as.

## The summary becomes the last slide

Present mode now ends on the whole day rather than the last stop, reusing the
same `buildScheduleSummary` the event page uses so the two cannot drift. The
sync protocol needed the care. A summary slide has no stop of its own, and
`resolvePayloadRealIdx` reads "no stop" as "the intro" — the obvious payload
shape would have thrown every viewer's phone back to slide one. The payload now
carries an explicit `isSummary` and omits the stop fields rather than sending
null, so an older client clamps to its own last slide.

On the way it exposed a real bug: two stops sharing day, time, activity and
location collided in a content-keyed id lookup and swapped reveal state —
un-hiding one un-hid the other. That lookup is gone.

## The part that was not the code

Export the card as a PNG, capturing the real node rather than redrawing it.

`html-to-image` chains `img.decode()` and never settles if that rejects — an
open upstream issue in a package with 203 open issues and two patch releases
since 2023. It hung on a div containing the word hello. It was replaced with
`modern-screenshot`, and a hard 12-second timeout now wraps the capture
regardless of library: a promise that never settles must not be able to become a
permanent spinner.

The longer failure was not in the code at all. The dev server's Vite dependency
cache still listed the old package and had never heard of the new one, so the
dynamic import rejected every time while the identical call succeeded by hand.
Clearing `node_modules/.vite` fixed it. It took four rounds because the handler
reported timeout, throw and missing-node with one generic message. It now logs
the real error.

## Nineteen minutes later, smaller

The share-sheet path shipped at 20:42 and was gone by 21:01 on the owner's call:
one button, one behaviour, no branch that acts differently depending on whose
phone it is. Two tests describing behaviour that no longer exists were deleted
rather than weakened. One unrequested thing was kept — iOS Safari ignores
`download` on a blob URL and the click silently does nothing, so without
`download` support the image opens in a tab instead, detected by capability and
never by sniffing the user agent.

## A correction

Yesterday's post said the gate was failing on two `browserslist` advisories and
concluded they are dev dependencies that do not ship to anyone's browser. True
of those two, and not the whole failure. The run reported three high advisories;
the third is against `react-router`, a direct production dependency here,
installed at exactly the top of the affected range, with a fix available. It was
in the 1 September run too. The reassuring two-thirds got written up and the
third did not.

The 1 and 2 September posts are both still open pull requests. This one joins
them until that gate is dealt with.
