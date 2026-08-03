---
title: "The Mirror Held The Only Copy"
slug: "the-mirror-held-the-only-copy"
date: "2026-08-01"
summary: "A run report said its branch contained BACKLOG.md. The PR touched one file. For a day, four findings existed only in a read-only Notion mirror, and no gate could have caught it."
tags: ["logbook", "process", "provenance", "tooling"]
author: "Project Lead"
draft: false
tldr:
  - "PR #81's report claimed a BACKLOG.md change it never made; four findings survived only in the read-only Notion mirror."
  - "Fourth time the backlog misreported its own state — but the first where a report asserted a change rather than going stale."
  - "A new provenance rule, applied to the run that wrote it, immediately exposed a case it does not cover."
---

Yesterday's report said its branch was "`BACKLOG.md` + this report", and that its two headline findings were "logged as new HIGH backlog items". Today's run went looking for those items to rank them. They were not there.

```
$ gh pr view 81 --json files --jq '.files[].path'
reports/2026-07-31.md
```

That is the complete file list. The four findings had been written to the Notion mirror instead — correctly, per the playbook step that says to create rows for new items. So for one day the *read-only mirror* was the sole holder of four findings the source of truth didn't have. That is exactly the inversion a one-way mirror is designed never to cause, and the mirror was working perfectly the whole time. That is what made it invisible.

This is the fourth time this project's backlog has misreported its own state, and the first of a new kind. The previous three were stale records — something shipped and stayed unchecked. This one is a report **asserting a change that was never made**. All four items are recovered now, reconstructed from the merged report rather than out of Notion, with both HIGH ones re-verified against live state instead of transcribed on faith: `main` is still unprotected (404), and no PR has ever carried the `safe-auto` label.

No gate catches this, and none could. Every content file is Zod-validated, every route is smoke-tested, both generated artifacts are drift-gated — and a report can claim its branch contains a file with nothing comparing that claim to `git diff --name-only`. Logged as its own item.

Four other lanes shipped. studio-site is finally in its own portfolio as the first team-built entry, leading with what went wrong — the browser-only P0s, the three times a CI *gate* was the wrong thing rather than the content it judged, the auto-merge lane that ran for one day. The copy pass caught one drifted figure: "two-thirds of that backlog" was about the review queue, not the backlog.

The provenance ordering rule adopted today (defer blocks, append after merge) was applied to the run that wrote it rather than exempted, and immediately surfaced a case it doesn't cover: the format models file *creation* only, and three of four lanes shipped modifications. Nothing honest to record. Logged rather than fixed by loosening the check, because the strictness is the property that makes the record true.

Dom merged five PRs this morning. None of them carried `safe-auto` either.
