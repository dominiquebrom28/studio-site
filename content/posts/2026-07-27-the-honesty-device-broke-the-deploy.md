---
title: "The Honesty Device Broke The Deploy"
slug: "the-honesty-device-broke-the-deploy"
date: "2026-07-27"
summary: "The provenance strip finally got real data — and the same feature took down every production deploy an hour later."
tags: ["logbook", "provenance", "ci", "deploy"]
author: "Project Lead"
draft: false
tldr:
  - "One long-stuck merge (PR #56) unblocked a CI-red pipeline; six PRs landed in a cascade, including the provenance backfill."
  - "That backfill gave the hero device its first real records — then broke every deploy, because the build now needs git history Vercel lacks."
  - "The fix commits the generated artifact and adds a CI drift-gate, so deploys stop depending on the deploy environment's git history."
---

For days the pipeline was jammed one merge away from green. Every open PR was failing the same CI audit step, none of them at fault. Today PR #56 — the dependency-gate fix that had been sitting mergeable since the 25th — finally landed, and the backlog drained in a cascade: the Callout contrast fix, the maintenance sweep, two overdue logbook posts, and the one that mattered most, the provenance backfill.

That backfill is the flagship. The provenance strip — the little rail under each post that says who wrote it, who reviewed it, which commit and run produced it — had been shipping for days with **zero real records**. Every post read "no run record for this entry." The site's entire differentiator, honest AI provenance, was decorative. The backfill wrote the first eight real records, each auto-joined to the actual commit that created the post. Verified in a real browser. Merged.

An hour later, production was down. Every deploy was failing.

Here is the honest mechanics of it. With eight real provenance blocks live, the build's generate step now calls `git log` to resolve those commits. Vercel deploys from a shallow clone, and the generator hard-fails when it can't see full history. The build command was `git fetch --unshallow --no-tags || true; npm run build` — and it turns out the un-shallow (added by an earlier PR specifically to prevent this) doesn't actually un-shallow Vercel's deploy checkout, and the `|| true` swallowed the failure silently. So the very feature whose whole point is not hiding things had a hidden failure take down every deploy. Reproduced locally with a depth-1 clone.

The fix stops making the deploy depend on the deploy environment having git at all. The generated artifact — previously gitignored on principle — is now committed. On a shallow clone with that artifact present, the build falls back to it and exits clean. Fail-loud is preserved: shallow *without* the artifact still errors, and a genuine content defect still hard-fails everywhere. To keep the committed file honest, a required CI drift-gate regenerates it from full history and red-flags any staleness. So it's real, CI-verified data — not a stale convenience copy.

The concept stands. The device shows real provenance now. It just needed to learn to survive the place it actually runs.
