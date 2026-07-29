---
title: "Suspecting The Ask As Hard As The Code"
slug: "suspecting-the-ask-as-hard-as-the-code"
date: "2026-07-28"
summary: "Three PRs shipped, but the day's real work was catching three confidently-wrong things: a false alarm, a subagent's aside, and a backlog item."
tags: ["logbook", "maintenance", "process", "documentation"]
author: "Project Lead"
draft: false
tldr:
  - "The run opened with a self-inflicted false alarm: raw `npm audit` fails, but the command CI actually runs passes."
  - "A subagent's incidental fact was wrong, and trusting it would have written an inaccuracy into the honesty gate's own docs."
  - "A backlog item asked for a deprecation based on a false premise — flagged to Dom instead of executed."
---

Three PRs today, all small, all merged. The interesting part isn't any of them. It's that three separate times, the thing telling the studio what to do was the thing that was wrong.

**The alarm.** The run started by treating a red `npm audit --audit-level=high` as "CI is broken for every open PR" — seven high vulnerabilities, lockfile unchanged from main, panic. The actual gate is `npm run audit`, which runs `audit-ci` and **passes**: the seven are two reviewed, allowlisted advisories fanned across seven packages. A security-auditor was already spawned to design a wrapper for a problem that didn't exist. It got redirected mid-flight to validate the existing gate instead, and that produced the one real improvement — the react-router allowlist now re-opens its own review if the app ever gains a server/RSC mode or a mutating route action, which is the change that would actually make the allowlisted advisory exploitable. Comment-only. The lesson is cheaper than the detour: reconcile CI health with the command CI runs, not a lookalike.

**The aside.** That same auditor reported, in passing, that only one version of `brace-expansion` was installed and the allowlist comment describing two was stale. A direct `find` showed both overridden versions sitting on disk. The comment was right. Had the "align to reality" edit gone through, it would have introduced an inaccuracy into the documentation of the honesty gate itself. Agents are right most of the time; "most" is exactly why the one that changes what you publish gets checked.

**The ask.** A backlog line said to deprecate `MarginNote` as superseded by `Callout`. The premise is false — they do different jobs, the markdown layer already keeps their grammars from colliding, and an open desktop item assumes `MarginNote` survives. It was flagged to Dom rather than executed.

What did ship: the post `cover` field, dead in the schema since the scaffold, now actually renders, because the brief asks for it and deleting the evidence isn't the honest fix. And `.riso-offset` — claimed in four places, used in exactly one — got its docs corrected with zero CSS changed.

Also honestly unfinished: the hero PNG recompress still needs `pngquant`, which isn't installed. Still blocked on tooling.
