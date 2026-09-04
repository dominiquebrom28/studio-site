---
title: "Yesterday's Correction Was The Thing That Needed Correcting"
slug: "yesterdays-correction-was-the-thing-that-needed-correcting"
date: "2026-09-04"
summary: "No code was written today. Running the blocked publish gate by hand showed the correction in yesterday's post was wrong, and the allowlist it argued with is stale in the other direction."
tags: ["logbook", "studio-site", "dependencies", "correction", "process"]
author: "Project Lead"
draft: false
tldr:
  - "No commits on any project today, and no backlog movement — the only work was auditing why three finished posts have not published."
  - "The gate fails on exactly two browserslist advisories. Running it locally prints allowlisted advisories separately from failing ones."
  - "Yesterday's correction named a third, react-router advisory as part of the failure. It is allowlisted and has never failed the gate."
  - "That allowlist entry is stale anyway: it records a range that no longer matches, and the patch it says does not exist is published."
  - "Nothing was fixed, on purpose. A dependency bump does not belong in a blog-post pull request."
---

Nothing was committed today, on any project. The MensApp backlog has not moved
since yesterday. The only thing worth writing down is what happened when the
publish pipeline got looked at instead of used.

Three finished logbook posts — 1, 2 and 3 September — are sitting as open pull
requests. All three fail the same required check, at the same step, in about
thirteen seconds: the dependency audit that runs before anything else.

## Running the gate instead of reading the report

The last two posts both wrote about this gate and both got it wrong. Today it
was run by hand rather than reconstructed from a log, and the tool draws a line
the log does not:

```
Found vulnerable allowlisted advisories: GHSA-qwww-vcr4-c8h2.
Found vulnerable advisory paths:
GHSA-73wf-gq98-2v4g|browserslist
GHSA-c83g-rgw3-j3cx|browserslist
```

Two lists. The first is reported and forgiven. The second is what fails the
build. The advisory yesterday's post promoted to the real cause — the
`react-router` one — is in the first list. It is allowlisted, deliberately, with
a documented reason, and it has not failed a build once. The 2 September post
said the failure was two `browserslist` advisories reaching the tree through the
build toolchain and never shipping to a browser. That was right. The correction
issued against it was the error.

Three advisories appear in the JSON report; two of them are the failure. Reading
a count out of a report is not the same as reading a verdict out of a gate.

## The entry that spares it has expired anyway

Being allowlisted is not the same as being fine. The entry's own comment records
the advisory range as covering every 7.x release and concludes that only the 8.x
major — measured at roughly twenty-eight files — can clear it. The advisory no
longer reads that way. It now ends below `7.18.2`, and `7.18.3` is published. The
migration the deferral was priced against is not the price any more.

The file carries a standing lesson, written after a previous entry rotted: an
allowlist justified by a version claim is only true against the range as it reads
today, because ranges get widened. They also get narrowed, and that direction has
no rule written for it yet.

## What was not done

Both fixes are small — a patch bump, a rewritten allowlist entry. Neither was
made. This task is scoped to writing the post, and a dependency change slipped
into a blog-post pull request is exactly the move the audit config argues against
in its own comments. It is reviewed work with its own branch.

So today's post joins the queue. Four now.
