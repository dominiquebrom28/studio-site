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
- [x] **Projects pages** — render the portfolio content: index + detail pages.
      _(2026-07-17, team/2026-07-17-projects-pages — index was already on-brief
      from the scaffold; detail page polished to design-brief §5: mobile meta
      strip under H1 (fixed a real mobile reading-order gap where status/stack
      sat after the whole body) + "More projects" mini-list (desktop rail +
      mobile footer nav) via new `getMoreProjects` helper. frontend-dev →
      qa-tester (5 new tests, 62 total green) → browser-verified desktop +
      mobile. Provenance strip deliberately NOT added — see report.)_
- [x] **Auto-merge infrastructure** — devops: GitHub-native CI
      (`.github/workflows/ci.yml`, build/typecheck/test on every PR → `CI / build`
      check) + label-based auto-merge (`.github/workflows/auto-merge.yml`) that
      merges `safe-auto`-labeled PRs only after CI passes and a path guard confirms
      they touch only safe files (content/docs/tests/reports/root-md). Lets the team
      ship a higher daily volume without burying Dom in reviews.
      _(2026-07-17, team/2026-07-17-auto-merge-infra — devops built + YAML-validated;
      lead-reviewed the guard/label logic. INERT until Dom does the one-time repo
      config: enable Allow auto-merge, branch-protect `main` requiring `CI / build`,
      create the `safe-auto` label, `gh auth login`. Steps in
      `.github/AUTO-MERGE-SETUP.md`.)_
- [ ] **CI: add `npm audit` gate** — extend `ci.yml` to fail on high/critical
      vulnerabilities, per the studio security checklist (devops flagged this while
      building the auto-merge infra).
- [ ] **Blog engine** — markdown posts in `content/posts/` rendered to blog
      index + post pages.
- [ ] **First blog post** — "I gave Claude a dev team": how the studio was
      set up (agents, Project Lead, scheduled runs), sourced from
      the claude-dev-company repo and early `reports/`.
- [x] **Home page** — hero, featured projects, latest posts, the pitch from
      PROJECT-BRIEF.md.
      _(2026-07-18, verified in-browser by the Project Lead, **no code change
      written on purpose**. The scaffold already built Home to design-brief §5:
      mono eyebrow with the agreed "1 human + 9 AI characters" framing, Fraunces
      H1 pitch, two CTAs, cast strip with the "9 characters, 0 ghostwriting"
      caption, 3 featured projects, 3 latest posts, correct heading hierarchy,
      no content duplicated across breakpoints. The only literal deviation is
      that desktop shows all 9 avatar stamps where §5 says "3–4" — 9 is the
      better call because it matches the caption's own claim. Re-skinning a
      correct page would be churn, so this is checked off as verified rather
      than rebuilt.)_
- [ ] **QA pass** — qa-tester: all states, responsive, accessibility;
      fix findings.
- [ ] **Second blog post** — distill learnings from `reports/` so far: what
      the autonomous runs got right and wrong.
- [ ] **Pre-launch review** — security-auditor + designer critique; fix
      findings. Then STOP and ask Dom about deployment.

### Added 2026-07-18 (impact-ranked; slot above "Pre-launch review")

- [ ] **HIGH — Browser-level smoke test in CI.** devops + qa-tester: add a
      minimal real-DOM check (jsdom Vitest project, or Playwright on the built
      `dist/`) covering a handful of load-bearing invariants — every in-page
      anchor resolves, exactly one `<h1>` per route, no console errors, key
      routes render. _Source: this run. A P0 shipped past typecheck, lint, 99
      unit tests AND a `renderToStaticMarkup` QA harness: every blog TOC anchor
      was dead, because a render-time mutation only misbehaves under React
      StrictMode's double-invoke, which single-pass static rendering cannot
      reproduce. Three separate runs have now had their most serious bug caught
      only by a human opening a browser (2026-07-15 hero token collision,
      2026-07-17 mobile reading order, 2026-07-18 dead anchors). That is a
      pattern, not bad luck — it deserves a gate. qa-tester independently
      flagged the same coverage gap._
- [ ] **HIGH — Provenance content model.** architect: design real frontmatter
      (or a generated sidecar fed from `reports/`) carrying reviewer, Judge
      verdict/round/score, commit hash and token cost, then wire
      `ProvenanceStrip` to render it. _Source: PROJECT-BRIEF goal 3 + design
      brief §5/§6, where honest AI provenance is the **hero device**. It is
      currently under-delivered: `ProvenanceStrip` only ever renders "Written
      by X" because no other field exists, and its own doc comment says to wire
      the rest up "once the content schema carries them." Two consecutive runs
      have now deliberately omitted a brief-specified provenance element rather
      than fabricate it (2026-07-17 projects, 2026-07-18 posts). The honest fix
      is real data, not a smaller strip._
- [ ] **MEDIUM — `MarginNote` component.** designer → frontend-dev: the design
      brief specifies margin notes on project detail and blog post (desktop:
      anchored into the rail at their true vertical position; mobile: inline
      sticky-note blocks under their anchor paragraph, per §9 never hidden).
      _Source: design-brief §5 + §6 component inventory. The component does not
      exist anywhere in `src/` — flagged by frontend-dev during the blog-engine
      pass as a whole undelivered piece of the design system, not a blog gap._
- [ ] **MEDIUM — Cover images for projects and posts.** `cover` is already in
      both frontmatter schemas (spec §3.1/§3.2), is rendered by nothing, and is
      set by no content file — all 6 projects show "no cover yet" placeholders.
      Decide whether to source real images or drop the field. _Source: named
      product gap; flagged in reports/2026-07-17.md and again by frontend-dev
      this run._
- [ ] **MEDIUM — RSS/Atom feed + `sitemap.xml`.** The site is a blog with no
      feed and no sitemap. _Source: Google Search Central recommends sites use
      **both** — a sitemap to describe the full URL set and an RSS/Atom feed to
      describe recent changes — for optimal crawling
      (developers.google.com/search/blog/2014/10/best-practices-for-xml-sitemaps-rssatom).
      Both are cheap to generate at build time from the existing loader, and a
      feed is table stakes for a developer logbook that wants readers._
- [ ] **LOW — Non-ASCII heading slugs collapse.** `slugifyHeading` strips
      non-Latin characters entirely (`Über café ñ 中文标题` → `ber-caf`), so two
      headings differing only in non-Latin content collide before de-dup runs.
      Not a live bug — TOC and DOM agree, and no current post has such a
      heading — and ASCII-only URLs may well be intentional. _Source:
      qa-tester, blog-engine pass. Logged so the decision is explicit._

Add new items to this list (bottom, or prioritized with a note) when run
reports surface work worth doing — but never reorder Dom's edits.

## Run report format (`reports/YYYY-MM-DD.md`)

- **Item worked on** and branch name
- **What was done** — agents deployed, output summary
- **Decisions made** and why
- **For Dom to review** — the branch, plus any open questions
- **Learnings** — anything blog-worthy: surprises, failures, costs, wins
