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
- [x] **CI: add `npm audit` gate** — extend `ci.yml` to fail on high/critical
      vulnerabilities, per the studio security checklist (devops flagged this while
      building the auto-merge infra).
      _(2026-07-18, team/2026-07-18-ci-audit-gate — devops added a single
      `npm audit --audit-level=high` step after `npm ci`. Repo audits clean at
      every severity (0 vulns, prod and dev), so the gate is not born failing and
      was deliberately NOT scoped to `--omit=dev` — narrowing it would have hidden
      dev/build-tool supply-chain advisories for no benefit. `CI / build` check
      name preserved, so the auto-merge branch protection is unaffected.)_
- [x] **Blog engine** — markdown posts in `content/posts/` rendered to blog
      index + post pages.
      _(2026-07-18, team/2026-07-18-blog-engine — like the projects-pages item,
      this was a "renders → on-brief" pass, not a from-zero build. frontend-dev
      closed 5 design-brief §5 gaps on the post page: prev/next nav (new
      `getAdjacentPosts`, deliberately does NOT wrap — a dated logbook asserting
      false chronological adjacency reads as a bug), mailto+copy-link share with
      an `aria-live` toast, `Signed, {name}, {title}` signature, desktop 68/32
      sticky rail, and the §5 mobile element order. Blog index was already
      on-brief and left alone. qa-tester PASS 88/100, fixed 3 real bugs.
      **Browser verification then caught a P0 all four gates missed:** every TOC
      anchor was dead (`#the-cleanup-sweep` vs rendered id `the-cleanup-sweep-1`)
      because `Markdown.tsx` mutated a heading-id Map during render and
      StrictMode's double-invoke made pass 2 de-dup against pass 1. Fixed by
      precomputing ids from the markdown source (`headingIdsByLine`) so TOC/DOM
      parity is structural. Also fixed a duplicated "Written by" line and a
      signature that printed a whole job description. 104 tests green.)_
- [x] **First blog post** — "I gave Claude a dev team": how the studio was
      set up (agents, Project Lead, scheduled runs), sourced from
      the claude-dev-company repo and early `reports/`.
      _(2026-07-18, team/2026-07-18-first-post — this item was NOT unbuilt-but-
      empty: a 104-word placeholder whose body read "the honest write-up lands in
      a later run" had been live on the blog index with `draft: false` since
      2026-07-15. Replaced with the real ~990-word post in Dom's first-person
      voice. **The `claude-dev-company` repo named in this item no longer exists
      on disk** — marketer searched and reported it rather than inventing its
      contents; sourced from `~/.claude/CLAUDE.md`, `~/.claude/agents/*.md` (the
      current versions, not the older vendored in-repo copies) and the early
      reports instead, and says so in the post. Initially re-dated to
      2026-07-18 (the day it was written); **Dom chose chronology on review**,
      so it is dated 2026-07-15 with an explicit up-front note that it was
      written on the 18th and a placeholder sat there in between — order
      restored, nothing hidden (team/2026-07-18-founding-post-date).)_
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
- [x] **Second blog post** — distill learnings from `reports/` so far: what
      the autonomous runs got right and wrong.
      _(2026-07-18, team/2026-07-18-second-post — "What the green checkmarks
      missed", by Project Lead. Retrospective across all six run reports rather
      than another day-in-the-life: claims that look like proof and aren't
      (fabricated-but-cited overclaims, "verified" contrast ratios nobody
      computed), green builds hiding broken pages, a backlog that lied about
      what was built, and the honest admission that the bottleneck is Dom's
      review capacity, not tokens. Lead spot-checked every factual claim against
      `reports/` before shipping and corrected the run count — the draft said
      "four runs," there are six report files.)_
- [ ] **Pre-launch review** — security-auditor + designer critique; fix
      findings. Then STOP and ask Dom about deployment.

### Dom's directives 2026-07-18 evening (in person, verbatim priorities —
### these outrank the machine-generated items below)

- [x] **DOM-1 — Cast names: every agent gets a real first name.** Lead +
      designer: real, distinct, Dutch/English-pronounceable first names for
      all characters so "personality can grow and everyone can actually
      become a personality inside this devops drama" (Dom). Scope grew to 10
      mid-session when Dom decided the newly hired visual-media agent joins
      the public cast (→ Lucas). Persona bible v2
      (names + pronouns + byline format), `cast.ts` + Cast page + bylines
      updated. The Judge stays deliberately unnamed — it is an independent
      check, not a teammate, and naming it would break that framing. **Gates
      DOM-2 and DOM-3.** _(2026-07-18, team/2026-07-18-cast-names — merged as
      PR #15. **This item was left unchecked for a day after it shipped**; the
      2026-07-19 run found the merge in git history and corrected it. See that
      run's report — the backlog has now misreported its own state twice.)_
- [x] **DOM-2 — Blog format v2: layered, scannable, multi-voice.** Dom:
      "a loooot of text… bullets, visuals, layered information; labels on
      which backlog items got worked on or completed; let multiple team
      members tell the part of the story that's their expertise." designer
      spec first, then frontend-dev: scannable post anatomy (TL;DR block,
      bullets, callouts, pull-quotes), **per-section bylines** (schema change:
      posts need multi-author support — `author` today is one string), and
      **backlog-item chips** on posts ("worked on: Blog engine ✓ completed")
      linking the narrative to the actual backlog. Guardrail: personality and
      banter are free; **events must be real** (never-invent applies to facts,
      not voice).
      _(2026-07-19, team/2026-07-19-blog-format-v2, PR #22 — awaiting Dom.
      Spec (`docs/blog-format-v2.md`) + implementation in one PR so the format
      is reviewable as a rendered page. Six components: TLDRBlock, Callout,
      PullQuote (formalizing the existing blockquote treatment), SectionByline,
      BacklogChip/Row, BylineGroup. **Zero new npm dependencies** —
      `remark-directive` rejected partly because `:::callout` renders as inert
      literal text on GitHub, where these posts also get read during PR review;
      a labeled blockquote degrades legibly everywhere. Multi-author is
      additive: `author: string` stays valid forever, new `authors[]` is
      mutually exclusive via `.refine`, and the LOADER (not the schema) derives
      `post.authors`/`post.author` so every existing consumer is untouched.
      frontend-dev **declined to compose `BacklogChip` on `<Badge>`** — an
      override className after Badge's hardcoded padding relies on Tailwind
      class order, which guarantees nothing, and would have silently shipped
      the undersized tap target the spec warned about. 159 tests green (from
      104). Demo on the 07-18 retrospective post; lead verified every TL;DR
      bullet and all 5 backlog chips against the post's own body — no new
      factual claim introduced. **Caveat: all 159 tests are pure logic; a
      browser pass is still warranted.** DOM-3 is now unblocked.)_
- [x] **DOM-3 — Agent-interaction storytelling.** Dom: "create a story about
      the multiple agents interacting with each other, how they work together
      on tasks." The reports already contain real drama (QA passing a harness
      that measured the wrong thing, browser verification overruling four
      green gates, a hard rule overruling the design brief) — write posts and
      cast-page copy that dramatize REAL events in the named characters'
      voices, with the same event-sourcing discipline as the persona bible.
      Needs DOM-1 (names) and benefits from DOM-2 (multi-voice format).
      _(2026-07-20, team/2026-07-20-dom3-story, PR #28 — awaiting Dom. "Red Is
      Not Self-Justifying": four real catches in four voices (first genuinely
      multi-author post — Project Lead, qa-tester, frontend-dev, designer with
      per-section bylines). Marketer wrote from reports/ only, with a
      claim-by-claim source table the lead verified before landing; the things
      deliberately NOT dramatized (Otto's falsification payoff the report
      never names, the unresolved smoke flake) are listed in the PR. **The
      post immediately proved its own thesis:** the content-validation gate
      failed it with "no author field found" because the gate read only
      `author` while blog-format-v2 made `authors[]` mutually exclusive with
      it — the first real multi-author post was exactly the case the gate
      never covered. Third wrong-gate incident in three days; fixed +
      falsified with a fake cast name in the same PR. Cast-page copy NOT
      included — one reviewable concern per PR; posts can carry DOM-3 forward
      as more events accumulate.)_
- [ ] **DOM-4 — Project visuals: screenshots + short animations.** Dom: the
      project pages are "a wall of text… create screenshots, but preferably
      short animations — that's what works best in the market." Market
      research agrees: short walkthrough video/GIF measurably outperforms
      static screenshots for engagement (hybrid approach — motion first,
      annotated stills as support; techtimes.com 2026 tech-portfolio guide,
      influenceflow.io case-study guide). Pipeline: run each project locally
      (launch.json configs exist for portfolio, chart-token-playground,
      travel-planner, token-impact-mapper, sollie-process-presentation +
      SoulForge), capture screenshots + screen-recorded GIFs of core flows,
      store under `public/images/projects/<slug>/`, render cover + media
      gallery on ProjectCard/ProjectDetail. **Supersedes the old "Cover
      images" item.** PizzaParty/MensApp/LoveDiary need their dev servers
      checked first.
      _(**PARTIAL — stays open.** Capture: 2026-07-18, PRs #14/#18, 6 assets
      for 2 of 6 projects. Rendering: 2026-07-19,
      team/2026-07-19-project-media-rendering, PR #21 — awaiting Dom. `cover`
      finally wired after being dead in the schema since the scaffold; new
      `media` gallery, animations first per Dom's directive. QA found **an
      autoplaying GIF hiding under a "Play" button** (`poster` was optional for
      `kind: 'animation'` while the renderer falls back to `src`) — a landmine
      for the 4 projects still awaiting assets, now schema-enforced. Lead review
      found **focus dropped to `<body>`** when the play button unmounted on
      click; fixed with a persistent Play⇄Stop toggle, which also closed an
      unnamed gap — there was no way to STOP a GIF on a feature whose whole
      premise is invited motion. Captions verified byte-for-byte against
      CAPTIONS.md and posters verified pixel-by-pixel against ffmpeg frame 0.
      **Still outstanding: capture for SoulForge, PizzaParty, MensApp,
      LoveDiary** — the latter three need their dev servers checked first.)_
- [x] **DOM-5 — Hire a visual-media agent.** Dom: "if we need a new
      visual-design agent, you have all freedom to hire one on your own —
      document this process." Decision: yes — no existing agent has browser/
      capture tools (frontend-dev, designer et al. are code/spec agents;
      every browser verification so far has been done by the lead by hand,
      and DOM-4 is exactly this skill set). Write the agent definition,
      vendor a copy in-repo, announce the hire in a report + logbook post
      (the hire itself is a real studio event — good DOM-3 material).
      _(2026-07-18, team/2026-07-18-visual-media-hire — merged as PR #13; the
      announcement post shipped as PR #16. Lucas found a real sticky-nav bug in
      Dom's own portfolio while shooting it on night one. Also left unchecked
      for a day after shipping; corrected by the 2026-07-19 run.)_

### Added 2026-07-18 (impact-ranked; slot above "Pre-launch review")

- [x] **HIGH — Browser-level smoke test in CI.** devops + qa-tester: add a
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
      flagged the same coverage gap. **Scope raised 2026-07-18 evening: the
      check must ALSO run against the deployed URL (Vercel preview), not only
      a local server.** The same day a 4th browser-only bug shipped: every
      route except `/` returned 404 in production (SPA with no rewrite rule,
      `vercel.json` added in PR #9) while localhost worked perfectly, because
      Vite's dev server does the SPA fallback silently. A local-only smoke
      test would have stayed green through it._
      _(2026-07-19, team/2026-07-19-ci-gates, PR #20 — awaiting Dom. Real mount
      under StrictMode in jsdom (NOT `renderToStaticMarkup`, which by
      construction cannot reproduce a double-invoke bug), 16 route cases = all
      5 static + all 6 projects + all 5 posts. devops proved it by
      reintroducing the exact 07-18 `Markdown.tsx` bug and watching it fail.
      **The lead's review then caught a second gap: v1 tested
      `getAllPosts()[0]` only — 1 of 11 content routes — and a dead anchor
      planted in a different post passed 7/7 green.** Fixed to full coverage,
      re-falsified. Deployed-URL check ships as a separate non-required job
      that skips visibly when no URL is set. Screenshot-diff (the 07-15 token
      collision / 07-17 mobile-order class) deliberately NOT added — real
      ongoing cost, named rather than implied away.)_
- [x] **HIGH — Content-validation gate in CI.** qa-tester: a build-time check
      over `content/` frontmatter — post `date` must match the filename's
      `YYYY-MM-DD` prefix; slugs unique; no two posts sharing a `date` (forces
      an explicit decision instead of an arbitrary sort tie-break deciding
      public reading order); summaries ≤200 chars; `author` resolves to a cast
      member or "Dom". _Source: 2026-07-18 evening — Dom caught the blog
      rendering in the wrong order live. Root cause was a date decision, plus
      a filename/date mismatch and a two-posts-one-date tie no gate flagged.
      Dom asked "do we need a database as fallback?" — answer: no, git already
      keeps every version of every post (the deleted placeholder was recovered
      from history the same day as proof), and a database would store a wrong
      date just as faithfully while moving posts out of PR review. The fix for
      decision-level mistakes is a gate at decision time, which is this item._
      _(2026-07-19, team/2026-07-19-ci-gates, merged as PR #20, grouped with
      the smoke test because both edit `ci.yml`. Shipped deliberately RED on
      one rule — and **that rule turned out to be wrong.** It forbade two posts
      sharing a date; Dom corrected it the same day, and it also contradicted
      the standing "multiple posts per day are fine" policy. Escalating rather
      than silently rewriting his content was still the right call — it put the
      question in front of the one person who could see the rule was
      mis-specified. Rule replaced in
      team/2026-07-19-same-day-post-order; see that item.
      **Lesson: a gate that fails should be suspected as hard as the content it
      fails on.**)_
- [x] **HIGH — Provenance content model.** architect: design real frontmatter
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
      _(2026-07-19, team/2026-07-19-provenance-model, PR #19 — **SPEC ONLY**,
      awaiting Dom; `docs/provenance-model.md`. Recommends DERIVING provenance
      from a structured `yaml provenance` block in `reports/` joined with
      `git log`, over hand-authored frontmatter. The argument is
      falsifiability: with frontmatter the value asserted and the value
      displayed are the same string, so no gate can ever contradict it —
      exactly the failure the Judge already caught here once. Prose parsing
      rejected outright because `reports/2026-07-18.md` contains
      `qa-tester passed it **88/100**`, which any regex loose enough to catch
      the four real Judge-verdict formats would misattribute to the Judge on
      the site's most prominent honesty device. Zero new frontmatter fields;
      7 PR-sized items in dependency order. **Implementation NOT started.**
      Two posts will render "no run record" permanently — verified by grep
      that neither is named in any report. Flags a deploy blocker: the
      generator needs full git history and `ci.yml` sets no `fetch-depth`
      while Vercel shallow-clones.)_
- [x] **MEDIUM — `MarginNote` component.** designer → frontend-dev: the design
      brief specifies margin notes on project detail and blog post (desktop:
      anchored into the rail at their true vertical position; mobile: inline
      sticky-note blocks under their anchor paragraph, per §9 never hidden).
      _Source: design-brief §5 + §6 component inventory. The component does not
      exist anywhere in `src/` — flagged by frontend-dev during the blog-engine
      pass as a whole undelivered piece of the design system, not a blog gap._
      _(2026-07-21, team/2026-07-21-margin-note, PR #33 — awaiting Dom. Designer
      spec first, which surfaced that **project-detail no longer has a rail**
      (project-page-v2 replaced §5's 68/32 split with a single centered column),
      so the desktop lane primarily serves blog posts. **Shipped the spec's
      sanctioned inline-everywhere v1**, not the anchored desktop lane: the lane
      needs portal + `ResizeObserver` + collision math off `getBoundingClientRect`,
      and jsdom (the repo's only test env) returns all-zero rects, so a test of
      that math would be fake-green — shipping unfalsifiable measurement code
      fails the bar. Inline v1 is fully §9-compliant, authored like `Callout`
      (no new syntax), zero layout changes, zero new deps. Falsified the §5/§9
      reading-order invariant (red→green). 253 unit + 7 component tests green.
      Desktop anchored lane logged as a fast-follow below.)_
- [ ] **MEDIUM — `MarginNote` desktop anchored lane (fast-follow).** The
      inline-everywhere v1 shipped 2026-07-21; the design-brief §5/§6 desktop
      treatment — notes anchored into a dedicated non-sticky lane at their true
      vertical position, connector SVG reused from `BuildTimeline`
      (`DesktopPhaseCaption`) — is deferred because its position/collision math
      can't be honestly tested under jsdom. `MarginNoteProps` (`{children, name}`)
      does not need to change to add it. Needs either a real-browser test
      (Playwright on `dist/`, i.e. the deployed-smoke lane from PR #20) or a
      deliberate decision to ship it review-only. Sequence after a real page
      actually authors a `Margin note —` so there's something to anchor.
      _Source: 2026-07-21 run; designer spec §2/§6 + frontend-dev implementation
      note._
- [ ] ~~**MEDIUM — Cover images for projects and posts.**~~ **SUPERSEDED by
      DOM-4** (2026-07-18 evening) — covers become the still-frame subset of
      the full visuals pipeline. Original text kept for context: `cover` is already in
      both frontmatter schemas (spec §3.1/§3.2), is rendered by nothing, and is
      set by no content file — all 6 projects show "no cover yet" placeholders.
      Decide whether to source real images or drop the field. _Source: named
      product gap; flagged in reports/2026-07-17.md and again by frontend-dev
      this run._
- [x] **MEDIUM — RSS/Atom feed + `sitemap.xml`.** The site is a blog with no
      feed and no sitemap. _Source: Google Search Central recommends sites use
      **both** — a sitemap to describe the full URL set and an RSS/Atom feed to
      describe recent changes — for optimal crawling
      (developers.google.com/search/blog/2014/10/best-practices-for-xml-sitemaps-rssatom).
      Both are cheap to generate at build time from the existing loader, and a
      feed is table stakes for a developer logbook that wants readers._
      _(2026-07-20, team/2026-07-20-feed-sitemap, PR #29 — awaiting Dom.
      `npm run build` now emits `dist/sitemap.xml` + `dist/feed.xml` (RSS 2.0)
      and appends the Sitemap directive to robots.txt. Zero new deps — the
      generator runs the REAL content loader via Vite's own `ssrLoadModule`
      instead of adding tsx/ts-node, so sort rules and draft semantics can
      never drift from the site's. frontend-dev verified empirically that
      `import.meta.env.PROD` is false under ssrLoadModule and therefore
      passes `isProd: true` explicitly — proven with a synthetic draft probe
      post, not assumed. 23 new unit tests; lead independently rebuilt and
      xmllint-verified both artifacts (15 URLs / 5 items). Open question for
      Dom in the PR: `/feed.xml` vs `/rss.xml`.)_
- [ ] **LOW — Non-ASCII heading slugs collapse.** `slugifyHeading` strips
      non-Latin characters entirely (`Über café ñ 中文标题` → `ber-caf`), so two
      headings differing only in non-Latin content collide before de-dup runs.
      Not a live bug — TOC and DOM agree, and no current post has such a
      heading — and ASCII-only URLs may well be intentional. _Source:
      qa-tester, blog-engine pass. Logged so the decision is explicit._

### Added 2026-07-19 (impact-ranked; slot above "Pre-launch review")

- [x] **HIGH — `liveUrl` is set by zero projects (and 2 of 6 have no `repo`).**
      `liveUrl` is in the schema AND rendered in two places in
      `ProjectDetail.tsx` — and no project file sets it, so the markup is
      permanently dead. `portfolio` and `chart-token-playground` also have no
      `repo`. Decide per project: real URL, or drop the affordance. **Check
      first whether each repo is actually public — a 404 link is worse than no
      link**, and several of these may be private. _Source: named product gap
      found by the lead 2026-07-19 while auditing the schema; this is the exact
      same "brief-specified element quietly rendering nothing" pattern as
      `cover` (dead from the scaffold until DOM-4 this run) and the provenance
      strip. Market research backs the priority: live deployments a reader can
      click are repeatedly cited as the highest-signal portfolio element
      (hyperskill.org "Building a Developer Portfolio in 2026: What Actually
      Gets Attention"; techtimes.com 2026 tech-portfolio guide)._
      _(2026-07-20, team/2026-07-20-live-urls, PR #27 — awaiting Dom. The
      caveat WAS the live state: pizzaparty/mensapp/lovediary repos are
      PRIVATE, so three of six project pages were shipping "Repository →"
      links that 404 for every logged-out reader — invisible to Dom precisely
      because he's always logged in. All three have working Vercel
      deployments (200 + page titles verified as the real apps), so each dead
      repo link became a live demo link. soulforge is genuinely public and
      keeps its repo link; portfolio/chart-token-playground keep nothing.
      Open decision flagged to Dom: making the three repos public restores
      both links — a three-line revert. Bonus finding: studio-site itself is
      live at doms-ai-studio.vercel.app, which the deployed-smoke job from
      PR #20 was built for — see the new SMOKE_URL item below.)_
- [x] **MEDIUM — Component-level test infrastructure is missing repo-wide.**
      `vitest.config.ts` restricts `include` to `src/**/*.test.ts`, so a
      `.tsx` test would not even run, and there is no jsdom. Every "N tests
      green" figure this project has ever reported is pure logic/schema
      coverage with **zero evidence about rendered DOM, clicks, or focus**.
      PR #20 adds `jsdom` + `@testing-library/react` for the smoke suite —
      this item is to widen the include pattern and backfill interaction tests
      for the components that need them. **First customer: the DOM-4 play/stop
      control (PR #21), whose focus-retention fix currently rests on React
      reconciliation semantics and code review, not a passing assertion.**
      _Source: qa-tester flagged the gap during the DOM-4 review and could not
      close it; frontend-dev independently confirmed it. Sequence AFTER #20 and
      #21 merge._
      _(2026-07-21, team/2026-07-21-component-test-infra, PR #32 — awaiting Dom.
      New `vitest.component.config.ts` (jsdom + React plugin, `src/**/*.test.tsx`,
      reuses `src/smoke/setup.ts`) + `test:component` script + a CI step; **zero
      new deps** (jsdom/testing-library already present). First real interaction
      test — `MediaGallery.test.tsx`, 6 tests — targets exactly the DOM-4
      play/stop focus fix. **Falsified:** keying the button to force
      unmount/remount turned the focus-retention assertion RED with
      `document.activeElement === BODY` — the precise 07-19 bug — green when
      reverted. Lead independently re-ran → 6/6. Gates: 241 unit + 24 smoke + 6
      component + 24 content, build + lint clean.)_
- [ ] **MEDIUM — Performance budget for the now-image-heavy project pages.**
      DOM-4 puts GIFs and PNGs on pages that were previously text-only, which
      changes this site's performance profile for the first time. Define and
      check a budget (LCP <2.5s, CLS <0.1, INP <200ms; a page-weight ceiling).
      The groundwork is already in place — click-to-play means no GIF can be
      the LCP element, dimensions are declared on every image, and `dist/`
      output is small — so this is measurement and a guardrail, not
      optimization work. _Source: 2026-07-19 run. Deliberately scoped small:
      the deployed-URL check from PR #20 is the natural place to hang it, and
      no measurement has ever been taken for this site. Thresholds per
      Google's Core Web Vitals (developers.google.com/search/docs/appearance/
      core-web-vitals); INP is the most-failed metric on the 2026 web, which is
      an argument for measuring rather than assuming._
- [x] **HIGH — Same-day post ordering: the gate rule was wrong, not the
      content.** The content-validation gate shipped with a rule "no two posts
      may share a date." **Dom corrected it the same day:** _"one of the checks
      gave an error because 2 blog posts had the same date. but this IS
      possible on days we worked more than usual."_ He is right, and the rule
      also contradicted a standing studio policy already recorded on
      2026-07-18 — _"multiple posts per day are fine for significant events."_
      The rule punished exactly the productive days it should celebrate.
      The real defect was never the shared date: `sortPosts` sorted on date
      alone, so same-date posts fell back to `import.meta.glob` order —
      **public reading order was being decided by filename spelling.** Fix:
      optional `order` frontmatter, a fully deterministic
      date→order→slug sort, and the gate rule rewritten to "same-date posts
      must each declare a distinct `order`." Sharing a date is legal; leaving
      the resulting order to chance is not. `order` set on the two 07-18 posts
      from real git chronology (green-checkmarks added 10:34, hire post 21:35).
      _(2026-07-19, team/2026-07-19-same-day-post-order.)_

- [ ] **MEDIUM — The route smoke suite failed once and could not be
      reproduced.** Immediately after PRs #20/#22/#24 landed on `main`, a
      health check of the merged tree returned `1 failed | 15 passed (16)` from
      `npm run test:smoke`. Seven subsequent runs — five standalone, two
      replaying the exact command sequence — all returned 16/16, and the
      failure output was not captured before it vanished. **Logged deliberately
      rather than dismissed:** a gate that fails once without explanation is
      either a real intermittent bug (plausible — these are async
      `withSuspense` route mounts in jsdom, and a missing `await`/`findBy`
      somewhere would look exactly like this) or a flaky gate. Both are worth
      fixing, because the second one is arguably worse: a gate people learn to
      re-run until it's green stops being a gate. Next step is not to hunt it
      blind — it is to make failures capturable (retain vitest output in CI,
      consider `--retry=0` plus an explicit repeat run) so the next occurrence
      is diagnosable. _Source: lead health check of `main`, 2026-07-19._

### Added 2026-07-20 (impact-ranked; slot above "Pre-launch review")

- [ ] **HIGH — Set the `SMOKE_URL` repo variable so `deployed-smoke` checks
      something.** The deployed-URL smoke job from PR #20 is wired correctly
      (`vars.SMOKE_URL` → `scripts/check-deployed-routes.mjs`) but the
      variable has never been set, so every run since has printed "SKIPPED —
      no deployed URL supplied" and gone green in 7 seconds. The site IS
      deployed — https://doms-ai-studio.vercel.app confirmed live 2026-07-20 —
      so the gate's designed skip path has silently become its permanent
      behavior. One-time Dom action, no PR:
      `gh variable set SMOKE_URL --body "https://doms-ai-studio.vercel.app"`
      (or repo Settings → Variables). _Source: 2026-07-20 run — found while
      confirming CI on PR #26; the skip prints loudly in the log but nothing
      surfaces it on the PR checks screen, which is exactly the
      "green-but-covering-nothing" pattern PR #20 itself was built to end._
- [x] **MEDIUM — Backfill the missing 2026-07-19 evening run record.** PR #25
      (project page v2 — six commits, a full redesign, shipped and merged
      same-day) has no `reports/` entry; the 07-19 report predates it. The
      session also left its logbook post UNCOMMITTED in the working tree
      (landed by PR #26) and a second unfinished worktree
      (`team/2026-07-20-fix-post-count`, zero commits — but holding an
      UNCOMMITTED pin-by-slug fix for the same brittle assertion PR #26
      fixes; left in place in case that session is still live). Consequence,
      stated in PR #26 rather than smoothed over: the post's precise figures
      (37px/18px overlaps, the 51px/224px argument) currently trace to the
      session's own account, not to a run record. Reconstruct what's
      reconstructable from git + the PR #25 body, and say plainly what isn't.
      _Source: 2026-07-20 run reconciliation; PROJECT-BRIEF hard rule "every
      run ends with a report in reports/"._
      _(2026-07-21, team/2026-07-21-backlog-and-report — `reports/2026-07-19-evening.md`,
      every figure tagged git / PR-claim / not-reconstructable. Doing it
      mechanically against `main...<branchtip>` rather than trusting the PR list
      **surfaced a new finding neither the 07-20 report nor this backlog knew:**
      after PR #25's true-merge point (`47ef724`, 14:05 CEST) SIX further commits
      (14:49–15:36) were never merged — a whole "team rebuild model" feature
      (`buildMode`, +1264/−119, 11 files, a 459-line `docs/team-rebuild-model.md`),
      absent from `main`. Logged as its own item below.)_
- [ ] **MEDIUM — Post-merge integration check for same-file test edits.**
      PRs #26 and #28 carry an intentionally identical `index.test.ts` hunk
      (both needed it to stay independently green; identical-content merges
      are clean). Harmless here, but the pattern "two open PRs edit the same
      test file" now has a precedent, and `main` after both merge should get
      one full-gate run. Cheap: it's what the post-merge health check already
      does — this item just says to keep doing it and to watch that file.
      _Source: 2026-07-20 run, lead decision log._

### Added 2026-07-21 (impact-ranked; slot above "Pre-launch review")

- [ ] **HIGH — Unmerged feature tail stranded on `team/2026-07-19-project-page-v2`
      (`buildMode` / "team rebuild model").** Found by the 2026-07-21 backfill
      doing git archaeology (`main...<branchtip>`), not visible from the PR list.
      PR #25 was a **true merge at commit `47ef724`** (2026-07-19 14:05 CEST);
      **six later commits (14:49–15:36) were never merged and are absent from
      `main`:** `+1264/−119` across 11 files — a new `src/content/buildMode.ts`,
      a 459-line `docs/team-rebuild-model.md`, `schemas.ts` additions, and
      changes to `BuildTimeline`, `ProjectCard`, `ProjectsIndex`, `loader.ts`,
      `timeline.ts` with new tests. Two of the six are literally
      "Supersede… model," so this may be a **deliberately abandoned design
      direction** OR unfinished-but-wanted work — **[not reconstructable] from
      git; Dom's call.** Options: (a) rebase/cherry-pick the tail onto a fresh
      branch, review it, finish + merge; (b) decide it's superseded and delete
      the branch (its leftover worktree still sits at `26c0d1c`). Either way the
      branch should not keep silently holding tested, documented, unmerged
      feature work. _Source: reports/2026-07-19-evening.md, 2026-07-21 run._
- [ ] **LOW — Worktree isolation is wired to the wrong repo for studio-site
      runs.** Two frontend-dev agents this run were launched with
      `isolation: worktree` into a worktree of the **SoulForge game repo**
      (this session's primary cwd), not studio-site — no studio-site files
      present. Both detected it and hand-created a correct worktree under
      `/Users/doom/Documents/VibeCodeProjects/studio-site/.claude/worktrees/`,
      so no harm, but it wastes a recovery step every spawn and is a trap for a
      less careful agent. Whatever sets the worktree base for these runs should
      point at studio-site. _Source: frontend-dev env note, 2026-07-21 run._

Add new items to this list (bottom, or prioritized with a note) when run
reports surface work worth doing — but never reorder Dom's edits.

## Run report format (`reports/YYYY-MM-DD.md`)

- **Item worked on** and branch name
- **What was done** — agents deployed, output summary
- **Decisions made** and why
- **For Dom to review** — the branch, plus any open questions
- **Learnings** — anything blog-worthy: surprises, failures, costs, wins
