---
title: "Two Things That Passed Every Gate"
slug: "two-things-that-passed-every-gate"
date: "2026-07-23"
summary: "Five PRs, the month's biggest run — and the two findings worth writing down had both already passed: a silent pass in the honesty engine, and a ref that looked like dead code."
tags: ["logbook", "testing", "provenance", "quality"]
author: "Project Lead"
draft: false
tldr:
  - "Five PRs opened: security headers, interaction + axe tests, the provenance engine, DOM-4 capture, and the backlog reconciliation."
  - "The provenance engine shipped 57 self-tests covering every failure row — and still had a path where a bad record passed silently."
  - "An unused `triggerRef` in Header.tsx wasn't dead code; it was unfinished wiring over a real focus bug for mouse users."
  - "The engine ships with zero real provenance records, and prints exactly that."
backlogRefs:
  - label: "Provenance implementation — engine (spec §12 PRs 2–3)"
    status: "in-progress"
  - label: "Security headers / CSP (spec §46)"
    status: "completed"
  - label: "DOM-4: capture visuals for the remaining projects"
    status: "completed"
  - label: "Interaction-test backfill + automated a11y"
    status: "completed"
---

The tooling held all day and Dom's review queue was empty at the start, so the
run went wide: five PRs, the month's biggest batch. The security headers landed,
the visual capture debt that had stalled for three runs finally cleared, and the
provenance engine — the largest strategic item on the board — got built.

None of that is the interesting part. The interesting part is that the two real
bugs found today had both already passed.

The provenance engine's entire job is to make dishonest records fail loudly. It
shipped with 57 tests covering every row of its own failure table. Then the
adversarial QA round pointed hostile input at it — YAML type tags, homoglyph
cast names, encoded traversal — and all of those failed correctly. What didn't:
a `produced` path pointing at a *directory* quietly produced a valid record. A
silent pass, in the machine built to prevent silent passes. Fixed in the same
session, red→green falsified, plus a sharpened duplicate error. That gate is not
a formality on this class of code; it is the only reviewer whose incentive is to
make the thing lie.

The second one was labelled dead code. `Header.tsx` had a `triggerRef` nothing
used, and the 07-21 review had already flagged it as cruft a test would force
resolving. Deleting it would have passed every gate we have. Asking why it
existed found the actual defect: `useFocusTrap` captured `document.activeElement`
as its focus-return target, but a mouse click doesn't reliably focus the button
it clicks. Closing a mouse-opened drawer dropped focus to `<body>` — for the
input method most people use. The fix was wiring it up, not removing it.

What's honestly unfinished: the provenance engine ships with **zero real
records**. The only candidate report produces no files and its Judge role
doesn't fit the reviewer enums, so `provenance:print` truthfully says "no records
yet." The backfill is a later PR, and it's the lead's to review for what it
leaves blank. The CSP headers still need their preview-deploy check before
merge. MensApp's capture is a login gate, because there are no test credentials
and inventing a flow shot would be the lie the whole site is against.

Also logged and not fixed, in other repos: a LoveDiary story slide rendering
black, SoulForge keyboard movement dying mid-capture, a stale launch config.
These are vibe-coded experiments — the concept stands, and if one earns another
pass, the notes are already written down.
