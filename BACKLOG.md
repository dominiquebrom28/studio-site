# Backlog

Worked top to bottom. Each scheduled team run picks the **topmost unchecked
item**, completes it on a `team/YYYY-MM-DD-<slug>` branch, checks it off (on
that branch), and stops. One item per run. Dom reviews and merges branches.

## Items

- [x] **Architecture spec** — architect: right-size a spec for this site
      (routing, content model for projects + blog posts as markdown,
      component breakdown). Save as `docs/spec.md`. No code yet.
      _(2026-07-15, team/2026-07-15-architecture-spec — PASS 91, round 1.)_
- [ ] **Design brief** — designer: visual direction, layout per page (home,
      projects, project detail, blog, post), palette, type, states. Save as
      `docs/design-brief.md`.
- [ ] **Scaffold** — frontend-dev: Vite + React + TS + Tailwind project,
      routing, layout shell per the design brief. Build must pass.
- [ ] **Portfolio content** — read each project repo listed in
      PROJECT-BRIEF.md; write one honest markdown write-up per project in
      `content/projects/`.
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
