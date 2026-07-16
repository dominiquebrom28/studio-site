# Backlog

Worked top to bottom. Each scheduled team run picks the **topmost unchecked
item**, completes it on a `team/YYYY-MM-DD-<slug>` branch, checks it off (on
that branch), and stops. One item per run. Dom reviews and merges branches.

## Items

- [x] **Architecture spec** — architect: right-size a spec for this site
      (routing, content model for projects + blog posts as markdown,
      component breakdown). Save as `docs/spec.md`. No code yet.
      _(2026-07-15, team/2026-07-15-architecture-spec — PASS 91, round 1.)_
- [x] **Design brief** — designer: visual direction, layout per page (home,
      projects, project detail, blog, post, cast/team, 404), palette, type,
      states. Save as `docs/design-brief.md`.
      _(2026-07-15, team/2026-07-15-studio-mvp — PASS 93, round 2. Awaiting
      Dom's visual sign-off on the concept.)_ **Direction (agreed w/ Dom
      2026-07-15):** "Machine-made, hand-felt" — the Studio Logbook. Analog
      warmth (~6/10) over sharp editorial structure; light-first + dark mode;
      serif×mono×handwritten type roles; per-character bylines + honest AI
      provenance as the hero device. Dom holds final visual sign-off.
- [x] **Persona bible** — Project Lead + designer: the 9 team characters (8
      specialists + Project Lead), each with voice/tone, a running bit
      **sourced from real reports + git history, never invented**, a color +
      portrait direction, and byline rules. Save as `docs/persona-bible.md`.
      Gates blog voice and case-study bylines.
      _(2026-07-15, team/2026-07-15-persona-and-build — Judge loop. Every running
      bit cited to agent defs / reports / git; backend-dev, devops, marketer,
      qa-tester honestly flagged standing-rule-only, no invented incidents.)_
- [x] **Scaffold** — frontend-dev: Vite + React + TS + Tailwind project,
      routing, layout shell per the design brief. Build must pass.
      _(2026-07-15, team/2026-07-15-persona-and-build — built with Dom's live
      go-ahead; concept implemented, not just a shell. Build green; qa-tester
      added a 56-test loader suite + found 3 bugs; a hero design-token collision
      was caught in browser verification. All 4 fixed in a consolidated
      frontend-dev round, re-verified in the browser before merge.)_
- [x] **Portfolio content** — read each project repo listed in
      PROJECT-BRIEF.md; write one honest markdown write-up per project in
      `content/projects/`.
      _(2026-07-16, team/2026-07-16-portfolio-content — 6 research agents read
      the actual repos in parallel; marketer wrote all 6 from verified dossiers
      only. 57 tests + build green.)_
- [ ] **Projects pages** — render the portfolio content: index + detail pages.
- [ ] **Blog engine** — markdown posts in `content/posts/` rendered to blog
      index + post pages.
- [ ] **First blog post** — "I gave Claude a dev team": how the studio was
      set up (agents, Project Lead, scheduled runs), sourced from
      the claude-dev-company repo and early `reports/`.
- [ ] **Home page** — hero, featured projects, latest posts, the pitch from
      PROJECT-BRIEF.md.
- [ ] **QA pass** — qa-tester: all states, responsive, accessibility;
      fix findings.
- [ ] **Second blog post** — distill learnings from `reports/` so far: what
      the autonomous runs got right and wrong.
- [ ] **Pre-launch review** — security-auditor + designer critique; fix
      findings. Then STOP and ask Dom about deployment.

Add new items to this list (bottom, or prioritized with a note) when run
reports surface work worth doing — but never reorder Dom's edits.

## Run report format (`reports/YYYY-MM-DD.md`)

- **Item worked on** and branch name
- **What was done** — agents deployed, output summary
- **Decisions made** and why
- **For Dom to review** — the branch, plus any open questions
- **Learnings** — anything blog-worthy: surprises, failures, costs, wins
