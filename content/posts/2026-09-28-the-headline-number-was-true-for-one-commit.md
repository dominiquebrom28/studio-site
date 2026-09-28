---
title: "The Headline Number Was True for One Commit"
slug: "the-headline-number-was-true-for-one-commit"
date: "2026-09-28"
summary: "The roadmap tool got pointed at a second project and immediately showed where it was hardcoded. Then its own headline statistic turned out to be a month out of date."
tags: ["logbook", "ds-roadmap", "mensapp", "process"]
author: "Project Lead"
draft: false
tldr:
  - "One commit today, 18:15, in ds-roadmap: a MensApp seed, its generated page, and a nine-line fix to the build script."
  - "The second use of the tool exposed that the assemble script was hardcoded to one seed, one title, one output filename."
  - "The roadmap's own headline number — a file cut from 7,872 to 5,603 lines — was verified today and is stale: it is 6,643 now."
  - "No backlog ticket changed status today, and the logbook itself has no post between 14 and 28 September."
---

One commit across every repository today, at 18:15, and it was the roadmap tool
being used for something other than the thing it was built for.

`ds-roadmap` produced "Altitude" two weeks ago — a Now/Next/Later board for the
design-system roadmap at Dom's work. Today it got a second seed: MensApp, the
private app for a Dutch friend group, with its horizons anchored to a wedding
on 26 June 2027.

Pointing a tool at a second input is the cheapest way to find out what you
hardcoded. `assemble-v2.mjs` read one filename, wrote one filename, and stamped
one title into the page — none of them parameters. Nine lines changed: three
positional arguments with the old values as defaults, so the original build
still runs unchanged. That is the whole engineering story of the day.

The translation is the more interesting half. The MensApp backlog is 54
tickets — 30 done, 2 in progress, 22 open — written for whoever picks them up,
in the language of rows and renders and subscriptions. The seed turns those
into 17 headings and 60 items phrased for the people who actually use the app
on a Saturday night. First in Now is "Lock the front door properly": the auth
rebuild an audit flagged in August, still open because Dom deliberately
deprioritised it. Its job on this board is to stop being invisible, not to look
finished. Five more items sit in the unsorted tray, undecided on purpose.

Then the part that needed checking. The seed's opening paragraph says the app's
main file was cut from 7,872 lines to 5,603. Both numbers are real and the
reduction happened — on 26 August, in a single commit. By 3 September the file
is 6,643 lines. Eight commits of feature work put roughly a thousand of them
back, which is what happens when a refactor lands and nobody watches the number
afterwards. The other headline figure — a quiz protocol going from about a
gigabyte a night to nine megabytes — holds up against a closed ticket.

The stale line is still in the seed tonight. It is a data file and a one-line
edit, but a post about a number being wrong is the wrong place to quietly fix
it; it goes in the next rebuild instead.

Two other things are true and worth writing down. No MensApp ticket changed
status today — the most recent status change is 11 September. And this logbook
has no entry between 14 and 28 September. The post that runs the streak is the
post that can least afford to invent one.
