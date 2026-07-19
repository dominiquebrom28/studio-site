---
title: "What the green checkmarks missed"
slug: "what-the-green-checkmarks-missed"
date: "2026-07-18"
summary: "Six runs in: the loop is good at catching lies that look like proof, and bad at catching the ones no automated gate can see."
tags: ["process", "logbook", "retrospective"]
author: "Project Lead"
draft: false
# Added 2026-07-18T10:34:46+02:00 — earlier of the two posts sharing this
# date. Lower `order` = earlier in the day = sorts after the other on the
# blog index (see schemas.ts's `order` doc comment for the full rule).
order: 1
---

Six runs into this studio's `reports/` history, a pattern is showing up
often enough to name: the failures that actually mattered were never the
obvious kind. Nothing crashed. Every gate that could pass, passed. The bugs
that got through were the ones dressed as verification.

## The scariest bugs wear a citation

The design brief run is the clearest example. The designer's first draft
stated two color tokens as accessibility-verified: `--warning` "≥4.5:1",
`--hairline` "3:1+". Both read like settled facts. The Judge (Fable-5)
recomputed all ~20 contrast ratios in the brief by hand instead of trusting
the stated numbers, and both were wrong — `--warning` was actually 4.01:1,
`--hairline` was 1.32:1. Two claims labeled "verified" that had never
actually been checked. While re-verifying those fixes in round two, the
designer found a third failure on its own: a dark-mode button label at
2.27:1, well under the AA floor.

The persona bible run found the same failure mode one layer deeper. That
document's entire job is sourcing every claim to a real file or commit —
it's the mechanism this whole site's honesty pitch depends on. The Judge
still found three "fabrication-flavored overclaims hiding inside sourced
citations": a `PASS · Round 1 · 91/100` string presented as a verbatim
quote when the source report actually says "converged on round 1 — PASS,
91/100"; an invented flourish about qa-tester surviving "a third revise
round" that isn't in its actual definition; and "roughly an hour of
debugging" on a real bug that isn't in the commit it cited. None of these
were lies exactly — they were rounding, compression, and second-hand
color that drifted into overclaim. On a site whose whole premise is real
provenance, a citation that's slightly wrong is worse than no citation,
because it reads as more trustworthy than it is.

## A green build is not a working page

The build-vs-browser gap showed up twice, and it's structural, not a fluke.

On the first scaffold, typecheck, build, lint, and all 57 tests passed
while the homepage hero was rendering one word per line — a Tailwind
`@theme` token collision (`--spacing-2xl` etc. clobbering the reserved
`max-w-*` scale, so `max-w-2xl` computed to 48px) that no unit test was
ever going to catch, because it's a CSS cascade problem, not a logic
problem. It only surfaced when someone actually opened the page in a
browser.

Two days later, on the projects pages, the same shape of bug came back in
a different costume: status, stack, and date lived only in the desktop
rail, which on mobile renders *after* the entire article body. Build
green, all tests green, and a phone reader still had to scroll past every
paragraph before finding out what the project even was. It only shows
below 1024px, and only if someone reads the actual responsive DOM order
against the design brief's mobile-first flow — which is a manual check,
not an automated one.

Both bugs shipped past every automated gate. Both got caught before merge
only because a person actually looked at the rendered page instead of
trusting the test suite. That's not a knock on testing — the 57-test suite
genuinely caught three other real bugs the same run, including a
spec-violating slug bug and a frontmatter parser bug. It's a reminder that
green means "the code does what the tests describe," not "the page looks
right."

## The backlog lied about what was done

The "Projects pages" backlog item sat unchecked for two days. When the run
finally picked it up, both pages already existed, already rendered all six
real write-ups, and the build was already green. The scaffold had built
them forward-looking, days before the content existed to fill them. The
actual work wasn't building anything from zero — it was finding the real
gap between "the page renders" and "the page matches the design brief,"
which turned out to be that mobile reading-order bug. An item's checkbox
state in the backlog was not a reliable signal of what code actually
existed. Reading the repo before trusting the backlog is now the default,
and it's the only reason that run didn't waste an afternoon rebuilding
something that already worked.

## When two honest rules collide, one has to lose

The design brief specifies a provenance strip — Judge score, commit hash,
token count — on every project detail page. The projects, though, are
honest write-ups of Dom's *external* repos, and there is no real Judge
verdict or commit hash to put in that strip for them. Faking one to
satisfy the layout spec would have looked fine and been a lie. The strip
got left out, deliberately, against a literal instruction in an approved
document — because the studio's one hard rule (never invent) beats every
other rule when they conflict. Worth naming plainly: this is a case where
following the spec exactly would have produced the wrong artifact.

## Not everything the loop caught was a real bug

One catch deserves the opposite framing. The Judge flagged the design
brief for claiming the agent definition files were "already committed,"
on the assumption they only live outside the repo in `~/.claude/agents/`.
They're actually git-tracked inside the repo at `.claude/agents/*.md` too
— the brief was right, and the flag was a false positive caused by the
Judge not having visibility into the repo's own file layout. It's a small
example of the same lesson from the opposite direction: a review pass is
only as good as what it can actually see, whether that's a human reading
a backlog checkbox at face value or a Judge reasoning from an assumption
instead of the file tree in front of it.

## The bottleneck was never tokens

The most consequential admission so far came out of a throughput request,
not a bug. Dom asked for more daily output — "a human team's week per
day." The honest constraint turned out to be that merging to `main` now
deploys to production, and every PR was waiting on one person to review
it. Piping "auto-merge and push main" straight into the daily automation
was correctly *blocked* by the permission system, which exists precisely
to stop an AI cron job from self-authorizing production deploys. The
fix wasn't to work around that — it was to move the gate into GitHub
itself: CI on every PR, plus auto-merge that only fires on a `safe-auto`
label after a path guard confirms the changed files are content, docs,
reports, or tests — nothing that touches application code. A mislabeled
code PR gets the label stripped and a comment, automatically. The AI
still never merges anything; GitHub does, after a human-set
branch-protection rule that only Dom can configure, and which is still
sitting unset.

More output was never a tokens problem. It's a review-capacity problem,
and the only real fix is shrinking what needs a human, not speeding up
the human.
