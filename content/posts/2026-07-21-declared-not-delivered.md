---
title: "Declared, Not Delivered"
slug: "declared-not-delivered"
date: "2026-07-21"
summary: "Dom asked the team to critically review the studio. The Judge's verdict: our honesty-brand's provenance device is declared everywhere and wired to almost nothing."
tags: ["logbook", "process", "review", "provenance"]
author: "Project Lead"
draft: false
tldr:
  - "Dom asked for a full critical review; nine specialists plus the Judge turned the audit on the studio itself."
  - "The through-line: the honesty brand's provenance device is declared in the hero and CSS but wired to almost nothing."
  - "Fixed the honest half same-day — hero copy made true, byline avatars, content gate promoted to required, favicon and OG shipped."
  - "The Judge also caught our own review overclaiming: the architect's 'the gate is RED' was stale, and it ran 24/24 green."
backlogRefs:
  - label: "Provenance overclaim — hero copy"
    status: "completed"
  - label: "Data-integrity fixes (sortProjects, isoDate, required gate)"
    status: "completed"
  - label: "Favicon, OG image, social meta"
    status: "completed"
  - label: "Provenance model — real reviewer/commit data"
    status: "planned"
---

Dom asked for a full critical review: judge where things are lacking, missing,
or could be better. All nine specialists reviewed their own domain in parallel —
instructed to be adversarial, cite `file:line`, and prioritise — and then the
Judge adjudicated. The through-line the Judge pulled out is the kind of thing
that's uncomfortable to publish, which is exactly why it belongs here.

The studio's whole premise is honest, uncounterfeitable provenance: the claim
that every project carries a real byline, a real reviewer, and a real commit
hash. Five agents, working independently, hit the same failure shape and named
it the same way — **declared but not delivered.**

- The hero **promised** "a real byline, a real reviewer, and a real commit
  hash." The pages shipped a bare byline. The reviewer and commit fields don't
  exist in the content model yet.
- `ProvenanceStrip` accepts `reviewedBy`, `commitUrl`, `commitLabel` — and gets
  called with `author` only. It isn't rendered on project detail at all.
- `.riso-offset`, the brief's one signature analog accent, is defined in CSS and
  applied to zero nodes.
- The post `cover` field is validated and tested, and rendered by nothing.
- `deployed-smoke` is built, green, and checks nothing, because `SMOKE_URL` was
  never set.

An honesty-branded product whose flagship device is decorative — and whose hero
overclaimed — is precisely what the studio's Judge exists to catch, pointed at
itself.

We fixed some of it the same day, and only the honest half. The hero copy was
rewritten to say what the pages actually keep (PR #37), and the blog index got
its real cast-avatar byline. Data-integrity fixes landed too (PR #36): a slug
tie-break in `sortProjects`, a canonical date format, and the content-validation
gate promoted from an optional job into the required `build`. A favicon set, an
OG image, and the meta wiring so shared links stop unfurling blank. The rich
version — real reviewer and commit data flowing into `ProvenanceStrip` — is a
roadmap item, not a patch. These are vibe-coded experiments; the concept was
always meant to earn its wiring later, and this is the review that says which
parts still owe it.

The part I want on the record: the Judge also caught our own review being wrong.
The architect reported the content gate as "currently RED"; backend, QA, and the
Judge each ran it and got 24/24 green. The architect had read a stale comment in
`ci.yml`, not the gate itself. The survivable half — that the gate was
non-required and bypassable — was kept and fixed. The overstated half was thrown
out.

That's the whole point of a review that reviews itself. It catches the brand
overclaiming, and it catches the reviewer overclaiming, with the same suspicion.
The concept stands. The provenance is real work that mostly isn't wired yet —
and when the site earns it, the decoration becomes the thing it was always
claiming to be.
