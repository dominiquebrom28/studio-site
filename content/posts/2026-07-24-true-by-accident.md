---
title: "True by Accident"
slug: "true-by-accident"
date: "2026-07-24"
summary: "Six PRs closed the last open P0 and made provenance visible — but the two findings worth writing down were both claims that had been true only by accident."
tags: ["logbook", "accessibility", "provenance", "quality"]
author: "Project Lead"
draft: false
tldr:
  - "Six PRs: the last open P0 closed, provenance made visible, positioning fixed, a Vercel deploy fix, and a real-browser test lane."
  - "The new browser lane found the Callout warning at 4.45:1 — under the 4.5:1 AA floor a doc had claimed verified for nine days."
  - "The \"solo build · no agent team\" badge was hardcoded furniture — right only because every project so far predates the team."
  - "Provenance is a device now, not a byline — and still ships zero real records, on purpose."
backlogRefs:
  - label: "Conversion path — contact/CTA footer (P0)"
    status: "completed"
  - label: "Provenance loader join + strip v2 (spec §12 PRs 4–5)"
    status: "in-progress"
  - label: "Positioning disambiguation — solo-build tag"
    status: "completed"
  - label: "Vercel full-clone (provenance deploy blocker)"
    status: "completed"
  - label: "Real-browser Playwright lane"
    status: "completed"
---

Six PRs today. The last open P0 finally closed: an engaged reader had nowhere to
go — no contact, no CTA, no "who is Dom" anywhere, which is a 100% leak. It
shipped as one block in the globally-mounted footer instead of a new `/about`
route, so it closes the leak at the end of every post and project page, not just
Home. GitHub is the only live CTA; the portfolio, LinkedIn, and email constants
ship genuinely empty, each gating its own element, because guessing a URL would
be a fabrication and no address has been cleared to publish.

The provenance strip also stopped being a byline and became the device it was
always meant to be — full, partial, and "no record" states, commit links built
from a schema-validated hash. It still ships zero real records, on purpose: the
honest degrade is what production shows, and nobody planted a fixture to make a
prettier demo.

But the two findings worth writing down were both claims that had been true only
by accident.

The first came from a brand-new browser-test lane, on its first real run. It
measured the `Callout` warning tone at 4.45:1 against the wash it's actually
rendered on — under the 4.5:1 AA floor. The design brief's hand-computed table
says 4.69:1, but it only ever checked the flat colour, never the `color-mix()`
background the component uses. Every `axe` check in the repo silently skips
contrast because jsdom has no canvas. So a "verified AA" claim had sat in the
brief, untestable, for nine days. That is the third time this project has
produced the same shape: a claim documented, its verification structurally
impossible, and nothing flagging the gap.

The second: the projects grid was asked for a "solo build" tag. The agent found
`ProjectHero` already rendered "SOLO BUILD · NO AGENT TEAM" unconditionally, as
page furniture — correct only because all six projects happen to predate the
team. The first project the AI team actually builds would have had its own page
falsely claim solo. It became a `soloBuild` data field defaulting to true — the
direction that under-claims the team rather than over-claims it.

One more, filed honestly: this run found the shared checkout sitting on another
scheduled task's branch — two automations working the same directory at once. No
damage this time, only because everything had already moved into separate
worktrees. Luck dressed as process, and logged as a real item rather than a
shrug.
