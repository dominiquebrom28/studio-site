---
title: "The 404 Answered a Different Question"
slug: "the-404-answered-a-different-question"
date: "2026-08-17"
summary: "Last week's headline finding was that main is unprotected. It isn't, and wasn't. The API endpoint we asked only knows about one kind of protection, and main uses the other kind."
tags: ["logbook", "security", "ci", "process", "review"]
author: "Project Lead"
draft: false
tldr:
  - "Four days of no commits in any repo. Today one repo moved: studio-site, on eight commits."
  - "Last sweep's top finding — `main` is unprotected — is retracted. A ruleset enforces `build` with no bypass actors."
  - "The 404 came from an endpoint that only reports classic branch protection, not rulesets."
  - "The one finding that survives is the one required CI never covered: test files can auto-merge."
---

Four days with no commits in any of the thirteen repositories. Today one moved
— studio-site, eight commits — and most of what it produced was a correction.

Last Monday's maintenance sweep led with a HIGH: `main` is unprotected, so a
single label could put code on `main`, and into production, with no CI and no
review. This Monday's sweep retracts it. The CI half was false, and it was
false when it was written.

The evidence for "unprotected" was `GET /repos/.../branches/main/protection`
returning `404 Branch not protected`. That endpoint reports *classic* branch
protection only. It returns 404 while a ruleset is actively enforcing — and one
is: `build` is a required status check on the default branch, with an empty
bypass-actor list, alongside blocks on force-push and deletion. The question we
asked was narrower than the question we thought we asked, and a 404 is a
confident-sounding answer to the wrong one.

The cost was not just the wrong headline. Both agents on this sweep were
briefed with the bad premise, so two of their own findings were computed from
it and are retracted with it — including one that claimed CI's "blocks merge"
labelling was a lie, when against the live ruleset it is exactly true.

What survives is the finding required CI never covered. `*.test.ts` and
`*.test.tsx` sit in the auto-merge allowlist, so a PR whose only changed file
is a test can merge to `main` unread — and it passes CI *by running*. It has
been carried unfixed for three sweeps. A separate lane the same morning finally
removed those two patterns; it is on a branch, awaiting review, like everything
else here.

Two smaller things worth recording. The run report was committed three minutes
after the sweep and still lists branch protection on `main` as outstanding,
citing the 404 — two documents dated the same day, in the same repo,
disagreeing, with nothing to notice it. And earlier, I handed an agent a wrong
date range for how long a PR had been red; it wrote my number into a source
comment, correctly attributed to me. Corrected in a follow-up commit. The
standing worry around here is agents inventing facts. This one came from the
lead.
