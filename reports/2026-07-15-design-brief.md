# Run report — 2026-07-15 (Design brief)

## Item worked on
**Design brief** (backlog item 2) — branch `team/2026-07-15-studio-mvp`.

## What was done
Second run of the worker → Fable-5 judge loop. The Project Lead worked the
creative direction through with Dom first (concept, characters, visual system);
the **designer** (Sonnet) then formalized the *agreed* direction into a
buildable system → `docs/design-brief.md`. **Judge** (Fable 5) scored it.

Result: **converged round 2 — PASS 93/100.** Cost: 4 agents, ~173k tokens,
~34 min.

| Round | Worker | Judge | Blocking | Nits |
|---|---|---|---|---|
| 1 | designer drafts full brief | **revise · 86** | 2 | 5 |
| 2 | designer fixes both + nits | **pass · 93** | 0 | 4 |

### What the loop caught (this is the value)
The judge **recomputed all ~20 WCAG contrast ratios by hand** and caught, as
round-1 **blockers**:
1. `--warning` token labeled "verified ≥4.5:1" but actually **4.01:1** — a real
   AA text failure *and* a fabricated verification claim.
2. `--hairline` annotated "3:1+" but actually **1.32:1** — false stated ratio.

Round 2 fixed both, and the designer **self-caught a third** while
re-verifying: the dark-mode primary-button label (`--ink` on `--marker-600`)
computes **2.27:1** — fails outright; fixed to a dark `--paper` label at 6.33:1.
None of these survive an adversarial reviewer; all three would have shipped
silently otherwise.

### Nits — applied vs skipped (with judgment)
- **Applied:** (a) frontend-dev's running bit conflated two *distinct* SoulForge
  incidents (the 32-file loader cap = blank scene; "floating heads" = separate
  LPC head-layer bug) — split and correctly attributed, since sourced accuracy
  is the site's whole premise; (b) stated the dark-mode character-tint contrast
  floor (`#8A67A0` = 3.84:1).
- **Skipped — judge false-positive:** the judge flagged "agent files are
  *already committed*" as wrong, assuming they only live in `~/.claude/agents/`.
  **They are in fact git-tracked in this repo** (`.claude/agents/*.md`), so the
  brief was correct — not changed. (Lesson: the judge lacked repo-local
  visibility; worth feeding it the file list next time.)
- **Routed to QA:** grain-applied contrast must be verified with the noise layer
  active — already assigned to qa-tester in §9; will be enforced in the QA pass.

## Decisions in the brief worth surfacing
- **Concept executed:** "Machine-made, hand-felt" / Studio Logbook; honest AI
  provenance (byline + provenance strip + margin notes) is the hero device.
- **Type:** Fraunces (one serif doing display *and* body via its optical-size
  axis) + JetBrains Mono (machine voice) + Caveat (decorative signatures only).
- **Anti-glass stance:** hard-edged flat offset shadows, no blur anywhere;
  mostly-sharp radii, pills reserved for badges/avatars.
- **Avatars are stamped glyphs, not faces** — deliberately dodging the uncanny
  AI-mascot cliché.

## For Dom to review
- Branch `team/2026-07-15-studio-mvp` → `docs/design-brief.md`.
- **A one-screen visual concept is coming next** so you react to the *look*, not
  a text doc. This is your Phase-2 sign-off gate — nothing scaffolds until you
  approve.
- Two open items the brief flags honestly: (1) **no studio name/wordmark** exists
  in any doc — header ships a placeholder; pick a name when ready. (2) `/cast` is
  a new route not yet in `docs/spec.md` — needs adding to the spec before build.

## Flag (separate from this item)
The repo's vendored `.claude/agents/*.md` are the **old** versions — they predate
today's senior-expert + security upgrade to `~/.claude/agents/`. If the scheduled
studio-site runs use the repo-local copies, they'd miss the new bar. Recommend
syncing them; happy to do it as a quick task.

## Learnings (blog-worthy)
- A cheap Fable-5 reviewer that *actually recomputes the math* caught two
  fabricated "verified" contrast claims and forced a real AA fix. The scariest
  bugs are the ones wearing a "verified" label.
- One revise round on a dense visual system is efficient; the honesty gate
  (compute, don't assert) is where the rounds get spent.
