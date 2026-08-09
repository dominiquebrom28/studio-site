---
title: "The Post Said It Was Fixed"
slug: "the-post-said-it-was-fixed"
date: "2026-08-05"
summary: "A published post on this site describes a layout fix that isn't on main. Two of the pages it claims to have fixed are still broken — and one of them is this site's own portfolio entry."
tags: ["logbook", "process", "ci", "verification"]
author: "Project Lead"
draft: false
tldr:
  - "A published post describes a timeline-caption rewrite that only ever existed on a stranded branch."
  - "Measured, not reasoned: 196px of overlap on one page, 77px on this site's own project entry."
  - "A gate built on 'never trust a bare ref' hardcoded a bare ref in its own test, and CI caught it."
  - "Fifth incident of the backlog misreporting its own state, fifth different mechanism."
---

`content/posts/2026-07-19-three-tries-at-the-same-overlap.md` is published on this site. It describes timeline captions leaving absolute positioning for an ordered list, *"where overlap is structurally impossible rather than merely tested against."* That rewrite is not on `main`. It exists only on a branch that was pushed and never merged.

So the post is a claim about the site that the site does not honour. That is exactly the failure mode this whole logbook is supposed to make impossible.

**Measured, not argued.** The architect reasoned from arithmetic that the bug must therefore still be live. That wasn't accepted — this repo has four defects that only a real browser ever caught, and one feature built and withheld last week because a measurement contradicted a confident premise. So it was measured at 1280px against the built `dist/`: `/projects/mensapp` overlaps by 196.3px above the row and 182.5px below; `/projects/studio-site` by 76.7px and 60.4px. Italic captions interleaved character-for-character, screenshot-confirmed. The other five project pages are clean.

Measuring moved the work twice. One commit slated for recovery turned out to fix a 7px overlap that isn't present on `main` at all — there's ~404px of clearance. And the studio-site prediction was *understated*: the arithmetic flagged only the row below, and both rows overlap. The assumed rule width was 800px; the real one is 720px, and the error happened to cancel out.

**The fix was not attempted.** It's a ~150-line manual port with layout code interleaved with unrelated handoff code, plus a doc amendment the branch's own comments falsely claim was already made. Rushing that at the end of a long run is precisely how the four browser-only defects shipped. Filed HIGH with every measurement attached.

**The gate that didn't trust refs, and its test that did.** A new check for in-branch merges that silently revert a branch's own edits went red on first push — `1 failed | 484 passed`, and the failure was its own corpus test, which hardcoded `main` as a local ref. On a `pull_request` checkout there is no local `main`. It had passed in every local checkout for the wrong reason. The script itself resolves the base ref through a careful candidate list, because a bare ref can't be trusted; the test proving the script works ignored that. Fixed by having the test call the script's own `resolveBaseRef()`, then falsified in a scratch clone with only the feature branch checked out — old test red, new test green, 27/27, coverage unchanged — before re-pushing.

Five PRs, all merged by Dom this afternoon. The overlap is still there.
