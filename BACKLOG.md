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
- [x] **QA pass** — qa-tester: all states, responsive, accessibility;
      fix findings.
      _(**Closed 2026-08-01 by enumeration, not by assertion** — the LOW item
      "The 'QA pass' item at the top of this file is stale" asked for exactly
      this: name what it still means that no gate covers, or check it off
      citing the gates that closed it. Each of its three clauses now has a
      gate that runs on every PR: **responsive** — the Playwright lane at
      375/768/1280 (PR #53), plus `e2e/overflow.spec.ts` and
      `e2e/reading-order.spec.ts`; **accessibility** — axe-core against
      Header/BlogPost/ProjectDetail/Home (PR #43) and real-browser
      colour-contrast (PR #53), which found and fixed a genuine AA failure
      (PR #57); **all states** — the route smoke suite mounts every route and
      asserts one `<h1>`, resolvable internal hrefs and zero console errors
      (PR #20), with component-level interaction tests behind it (PR #32,
      #43). Add the content-validation gate (PR #36) and the performance
      budget (PR #73) and the original scope is covered. **The honest
      residue, stated rather than buried:** this closes the item as
      *specified*, not as *"nothing can be wrong"* — five browser-only
      defects have shipped past full-green CI in this project's history, four
      of them found by a human opening a page. What no gate here does is look
      at a page and judge whether it is any **good**; that is the still-open
      "Pre-launch review" item below and the designer's job, not this one's.
      Closing a permanently-open vague item is the point — three separate
      incidents of this backlog misreporting its own state make a
      never-closing checkbox a liability, not a safety net.)_
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
      _(**CAPTURE COMPLETE 2026-07-23**, team/2026-07-23-dom4-capture, PR #45
      — awaiting Dom. 19 assets, motion-first. The dev-server framing was the
      three-run blocker and turned out unnecessary: pizzaparty/mensapp/
      lovediary were shot from their live Vercel deployments; only SoulForge
      ran locally (existing branch, never switched). MensApp is username+PIN
      gated → ships its login gate as the honest visual; **open question for
      Dom: test credentials for a real flow capture, or keep the gate?**
      Posters lead-verified pixel-wise as GIF frame 0. Lucas's found-while-
      shooting bugs (LoveDiary black story slide, SoulForge input quirks,
      stale soulforge-static launch config) are in the run report — other
      repos' bugs, not backlog items here.)_
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
- [x] **LOW — Non-ASCII heading slugs collapse.** `slugifyHeading` strips
      non-Latin characters entirely (`Über café ñ 中文标题` → `ber-caf`), so two
      headings differing only in non-Latin content collide before de-dup runs.
      Not a live bug — TOC and DOM agree, and no current post has such a
      heading — and ASCII-only URLs may well be intentional. _Source:
      qa-tester, blog-engine pass. Logged so the decision is explicit._
      _(2026-07-29, team/2026-07-29-links-docs, PR #71 — awaiting Dom.
      **Decision: leave as-is, document + pin.** The item asked for an explicit
      decision, not necessarily a fix, and the evidence supports leaving it:
      ASCII-only URLs match the site's existing slug convention for post/project
      frontmatter, and `grep -P` confirms no current post has a non-ASCII H2, so
      it is genuinely dormant. The stripping is now documented as deliberate in
      `src/content/toc.ts` and pinned by tests that (a) pin the exact collapse
      `Über café ñ 中文标题` → `ber-caf` and the all-non-Latin empty case, (b)
      PROVE the de-dup safety net actually rescues two different-script headings
      that collapse to the same base id (`section` / `section-1`), and (c)
      assert `extractTableOfContents` and `headingIdsByLine` never drift on this
      case — the exact parity the 2026-07-18 dead-anchor P0 broke.)_

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
- [x] **MEDIUM — Performance budget for the now-image-heavy project pages.**
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
      _(2026-07-29, team/2026-07-29-perf-budget, PR #73 — awaiting Dom.
      `e2e/perf-budget.spec.ts` (19 tests) + `docs/performance-budget.md`; no
      product code touched, so the numbers describe `main` as it stands.
      **The first measurement immediately found a site-wide failure this item
      had mis-scoped: CLS ≈ 0.39 on EVERY route — 4× the 0.1 Core Web Vitals
      threshold — and it is not the images.** The text-only blog control
      measures the same magnitude, and the figure is identical under
      `reducedMotion: 'reduce'`. Root cause is `src/lib/withSuspense.tsx`'s
      `RouteFallback` (a `py-24` "Loading…" box): every route is lazy, so
      `scrollHeight` jumps 800px→5096px when the real chunk resolves and shoves
      the already-painted footer down. User-affecting for real traffic, not just
      SPA transitions — the fallback paints on the FIRST load of any deep-linked
      URL, which is how most search/social visitors arrive. So the item's own
      premise ("the groundwork is already in place… this is measurement and a
      guardrail, not optimization work") was right about the images and wrong
      about the site: the guardrail found something the reasoning had ruled out.
      Tracked in `KNOWN_CLS_VIOLATIONS` with a delete-on-fix (not renumber)
      instruction per the PR #57 precedent; the FIX is a separate item below.
      Thresholds set from measured reality with ~20% headroom (a budget born
      failing gets disabled); CLS asserted against the real 0.1, not raised to
      hide the finding. **INP deliberately NOT asserted** — it is a field
      metric; a labeled synthetic click proxy is measured at a 300ms gross-stall
      ceiling and never called INP. Every assertion falsified red→green — and
      **one falsification failed to fail, and is reported rather than buried**:
      stripping `width`/`height` from `MediaGallery` items changed CLS by zero,
      because those images are `loading="lazy"` below the fold and never fetched
      inside the measurement window. Logged as a named coverage gap, not left as
      false protection. Lead independently re-ran the spec: 19/19 in 17.4s.)_
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

- [x] **MEDIUM — The route smoke suite failed once and could not be
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
      _(2026-07-29, team/2026-07-29-ci-hardening, PR #73's sibling PR #70 —
      awaiting Dom. Took this item's OWN prescribed next step rather than
      hunting blind. Checked first: `vitest.smoke.config.ts` sets no
      `test.retry`, so nothing was silently masking a flake — `--retry=0` is now
      spelled out in `ci.yml` anyway so a future edit can't reintroduce masking
      invisibly. The smoke step now writes full per-test JSON (failing
      assertion, stack, timing) on every run, and uploads it as a CI artifact
      when smoke fails. **Lead review caught a defect in the first cut:** the
      upload used a bare `if: failure()`, which fires on ANY earlier step
      failure (lint/typecheck/audit) — runs where smoke never executed — so CI
      would have published an EMPTY artifact named `smoke-test-results`. That is
      worse than none: an artifact that shows up empty on unrelated failures is
      exactly how people learn to ignore it, which is this item's own argument
      about gates. Scoped to `steps.smoke.conclusion` with
      `if-no-files-found: error`.)_

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
      _(Workaround proven 2026-07-24: the lead hand-created five worktrees under
      the scratchpad with `git worktree add` + a symlinked `node_modules` and
      ran five agents fully in parallel with zero branch collisions. Worth
      making the default rather than a per-run improvisation. One wrinkle found:
      an agent that runs `npm install` gets its symlink **replaced** by a real
      local `node_modules` — safer than a shared write, but it means a
      dependency-adding lane silently stops sharing the cache.)_

- [ ] **MEDIUM — Two scheduled tasks share one working checkout and can collide.**
      During the 2026-07-24 run, `studio-site-build` found the main checkout at
      `/Users/doom/Documents/VibeCodeProjects/studio-site` sitting on
      `team/2026-07-23-logbook` with a fresh commit — the `daily-logbook` task
      was running **concurrently in the same checkout**, and PR numbering
      interleaved (#47, #49 came from that session while this one opened #48,
      #50–#53). No damage this time only because the build run had already
      moved all its work into separate worktrees. But `git checkout` in one
      session while the other is mid-build is a real corruption/false-verify
      hazard, and the two tasks' schedules are not coordinated. Fix options:
      give each scheduled task its own worktree by default (see the item
      above), or serialize the two schedules, or have each task assert the
      checkout is on a branch it owns before touching it. _Source: Project Lead,
      2026-07-24 run — observed, not hypothetical._

- [x] **LOW — `npm install` drift between `package.json` and the local
      `node_modules`.** PR #43 added `axe-core` to devDependencies and merged,
      but nobody ran `npm install` in the main checkout — so on 2026-07-24
      `npm run build` and `npm run typecheck` failed repo-wide with
      `Cannot find module 'axe-core'` across four `.test.tsx` files, and the
      first agent to hit it lost time proving the breakage pre-existed its own
      branch. CI is unaffected (it runs `npm ci`), so this is a local-only
      trap that CI structurally cannot catch — which is exactly why it went
      unnoticed for a day. Cheap fix: a `postmerge`/`post-checkout` git hook,
      or a preflight check in the run playbook that diffs `package.json`
      against installed packages before any agent is dispatched. _Source:
      devops + Project Lead, 2026-07-24 run._
      _(2026-08-01, team/2026-08-01-dep-drift-preflight, PR #86 — awaiting
      Dom. `scripts/check-deps-drift.mjs`, dependency-free, 0.22s on the real
      33-dep tree, reporting **three** states — `clean`/`drift`/
      **`inconclusive`** — so a missing `node_modules` can never be reported
      as fine. A fourth green-but-checking-nothing gate was not worth adding.
      Fires from committed `.githooks/{post-checkout,post-merge}` wired via
      `core.hooksPath` (chosen because `.git/hooks/` does not propagate to a
      `git worktree`, which this project uses constantly), non-blocking by
      design. Worktree-aware: on drift it resolves a symlinked `node_modules`
      and points the fix at the real target, since `npm install` inside a
      worktree replaces the symlink and silently stops sharing the cache —
      the hazard already logged two items above. **Lead review caught the
      prepare script clobbering an existing `core.hooksPath`** (it would have
      disabled an unrelated husky/lefthook setup as a side effect of `npm
      install`); it now refuses and reports, falsified across all three
      starting states. **Note for Dom: merging this makes `npm install` set
      repo-local git config** — deliberate, but a conscious call.)_

### Critical review findings (2026-07-21) — whole team + Judge

Full record in `reports/2026-07-21-review.md`. Impact-ranked; several shipped
same-day (marked). Theme: **declared-but-not-delivered** — an honesty-branded
site whose provenance device is still decorative.

- [x] **P0 — Hero overclaim (provenance).** Hero promised "a real reviewer and a
      real commit hash"; pages ship only a byline. _(Fixed 2026-07-21, PR #37 —
      copy softened to the truth; the rich claim returns when the provenance
      model ships.)_
- [x] **P0 — No favicon / OG image / social meta.** Every shared link unfurls
      blank; `Seo.tsx` has no `og:image`/`twitter:card`/`canonical`; SEO meta is
      CSR-only so unfurl bots see nothing. _(2026-07-21,
      team/2026-07-21-seo-social — **merged same day as PR #39**; this checkbox
      lagged two days behind the merge and was healed by the 2026-07-23
      reconciliation. Third backlog-misreports-its-own-state incident.)_
- [x] **P0 — No next step / conversion path.** No contact, email, CTA, or "who
      is Dom" anywhere — an engaged reader is a 100% leak. Even an honest
      "experiment log, here's Dom's real portfolio/LinkedIn" exit closes it.
      _Source: marketer._
      _(2026-07-24, team/2026-07-24-conversion-path, PR #50 — awaiting Dom.
      **The last open P0 on the board.** marketer spec'd it, frontend-dev
      built it. Decision: a single "WHO'S BEHIND THIS" block in `Footer.tsx`,
      NOT a new `/about` route — `RootLayout` mounts the footer globally, so
      one component edit closes the leak at every disengagement point (end of
      a post, end of a project page, everywhere), and `docs/spec.md` §2's
      deferral of `/about` to "phase 2" stays intact. Ships with GitHub as the
      sole CTA; `DOM_PORTFOLIO_URL`/`DOM_LINKEDIN_URL`/`DOM_EMAIL` exist as
      genuinely EMPTY constants (not placeholder domains) with a comment
      telling future contributors not to fill them in — every optional element
      gates on non-empty, so wiring one up later is a one-line edit. No
      `mailto:` ships. 13 tests, 6 falsified red first; axe clean; eyebrow is
      a `<p>` not an `<h2>` so it doesn't inject a stray heading into every
      page's outline. **The dev overrode its own brief and was right**: the
      brief said "the ten AI characters", but persona-bible §35 and
      design-brief §155/§236 bind the numeral "10 AI characters" and
      design-brief §7 names the footer specifically — lead verified against
      both docs. **Three open Dom decisions, none blocking**: supply a
      portfolio URL? supply LinkedIn? approve publishing an email — which is
      two gates, not one, since having the address on file is separate from
      consenting to publish it.)_
- [x] **P1 — Security headers / CSP in `vercel.json`.** Spec §46 mandates CSP +
      HSTS + `X-Frame-Options` + `nosniff` + `Referrer-Policy`; none ship. No
      live exploit (static, no-auth — Judge downgraded from P0), but it's a
      spec-required control. **The CSP MUST hash/nonce the inline theme-bootstrap
      script in `index.html` or dark-mode-before-paint breaks.** _Source:
      devops/security/architect._
      _(2026-07-23, team/2026-07-23-security-headers, PR #42 — awaiting Dom.
      All six headers; inline script sha256-hashed with a 9-test build-time
      hash guard in default `npm test` (drift = red CI, not a silent prod
      theme break). `font-src data:` derived from evidence — Vite inlines
      small @fontsource subsets into built CSS. HSTS deliberately without
      `preload` (irreversible; Dom's call). security-auditor PASS, 4 P2
      notes. **Merge requires the preview-deploy header check in the PR
      body** — vercel.json headers are unverifiable on the Vite dev server.)_
- [x] **P1 — Content-validation gate was non-blocking.** A non-required CI job
      that green-passed but gated nothing (a content PR could auto-merge without
      it). _(Fixed 2026-07-21, PR #36 — promoted into the required `build` job;
      stale "currently RED" comment removed, gate is green.)_
- [x] **P1 — `sortProjects`/`isoDate` data bugs.** _(Fixed 2026-07-21, PR #36 —
      slug tie-break + regression test; canonical `YYYY-MM-DD`.)_ The third
      backend item — a **draft-exclusion / feed-generator regression test**
      (currently a one-time manual proof) — remains open (P1).
      _(**CLOSED 2026-07-30**, team/2026-07-30-seo-loader-contract, PR #77 —
      fell out of the SEO loader-contract work rather than needing its own run.
      Draft exclusion is now asserted end-to-end twice: once through injected
      real modules and once through a **real Vite SSR boot**, which is the
      configuration that actually matters, because `import.meta.env.PROD` is
      empirically false under `ssrLoadModule` and the generator therefore has to
      pass `isProd: true` explicitly. Lead independently falsified it — flipping
      `filterVisiblePosts(normalizedPosts, true)` to `false` turns BOTH tests
      red with `expected ['a-draft','published'] to deeply equal ['published']`,
      green on restore with an empty diff. The one-time manual proof is now a
      standing gate.)_
- [x] **P1 — Blog index missing cast avatars.** _(Fixed 2026-07-21, PR #37 —
      cast avatar stamp + name, honest `+N` for multi-author.)_
- [x] **P1 — Interaction-test backfill (extends component-test infra).** Zero
      interaction coverage on: `Header` mobile drawer + `useFocusTrap` (a binding
      §9 a11y mechanism), `ThemeToggle`, `ShareRow` clipboard (never clicked by
      any test), `BylineGroup`/`joinNames` overflow (live in the 4-author post).
      Also a dead `triggerRef` in `Header.tsx` a test would force resolving.
      _Source: qa + frontend-dev._
      _(2026-07-23, team/2026-07-23-test-hardening, PR #43 — awaiting Dom,
      grouped with the axe item below. 5 new component-test files, all
      falsified red→green. **The dead `triggerRef` was hiding a real bug**:
      mouse clicks don't reliably focus the clicked button (jsdom + Safari),
      so a mouse-opened drawer returned focus to `<body>` on close — fixed by
      wiring `triggerRef` through `useFocusTrap` as the definitive return
      target, exactly the resolution this item predicted a test would force.)_
- [x] **P1 — Automated a11y tooling.** No `axe`/`vitest-axe` anywhere; §9 is
      "binding WCAG 2.2 AA" with checkable rules (target sizes, focus outlines,
      heading skips) that nothing asserts. Add `axe()` to the component-test
      config against Header (both drawer states), BlogPost, ProjectDetail, Home.
      _Source: qa._
      _(2026-07-23, PR #43 with the item above. `axe-core@4.12.1` direct —
      vitest-axe rejected as effectively unmaintained. Zero violations on all
      four surfaces; one rule (`landmark-unique`) excluded on one scan with a
      written jsdom-only justification; `color-contrast` documented as
      structurally unverifiable in jsdom (no canvas) rather than claimed —
      contrast remains covered only by the design brief's hand-computed
      table, which the Playwright item below could someday automate.)_
      _(UPDATE 2026-07-24: automated now — see the Playwright item below,
      `e2e/contrast.spec.ts`. Real-browser `color-contrast` runs for the
      first time, on a handful of representative pages/modes, and already
      found a real violation the hand-computed table structurally couldn't
      have caught. Not full-site coverage — see that item for scope.)_
- [x] **P1 — Real-browser responsive/visual testing.** jsdom can't evaluate
      media queries, so the 2026-07-17 mobile-reading-order P0 class is
      structurally uncatchable and the never-done "QA pass — responsive" item
      cannot be honestly closed. Needs Playwright (or similar) at 375/768/1280
      against `dist/`. _Source: qa. Relates to the existing HIGH smoke-test item._
      _(2026-07-24, team/2026-07-24-playwright-lane — awaiting Dom. `@playwright/
      test` against `vite preview`'s `dist/` (webServer-managed), 375/768/1280.
      28 tests across 4 files, every one falsified red→green against a real
      product-code break before being trusted: `e2e/reading-order.spec.ts`
      reproduces BOTH the 2026-07-17 mobile-metadata-after-body shape AND the
      2026-07-18 duplicate-visible-metadata shape on `BlogPost` (the one
      remaining route with this responsive split — `ProjectDetail` was
      redesigned to a single column in project-page-v2 and no longer has
      one); `e2e/overflow.spec.ts` (no horizontal scroll, 6 routes × 3
      viewports); `e2e/mobile-drawer.spec.ts` (real click-then-focus, real
      Tab/Shift+Tab wrap, real Escape-returns-focus, real scroll-lock — the
      things jsdom's own component test has to fake); `e2e/contrast.spec.ts`
      (see below — the actual unlock for the two items this was blocking).
      **CI: added as its own non-required `e2e` job** (needs the `build` job
      green first), NOT added to branch protection — first-introduction
      flakiness risk + "don't block every PR on day one over a bug this lane
      itself just found" (see ci.yml's `e2e` job comment for the full
      reasoning and the explicit promote-once-proven recommendation).
      Chromium only. Known gap: cannot verify `vercel.json`'s response
      headers (CSP/HSTS/etc.) — `vite preview` doesn't apply them; that stays
      `scripts/check-deployed-routes.mjs`'s (a real deployed URL) or a future
      dedicated header-assertion script's job.)_
      **Unblocks, partially:**
      - `color-contrast` (the P1 above, "Automated a11y tooling"): now
        actually runs, in a real browser, for the first time — home page
        light+dark + one blog post. Found a real, previously-invisible AA
        violation on first run: `Callout`'s `watch-out` tone renders its
        label directly on a `color-mix()` wash the design brief's §2 table
        never computed against (only the two flat tokens it blends) —
        4.45:1, not the table's 4.69:1 flat-`--paper` number. Tracked as its
        own item below rather than silently allowed or hidden behind a
        weakened assertion.
      - `style-src 'unsafe-inline'` (security-auditor P2, PR #42): still
        open — this lane doesn't check response headers at all (see the
        known gap above), so a real-browser CSP check is still a distinct,
        unbuilt piece of work, not something this PR does incidentally.
- [x] **P2 — `Callout` `watch-out` tone fails AA color-contrast (4.45:1, not
      4.69:1).** Found by the new Playwright contrast lane on first run
      (`e2e/contrast.spec.ts`'s `KNOWN_VIOLATIONS`), tracked there explicitly
      so the lane stays a real regression gate rather than silently
      swallowing it. `Callout.tsx`'s `watch-out` tone renders `.text-warning`
      (`--warning: #985F12`) directly on `color-mix(in srgb, var(--warning)
      8%, var(--paper-raised))` (`#F3EBDC`) — a real, rendered pairing the
      design brief's §2 hand-computed table never checked (it only verified
      `--warning` against flat `--paper`, at 4.69:1; the actual wash it's
      shown on in this one component measures 4.45:1, just under the 4.5:1
      AA floor for the label's 11px text). A design/frontend-dev call, not
      this lane's to make unilaterally: either darken `--warning` further,
      reduce/change the wash mix, or use a different label color for this
      tone. _Source: qa (via the new Playwright contrast lane)._
      _(2026-07-27, team/2026-07-27-callout-contrast, PR #57 — awaiting Dom.
      Designer's call: darken the token, not the wash — light-mode `--warning`
      `#985f12` → `#925a11` (same hue/saturation, −1.3pt lightness). Fixing at
      the token means the label, the 3px border, the wash base, and the
      `.text-warning` status-dot legend all inherit it. Recomputed ratios:
      watch-out label on the wash **4.45 → 4.77:1**; on flat `--paper`
      4.69 → 5.06:1 (no regression); dark-mode `--warning` on its wash 6.38:1
      and `win`/`--success` 5.36/5.38:1 both already passed, unchanged. The
      violation is GONE, so `KNOWN_VIOLATIONS` was **deleted, not renumbered**
      — an allowlist that outlives its own fix is the anti-pattern that file's
      header warns of; all four contrast tests now assert `[]`. Proven in a
      real browser: `npx playwright test e2e/contrast.spec.ts` 4/4 green.)_
- [x] **P1 — Provenance model IMPLEMENTATION (the hero device is still a
      byline).** The spec shipped (2026-07-19, PR #19); the generator/schema/
      strip-wiring did not. `ProvenanceStrip` renders `author` only and isn't on
      `ProjectDetail` at all. This is the review's #1 strategic gap — the site's
      whole differentiator. _Source: architect/designer/marketer + Judge._
      _(**PARTIAL — engine shipped 2026-07-23**, team/2026-07-23-provenance-
      engine, PR #44 — awaiting Dom: spec §12 PRs 2–3 (schema, block parser,
      git-joined generator, 60 dedicated tests, zero new deps). Adversarial
      QA caught a real P1 pre-merge — a directory as `produced` path silently
      yielded a valid record — fixed + falsified. Zero real blocks yet on
      purpose; `provenance:print` truthfully says "no records yet". The
      report-block format is now binding (see "Run report format" below).
      **Remaining: PR 4 loader join → PR 5 strip v2 → PR 6 backfill (lead;
      review what stays blank) → PR 7 project-detail enablement (Dom
      checkpoint) + the Vercel full-clone devops item below.** Strip still a
      byline until 4–5 land, so this item stays open.)_
      _(**PRs 4+5 SHIPPED 2026-07-24**, team/2026-07-24-provenance-strip-v2,
      PR #52 — awaiting Dom, **merge after PR #48**. The strip is no longer a
      byline. PR 4: `loader.ts` attaches `provenance?` joined by repo-relative
      path; the hard part was that `import.meta.glob` can't distinguish
      "artifact missing" from "artifact present but empty" and a plain `import`
      throws an unhelpful Vite resolution error — solved with an exported
      `resolveProvenanceArtifact()` that throws a specific, actionable error
      naming `provenance:generate`, preserving §5.2's "infra failure must never
      look like a legitimate no-commit claim". PR 5: full/partial/none states,
      inline + rail variants, graded-paper Judge badge, commit/run links built
      from a hardcoded `REPO_BASE` + schema-validated 40-hex hash and **never
      read from content** (closes the spec's one named injection path). Also
      wired `.riso-offset`, which was spec'd in design-brief §6 but was dead
      CSS used nowhere — one of the three spots the dead-field item below
      lists. 65 component tests, axe clean on all 6 new states; falsification
      **caught a weak assertion** (`toThrow(/provenance:generate/)` passed
      against both failure branches; tightened). **Zero real records still
      exist, on purpose** — `provenance:print` says "no records yet", so the
      state actually shipping is the honest "no run record" degrade, and no
      fixture records were planted to make a prettier demo. **Remaining: PR 6
      backfill (lead) → PR 7 project-detail enablement (Dom checkpoint).**
      Honest gap: no real-browser visual check of the new states — the
      Playwright lane (PR #53) is what will eventually cover that.)_
      _(**PR 6 (BACKFILL) SHIPPED 2026-07-27**, team/2026-07-27-provenance-
      backfill, PR #58 — awaiting Dom. The engine finally has real data: a
      `yaml provenance` block for **8 logbook posts**, each appended to the
      report of the run that created it, so the generator joins it against
      `git log` and the strip renders real commit/run/reviewer/author instead
      of "no run record". **Closed the honest gap the strip-v2 PR left open:**
      verified in a real browser (localhost dev) — `red-is-not-self-justifying`
      now shows WRITTEN BY / REVIEWED (fact-check) / COMMIT `991e075cab66` /
      RUN 2026-07-20 / JUDGE "none for this entry", and a skipped post still
      shows the honest "no run record". Placement rule keeps runId and commit
      links from contradicting; authors from frontmatter, reviewers only where
      a report documents one, `judge: null` (posts aren't Judge-gated), tokens
      omitted. **Two posts deliberately left blank, documented not forced:**
      the founding post (file created as a placeholder before its content) and
      `declared-not-delivered` (created 07-22, no same-date report to host the
      block). Updated the `generate.test.ts` "zero blocks yet" canary to the
      new reality. 341 tests green. **Remaining: PR 7 project-detail strip
      enablement (Dom checkpoint); backfill the 2 skipped posts once decided;
      reviewer/token enrichment for these 8.** Strip stays a full device on
      posts now, so this item is close — PR 7 is the last piece.)_
      _(**PR 7 SHIPPED 2026-07-29 — item COMPLETE**, team/2026-07-29-provenance-
      project-strip, PR #72 — awaiting Dom, **Dom checkpoint** (public copy +
      reverses the 2026-07-17 omit decision). The strip is now on
      `/projects/:slug`. **The backfill was the hard part, and the naive version
      would have been fabrication:** `reports/2026-07-16.md` produced six
      write-ups, but `git log --diff-filter=A` shows only
      pizzaparty/mensapp/lovediary were CREATED by that run (`48e4fe5`);
      soulforge/portfolio/chart-token-playground were created in an EARLIER
      run's scaffold commit (`980a4c2`) holding placeholder text that literally
      reads "the real write-up … is a separate backlog item". Claiming all six
      would have joined this run's authors/reviewer onto a different run's
      commit, on the site's own honesty device. **Result: 3 of 6 project pages
      show real provenance, 3 honestly show "no run record" — the correct
      outcome, not a shortfall**, and it resolves the 2026-07-17 open question
      with real data instead of the fabrication two prior runs correctly
      refused. Placement resolves `project-page-v2.md` §7's objection (that the
      strip would misattribute the SOFTWARE's authorship) by making the
      distinction explicit: an end-of-page colophon led by "ABOUT THIS WRITE-UP
      … this note is about how the page describing it was produced, not the
      software itself", adapted off `project.soloBuild`. `ProvenanceStrip`'s
      `author` became optional so a record-less project omits the chip rather
      than the caller guessing. **Lead browser-verified all six routes against
      `vite preview` on the real `dist/`** — closing the gap the strip-v2 PR
      left open — zero console errors, one `<h1>`, no 375px overflow. 101
      component tests. Falsified: removing the footer call → 5 of 6 red;
      reintroducing a fabricated `author ?? 'Dom'` fallback → 3 of 5 red.
      Remaining follow-ups are NOT this item: the 2 skipped posts and
      reviewer/token enrichment.)_
- [x] **P1 — Vercel deploy must full-clone (provenance deploy blocker).**
      devops: the provenance generator hard-fails on shallow clones by design
      (spec §5.2 — `git log --diff-filter=A` silently truncates there, which
      would turn an infra failure into a false "no commit yet" claim). CI now
      fetches full history (PR #44 sets `fetch-depth: 0`), but **Vercel
      shallow-clones by default**, so the first deploy after PR 4 lands will
      fail loudly unless Vercel's build is configured to full-clone (or the
      deploy build skips the generator — rejected by the spec). Sequence
      BEFORE spec §12 PR 4 merges. _Source: docs/provenance-model.md §5.2
      flagged it 07-19; PR #44 makes it concrete._
      _(2026-07-24, team/2026-07-24-vercel-full-clone, PR #48 — awaiting Dom.
      **Must merge before PR #52.** `vercel.json` gains
      `"buildCommand": "git fetch --unshallow --no-tags || true; npm run build"`,
      un-shallowing before `prebuild` runs the generator. The `|| true` is safe
      *specifically because* it only swallows the already-complete-clone error:
      a genuinely-shallow repo still trips `assertGitAvailable`'s hard-fail
      moments later, so the generator stays the enforcement point and the
      spec's fail-loud property is preserved rather than bypassed. Rejected a
      dashboard-only `VERCEL_DEEP_CLONE=1` fix as the primary mechanism — it
      can't be verified or enforced from the repo, and `vercel.json`'s
      `env`/`build.env` is populated too late to affect Vercel's checkout step.
      New `scripts/provenance/vercelFullClone.test.ts` guards drift (same
      pattern as `inlineScriptHash.test.ts`) and **also asserts all six PR #42
      security headers survive**, since both concerns now share the file. Docs
      §5.2/§11 updated from "likeliest thing to blow up at deploy" to fixed.
      **No Dom dashboard action required**; `VERCEL_DEEP_CLONE=1` is optional
      hardening only.)_
- [x] **P1 — Positioning disambiguation.** "An AI dev team builds software" hero
      over a grid of Dom's SOLO builds; the "SOLO BUILD · NO AGENT TEAM" tag is
      only on detail pages. Add it to `ProjectCard` and/or a clarifier under the
      Projects H1 — **placement/wording is Dom's call.** _Source: marketer._
      _(2026-07-24, team/2026-07-24-positioning-tag, PR #51 — awaiting Dom.
      **The item was truer than it knew.** `ProjectHero` rendered "SOLO BUILD ·
      NO AGENT TEAM" *unconditionally*, as page furniture — correct only by
      accident because all six projects happen to be Dom's pre-team work.
      Nothing in the schema encoded it; project-page-v2.md states it as a prose
      assumption. The first team-built project would have had its detail page
      falsely claim solo. So the fix is data-driven in BOTH directions:
      `soloBuild: z.boolean().default(true)` on the project schema (default
      `true` matches existing behavior and is the safer failure mode —
      under-claims the team rather than over-claims it), set explicitly on all
      six project files so each claim is auditable; `src/content/soloBuild.ts`
      as the single copy source so hero and grid render byte-identical text;
      the chip added to `ProjectCard`; a quiet clarifier under the Projects H1
      **and under Home's "Recent builds"** — Home needed it too, being the grid
      directly beneath the "AI dev team" hero claim. Tag wording reused verbatim
      from the already-shipped hero, so no new public copy was invented. Tag is
      NOT `aria-hidden` — deliberate: a screen-reader user needs the provenance
      cue more, not less. 5 falsified tests + schema/label/page tests; axe clean.
      **Dom's call on placement**: PR #51 lays out 3 options (per-card tag +
      clarifier [shipped], tag-only, or one site-wide banner) with reasoning.
      Disclosed gap: the inverse branch — a team-built project correctly
      omitting the chip — has no test, since no team-built fixture exists yet.)_
- [x] **P1 — Dead-field / retired-device cleanup.** Render or remove post
      `cover`; wire `.riso-offset` into its three spec'd spots (H2 underline,
      blockquote bar, provenance icon) or update the brief; formally deprecate
      `MarginNote` in the design brief (superseded by `Callout` — currently
      described as shipping in 6 passages). _Source: designer/frontend/backend/
      visual-media — the same declared-not-delivered pattern as the P0 spine._
      _(2026-07-28, team/2026-07-28-dead-field-cleanup, PR #66 — awaiting Dom.
      designer decision-spec → frontend-dev → lead QA. **post `cover`: RENDERED,
      not removed** — design-brief §5 places it in the post reading order, so the
      honest fix is to make the dead field work (new `PostCover.tsx`, conditional,
      no placeholder when absent, CLS-safe, falsified component test) rather than
      discard a stated intention. **`.riso-offset`: docs-match-reality** — it is a
      provenance-icon accent only; FOUR places falsely claimed wider use
      (index.css, design-brief §4+§6, PullQuote.tsx, and a false "PullQuote border
      via the riso-offset accent" in blog-format-v2.md), all corrected with zero
      CSS change. **design-brief §6** now documents the 5 live blog-format-v2
      components it never listed. **MarginNote deprecation deliberately NOT done:**
      the "superseded by Callout" premise is factually wrong — the two do different
      jobs, `Markdown.tsx` keeps their grammars from colliding, an OPEN
      "MarginNote desktop lane" item assumes it lives on, and the "6 passages"
      count was really 3. Whether to ever collapse the two is a **Dom decision**
      (recommendation: keep both). `.riso-offset`-on-H2/blockquote ruling is
      reversible if Dom wants the flourish. Gates: unit 341 / component 90 (incl.
      new PostCover 3/3) / content 39 / build + lint. PostCover is logic+a11y
      tested, not browser-verified — no post sets `cover` yet.)_
- [ ] **P2 batch (from the review — see `reports/2026-07-21-review.md`).**
      ~~Lint into CI~~ (✓ 2026-07-29, PR #70); scheduled `npm audit` + drop `*.test.*` from the auto-merge
      allowlist; error tracking (Sentry free tier) once DOM-4's client JS lands;
      ~~SEO-generator loader-contract test~~ (✓ 2026-07-30, PR #77 — the
      generator's whole premise, "runs the REAL loader via `ssrLoadModule` so
      sort rules and draft semantics can never drift from the site's", had
      **zero** tests; the 23 that shipped with it cover only the pure XML
      builders. 7 new contract tests + a `STATIC_ROUTES`-vs-`router.tsx`
      consistency test; six falsifications, **none of which failed to fail**;
      also closes the separate P1 draft-exclusion item above); ~~build-time check that
      `cover`/`media[].src`/`poster` paths exist on disk~~ (✓ 2026-07-29,
      PR #69 — case-sensitive walk, not `existsSync`, so a case-only typo that
      passes on macOS and 404s on Vercel's Linux build fails the gate); dedupe the
      ProjectDetail footer + share a `vitest.jsdom.base` config; `BuildTimeline`
      double-mount; Markdown AST-wiring test; ~~team-size "9→10" note in the
      founding post~~ (✓ 2026-07-28, PR #65 — `Note:` Callout annotating the
      Lucas hire, the "9" left unchanged); ~~GitHub link → the `studio-site` repo + a `reports/` deep
      link~~ (✓ 2026-07-29, PR #71 — the `reports/` link initially landed only
      in BlogIndex's never-rendered empty state and was unreachable in
      production; lead review moved it into the global footer nav); recompress the 885KB hero PNG (**blocked 2026-07-29: `pngquant`,
      `oxipng` and `cwebp` are all absent from this machine — needs a one-time
      install before any run can do this honestly**; PR #73 measured the real
      cost: 885KB portfolio + 844KB lovediary heroes); ProjectCard
      cover-aspect capture discipline; per-post/per-project OG images +
      prerender-for-bots (follow-up to the favicon/OG P0); ~~make the flaky-smoke
      failure capturable in CI~~ (✓ 2026-07-29, PR #70);
      ~~**dist-side CSP hash assertion**~~ (✓ 2026-07-29, PR #70 — security-auditor P2 on PR #42: the
      hash guard read source `index.html`, the browser gets
      `dist/index.html` — byte-identical today, lead-verified, but a Vite
      version bump could change emission; assert against `dist/` post-build);
      tighten `style-src 'unsafe-inline'` once a real-browser CSP check
      exists (security-auditor P2, needs the Playwright lane).

### Added 2026-07-28 (maintenance run)

- [x] **Audit-gate revisit-trigger hardening.** A run-start reconciliation
      false-alarm (raw `npm audit --audit-level=high` exits 1 with "7 high vulns"
      while the actual CI gate `npm run audit` = `audit-ci --config audit-ci.jsonc`
      passes — the "7" are 2 allowlisted advisories fanned across 7 packages)
      prompted a security-auditor re-validation of the gate. Posture confirmed
      sound; one real improvement shipped: the react-router allowlist's REVISIT
      trigger keyed only on "a patched release ships" and missed the scenario that
      would actually make the RSC-CSRF advisory exploitable here — the app gaining
      a server/RSC mode or a mutating route action. Broadened the comment.
      _(2026-07-28, team/2026-07-28-audit-allowlist-polish, PR #64 — awaiting Dom.
      Comment-only, gate still green.)_
- [x] **LOW — Run-playbook note: raw `npm audit` ≠ the CI gate.** The 2026-07-28
      run lost time treating raw `npm audit --audit-level=high` (exit 1, 7 highs)
      as a merge-blocker before checking the real gate, `npm run audit`
      (`audit-ci`, which passes). Both are "correct"; they just measure different
      things (raw npm audit can't express "reviewed & not-applicable", audit-ci
      can). A one-line preflight note — "verify CI status with `npm run audit`, not
      raw `npm audit`" — would save the next run the same detour. _Source:
      2026-07-28 run._
      _(2026-07-29, team/2026-07-29-links-docs, PR #71. Note added to
      `README.md`'s "CI gates" section — the doc a future run actually reads
      first — and that section's own description corrected from generic
      "`npm audit`" to the accurate `audit-ci --config ./audit-ci.jsonc`.)_
- [x] **LOW — `project-page-v2.md` stale riso-offset refs in declined proposals**
      (lines 456, 521). The 2026-07-28 dead-field cleanup corrected every false
      "riso-offset is used on X" claim about *delivered* state, but left two refs
      in `project-page-v2.md` that describe a *declined* "4th riso-offset use for
      the timeline rule" ("deliberately not recommending it," "flagged for your
      call"). They're historical design-rationale, not lies about what ships, so
      they were left intact — but they still cite design-brief §4's old "three
      uses" cap, now corrected to one. Trim if full cross-doc consistency is
      wanted. _Source: frontend-dev, 2026-07-28 dead-field pass._
      _(2026-07-29, team/2026-07-29-links-docs, PR #71. Original declined-proposal
      text left intact so it stays legible as what the designer actually
      proposed; a dated cross-doc annotation at both refs notes design-brief §4's
      "three uses" cap was itself a doc error corrected 2026-07-28 to one, and
      that the decline verdict is unaffected. No history rewritten.)_
- [ ] **LOW — `PostCover` needs a real-browser pass once a post sets `cover`.**
      The dead-field cleanup (PR #66) rendered the previously-dead post `cover`
      field, verified by a component test (logic + axe) reusing `ProjectHero`'s
      already-browser-verified image-block pattern. But no post sets `cover`, so
      it never renders in production content yet. First post to add a `cover:`
      warrants a quick visual-media pass on aspect/radius/spacing. _Source:
      frontend-dev, 2026-07-28._

### Added 2026-07-29 (impact-ranked; slot above "Pre-launch review")

- [x] **HIGH — Site-wide CLS ≈ 0.39 from the route Suspense fallback (4× the
      Core Web Vitals threshold).** Every route measures ~0.39 CLS; "good" is
      ≤ 0.1. `src/lib/withSuspense.tsx`'s `RouteFallback` renders a `py-24`
      centered "Loading…" box, and because every route is lazy-loaded behind it,
      `scrollHeight` jumps ~800px → ~5096px when the real chunk resolves,
      shoving the already-painted footer down. **Not an image problem** — the
      text-only blog control measures the same magnitude and the figure is
      identical under `reducedMotion: 'reduce'`. It is user-affecting for real
      traffic, not only SPA transitions: the fallback paints on the FIRST load
      of any deep-linked URL, which is how most search and social visitors
      arrive, so this is live on every shared link the site has. Likely fix is
      to reserve plausible vertical space in the fallback (e.g. a min-height
      matched to typical content) or to hold the previous route until the next
      one is ready; both are layout decisions worth a designer opinion, not a
      one-line patch. Delete the route's entry from `KNOWN_CLS_VIOLATIONS` in
      `e2e/perf-budget.spec.ts` as each is fixed — **do not renumber**, per the
      PR #57 precedent. _Source: 2026-07-29 performance-budget measurement
      (PR #73) — the site's first-ever perf measurement, found on its first
      run. Thresholds per Google Core Web Vitals._
      _(2026-07-30, team/2026-07-30-cls-suspense-fallback, PR #78 — awaiting
      Dom. **0.3901–0.3955 → 0.0000–0.0055 on every route**, real Playwright
      measurements against `vite preview` on the built `dist/`; lead
      independently re-ran the whole spec on the pushed tree, 21/21 in 16.1s.
      designer decision spec first (`docs/cls-fallback-decision.md`), then
      frontend-dev. **Two treatments, because it was two bugs.** (A) cold
      deep-link load: `RouteFallback` reserves `min-h-[100svh]`. The value is
      derived, not guessed — a layout shift only counts an element visible in
      the frame BEFORE it moved, so reserving one viewport puts the painted
      `<Footer>` below the fold and its later jump stops counting. That is also
      why CLS was ~0.39 on every route regardless of content height: the
      distance term saturates. So it needs no per-route numbers, which matters
      because the repo only ever measured ONE height pair (800px→5096px) and
      inventing five more would have been fabrication. (B) in-app navigation:
      one stable `<Suspense>`/`<RouteErrorBoundary>` around `<Outlet/>` instead
      of a fresh boundary per route. The spec's named trap was avoided —
      `RouteErrorBoundary` got a `resetKey` prop, NOT `key={pathname}`, which
      would remount the nested `<Suspense>` and silently restore the bug.
      `withSuspense` survived (still the only path for the router's top-level
      `errorElement`) and says so, rather than being deleted as dead.
      **A falsification failed to fail, and is reported rather than buried:**
      reverting (B) alone did NOT turn the in-app test red even under an
      injected 1500ms chunk delay, because this app's routes are siblings at one
      `<Outlet/>` with identical wrapper types, so React's unkeyed
      reconciliation never remounts that boundary anyway. **Read honestly:
      treatment A is what fixed the measured CLS; treatment B is structural
      hardening whose benefit this route topology cannot demonstrate.** Rather
      than ship an unfalsifiable change, a second deterministic test was added
      ("never flashes the route fallback, even under injected chunk latency")
      which DOES catch the `key={pathname}` regression class. `KNOWN_CLS_
      VIOLATIONS` deleted, not renumbered, per PR #57. Lead review added one
      commit: a doc comment still referenced the allowlist in the present tense
      after its deletion — the doc-drift class PR #66 cleaned up.)_
- [ ] **MEDIUM — Hero images are oversized and non-responsive.**
      `ProjectHero`'s `cover` renders as a single image at every viewport — no
      `<picture>`/`srcset` — so a phone fetches the desktop-sized hero.
      `portfolio-hero-desktop.png` is 885KB and `lovediary-hero-desktop.png` is
      844KB; project routes measure 1.6–2.5MB total, and `/` is already ~2.2MB
      because `ProjectCard` loads featured covers (that predates DOM-4). Two
      separable fixes: responsive sources, and recompression — **the latter is
      blocked on tooling** (`pngquant`/`oxipng`/`cwebp` are not installed on
      this machine; a one-time install unblocks it). _Source: 2026-07-29
      performance-budget measurement (PR #73)._
      _(**BUILT AND WITHHELD 2026-07-30** — stays open, and this item's own
      premise was wrong. frontend-dev implemented the responsive-sources half
      cleanly on `team/2026-07-30-responsive-hero-sources` (commit `f2f7db1`,
      **local, deliberately unpushed**): explicit optional `coverMobile` field
      rather than a `-desktop`→`-mobile` naming convention (a missing sibling
      would 404 silently inside a `<source>`), `<picture>` + `<source media>`
      keyed to the real `--breakpoint-sm` token, falsified red→green, all six
      gates green, **~1.04MB less transferred at 375px**. The lead then measured
      it in a real browser and it is a visual regression: **every mobile asset
      on disk is a 375×812 PORTRAIT phone capture (ratio 0.462) and the hero box
      is `aspect-[16/9]` with `object-cover`, so the visible fraction of the
      image drops from 90% to 26%** — three quarters of the screenshot cropped
      away, leaving a band of body text with its top sheared off. Measured on
      `vite preview` against real `dist/`: baseline serves
      `portfolio-hero-desktop.png` 1280×800 into a 343×193 box (0.90 visible);
      the change serves `portfolio-hero-mobile.png` 375×812 into the same box
      (0.26 visible). **The jsdom component tests pass and always would** — they
      assert the `<source>` element exists, which it correctly does; jsdom has
      no layout. **Correction to this item: BOTH halves are blocked on the
      missing image tooling, not just recompression.** Usable responsive sources
      need mobile-width LANDSCAPE crops, which do not exist and cannot be
      produced without the same absent `pngquant`/`cwebp`/ImageMagick. The
      alternative — a portrait `aspect-[375/812]` mobile hero, ~743px tall on a
      343px-wide screen — is a legitimate direction but a **designer + Dom
      layout decision**, not something to slip into a performance PR, and it
      fights the CLS work. Branch is recoverable in one command if Dom takes
      that direction.)_
- [ ] **MEDIUM — No on-site surface for the run reports (spec first).**
      PROJECT-BRIEF goal 3 says the site's own git history and run reports ARE
      content, and the provenance strip now links individual runs — but there is
      no route that lets a reader browse `reports/` on the site. The only
      pointers are outbound GitHub links (the new footer "Run reports" entry
      added in PR #71, and `BacklogChip`). Every other goal-3 device built so
      far (provenance strip, backlog chips, the logbook) points AT the reports
      without ever showing them. Wants an **architect spec first** — it is a new
      content source with real questions (render `reports/*.md` as routes vs. an
      index-only surface? how do run reports relate to logbook posts, which are
      already distilled FROM them? does a raw run report read as content or as
      exhaust?) — and a designer pass before any implementation. Right-size it:
      the honest answer may be "an index page, not 20 new routes." _Source:
      named product gap, PROJECT-BRIEF goal 3; found by the lead 2026-07-29
      while wiring the reports deep link._
      _(**SPEC SHIPPED 2026-07-30 — item stays open**, team/2026-07-30-reports-
      surface-spec, PR #76. `docs/reports-surface.md`; no product code, no route,
      nothing public. **The item guessed its own answer correctly:** architect
      recommends ONE `/reports` index route, not 21 per-report routes. Measured
      across all 21 reports, a run report is ~30–40% reader-facing prose wrapped
      in ~60% operations (`## For Dom to review`, Notion-mirror bookkeeping,
      token estimates, machine-input provenance blocks) — and the reader-facing
      part is exactly what the logbook already distills, so publishing them
      would double the page count with unedited prose competing with the edited
      version of itself. What the reader actually lacks is not the reports (one
      click away since PR #71) but the **join**: which run produced which post —
      21 runs, 8 with recorded output, 13 without. Options (b) per-report routes,
      (c) provenance-block-only partial view and (d) fold-into-logbook are each
      costed and rejected **in writing** so a future run doesn't re-propose
      them; (c) specifically for showing a document's table of contents while
      withholding the document. **No new report frontmatter**: date from the
      filename (all 21 match, including the irregular `-review`/`maintenance-`
      shapes), title from the verbatim first H1, and deliberately **no derived
      summary** — report first paragraphs can't survive truncation, and a
      distorted one-liner on the honesty page is worse than none. Also declines
      to repoint `ProvenanceStrip`'s run chip in-site: under an index-only shape
      that swaps a link to the primary record for a link to a summary of it, on
      the device whose whole justification is verification. Lead re-checked every
      countable claim; one was wrong and is corrected in the committed version
      ("thirteen posts" → 14, 0 drafts). **Remaining: designer pass (§6 PR 3, a
      hard Dom checkpoint) then implementation PRs 0–4.** Two spin-off items
      below.)_
- [ ] **LOW — `media[].width`/`height` are never checked against the real
      image.** The schema requires them (they exist to prevent layout shift) and
      the new asset-path gate proves the file exists, but nothing verifies the
      declared dimensions match the file's intrinsic size. A wrong ratio
      reintroduces exactly the CLS the fields were added to prevent, with every
      gate green. _Source: qa-tester, 2026-07-29 asset-path-gate pass — named as
      the natural next gap by the gate that closed the path half._
- [ ] **LOW — Worktree isolation: a shared `node_modules` also shares
      `.vite`, and parallel dev servers corrupt each other.** Extends the
      existing worktree item. The proven workaround (hand-made worktrees +
      symlinked `node_modules`) has a second failure mode beyond "`npm install`
      replaces the symlink": Vite's dep-optimizer cache lives at
      `node_modules/.vite`, so two worktrees running dev servers concurrently
      write the same cache and the app throws `Invalid hook call … more than one
      copy of React`. Cost this run: a real diagnosis detour on PR #72 before it
      was confirmed environmental (verified by re-running against `vite preview`
      on `dist/`, where the optimizer plays no part — zero errors). Fix: give
      each worktree its own `.vite` (e.g. `cacheDir` per worktree) or don't run
      concurrent dev servers off a shared `node_modules`. _Source: Project Lead,
      2026-07-29 — observed, not hypothetical._
- [ ] **LOW — Notion mirror can't attribute the tenth cast member.** The
      "Studio Site — Backlog" database's `Agent(s)` multi-select offers only the
      nine original disciplines; `visual-media` (Lucas, hired 2026-07-18,
      DOM-5) is not an option, so the mirror silently cannot credit him and the
      2026-07-29 sync had to substitute `frontend-dev` on a row he owns. Same
      "the cast grew to 10 and a system still says 9" class as the founding-post
      note fixed in PR #65. One-time Dom action in Notion (add the option); no
      PR. _Source: 2026-07-29 Notion reconciliation — the API rejected the
      write._

### Added 2026-07-30 (impact-ranked; slot above "Pre-launch review")

- [x] **HIGH — studio-site itself is missing from the portfolio.** `content/
      projects/` holds six write-ups and **all six are `soloBuild: true`** —
      verified, every file. The one project the AI team actually built, the
      site making the claim, is not in its own portfolio. This is the site's
      whole proof sitting outside the case it argues. It would also be the
      **first `soloBuild: false` project**, which closes a gap PR #51 disclosed
      itself: the inverse branch (a team-built project correctly omitting the
      "SOLO BUILD · NO AGENT TEAM" chip) has no test because no team-built
      fixture exists. And it has by far the deepest evidence base of any project
      here — 21 run reports, ~78 PRs, a provenance engine, a documented
      falsification culture. **Dom checkpoint**: it is public copy, it is
      self-referential ("a portfolio entry about the portfolio"), and the honest
      framing needs his sign-off — recommend the write-up lead with what went
      WRONG (the four browser-only P0s, the three wrong-gate incidents, the
      backlog misreporting its own state three times), because that is the
      differentiated content and the site's stated voice. _Source: named product
      gap, verified by the lead 2026-07-30; PROJECT-BRIEF goals 1 + 3. Market
      research supports the priority: depth-of-reasoning case studies outperform
      project count, and "2–4 fully documented case studies beat 8–10 shallow
      entries" (greatfrontend.com, "Frontend Developer Portfolio: What to Build
      and How to Stand Out in 2026")._
      _(2026-08-01, team/2026-08-01-studio-site-portfolio-entry, PR #84 —
      awaiting Dom, **DOM CHECKPOINT: public, self-referential copy**. Leads
      with what went wrong, as the item recommended: four browser-only P0s,
      three wrong-gate incidents, three backlog-misreports-its-own-state
      incidents, the auto-merge lane that ran for one day. Every figure is
      scoped to a stated window (2026-07-14–2026-07-31) so the entry cannot
      silently rot, and the lead re-derived all of them independently — 210
      commits / 118 non-merge / 17 of 18 days / 81 PRs (77 Dom, 4 auto) / 23
      reports, all exact. Closes the inverse-chip test gap PR #51 disclosed:
      `ProjectDetail.test.tsx` now covers a team-built project rendering NO
      chip, with a `soulforge` positive control and an axe pass, falsified by
      removing the gate in `ProjectHero.tsx`. **Lead copy pass caught one real
      accuracy drift** — the draft said "roughly two-thirds of that backlog"
      when the 07-31 finding was about the review QUEUE (5 of 7 open PRs) —
      and pulled the `soloBuild: false` schema field name out of public prose.
      **Two calls deferred to Dom, not made silently:** `featured: false` (a
      flagged entry would push one of the three current projects off the
      homepage), and no exact agent headcount in the copy, because
      PROJECT-BRIEF.md's "8 specialist subagents" now contradicts the footer's
      "10 AI characters" — logged as its own item below.)_
- [ ] **MEDIUM — Provenance follow-ups the strip work deferred.** Named as
      "remaining follow-ups are NOT this item" in PRs #58 and #72 and then never
      became an item, which is how work goes missing here. Three parts:
      (a) **backfill the 2 deliberately-skipped posts** — the founding post (file
      created as a placeholder before its content) and `declared-not-delivered`
      (created 07-22, no same-date report to host the block); both need a
      decision on where the block lives, not just a block; (b) **reviewer/token
      enrichment for the 8 backfilled posts**, which currently carry authors and
      commits but thin reviewer data; (c) decide whether the 3 project pages
      honestly showing "no run record" (their write-ups were created by an
      earlier run's scaffold commit, per PR #72's archaeology) stay that way
      permanently or get a record. **Do not invent records to fill the gaps** —
      the "no run record" degrade is the honest state and PR #72 already refused
      this once. _Source: PRs #58 / #72 follow-up notes, 2026-07-27 + 2026-07-29._
- [x] **MEDIUM — `runId`/`reportPath` are unvalidated `z.string()` and one is
      already in an `href`.** `src/content/provenance-schema.ts:101-102` declares
      both as bare `z.string()`, and `ProvenanceStrip.tsx:169` interpolates
      `record.reportPath` straight into `href={`${REPO_BASE}/blob/main/${...}`}`.
      Safe **in practice** only because `generate.mjs` writes that value from the
      filesystem rather than from block content — an invariant enforced nowhere
      in the schema, on the one device whose entire purpose is verification. Pin
      both with regexes (`^(maintenance-)?\d{4}-\d{2}-\d{2}(-[a-z0-9-]+)?$` and
      `^reports/[A-Za-z0-9._-]+\.md$`). Cheap, and it must land before either
      value could ever become a route segment. _Source: architect, 2026-07-30
      reports-surface spec §4.1 (PR #76) — surfaced as worth doing regardless of
      that item's outcome; both facts verified against the tree by the lead._
      _(2026-08-01, team/2026-08-01-runs-artifact, PR #85 — awaiting Dom.
      Both pinned as `RUN_ID_PATTERN` / `REPORT_PATH_PATTERN`. Validated
      against reality before commit: all 11 entries in
      `provenance.generated.json` and all 23 filenames in `reports/` match.
      Rejection tests cover the hazards that actually matter for a value
      already interpolated into an `href` — `../` traversal, an absolute
      `https://` URL, an absolute filesystem path, and a path outside
      `reports/`.)_
- [x] **MEDIUM — The auto-merge allowlist and the committed generated artifact
      contradict each other.** `.github/workflows/auto-merge.yml` allowlists
      `content/**`, `docs/**`, `reports/**`, root `*.md` and `**/*.test.ts(x)` —
      confirmed, nothing under `src/`. But `src/content/provenance.generated.json`
      is committed (the 2026-07-27 reversal), so **any PR that regenerates it
      loses `safe-auto`**, including routine backlog-and-report PRs. Either
      allowlist `src/content/*.generated.json` (defensible: generated,
      Zod-validated, non-executable JSON whose freshness is proven by the CI
      drift gate in the same PR) or accept that these PRs are always manual and
      say so. Do not widen the allowlist further under `src/`. _Source:
      architect, 2026-07-30 (PR #76 §5); verified against both files by the lead._
      _(2026-08-01, team/2026-08-01-runs-artifact, PR #85 — awaiting Dom.
      Resolved the first way: exactly one pattern added,
      `src/content/*.generated.json`. Nothing else under `src/` — it
      deliberately does not match `.ts`/`.tsx`. Hand-verified against the
      guard's real shell `case` logic (it is not a `paths:` filter): a routine
      report PR keeps `safe-auto`, and PR #85's own file list correctly stays
      unsafe. Disclosed rather than left to be found: bash `case` patterns
      match `/` inside `*`, so the pattern would also match a hypothetical
      nested `src/content/sub/foo.generated.json` — no such file exists, and
      every pre-existing pattern in that guard (`docs/*`, `content/*`) has the
      same property.)_
- [ ] **MEDIUM — Nothing measures whether anyone reads this site.**
      PROJECT-BRIEF goal 2 wants readers; there is no analytics of any kind, so
      every prioritisation decision about content is made blind — the
      reports-surface spec had to note that "ship it and see if people click" is
      literally not measurable here. This is **not a pure build item**: any
      script-based analytics interacts with the CSP shipped in PR #42
      (`script-src` is hash-pinned, deliberately), and it is a privacy decision
      about Dom's visitors, so it is his call and needs a recommendation, not an
      install. Options worth costing: Vercel Web Analytics (first-party, no
      cookie banner, but a paid tier beyond a free allowance), a self-hosted or
      hosted Plausible/Umami, or server-side-only log analysis with zero client
      JS. _Source: named product gap; found 2026-07-30 while specifying the
      reports surface. Recommend costing before building._
- [ ] **HIGH — A run cannot record its own provenance until its PRs merge (and
      2026-07-30's three blocks are outstanding because of it).** Undocumented
      ordering constraint in the provenance format, hit for the first time on
      2026-07-30. A `yaml provenance` block is a **creation record** and
      `generate.mjs` verifies the produced path exists on disk — correct, and
      the §5.2 fail-loud property working. But a run writes its report on its own
      branch while the files it created sit on unmerged feature branches, so the
      claim is not yet true at write time and the generator rejects it. The
      2026-07-27 backfill (PR #58) never hit this because it operated on
      already-merged history. Shipping the blocks anyway would mean a **red CI on
      a PR awaiting review for days**, which is the "a gate people re-run until
      it's green stops being a gate" failure logged 2026-07-19 and fixed
      2026-07-29 — so they were deferred, with full content preserved in
      `reports/2026-07-30.md` so nothing is reconstructed from memory.
      **Two things to do:** (a) append the three preserved blocks once PRs #76,
      #77 and #78 merge — otherwise this run permanently shows "no run record";
      (b) decide the general rule, since this will recur every run. Options:
      always append blocks in a follow-up commit after merge (status quo,
      reliable but needs a standing step); have the report PR merge last and
      accept transient red CI (rejected above); relax the generator to accept a
      produced path that exists on the PR branch but not `main` (weakens the
      creation-record guarantee); or move the block into the branch that creates
      the files rather than the report. _Source: Project Lead, 2026-07-30 —
      observed, not hypothetical._
- [x] **LOW — The "QA pass" item at the top of this file is stale and should be
      re-scoped or closed with evidence.** It has been open and unchanged since
      day one, reading "all states, responsive, accessibility; fix findings" —
      but since it was written the studio has shipped the route smoke suite
      (PR #20), component-test infra (#32), interaction backfill + axe (#43), the
      Playwright responsive/contrast lane (#53), and the performance budget
      (#73). Most of what it asks for now exists and is gated in CI. Leaving a
      permanently-open vague item pinned near the top is exactly the
      "backlog lies about its own state" failure this project has already had
      **three** separate incidents of. Action: enumerate what "QA pass" still
      means that no existing gate covers, and either rewrite it as that specific
      list or check it off citing the gates that closed it. _Source: lead
      backlog-health review, 2026-07-30._

### Added 2026-07-31 — RECOVERED 2026-08-01 (see note)

**These four items were never written to this file.** The 2026-07-31 run
reported them as "logged as new HIGH backlog items" and its "For Dom to
review" section describes its branch as "`BACKLOG.md` + this report", but
PR #81 touched **only** `reports/2026-07-31.md` — verified with
`gh pr view 81 --json files`. Their rows were created in the Notion mirror,
so for one day the read-only mirror was the *only* record of four findings
and the source of truth silently lacked them. Recovered here on 2026-08-01
from `reports/2026-07-31.md` (merged, authoritative) with the Notion rows as
corroboration — not rewritten from Notion. **This is the fourth
backlog-misreports-its-own-state incident, and a new variant of it:** the
previous three were items left unchecked after shipping; this one is a report
asserting a file change that did not happen, which no gate catches because
nothing compares a report's claims against its own diff.

- [ ] **HIGH — Branch protection on `main` was never configured, so the
      auto-merge CI gate does not exist.** `gh api
      repos/dominiquebrom28/studio-site/branches/main/protection` returns
      `404 "Branch not protected"` — re-confirmed 2026-08-01, still 404.
      `.github/AUTO-MERGE-SETUP.md` lists four one-time manual steps; three
      are done (auto-merge enabled, the `safe-auto` label exists, `gh`
      authenticated) but **step 2 — require the `CI / build` check on `main` —
      never was.** That doc's own words about step 2: "even a PR with
      `safe-auto` enabled cannot merge until this required check is green."
      That sentence is currently false. The four PRs the lane merged on
      2026-07-18 were guarded by the path allowlist alone, never by CI.
      **Sequence this BEFORE re-adopting the labeling habit** — turning the
      lane back on first would be enabling self-merge with the safety catch
      off. One-time Dom action in the GitHub UI, no PR. _Source: 2026-07-31
      run; re-verified 2026-08-01._
- [ ] **HIGH — The auto-merge lane works, and the studio stopped using it.**
      Not broken infrastructure: the lane merged PRs #10/#11/#12/#17 on
      2026-07-18 via `app/github-actions` — **those four are its only
      successful runs in the repo's entire history, all on that one day.**
      Everything since is skipped runs, because no PR has carried the
      `safe-auto` label since. Re-checked 2026-08-01: **still zero labelled
      PRs**, and Dom merged all seven of the 2026-07-31 batch by hand. Fix is
      process, not code — the run playbook should classify and label each PR
      after opening it. **But this may simply be Dom's preference**, and if so
      the honest resolution is to close this item as a deliberate decision
      rather than leave it open forever; ask before building the habit.
      Sequence AFTER branch protection. _Source: 2026-07-31 run; re-verified
      2026-08-01._
- [ ] **MEDIUM — Nothing surfaces a red CI check, and nobody reads the
      artifacts.** PR #69's `e2e` failed 2026-07-29 and sat red and unexamined
      for two days while six green PRs queued behind it — the only red check
      in the queue. It was diagnosable the whole time: an unexpired 2MB
      `playwright-report` artifact with a full trace, one `gh run download`
      away, which is how the 07-31 run eventually root-caused it. Two gaps:
      (a) nothing notifies when a check goes red, and `e2e` is deliberately
      non-required so it blocks nothing; (b) the run playbook has no
      "download the artifact **before** re-running" step, and a re-run
      destroys the cheapest evidence available. Worth keeping the irony: PR
      #70 added artifact capture for the smoke suite on the theory that the
      next failure should be diagnosable — it was right, and the artifact that
      solved it was one Playwright had been writing all along. **Capturable is
      not the same as read.** _Source: 2026-07-31 run._
- [ ] **LOW — Nine stale worktrees, 764MB — and the blocker is now cleared.**
      `git worktree list` holds nine leftovers no run ever removed: five under
      `.claude/worktrees/` (764MB total; `dom4-capture` alone is 197MB of
      captured media) and four under a dead 2026-07-28 session's scratchpad.
      The 2026-07-31 run refused to sweep because one of them —
      `mystifying-wilbur-276efe` on `team/2026-07-20-fix-post-count` — still
      held an uncommitted pin-by-slug fix, and a blind sweep would have
      destroyed real work. **Resolved 2026-08-01:** the lead diffed that file
      against `main` and it is **fully superseded** — PR #26 shipped the same
      five-slug pin more thoroughly (a dedicated `LEGACY_POSTS` test plus a
      `>=` floor, instead of the stranded diff's inline rewrite of
      `expect(posts.length).toBe(5)`). The only fragment `main` lacked was a
      stale comment reading "currently 3-post" when there are 16; **that
      one-line fix is carried forward in this PR**, so nothing is lost by
      removing the worktree. All nine are now clean (`git status --porcelain`
      empty in each). Sweeping is a destructive operation across other
      sessions' directories, so it stays Dom's call — the branches and commits
      survive `git worktree remove`; only the checkouts go. _Source:
      2026-07-31 run; blocker cleared by the lead 2026-08-01._

### Added 2026-08-01 (impact-ranked; slot above "Pre-launch review")

- [ ] **MEDIUM — `PROJECT-BRIEF.md`'s team headcount is stale, and the site
      contradicts it in public.** The brief — the document every scheduled run
      reads first, and the stated source of truth for goals and voice — says
      "one Project Lead orchestrating **8 specialist subagents**". The roster
      has since grown by the `visual-media` hire (DOM-5, PR #13), and the
      site's own footer copy says **"10 AI characters"**. Two surfaces, two
      numbers, both public. This blocked real work rather than being cosmetic:
      the 2026-08-01 studio-site write-up **deliberately avoided stating any
      headcount** because there was no number it could state without
      contradicting one surface or the other, so a page about the AI team
      cannot currently say how big the AI team is. Fix at the source — correct
      the brief, then grep for every other place a count is asserted
      (`content/`, `src/components/`, `docs/`) and make them agree, or state
      the count in exactly one place and derive it. Related: the Notion mirror
      still cannot attribute the tenth cast member (item above), which is the
      same "the cast grew to 10 and a system still says 9" class. _Source:
      named product gap, found 2026-08-01 by the lead while reviewing the
      studio-site portfolio copy; both figures verified against
      `PROJECT-BRIEF.md` and the rendered footer._
- [ ] **MEDIUM — 16 posts, one reverse-chronological list, and no way in.**
      The blog is the site's main body of work (PROJECT-BRIEF goal 2) and it
      has exactly one view: everything, newest first. A first-time reader
      landing on `/blog` gets 16 similarly-titled logbook entries with no
      indication which are the good ones, and the genuinely strong
      retrospectives ("What the green checkmarks missed", "True by accident")
      are indistinguishable from routine day-logs. **Record the constraint
      before someone builds the obvious thing:** tag-filtering is NOT the
      answer here and should not be built without new evidence — tags are
      already authored on every post and rendered as text by `PostCard` and
      `BlogPost`, but the vocabulary is lopsided (**14 of 16 posts are tagged
      `logbook`**; 15 of the 22 distinct tags appear exactly once), so a tag
      filter would mostly render one bucket containing almost everything.
      What is actually missing is editorial: a small curated "start here" set,
      or a visible distinction between retrospectives and day-logs. That is a
      content-judgement call and reads as a **Dom checkpoint**, not something
      to auto-generate. Sequence after the `/reports` surface question is
      settled — both are "how does a reader navigate this site's own record"
      and answering them separately risks two competing indexes. _Source:
      named product gap, found 2026-08-01; tag counts measured across
      `content/posts/*.md`._

Add new items to this list (bottom, or prioritized with a note) when run
reports surface work worth doing — but never reorder Dom's edits.

## Run report format (`reports/YYYY-MM-DD.md`)

- **Item worked on** and branch name
- **What was done** — agents deployed, output summary
- **Decisions made** and why
- **For Dom to review** — the branch, plus any open questions
- **Learnings** — anything blog-worthy: surprises, failures, costs, wins

### Provenance blocks (binding since 2026-07-23 — see `docs/provenance-model.md`)

Each shipped item that **created files** gets one fenced `yaml provenance`
block appended to the report. Prose above it is unchanged and never parsed;
the block feeds the site's provenance generator (PR #44). Rules (spec §4.1):
`produced` lists repo-relative paths of files this run **created** (a path
may appear in at most one report, ever — this is a creation record, not an
edit log); `judge: null` is a positive claim ("explicitly not
Judge-reviewed"), omit the key only if genuinely unknown; never split a
combined token figure across items; `authors`/`reviewers[].by` must resolve
to a cast `name` (the discipline string, e.g. "marketer", "Project Lead") or
the literal `"Dom"`. Forgetting the block is self-correcting — the site
shows "no run record" — so **never invent one to fill the gap**, and a run
that created no content files should say so in prose rather than force a
block.

````
```yaml provenance
item: example-item
title: Example item
branch: team/YYYY-MM-DD-example
produced:
  - content/posts/YYYY-MM-DD-example.md
authors: ["marketer"]
reviewers:
  - by: "Project Lead"
    kind: fact-check
judge: null
tokens: { approx: 150000, scope: run }
```
````
