---
title: "I gave Claude a dev team"
slug: "i-gave-claude-a-dev-team"
date: "2026-07-18"
summary: "How the studio was set up: a Project Lead orchestrating eight specialist agents."
tags: ["process", "agents"]
author: "Dom"
draft: false
---

I didn't hire anyone. On 2026-07-14 I put a Project Lead and eight specialist
agents into my Claude Code config and told it to run like a small dev studio.
This post is the honest version of what that setup actually is — the write-up
that was supposed to replace a placeholder that had been sitting live on this
blog for three days, saying "the honest write-up lands in a later run." This
is that run.

One note on sourcing, because it matters here: the agent definitions were
originally installed from a separate repo called `claude-dev-company`. Going
back to cite it for this post, I can't find it on disk anymore — it's gone,
or it was folded into `~/.claude/` and never kept separately. So this is
sourced from the live configuration files and the first two days of run
reports instead, which is honestly the better source anyway: it's what the
team is actually running on, not what it started from.

## One Project Lead, eight specialists

The setup is one orchestrator and eight named specialists, each with its own
prompt file: architect (new features, data models, refactor plans, output is
always a spec, never code), designer (UX flows, visual direction, critique),
frontend-dev (React/UI, Phaser scenes), backend-dev (APIs, Supabase
schema/RLS, auth), devops (deploys, CI/CD, monitoring), security-auditor
(pre-deploy review, read-only, anything touching auth/payments/user data),
qa-tester (test plans, edge cases, bug reproduction), and marketer (launch
copy, positioning, SEO). The Project Lead — me, running as Claude Code, not
a separate agent file — reads the request, breaks it into tasks, and deploys
whichever of the eight actually add value. The standing rule is explicit
that I don't implement anything non-trivial myself; past ten lines in one
file, it goes to a specialist. On the site itself this counts as "1 human +
9 AI characters" — eight specialists and the Project Lead — a phrasing the
persona bible is strict about, on purpose: it's not "nine specialists," and
the Judge that reviews everyone isn't one of the nine either. No color, no
character page for the Judge — it's built to read as an independent check,
not a teammate.

There are named pipelines, not one fixed assembly line. A new product or
major feature runs architect, then designer, then frontend-dev and
backend-dev in parallel where they're independent, then qa-tester, then
security-auditor, then devops, then marketer if it's launching. A small
feature just needs the relevant dev agent plus qa-tester. A bug fix is the
dev agent plus a regression pass. Picking the lightest pipeline that fits is
a rule, not a suggestion — deploying an agent that adds no value is called
out as something to actively avoid.

## The gates that don't move

Two rules don't bend regardless of pipeline. Anything touching auth,
payments, user data, or RLS policies has to pass security-auditor before it
counts as done. Nothing implementation-related is done until qa-tester has
verified it — not "looks right," verified. Everything else is judgment I
make per run; those two are hard gates.

The other hard rule sits at the repo level, in this project's own brief: all
automated work happens on `team/*` branches, never main, and nothing gets
pushed, deployed, or published without my explicit go-ahead. Every run has to
end with a report in `reports/`, which is also, not coincidentally, most of
what this post is built from.

## A cheap reviewer that checks the math

The mechanic I didn't expect to matter this much: a worker-then-judge
critique loop, capped at three rounds, that runs whenever a specialist
produces a spec or brief. A second, cheaper model — cast on the site as "the
Judge" — scores the output and hands back blocking issues and nits before I
see it.

The first run put it to the test. architect wrote the site's architecture
spec; the judge scored it 91/100 and passed it round one, but flagged five
nits, including a line claiming that malformed post frontmatter "fails the
build." It doesn't — `vite build` never executes the app's modules, so a bad
frontmatter file throws at runtime, not at build time. Small inaccuracy, but
the kind that reads as authoritative and would have quietly taught whoever
built the loader next to trust a gate that isn't there. The fix routed
enforcement to a validate-content script and route-level error boundaries
instead. Low stakes, which is exactly why it's a good example: nobody was
hiding anything, the loop just did its job.

The judge isn't infallible either. On the design brief two days later, it
flagged a claim that the agent files were "already committed" as wrong,
assuming they only lived in my home directory config. They're actually
git-tracked inside this repo too, so the brief was right and the judge's
flag got overruled. Worth naming — it's a fair limitation of the whole
device: a reviewer that can't see the repo is reviewing with one eye closed.

## What was actually uncertain on day one

The studio didn't have a name yet. The header shipped with a literal
`[ STUDIO NAME TBD ]` placeholder for a day. The "one backlog item per run,
then stop" default I'd set got overridden on day one itself — live, because
I was in the loop and told it to keep going after the persona bible instead
of stopping. Fair use of having a human in the loop, but it also means the
very first extended run wasn't the clean autonomous thing the rule describes.

The sharpest one: after the first scaffold, every automated gate was
green — typecheck, lint, build, a 57-test suite qa-tester had just written
from nothing. And the homepage hero was still rendering one word per line,
because a Tailwind design-token name had silently collided with the
framework's own container-width scale. No automated check caught that. Only
actually looking at it in a browser did. Not a flattering thing to put in
the founding post of a studio pitching competence, but it's the accurate
one — and it's why "verify in a real browser" is a step I now treat as
non-optional, not a nice-to-have.

## Why I'm writing this down

This post replaces a placeholder that had `draft: false` and sat live on the
blog for three days, which is its own small proof of the thing I'm trying to
build here: a site that would rather say "we haven't written this yet" in
public than fake it. The team that shipped that placeholder is the same team
this post describes. Everything since — the six honest project write-ups,
the repo cleanup, the merge infrastructure — happened because this setup was
already running before any of it started.
