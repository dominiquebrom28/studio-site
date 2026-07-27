# Hire report — visual-media agent (2026-07-18 evening)

The studio hired its ninth specialist tonight. This report documents the
decision, the process, and the first assignment, per Dom's instruction:
"if we need a new visual-design agent, then you have all freedom to 'hire
a new agent' on your own — document this process if you do, of course."

## Why a hire, and why this one

Dom's directive DOM-4 asks for project screenshots and short animations —
"that's what works best in the market," and the market research agrees
(short walkthrough motion measurably outperforms static screenshots for
engagement; techtimes.com 2026 tech-portfolio guide, influenceflow.io
case-study guide).

Nobody on the roster could do it:

- **frontend-dev, backend-dev, devops, qa-tester** have code tools (Read/
  Write/Edit/Bash) but no browser. Every browser verification in this
  studio's history — the 2026-07-15 hero token collision, the 2026-07-17
  mobile reading-order bug, the 2026-07-18 dead TOC anchors — was done by
  the Project Lead personally, because no specialist could open a page.
- **designer and marketer** are spec/copy agents; they can describe a
  screenshot, not take one.

That's a structural gap, not a workload gap: the studio's most recurrent
class of serious bug (4 browser-only bugs in 4 consecutive runs, counting
the production SPA 404) lives exactly where no specialist can see. The
hire closes both needs at once: media production AND delegated browser
verification.

## The process

1. **Mandate**: Dom pre-approved the hire in person ("all freedom"),
   2026-07-18 evening, with the documentation requirement.
2. **Definition written** by the Project Lead: `~/.claude/agents/
   visual-media.md` — runtime copy in the agent registry — and vendored
   into this repo at `.claude/agents/visual-media.md` (this PR) so the
   definition is versioned and reviewable like everything else.
3. **Tooling**: the agent gets the full in-app browser toolset (navigate,
   read_page, computer, resize, console/network readers, preview server
   control) plus file tools and Bash. It is the ONLY agent with capture
   tooling. Supporting toolchain installed the same evening: ffmpeg +
   gifsicle via Homebrew; headless Chrome was already present.
4. **House rules baked into the definition** — the ones that make media
   compatible with this studio's honesty premise:
   - capture the product's best REAL state, never a staged one; no mocked
     data dressed as usage; if the honest capture shows a flaw, capture it
     and report the flaw;
   - motion first (5–12s, one task, loops cleanly), stills as support;
   - standard viewports (1280×800 / 375×812), size budgets, alt text and
     captions as part of every deliverable;
   - secrets/personal-data check on every frame before saving;
   - when verifying instead of shooting: check the DEPLOYED URL, not just
     localhost (the production-only 404 of 2026-07-18 is the standing
     lesson).
5. **Registration**: agent definitions load per session; the registry
   picked it up within the hiring session, and the scheduled runs have it
   from 2026-07-19 onward.

## First assignment (same evening)

Prove the DOM-4 pipeline end-to-end on two projects — Dom's portfolio and
Chart Token Playground: hero stills (desktop + mobile, animation-settled)
plus one short honest GIF each, web-optimized, with alt text.

Worth recording: the Project Lead's own first test shot, taken before the
hire came online, fired mid-animation and caught the portfolio hero
half-faded — the settle-before-shooting rule went into the assignment
brief because of it. The studio's pattern held even here: the first
attempt at a new capability surfaced the first process rule.

## Open questions

- The persona bible does not yet have a 10th character. Whether the
  visual-media agent joins the public cast (name, tint, glyph, byline
  rights) or stays behind-the-scenes crew is a DOM-1/DOM-3 decision for
  Dom and the designer — the cast page currently says "nine characters,"
  and that copy is load-bearing. Until decided, the agent works but
  doesn't byline.
- True motion recording (CDP screencast → WebM → GIF) vs. the honest
  "slideshow of real states" approach — first assignment will tell us
  what's practical headless; whatever it can't do honestly goes to the
  backlog rather than getting faked.

---

### Provenance backfill (added 2026-07-27, team/2026-07-27-provenance-backfill)

Structured `yaml provenance` record(s) for the logbook post(s) this run produced, appended so the site's provenance generator (`docs/provenance-model.md` §12) can join them against `git log` and render the strip with real commit data instead of "no run record". Prose above is unchanged and never parsed.

```yaml provenance
item: post-we-hired-someone-to-look-at-the-page
title: "We hired someone to actually look at the page"
produced:
  - content/posts/2026-07-18-we-hired-someone-to-look-at-the-page.md
authors: ["marketer"]
reviewers: []
judge: null
```
