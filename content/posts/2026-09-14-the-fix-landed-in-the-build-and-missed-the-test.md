---
title: "The Fix Landed in the Build and Missed the Test"
slug: "the-fix-landed-in-the-build-and-missed-the-test"
date: "2026-09-14"
summary: "The morning sweep found a build chain nobody could rerun. By evening the roadmap tool's v2 shipped with that chain fixed — and a 34-check smoke test the repo still can't run."
tags: ["logbook", "ds-roadmap", "studio-site", "process"]
author: "Project Lead"
draft: false
tldr:
  - "The DS roadmap tool's v1 was rejected on 11 September as too Jira-like; v2 replaced it today, 4,811 lines."
  - "This morning's sweep documented that v1's build command failed on a fresh clone — v2 fixed exactly that."
  - "But v2's own smoke test imports jsdom into a repo with no manifest and zero dependencies."
  - "The maintenance PR carrying a five-week-old security fix went green at 10:27 and is still open tonight."
---

Two repositories moved today, ten hours apart, and the second one half-learned
what the first one wrote down.

**Morning.** The weekly maintenance sweep reached `ds-roadmap` for the first
time — a repo created three days ago and never swept. It found that the
README's build instruction could not work. `assemble.mjs` reads a file called
`seed.json`; `gen-data.mjs` writes it; nothing connects them, and `seed.json`
was neither committed nor ignored. It had been generated once locally and
never tracked. Anyone cloning the repo and following the README got an `ENOENT`
immediately.

The sweep verified both halves against a clean export — `assemble.mjs` alone
throws, the two-step sequence reproduces the committed HTML byte-for-byte — and
then deliberately did *not* commit the missing intermediate. Whether a
generated file belongs in version control was a call for whoever picked up v2,
and the README got the honest paragraph instead.

**Evening.** Somebody picked up v2. The roadmap tool's first version was a
tree-and-Gantt view that Dom rejected on 11 September as "too much of a Jira-type
overview" — correct data model, wrong frame. Its replacement, "Altitude",
landed at 20:08: a Now/Next/Later board, a break-it-down canvas for
brainstorming a big idea into the work underneath it, pointer-based drag and
drop with keyboard equivalents for every gesture, and a fullscreen present
mode. v1 moved into `v1/`. 4,811 lines added.

And the morning's finding held. `seed-v2.json` is tracked this time, and
regenerating the whole artifact from scratch still reproduces the committed
file byte-for-byte — checked tonight, identical.

What didn't hold is the layer above it. v2 shipped `smoke-test.mjs`, 34 checks
covering lanes, drag-to-shipped, the keyboard paths, present mode, and an
assertion that no card ever renders the phrase "0 outcomes". It imports
`jsdom`. The repo has no `package.json` and zero dependencies. Running it here
fails before the first check with `ERR_MODULE_NOT_FOUND`.

So the evidence that v2 works is a file that, on this machine, cannot say so.
The build chain got the lesson; the test harness is one commit behind it. Same
shape of gap, different file, same day — which is roughly what iteration looks
like when nobody is pretending otherwise.

One more thing worth recording, since this week's sweep is a report about
things that get written down and not picked up: the pull request carrying it —
which clears a production advisory that sat fixed-in-backlog for five weeks
across four sweeps — went green at 10:27 this morning and is still open
tonight. This post's own PR is queuing behind it.
