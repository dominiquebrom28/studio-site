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
- [x] **Pre-launch review** — security-auditor + designer critique; fix
      findings. Then STOP and ask Dom about deployment.
      _(2026-08-07, team/2026-08-07-pre-launch-review, PR #115 — awaiting Dom.
      Unstarted since 2026-07-15; the oldest item in this file. **Its scope was
      corrected on contact and that correction is the honest part:** it was
      written as a gate *before* a first deploy, and the site has been live at
      `doms-ai-studio.vercel.app` for weeks — so running it as written was
      impossible. It ran instead as the periodic whole-codebase audit the
      standing rules already call for (security-auditor's own charter: "before
      any production deploy … and periodically on the whole codebase"). Both
      agents read-only and in parallel; findings written up in
      `docs/pre-launch-review-2026-08-07.md`. **Fixed in that PR:** the P1
      auto-merge disarm gap (`gh pr merge --auto` is sticky repo-side state —
      removing the `safe-auto` label after an unsafe commit did NOT un-arm it,
      so GitHub would have squash-merged the unreviewed commit the moment CI
      went green); the indexable soft-404 (`NotFound` served 200 with no
      `noindex`); the bot-comment fence break-out (unsafe filenames were
      interpolated inside a ``` fence in the guard's comment); plus two design
      fixes — the site's own project entry made `featured: true, order: 0`, and
      a TL;DR chip on `PostCard` derived from `post.tldr` presence rather than a
      new frontmatter flag. Everything not fixed here is logged as its own item
      under "Added 2026-08-07" below rather than left inside a review document.
      Deployment question is moot; the standing question of whether to re-run
      this periodically is Dom's.)_

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
      _(**Second source, 2026-08-13:** the 2026-08-07 pre-launch review reached
      the same item independently — `docs/pre-launch-review-2026-08-07.md` §2's
      "Live-header verification + setting `SMOKE_URL`". Deduped into this item
      rather than added twice. It adds one thing this item did not say: the URL
      choice is itself the decision (prod vs a preview pattern), and setting it
      makes CI depend on that deployment being reachable when the job runs. The
      header-verification half of that bullet is its own new item below —
      "Nothing has ever made an HTTP request to the live site" — because it
      needs an assertion written, not just a variable set._
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

- [x] **HIGH — Unmerged feature tail stranded on `team/2026-07-19-project-page-v2`
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
      _(2026-08-05, team/2026-08-05-buildmode-tail, PR #105 — awaiting Dom.
      **Closed as "assessed", not as "decided":** the item's only next step was
      "Dom's call" and there was nothing to decide from, which is why it sat
      open two weeks. architect read all 11 files at the tip against `main` and
      wrote `docs/buildmode-tail-assessment.md`; the branch is also now pinned
      by a local tag `archive/2026-07-19-buildmode-tail`, so the commits can
      never be gc'd. **Recommendation is (c), split three ways**, not the
      item's (a) or (b): recover the layout fix only; drop `buildMode` as
      superseded by `soloBuild` (shipped 2026-07-24, load-bearing across 24
      files — every one of the five file conflicts is a copy/product decision,
      not a merge conflict, and there are still zero team-built projects to
      justify the feature); keep `docs/team-rebuild-model.md` as reference-only
      for its §3 evidence-asymmetry and §4 no-scoreboard reasoning.
      **The archaeology found something bigger than the item** — a live,
      measured caption-overlap bug and a published post describing its
      never-merged fix; logged as its own HIGH item below. Honest note: `[not
      reconstructable]` why the tail was abandoned — no report, no PR, no
      message. Three named decisions are Dom's in the PR: take the split or
      overrule it, push the archive tag, delete the branch after the port.)_
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
      _(2026-08-07 — **direct evidence for the "scheduled `npm audit`" half of
      this batch, no longer a theoretical nice-to-have.** This run found `main`
      RED on its own `npm run audit` gate (`GHSA-5p4m-2wfm-xmqj|js-yaml` — see
      the HIGH item under "Added 2026-08-07" below), and the only thing in this
      repo that ever runs that gate is a PR. A newly-published advisory against
      an already-installed dependency turns every open PR red simultaneously and
      is invisible until someone opens one. Second occurrence of exactly this
      shape in four days — the 2026-08-04 `undici` advisories (PR #101) were the
      first. The rest of the batch is unchanged.)_

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
      _(**§6 PR 2 shipped 2026-08-04**, team/2026-08-04-runs-api, merged as
      PR #98 — item still open. `getAllRuns()` plus the reverse join from run
      reports to the posts/projects they produced; no route, no component, and
      the sitemap staying at 30 URLs is the check that proves it. The join keys
      on the same object reference `buildCollection` already attaches as
      `post.provenance`, **not** on a slug derived from the report filename,
      which would silently join nothing because every content file sets an
      explicit `slug:` differing from its filename stem; reference identity also
      keeps the 2026-07-16 batch's three byte-identical-but-distinct provenance
      records from collapsing into one. **Next is §6 PR 3, the designer pass —
      a hard Dom checkpoint that gates every public surface here.**)_
- [x] **LOW — `media[].width`/`height` are never checked against the real
      image.** The schema requires them (they exist to prevent layout shift) and
      the new asset-path gate proves the file exists, but nothing verifies the
      declared dimensions match the file's intrinsic size. A wrong ratio
      reintroduces exactly the CLS the fields were added to prevent, with every
      gate green. _Source: qa-tester, 2026-07-29 asset-path-gate pass — named as
      the natural next gap by the gate that closed the path half._
      _(2026-08-04, team/2026-08-04-media-dimensions, **merged as PR #99**.
      backend-dev wrote a dependency-free PNG/JPEG/GIF header reader wired into
      the existing asset-path gate rather than a parallel one; falsified
      red→green on real content, and all 23 existing media entries already
      matched their files, so nothing was edited to make it pass. qa-tester's
      mutation pass found **three surviving mutations** the original 14 tests
      missed — progressive-JPEG `0xC2` removed from the SOF marker set, the
      `segmentLength < 2` guard loosened, the `0xFF` fill-byte skip removed —
      plus a real off-by-one in the SOF truncation bound. The code was correct;
      the tests weren't pinning it. **This checkbox lagged the merge by a day**
      — see the 2026-08-05 reconciliation note below.)_
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
- [x] **HIGH — Writing the report last structurally guarantees a stale
      `runs.generated.json`, and only CI ever says so.** PR #87 sat red for two
      days on exactly this and nothing else: it added `reports/2026-08-01.md`
      without the regenerated `src/content/runs.generated.json`, so the `build`
      job's `git diff --exit-code src/content/runs.generated.json` step failed
      and blocked the merge. **This is a sequencing trap, not carelessness.**
      `predev`/`prebuild`/`pretest` all run `scripts/provenance/generate.mjs`,
      so any local `npm run build|test|dev` regenerates the file — but the run
      report *describes the run*, so it is always written and committed **after**
      the last gate invocation. The generated artifact is therefore stale by
      construction on every report-bearing branch, and the first thing that ever
      notices is a red check on a pushed PR. Verified by reproduction: on #87's
      branch a bare `node scripts/provenance/generate.mjs` produced exactly the
      7-line 2026-08-01 row CI had been complaining about, and re-running the
      full gate afterwards produced no further drift. Fix options, cheapest
      first: (a) a committed `pre-commit` hook that regenerates and stages
      `src/content/*.generated.json` whenever `reports/*.md` is staged —
      `.githooks/` + `core.hooksPath` already exist from PR #86 and already
      propagate to worktrees, so this is a third script in a proven lane;
      (b) a run-playbook step "regenerate + `git status` after committing the
      report", which is the same instruction that has now been missed at least
      once; (c) accept it and let CI catch it, but then the red check must
      actually be surfaced — which is the *other* open item about nobody reading
      red checks, and this incident is its second confirmed instance. Prefer
      (a): it fires at the moment of damage rather than two days downstream.
      _Source: concrete product gap hit and fixed by the lead this run
      (2026-08-03); not covered by the auto-merge-allowlist item above, which is
      about `safe-auto` labelling, not freshness._
      _(2026-08-05, team/2026-08-05-artifact-freshness, PR #104 — awaiting Dom.
      Option (a): `.githooks/pre-commit` + `scripts/stage-report-artifacts.mjs`
      regenerate and re-stage `src/content/{provenance,runs}.generated.json`
      whenever a `reports/*.md` is staged, always printing which artifact was
      refreshed. A shell short-circuit runs before node starts, so an ordinary
      code commit is a silent ~30ms no-op. **Block-vs-amend was the real
      decision:** amend on success (the generator is provably correct — it is
      the exact one CI trusts), **block on generator failure**, which diverges
      from PR #86's non-blocking drift hooks deliberately — those are
      non-blocking by git *mechanics* (a `post-*` exit code cannot abort a
      completed action), not by choice, and `pre-commit` gets a real decision.
      **Lead review caught a gap:** the first cut filtered `--diff-filter=ACMR`,
      excluding deletions — but `runs.generated.json` is one row per file
      *currently* in `reports/`, so a `git rm` staleness the artifact exactly as
      much as an addition. Reproduced red, then fixed to `ACMRD` with both the
      shell and the node re-derivation reading one exported constant so they
      cannot drift, pinned by a test that fails if a future edit narrows it back.
      Lead independently falsified all three states: addition-with-hook green,
      addition-with-`--no-verify` red on the exact PR #87 shape, deletion green.
      **Note for Dom:** this makes `git commit` run node on report-bearing
      commits — opt-out per commit via `--no-verify`, but a conscious call, same
      class as PR #86's repo-local git config note.)_
- [x] **MEDIUM — Nothing measures whether anyone reads this site.**
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
      _(2026-08-06, team/2026-08-06-analytics-costing, PR #109 — awaiting Dom.
      `docs/analytics-options.md`. **Nothing installed**, per the item's own
      "recommendation, not an install" instruction: no dependency, no client
      code, no `vercel.json` edit. Recommends **Vercel Web Analytics**, with a
      preview-deploy check as a hard prerequisite. **The CSP analysis is what
      decides it, and it was done against the tree rather than from memory:**
      `script-src` is hash-pinned to a single sha256 with no `'unsafe-inline'`
      and `connect-src` is `'self'`, so a third-party analytics script is
      refused twice — on load and on beacon. Vercel WA needs **zero** CSP
      change (same-origin script + beacon, and an *external* `<script src>`,
      so no new inline hash). Three constraints found that a casual reading
      misses: the two hash guards bake `toHaveLength(1)` into four assertions
      across two suites, so any second inline script is half a day's careful
      work on the repo's most delicate test, not a one-liner; **`img-src
      'self'` kills the classic zero-JS tracking pixel** (blocked by the
      *image* directive, not the script one); and a Plausible proxy's rewrite
      entries must precede the SPA catch-all or it silently serves
      `index.html` as `text/html` with a 200. **Zero-JS was taken seriously
      and fails structurally** — this is a `createBrowserRouter` SPA, so a
      whole browsing session is ONE server request, and server logs therefore
      cannot answer "which posts get read", the exact question the item
      exists to answer; on Hobby, logs live 1 hour and drains are Pro-only,
      so the "cheap" option costs more and answers less. Every price carries
      a source; figures not corroborated from the vendor's own domain are
      marked **"not verified"** rather than recalled — including **which plan
      this project is even on**, which gates several others. Ten open
      decisions for Dom, including the legitimate "don't measure at all" (D1)
      and whether defeating readers' ad-blockers via a first-party proxy is
      acceptable on an honesty-branded site (D4).)_
- [x] **HIGH — A run cannot record its own provenance until its PRs merge (and
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
      _(2026-08-01, team/2026-08-01-provenance-ordering — **(a) done:** PRs #76,
      #77 and #78 all merged 2026-07-31, so the three preserved blocks were
      appended to `reports/2026-07-30.md` and the generator accepts all three
      (15 records, was 12). **(b) decided:** `docs/provenance-model.md` §13.
      Option 2 (merge report last, accept red CI) confirmed rejected. Option 3
      (relax the generator to trust an unmerged branch) rejected — it would
      either drop the on-disk existence check entirely or add a report-content-
      driven cross-branch GitHub lookup, reopening the injection/drift concerns
      §4.3/§7/§5.2 close. Option 4 (block lives on the creating branch) looked
      promising but does not survive contact with `parse.mjs`,
      `ProvenanceStrip.tsx`, or the (spec-only) `docs/reports-surface.md` index
      — see §13.2 for the three concrete failure modes. **Recommended and
      adopted: Option 1**, formalized as a standing step in this file's
      "Provenance blocks" convention below — pending Dom's ratification, since
      it changes the format's binding convention.)_
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
      _(2026-08-03, team/2026-08-03-backlog-and-report — closed on PR #87's
      evidence, plus a structural repair. **The close:** #87 did exactly what
      this item specified — the "QA pass" item at the top of this file is now
      `[x]` with a per-clause enumeration of the gates covering it. **The
      repair:** this item existed **twice** on `main` after #87 merged — once
      `[ ]` here, and once as a phantom `[x]` duplicate heading ~30 lines up
      whose entire body was the *provenance-ordering* item's closure note. A
      merge had inserted a copy of this heading between that item and its own
      `_(…)_` note, which both orphaned the note and manufactured a checked
      duplicate. The stray heading is deleted, so the note reattaches to the
      HIGH provenance-ordering item it belongs to; nothing else was touched and
      no prose was rewritten. **This is the fourth "backlog lies about its own
      state" incident, and it landed inside the item that counts them** — the
      count in the paragraph above is left at three deliberately, since it was
      true when written. DOM: revert this checkbox if you read #87's enumeration
      as re-scoping rather than closing; the structural repair stands either
      way.)_

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

> **CORRECTION, 2026-08-02 — the mechanism above is wrong, and the recovery
> was still right.** Found while verifying PR #91's gate against real history
> rather than against this account. The 2026-07-31 run **did** write these
> items to `BACKLOG.md`: commit `b16e7bc` (+69 lines) and `755bf7c` (+19).
> They were destroyed by a third commit — `1e5e5e8`, an in-branch
> `git merge main` made at 10:17:48, **one minute before the PR merged** —
> which resolved the `BACKLOG.md` conflict wholesale in `main`'s favour.
> `BACKLOG.md` measures 1397 lines at the merge-base and 1397 at the branch
> head, so the file dropped out of `diff(merge-base, head)` entirely, which is
> why `gh pr view 81 --json files` truthfully reported one file. **The report
> was accurate when written; the loss happened after it, in a merge.** So this
> is not "a report asserting a change that did not happen" — it is work
> silently reverted by a merge, tracked as its own HIGH item below. The
> recovery performed on 2026-08-01 was correct and is unaffected; only the
> diagnosis changes. Kept as a dated correction rather than an edit to the
> paragraph above, because how this file misread its own history is part of
> the record.

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
- [x] **MEDIUM — Nothing surfaces a red CI check, and nobody reads the
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
      _(2026-08-04, team/2026-08-04-ci-red-surfacing, **merged as PR #97**.
      devops added a `notify-on-failure` job that comments on the PR naming
      which check went red and the exact `gh run download` command, editing its
      comment in place on re-runs rather than stacking duplicates — plus the
      matching "download the artifact **before** you re-run" step in `README.md`,
      which is the half the item cared about: a re-run destroys the cheapest
      evidence available. **This checkbox lagged the merge by a day** — see the
      2026-08-05 reconciliation note below.)_
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

- [x] **MEDIUM — `PROJECT-BRIEF.md`'s team headcount is stale, and the site
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
      _(2026-08-02, team/2026-08-02-headcount-truth, PR #90 — awaiting Dom.
      **The binding answer already existed and nothing was reading it:**
      `docs/persona-bible.md` §35 has said "9 specialists plus the Project
      Lead. Never '10 specialists'" all along, and `cast.ts` agrees
      (`cast.length === 10`, `specialists.length === 9`, corroborated by
      exactly 9 files in `~/.claude/agents/`). So this was never an open
      question about the number — it was two surfaces hardcoding it
      separately. Brief corrected; all six rendered counts (Footer ×2,
      CastStrip, Cast, Home ×2) now derive from `cast.length`. **The
      deliverable is the test, not the copy edit:** `castRenderedCount.test.tsx`
      mocks the roster down to 4 and asserts every surface renders 4, so a
      component can't render the right number today while secretly holding a
      literal. Falsified with a fake 11th member — `cast.test.ts` red
      (`expected 11 to be 10`) and the footer actually rendered "11 AI
      characters". **Lead review caught a copy regression in the first cut**:
      deriving the count had changed the Cast intro from "Ten AI characters and
      one human" to "10 AI characters and one human" — a sentence opening with
      a digit while still pairing it with a spelled-out "one human". The other
      three surfaces were byte-identical because they already used the numeral
      in a "1 human + 10" arithmetic framing; only that one is prose. Fixed by
      deriving the WORD (numeral fallback past the table so an oversized roster
      degrades legibly), plus a new `src/pages/Cast.test.tsx` pinning the real
      rendered sentence against the real roster — which the mocked suite
      structurally cannot do, since `vi.mock` is file-scoped. **Net public copy
      change: none.** `content/posts/**` deliberately untouched: every stale
      count there was true when written, and the founding post already carries
      its own addendum about the growth to ten — no retconning.)_
- [x] **MEDIUM — The provenance format can only record file *creation*, so a
      run whose deliverable is an edit has nothing it can honestly claim.**
      Surfaced 2026-08-01 by the very first application of the new §13 rule,
      on the run that wrote §13. A `yaml provenance` block's `produced` list
      is a creation record and `generate.mjs` resolves each path's *adding*
      commit (`--diff-filter=A`). But three of this run's four lanes shipped
      work whose main artifact is a **modification** — §13 into an existing
      `docs/provenance-model.md`, the regex pinning in
      `provenance-schema.ts`, the auto-merge allowlist line. Claiming those
      files as `produced` would attribute an earlier run's creation commit to
      this run — the exact error PR #72's archaeology refused when it excluded
      three project pages, and the reason those pages honestly show "no run
      record". So the honest options today are to omit the block entirely (a
      real run showing no record) or to record only the incidentally-created
      files, which under-describes the work. **Do not fix this by loosening
      `--diff-filter=A`** — that is what makes a creation record true. Worth
      deciding deliberately: a second block kind (`modified:`) with different
      commit semantics, an explicit "this run edited, did not create" prose
      convention, or accepting the gap and documenting it in §13 so the next
      run does not re-derive it. _Source: Project Lead, 2026-08-01 — observed
      while applying §13 to this run's own report, not hypothetical._
      _(2026-08-02, team/2026-08-02-provenance-modified, PR #89 — awaiting Dom.
      **DECISION: accept the gap.** `docs/provenance-model.md` §14 + a §13.1
      cross-reference (§13 is about *timing*; §14 is about *kind*). **Zero
      code** — no schema, generator, parser, loader or component change, all 15
      records untouched, drift gate green. The frame that decides it (§14.2):
      exactly ONE field in a `ProvenanceRecord` is git-derived — `commit`;
      `authors`/`reviewers`/`judge`/`tokens` are asserted and merely *typed*.
      So the feature rests on one narrow always-checkable claim, and any option
      that makes an edit RENDERABLE without a comparably mechanical check
      inverts it rather than extending it. **Names the real hazard, which
      nothing in CI can catch:** listing an edited file under `produced:`
      doesn't error — it silently resolves an EARLIER run's creation commit and
      ships a green build carrying a false claim, because the duplicate-path
      guard only fires when another report already claimed that path, and none
      ever has. The convention is the only guard. Six options rejected in
      writing; (C) `modified:` anchored to a PR number was the closest call —
      it genuinely does keep falsifiability, so it lost on cost, not principle,
      with an explicit §14.8 revisit trigger rather than being nailed shut.
      Lead independently verified every load-bearing code claim, including two
      that carry the argument: **4 of the 15 existing records already render
      nowhere** (`loader.ts` globs only `content/posts` + `content/projects`),
      and squash-merge really does break date-scoping (`runId:
      2026-07-19-evening` resolves to a commit dated `2026-07-20T21:39:38`).
      §14.7's binding convention text lands in this file below rather than in
      that PR, to avoid a three-way `BACKLOG.md` conflict with PR #87.
      **Adopted pending Dom's ratification** — it changes the format's binding
      convention, same posture as §13.)_
- [x] **MEDIUM — Nothing checks a run report's claims against its own diff.**
      PR #81 was titled "Backlog + 2026-07-31 run report", its report said the
      branch was "`BACKLOG.md` + this report", and it touched only
      `reports/2026-07-31.md`. Four findings existed solely in the Notion
      mirror for a day (recovered 2026-08-01 — see the RECOVERED section
      above). Every other artifact in this repo is gated: content is
      Zod-validated, routes are smoke-tested, both generated artifacts are
      drift-checked. A run report can assert anything about its own branch
      with nothing verifying it, which makes it the last unaudited artifact
      here — and reports are load-bearing, since blog posts and this backlog
      are both derived from them. Cheapest useful gate: on a branch containing
      a new `reports/*.md`, compare file paths named in its "Item worked on"
      table and prose against `git diff --name-only main...<branch>`, and fail
      on a claimed path the branch does not touch. Keep it narrow — it should
      catch "said BACKLOG.md, did not touch BACKLOG.md", not grade prose.
      _Source: Project Lead, 2026-08-01 — the fourth
      backlog-misreports-its-own-state incident, and the first that is a false
      claim rather than a stale one._
      _(2026-08-02, team/2026-08-02-report-claims-gate, PR #91 — awaiting Dom.
      `scripts/check-report-claims.mjs` + 31 tests, wired into the **required**
      `build` job. **This item's own premise turned out to be wrong, and the
      correction is the more valuable half — see the item directly below.**
      PR #81's branch DID write `BACKLOG.md`, twice (`b16e7bc` +69,
      `755bf7c` +19); an in-branch `git merge main` (`1e5e5e8`, one minute
      before the PR merged) resolved the conflict wholesale in main's favour
      and silently discarded all 88 lines. `BACKLOG.md` is 1397 lines at the
      merge-base and 1397 at the branch head, so the file vanished from
      `diff(merge-base, head)` — which is exactly why `gh pr view 81 --json
      files` showed only the report. **The report was accurate when written.**
      The gate still fires correctly on the real case (claims `BACKLOG.md`,
      branch diff is `reports/2026-07-31.md` only → violation); what changes is
      the diagnosis it points at. **Scope decision:** a path counts as a claim
      only if its text block also names the branch's OWN name — narrower than
      keying off an "Item worked on" heading, because the corpus spells that
      heading five ways or omits it, and because PR #81's false claim was under
      "For Dom to review", under no such heading. Extension whitelist grounded
      in the repo's real `git ls-files` set keeps contrast ratios, timings and
      semver from matching; `yaml provenance` blocks deliberately not
      re-checked (already gated). Exit code 2 = INCONCLUSIVE and still fails
      CI, so this can never become another silently-skipping gate like
      `SMOKE_URL`. Five mechanisms falsified red→green; disabling the
      branch-self-reference filter alone turns 5 tests red including 3 real-
      corpus regressions. **Lead swept all 24 reports** through the gate's own
      exported logic against the real commit that introduced each: 24/24 zero
      violations. A deliberately harsher variant (test every branch a report
      mentions, not just its own) flags 3 multi-lane reports — which is exactly
      the false-positive class the filter prevents, confirming it does real
      work. **COVERAGE DISCLOSED, because "24/24 clean" would overstate it:**
      measuring what the gate *examined* rather than what it returned, only
      **2 of 23 reports contain a single path claim it can see** (upper bound
      under the most generous branch matching: 7 of 24 reports, 7 claims
      total), and it extracted **zero** claims from this run's own report. On a
      typical report it is a no-op that passes green — the same shape as the
      unset `SMOKE_URL`. Merged-worthy anyway because one of the two it does
      see is `reports/2026-07-31.md`, the real incident, and because the
      thinness has a defensible cause: reports name a file OR a branch in a
      block, rarely both, and loosening the extractor buys coverage with the
      false positives that kill gates here. **The honest fix is a report-format
      convention, not a looser regex** — a files-produced column in the "Items
      worked on" table would make every claim visible. Not done: it changes the
      report format, which is Dom's to ratify. See the follow-up item below.)_
- [ ] **MEDIUM — Give the "Items worked on" table a files-produced column, so
      the report-claims gate can actually see anything.** PR #91's gate is
      correct and narrow, and on today's corpus it inspects **2 claims across
      23 reports** — it passed this run's own report having extracted zero.
      That is not a bug in the gate: a path only counts as a claim when it sits
      in the same block as the branch's own name, and reports habitually name a
      branch in the Items table and the files somewhere else entirely. The
      cheap fix is structural rather than a looser regex (which would buy
      coverage with false positives, the failure mode this repo has already
      been burned by twice): add a "Files produced/changed" column to the
      "Items worked on" table, so every lane states branch and paths adjacently
      and the gate's existing extractor sees them with no code change at all.
      **Dom checkpoint** — it changes the run report format, and belongs beside
      the §13/§14 conventions rather than being slipped in by a CI PR. Sequence
      after PR #91 merges. _Source: Project Lead, 2026-08-02 — measured, not
      assumed; both figures reproduced against the real report corpus._
      _(2026-08-06, team/2026-08-06-report-contract — awaiting Dom's sign-off
      on the format change itself, so left unchecked. Proposed column +
      example row documented under "Run report format" below. **Verified
      empirically, not assumed:** a row in the new shape needs zero change to
      `check-report-claims.mjs`'s extractor — confirmed with a constructed
      row and a new regression test. One real bug WAS found and fixed along
      the way: `PATH_TOKEN_RE` silently never matched a compound extension
      (`.test.ts`, `.d.mts`, `.generated.json`) because its final path
      segment forbade a dot in the name part — meaning every `.test.ts`/
      `.d.mts` sibling this repo's own scripts ship would have been dropped
      from a Files-produced cell. Fixed (one-line regex widening, see that
      file's header "COMPOUND EXTENSIONS"), with a false-positive check
      against the existing contrast-ratio/timing/semver test cases showing no
      new false positives. This item stays open until Dom ratifies the format
      change; the code-side half is done.)_
- [x] **HIGH — An in-branch `git merge main` can silently revert the branch's
      own edits, and nothing detects it.** The true root cause of the 2026-07-31
      loss, found 2026-08-02 while verifying the gate above — and misdiagnosed
      for two days as "a report claimed a change it never made." It was not a
      false claim: the work existed in two commits and a merge destroyed it.
      When a long-lived report/backlog branch falls behind `main` and someone
      merges `main` into it, a conflicted file can be resolved entirely in
      `main`'s favour, reverting the branch's own additions **to zero net
      diff** — after which GitHub, CI, and the PR file list all agree the
      branch never touched the file, because by then it genuinely doesn't.
      There is no red anything. `BACKLOG.md` is the standing victim because it
      is edited by nearly every run and is the one file two concurrent
      scheduled tasks both write. **Checked on the open PR #87** (identical
      shape: BACKLOG edits + an in-branch merge from main): healthy, 1428 →
      1668 lines, all four recovered items present at head — so this is not
      currently burning, but it went undetected once already. Cheap detections
      worth costing: (a) after any in-branch merge, assert
      `git diff --name-only <merge-base> HEAD` still contains every file the
      branch's own commits touched, and fail loudly if one dropped out —
      catches it at the moment it happens, on the branch, before the PR; (b)
      rebase rather than merge for report/backlog branches; (c) stop the two
      scheduled tasks sharing one checkout (existing item), which is what puts
      these branches far enough behind `main` to conflict in the first place.
      Note (a) is strictly stronger than PR #91's gate — it needs no report and
      no prose, and would have caught this the minute it happened. _Source:
      Project Lead, 2026-08-02 — verified against real git history
      (`b16e7bc`, `755bf7c`, `1e5e5e8`, merge-base `56e8dfb`), not inferred._
      _(2026-08-05, team/2026-08-05-merge-revert, PR #103 — awaiting Dom.
      Detection (a), as `scripts/check-merge-revert.mjs` in the **required**
      `build` job. Walks the branch's own first-parent chain since its
      merge-base, unions what its non-merge commits touched, and attributes any
      path missing from the net diff to whichever commit touched it **last** —
      a merge means violation, the branch's own later commit means self-caused
      (add-then-delete, deliberate revert) and is never flagged. That last-touch
      rule is what makes it usable rather than noisy. **The false-positive
      analysis is the deliverable:** a non-conflicting auto-merge converging on
      identical content is argued structurally impossible to false-positive; a
      conflict resolved in main's favour is ruled a TRUE violation even if the
      content coincidentally matched, because the branch's edit is gone either
      way; renames normalise and surface as a note. **It found a CI trap the
      item did not know about:** on `pull_request` events `actions/checkout`'s
      HEAD is GitHub's synthetic test-merge commit, whose **first parent is
      `main`, not the PR branch** — walking from a bare HEAD would have checked
      main's own history and reported clean on every PR forever. Fixed by
      passing `github.event.pull_request.head.sha`, with the script REFUSING to
      fall back (INCONCLUSIVE, exit 2) rather than guess. Lead independently
      re-ran everything: the real incident fires with the exact commits named
      (exit 1), the guard exits 2, self-check exits 0, and the permanent corpus
      sweep is **97 merge commits → 96 clean, 1 violation (PR #81), 0 false
      positives**, including PRs #87 and #92 which share the identical shape.
      Option (b), the rebase habit, is NOT done here — detection only; the
      violation message recommends it.)_
- [ ] **MEDIUM — 22 posts, one reverse-chronological list, and no way in.**
      (Counts corrected 2026-08-07 — was written as "16 posts" on 2026-08-01.)
      The blog is the site's main body of work (PROJECT-BRIEF goal 2) and it
      has exactly one view: everything, newest first. A first-time reader
      landing on `/blog` gets 22 similarly-titled logbook entries with no
      indication which are the good ones, and the genuinely strong
      retrospectives ("What the green checkmarks missed", "True by accident")
      are indistinguishable from routine day-logs. **Record the constraint
      before someone builds the obvious thing:** tag-filtering is NOT the
      answer here and should not be built without new evidence — tags are
      already authored on every post and rendered as text by `PostCard` and
      `BlogPost`, but the vocabulary is lopsided (**20 of 22 posts are tagged
      `logbook`**; 16 of the 24 distinct tags appear exactly once), so a tag
      filter would mostly render one bucket containing almost everything.
      What is actually missing is editorial: a small curated "start here" set,
      or a visible distinction between retrospectives and day-logs. That is a
      content-judgement call and reads as a **Dom checkpoint**, not something
      to auto-generate. Sequence after the `/reports` surface question is
      settled — both are "how does a reader navigate this site's own record"
      and answering them separately risks two competing indexes. _Source:
      named product gap, found 2026-08-01; tag counts measured across
      `content/posts/*.md`._
      _(2026-08-07 — recount + a costed recommendation, still unbuilt. **The
      counts moved against the blog, not for it:** six more posts since
      2026-08-01, and the `logbook` tag went from 14/16 to **20/22** while the
      long tail got longer (16 of 24 distinct tags now appear exactly once).
      The item's own constraint is therefore stronger than when it was written,
      not weaker — a tag filter would today render one bucket holding 91% of
      the corpus. Conclusion unchanged: do not build tag filtering.
      **Designer's costed recommendation (2026-08-07 pre-launch critique):** a
      curated **"Start here" rail of 3 hand-picked posts** above the existing
      reverse-chron list. Editorial picks are Dom's, not the machine's;
      **~half a day**; **no schema change**. Its supporting observation is the
      useful part — the corpus *already* has a real seam, it is just unlabeled:
      the first 5 posts (`2026-07-15` … `2026-07-19`) are origin-narrative prose
      with no `tldr` at all, while **17 of 22** carry the `blog-format-v2`
      incident-report shape (`tldr`, and `backlogRefs` on 6 of those). So the
      distinction the reader needs exists in the data already. It explicitly
      recommends **AGAINST** adding a `type:` frontmatter enum to make it
      explicit: derive from `tldr` presence instead, because a parallel flag
      would drift from whether a `TLDRBlock` actually renders. PR #115 shipped
      exactly that derivation for the card-level TL;DR chip, so the precedent is
      set. Still a **Dom checkpoint** — nothing here picks the three posts.)_

### Added 2026-08-04 (impact-ranked; slot above "Pre-launch review")

- [x] **HIGH — A run that stops on the review throttle pushes a branch and
      opens no PR, and nothing tracks that the work exists.** On 2026-08-03
      the daily run did the right thing — seven PRs were open against a stated
      throttle of four to six, so it declined to open an eighth announcing that
      the queue was too long — and then pushed
      `team/2026-08-03-backlog-and-report` and stopped. That branch held a
      415-line run report, a HIGH backlog item (the stale-`runs.generated.json`
      trap above), and a real structural repair to this file. **For a day the
      only record that any of it existed was a branch name.** It was recovered
      on 2026-08-04 only because the lead diffed `git branch -a` against
      `reports/` on a hunch while investigating a missing report — no gate, no
      playbook step, and no report pointed at it. This is the **second distinct
      stranding class** in this repo: the other, `team/2026-07-19-project-page-v2`'s
      unmerged `buildMode` tail, is still open two weeks later. Note the
      throttle behaviour itself was correct and should not be "fixed" by
      relaxing it. Options, cheapest first: (a) the throttled run opens a
      **draft** PR — visible in the PR list, excluded from the review-capacity
      count by construction, and it makes the work reviewable the moment
      capacity frees up; (b) a run-start step that lists `team/*` branches with
      no associated PR and reports them; (c) both. Prefer (a) — it removes the
      stranding at the moment it would otherwise happen, rather than adding
      another thing a future run must remember to check. _Source: Project Lead,
      2026-08-04 — observed and recovered this run, not hypothetical._
      _(2026-08-05, team/2026-08-05-stranded-branches, PR #106 — awaiting Dom.
      Built **(c)**, both halves, because (a) alone cannot surface the
      strandings that already exist. `scripts/check-stranded-branches.mjs`
      reports `team/*`/`claude/*` branches neither merged into `main` nor
      covered by a PR, with the same three exit codes as its siblings
      (INCONCLUSIVE still fails, so a missing `gh` can never read as a clean
      bill of health). **Two stranding shapes, and the second is what earns it:**
      `strandedNoPr` (the literal 08-03 incident) and `strandedStalePr` — a PR
      exists but none accounts for the branch's *current tip*, which is how
      `team/2026-07-19-project-page-v2` is caught (merged PR #25, then six
      never-re-PR'd commits). A CLOSED unmerged PR deliberately never counts as
      coverage. **Not** wired into the required `build` job — several `team/*`
      branches mid-review is this repo's normal state, and failing every PR over
      an unrelated sibling is the false-blocking mode the other gates avoid.
      Half 2 records the draft-PR convention in `README.md`. **Lead triage of
      the 9 it found, since "9 stranded" is not "9 losses":** 3 hold content
      genuinely absent from `main` — the `buildMode` tail, a 23-line
      `## Notion backlog mirror` section for `CLAUDE.md` (`grep -ci notion
      CLAUDE.md` on main returns **0**), and a ~9-line addendum to
      `reports/2026-07-20.md` recording a post-merge 241/241 gate check,
      verified line-by-line as missing after 15 days. The other 5 are
      redundant, their files confirmed present on `main`. The two small losses
      are tracked as their own item below.)_
- [x] **LOW — `loader.ts`'s `provenanceArtifact` comment says the artifact is
      "gitignored on purpose"; it has been committed since 2026-07-27.** The
      comment block above `provenanceArtifact` in `src/content/loader.ts`
      contradicts `.gitignore`, which records the 2026-07-27 commit-the-artifact
      reversal. Found by frontend-dev while making that binding an export for
      PR #98 and **deliberately left unfixed** to keep that PR's scope to the
      one-line export — flagged rather than silently swept in. Same doc-drift
      class PR #66 cleaned up, and the same class as the two stale references
      PR #71 annotated. _Source: frontend-dev, 2026-08-04, during PR #98._
      _(2026-08-07, team/2026-08-07-gate-and-doc-truth, PR #116 — awaiting Dom.
      **Two** comments were wrong, not just the one the item named: the file-header
      block above the `provenanceArtifact` glob, and a second "generator-written
      and gitignored" assertion in the JSDoc on the Zod-rejection branch ~50
      lines further down. Both now say the artifact is COMMITTED as of the
      2026-07-27 reversal, cite `.gitignore` and `docs/provenance-model.md`
      §5.2/§5.3, and give the reason (Vercel's shallow-clone deploy build cannot
      regenerate it from history, so the committed copy is the fallback, kept
      honest by CI's drift gate) — dated, so the next reader can check the claim
      rather than inherit it. Comments only; no behaviour change.)_
- [ ] **LOW — Bookkeeping PRs now stack three deep, and the stacking is
      load-bearing but undocumented.** Today's chain is #87 → #92 → the
      recovered 2026-08-03 branch → #99, because every backlog-and-report PR
      appends to the same region of `BACKLOG.md` and a second branch cut from
      `main` conflicts with the first. The pattern works — #92 used it
      deliberately and said so — but it has real consequences nobody has
      written down: merging the tip merges the whole chain, so Dom cannot
      merge today's report without also merging 08-02's and 08-03's, and
      reviewing the tip in isolation is impossible. Observed cost this run:
      `BACKLOG.md` merged clean through the chain, but
      `src/content/runs.generated.json` conflicted and had to be resolved by
      regenerating rather than hand-merging — **a third confirmed instance of
      the stale-generated-artifact trap logged as HIGH above**, this time
      surfacing as a merge conflict instead of a red check. Worth either
      documenting the stacking convention in the run playbook (when to stack,
      how to say so in the PR body, that generated artifacts are resolved by
      regeneration and never by hand) or removing the need for it — e.g. one
      append-only `BACKLOG-INBOX.md` per run that a later pass folds in.
      _Source: Project Lead, 2026-08-04 — measured on this run's own branch._

### Added 2026-08-05 (impact-ranked; slot above "Pre-launch review")

- [x] **HIGH — Desktop `BuildTimeline` phase captions overlap on
      `/projects/mensapp` and `/projects/studio-site`, and a published post says
      this was fixed.** `content/posts/2026-07-19-three-tries-at-the-same-overlap.md`
      is live (`draft: false`) and describes the captions leaving absolute
      positioning for an ordered list *"where overlap is structurally impossible
      rather than merely tested against."* **That rewrite is not on `main`** — it
      exists only in the stranded tail's commit `ba799f8`, now preserved at tag
      `archive/2026-07-19-buildmode-tail`. **Measured** in a real browser at
      1280px against the built `dist/`, not computed: mensapp overlaps by
      **196.3px** (above row) and **182.5px** (below row); studio-site by
      **76.7px** and **60.4px**. The text is genuinely unreadable — italic
      caption text interleaved character-for-character, screenshot-confirmed,
      not a transparent-padding artifact. Scope is exactly the two projects with
      5 phases clustered early in a long date domain; pizzaparty, lovediary,
      soulforge and portfolio (2–3 well-spaced phases) are clean, and
      chart-token-playground renders no process section. **One of the two
      broken pages is the site's own portfolio entry** (shipped in PR #84), on
      the site whose positioning is honest provenance. Fix per
      `docs/buildmode-tail-assessment.md` §5a: a **manual port** of ~150 lines
      (the layout code is interleaved with handoff code that must be stripped —
      not a cherry-pick), plus the `docs/project-page-v2.md` §2.2 amendment the
      tail's own comments falsely claim was already made, plus a real-browser
      before/after. **Skip the tail's `CommitLog` commit** — that bug measured as
      already absent on `main` (~404px clearance). Worth adding a Playwright
      assertion in the existing `e2e/` lane pinning no-same-row-overlap: this
      class has escaped a green suite four times. _Source: 2026-08-05 run —
      found by architect during the tail assessment, then measured by
      visual-media rather than trusted._
      _(2026-08-06, team/2026-08-06-timeline-overlap, PR #111 — awaiting Dom.
      Ported and gated. The rule keeps every commit-scaffold detail and gains
      a small numbered marker per phase; the narratives moved into an `<ol>`
      in normal document flow beneath it. Root cause restated as arithmetic
      rather than bad luck: `w-56` (224px) fixed-width boxes anchored to a
      date axis inside a **720px** column, with 5 phases averaging ~180px
      apart, cannot not overlap — which is also why the six 2–3-phase pages
      were always clean. `numberPhasesChronologically` ported into
      `src/lib/timeline.ts` as pure DOM-free logic; §2.2 amended for real
      this time. **This item's own instruction was wrong, and measuring
      caught it.** It said to skip the tail's `CommitLog` commit because that
      bug measured as absent on `main` (~404px clearance) — but that reading
      was taken against UNPORTED `main`, where the old `pt-[22rem] pb-[22rem]`
      caption padding was incidentally supplying the clearance. Remove the
      captions and it goes too: measured in real Chromium at 1280px against
      built `dist/`, the last `<li>` sat at **exactly 0px** from the
      `<details>` commit log on **all six** project pages. Fixed with `mb-6`
      on the layout container (spacing belongs to the container, not the leaf
      disclosure) rather than porting the commit; re-measured at 24px.
      **The gate the item asked for shipped**: `e2e/timeline-overlap.spec.ts`,
      15 tests, routes discovered from `content/projects/*.md` frontmatter
      mirroring `ProjectDetail.tsx`'s own branch logic so a future clustered
      project is covered without a list edit. Built deliberately against the
      vacuous-pass failure this repo has shipped twice: it asserts a real
      `<ol>` exists and `<li>` count > 0 BEFORE measuring, and
      chart-token-playground asserts both zero timeline nodes AND that the
      page rendered real content, so "found nothing because correct" can
      never be confused with "found nothing because broken". Four
      falsifications, all red then reverted, **none failed to fail** —
      including stashing the entire component fix, which fires the
      zero-elements guard on the real historical shape. 549 unit + 64/64
      Playwright (49 pre-existing + 15 new), axe clean on both pages. Named
      residual gap: a 0-or-1-phase process block is trivially passed by a
      consecutive-pair loop; no current content has that shape.)_
- [ ] **MEDIUM — Nothing checks that a run's shipped lanes get checked off in
      `BACKLOG.md`, and it just failed for the fifth time.** PR #100
      (2026-08-04) added five new backlog items and closed one, but **never
      checked off the three lanes that run shipped** — PRs #97, #98 and #99 all
      merged, and `BACKLOG.md` on `main` contained **zero** references to any
      `team/2026-08-04-*` branch until this run healed it. Two items therefore
      read `[ ]` for a day after their work was merged. This is a **different
      mechanism from the other four incidents**: not stale-after-shipping
      (DOM-1/DOM-5), not a merge dropping work (PR #81), not a phantom duplicate
      heading (PR #87) — the check-offs were simply never written, while new
      items in the same commit were. Every other artifact here is gated; the
      one asserting what is done is not. A cheap structural check now exists to
      build on: a run report's "Items worked on" table already names each branch
      and PR, so a gate could assert that every branch named in a **merged**
      report appears in `BACKLOG.md` alongside a `[x]`. Related to, but not the
      same as, the files-produced-column item — that one widens PR #91's claims
      gate; this one is about the backlog's own accuracy. _Source: Project Lead,
      2026-08-05 run-start reconciliation — measured against `main`, not
      inferred._
      _(2026-08-06, team/2026-08-06-report-contract — awaiting Dom, left
      unchecked. `scripts/check-backlog-checkoffs.mjs` built: for every
      `Item | Branch | PR`-shaped table row across `reports/*.md` whose
      branch has a MERGED pull request (per real `gh pr list`, never the
      report's own prose), asserts the branch string appears somewhere inside
      a `[x]`-checked `BACKLOG.md` bullet. A report's own filing/bookkeeping
      row is excluded (never gets its own checkbox anywhere in this repo's
      real history — verified). **Run for real against the current corpus,
      not assumed clean, per this task's own instruction: its first run was
      RED, and it found a sixth incident on day one.**
      `team/2026-08-04-undici-advisories` (PR #101, merged) was cited nowhere
      in `BACKLOG.md` — the exact PR #100 shape the item was written about,
      undetected for two days. **The gap is closed in this PR** (the new
      `[x]` undici item below), so the check now exits 0 on the real corpus:
      _"scanned 29 report(s), 15 item row(s), 109 pull request(s); 0 merged
      branch(es) unreferenced"_ — verified by the lead re-running it
      independently, not taken from the agent's summary. **Correction, kept
      rather than silently edited:** this note first shipped in this same
      branch saying the check "is RED… left as a found violation, not fixed
      by this PR." That was already false when written — the fix had landed
      in the same working tree. The lead caught it by running the gate
      instead of reading the note, which is the whole thesis of the item this
      note is attached to. A second, softer
      shape was also found and is deliberately NOT a hard failure:
      `team/2026-08-04-runs-api` (PR #98) is cited only inside a still-`[ ]`
      multi-PR-epic item (§6 PR 2 of several) — legitimate, honest, and
      structurally indistinguishable from a forgotten checkbox, so it is
      surfaced as a note every run rather than failed. Wired into
      `.github/workflows/ci.yml` as a REPORTING step (not required/blocking)
      in the new `backlog-checkoffs` job, same precedent as
      `check-stranded-branches.mjs`'s own header: a brand-new check with no
      track record must not block merges on day one. Promote to required
      once it has run green for a while, same path `validate:content` took.)_
      _(**CHECKED OFF 2026-08-11** — the note above says "awaiting Dom, left
      unchecked", and that was correct while PR #110 was open. **PR #110 merged
      2026-08-07** (`a98ec4a`; `scripts/check-backlog-checkoffs.mjs` is on
      `main` and its `backlog-checkoffs` job runs on every PR in the current
      queue), so the box has been owed for four days. **This is the sixth
      instance of the exact lag this item is about, on this item.** The
      2026-08-10 run found it, verified it against `main`'s own history, set the
      Notion row to Done and — per the mirror's "flag, don't silently fix" rule
      — flagged rather than edited the backlog; the flag is the record, and this
      is the edit it was waiting for. Worth stating what that sequence means for
      the item's own thesis: the gate it shipped **cannot** catch this, because
      the gate only fails when a merged branch is cited nowhere in `BACKLOG.md`,
      and this branch was cited — inside its own still-`[ ]` bullet. That is the
      "softer shape" the note above already predicted and deliberately declined
      to fail on. Declining was defensible; the cost is now measured at four
      days on the item that exists to measure it. Whether that second shape
      should become a failure — "a merged branch cited ONLY inside an unchecked
      item" — is a real design question and is deliberately NOT actioned here,
      because the note's own reasoning (it is structurally indistinguishable
      from a legitimate multi-PR epic, of which this repo currently has two) has
      not changed.)_
- [ ] **LOW — Two small pieces of genuinely stranded work, found by the new
      stranded-branch check.** Both verified absent from `main`, both needing a
      one-line Dom decision rather than work: (a) `claude/first-backlog-item-agvn1h`
      holds a 23-line `## Notion backlog mirror` section for `CLAUDE.md` —
      `grep -ci notion CLAUDE.md` on `main` returns **0**, so it never landed;
      it may be genuinely redundant now that the rule lives in the scheduled
      task's own instructions, but that is a call, not a fact. (b)
      `team/2026-07-20-backlog-and-report` holds a ~9-line addendum to
      `reports/2026-07-20.md` recording the post-merge full-gate check
      (241/241) run after Dom merged #26–#29 mid-run — exactly the class of
      record the PROJECT-BRIEF's "every run ends with a report" rule exists to
      protect, missing for 15 days. Land either, both, or neither, then the five
      confirmed-redundant refs can be swept. _Source: 2026-08-05 run, lead
      triage of the nine branches PR #106's check surfaced._
      _(**HALF DONE 2026-08-06** — stays open for (a). (b) **landed** in
      team/2026-08-06-stranded-records, PR #109's sibling PR #108: the 07-20
      addendum is restored, with a dated in-file note rather than smoothed
      into the prose. **Only the addendum hunk was taken, and that mattered** —
      the stranded branch predates the 2026-07-27 provenance backfill at the
      foot of that report, so applying its diff wholesale (or merging the
      branch) would have **silently deleted that `yaml provenance` block**,
      the exact mechanism logged HIGH on 2026-08-02 and gated by
      `check-merge-revert.mjs`. (a) — the 23-line `## Notion backlog mirror`
      section on `claude/first-backlog-item-agvn1h` — is untouched and still
      needs Dom's one-line call, since "genuinely redundant now that the rule
      lives in the scheduled task's own instructions" is a judgement, not a
      fact.)_
- [ ] **LOW — The Notion mirror has no completeness check: an item can exist in
      `BACKLOG.md` with no row at all.** The 2026-08-05 reconciliation found the
      HIGH stale-`runs.generated.json` item had been added to `BACKLOG.md` by
      PR #100 and **never mirrored** — it had no Notion row for a day, so the
      mirror was silently missing a HIGH item rather than showing it with a
      wrong status. Every sync so far reconciles *status* for rows that exist;
      nothing compares the two **sets**. This is the inverse of the 2026-07-31
      incident, where four findings existed only in Notion and not in
      `BACKLOG.md` — so the gap has now been demonstrated in both directions.
      Cheap fix: the sync step diffs item titles both ways and reports
      orphans on each side, rather than iterating `BACKLOG.md` alone. _Source:
      Project Lead, 2026-08-05 Notion reconciliation — observed, not
      hypothetical._
      _(**More evidence, 2026-08-06 — and the cheap version of the fix already
      pays.** This run's sync did the set comparison by hand: 28 unchecked
      items ↔ 28 non-Done rows matched exactly (**zero status drift, a
      first**), but the totals did not — **64 Done rows against 63 `[x]`
      items**. The orphan is the row "The 'QA pass' item is stale and should be
      re-scoped or closed", whose substance was folded into the QA-pass item's
      closing note on 2026-08-01 while its own checkbox disappeared from
      `BACKLOG.md` entirely. Harmless (both are done) but it is the third
      demonstrated direction of this gap: row-without-item, after
      item-without-row (2026-08-05) and finding-only-in-Notion (2026-07-31).
      Flagged, **not fixed** — the mirror is one-way, so deleting a Notion row
      to make the counts agree is exactly the silent reconciliation the rule
      forbids.)_
- [ ] **LOW — `buildMode` / the team-rebuild model is parked as superseded.**
      Not abandoned: superseded by `soloBuild` (shipped 2026-07-24), which
      solves the same reader-facing problem for the projects that exist today.
      `buildMode`'s phase-level derivation is the better model *when a project
      genuinely starts solo and the team joins partway* — which no current
      project does. **Revisit trigger: the first team-built project.** The
      reference implementation is complete and tested at tag
      `archive/2026-07-19-buildmode-tail`; the reasoning is in
      `docs/team-rebuild-model.md` §3–§4 and the trade-off table in
      `docs/buildmode-tail-assessment.md` §4. Do not re-derive either.
      _Source: 2026-08-05 tail assessment (PR #105) §5b._

### Added 2026-08-06 (impact-ranked; slot above "Pre-launch review")

- [ ] **HIGH — A finished blog post sat UNCOMMITTED in the shared checkout,
      and no check can see that class of loss.** Run-start found
      `content/posts/2026-08-05-the-post-said-it-was-fixed.md` untracked in the
      working tree at
      `/Users/doom/Documents/VibeCodeProjects/studio-site`: a complete,
      `draft: false`, publish-ready 28-line post from the **2026-08-05
      daily-logbook run**, whose branch `team/2026-08-05-logbook` has **zero
      commits**. That session wrote the post and ended before committing it.
      It survived only because nobody ran `git clean`, and it was landed in
      PR #108. **This is a sixth distinct work-goes-missing mechanism, and the
      first that is not a branch at all.** PR #106's stranded-branch check
      enumerates *branches*; PR #103's merge-revert check compares *commits*;
      both are structurally blind to a file that was never added. The fix is
      cheap and belongs to the run playbook rather than CI (CI never sees an
      uncommitted file **by construction** — this is the same class as the
      `npm install` drift item, a local-only trap CI cannot catch): assert
      `git status --porcelain` is empty at run start, and treat any untracked
      `content/` or `reports/` file as a finding to triage before doing
      anything else. Note the aggravating factor already logged separately:
      two scheduled tasks share this one checkout, so the file was left by a
      *different* task than the one that found it. _Source: Project Lead,
      2026-08-06 run start — observed, not hypothetical._
- [ ] **MEDIUM — Three tests in the default `npm test` now require network +
      an authenticated `gh`, and the first CI run proved how that fails.**
      `scripts/check-backlog-checkoffs.test.ts`'s real-corpus block shells out
      to real `gh` on purpose — the gate's ground truth is "does GitHub
      actually consider this PR merged", and mocking that proves nothing about
      the part most likely to break. But `gh` refuses to run inside Actions
      without `GH_TOKEN`, so PR #110's first CI run failed the `build` job
      while the identical command passed on every dev machine with a keyring
      login. Fixed in that PR two ways (token on the step; skip-only-when-not-
      CI, hard-fail under CI so a missing token can never downgrade them to
      silent no-ops). **The open question is the design, not the bug:** this is
      the first time this repo's default gate depends on the network and on a
      GitHub session, which makes `npm test` slower, flakier, and unavailable
      to a contributor without `gh`. Worth deciding deliberately — keep them in
      `npm test`, move them to their own opt-in script alongside the
      `backlog-checkoffs` job, or accept the dependency and document it. _Source:
      Project Lead, 2026-08-06 — the environment-shaped verification lesson
      from PR #103 landing in a new place._
- [ ] **LOW — The `e2e` lane is Chromium-only and nothing says so out loud.**
      Every real-browser gate this project has built — contrast, overflow,
      reading-order, perf-budget, and now timeline-overlap — runs against
      Chromium alone. That is a defensible scope decision (it is where the
      measured bugs were), but it is currently implicit in
      `playwright.config.ts` rather than stated, so each new spec silently
      inherits it and the coverage boundary is invisible on a green check.
      Either add WebKit/Firefox projects for the layout-measuring specs, or
      write the limitation down where a reader of a green `e2e` check will see
      it. Cheap either way; the point is that the boundary should be a
      decision, not an accident. _Source: qa-tester, 2026-08-06 timeline-overlap
      lane — flagged as an inherited scope decision rather than one it made._
      _(**Second source, 2026-08-13:** the 2026-08-07 pre-launch review reached
      the same conclusion — its Notion row reads "Whether the e2e lane should
      cover Firefox/WebKit is an unmade cost decision". Deduped into this item
      rather than added twice. Two independent reviewers landing on "this is an
      unmade decision, not a gap" is itself the argument for writing it down.)_
- [x] **LOW — Five `undici` advisories fixed on 2026-08-04 were never
      referenced by branch name in `BACKLOG.md`.** `team/2026-08-04-undici-
      advisories` (PR #101, merged same day) bumped `undici` past the
      advisory range via `package.json`'s `overrides`, unblocking `main`'s
      audit gate — real, shipped, security-relevant work — but no bullet
      here ever named the branch. Found by the new `check-backlog-checkoffs`
      gate's first real run against this corpus, not by inspection. Closing
      it here rather than leaving the gate red on its own first day.
      _Source: `scripts/check-backlog-checkoffs.mjs`, 2026-08-06 —
      `reports/2026-08-04.md`'s own "Items worked on" table names the branch
      and PR; this bullet is the missing `[x]`._
      _(2026-08-04, team/2026-08-04-undici-advisories, merged as PR #101.
      See `reports/2026-08-04.md` for the full incident — five new `undici`
      advisories published against `undici < 7.29.0`, reached via
      `jsdom@29.1.1 → undici`, turned `main`'s audit gate red; fixed via a
      version override, no code change.)_

### Added 2026-08-07 (impact-ranked; slot above "Pre-launch review")

- [x] **HIGH — `main` went red on its own audit gate, and nothing outside a PR
      would have noticed.** `npm run audit` (`audit-ci --config
      ./audit-ci.jsonc`; run in CI at `.github/workflows/ci.yml:56`, inside the
      required-candidate `build` job) failed on a clean `main` with
      **`GHSA-5p4m-2wfm-xmqj|js-yaml`** — CVE-2026-59870, quadratic CPU
      consumption in `!!omap` key resolution, CVSS **7.5**, affected range
      `>=4.0.0 <4.3.1`; this repo was on 4.3.0. **Fixed the same run** by
      PR #114 (`js-yaml` 4.3.0 → 4.3.1, `package.json` range `^4.1.0` → `^4.3.1`
      so the lockfile floor moves too), which is why this is checked off — the
      breakage is closed. **It is logged HIGH for the residue, not the fix:** a
      newly-published advisory against an already-installed dependency turns
      **every open PR red simultaneously**, on a gate whose only trigger is a
      PR. Nobody opening a PR that day means nobody learns. This is the
      concrete, second-in-four-days case for the P2 batch's "scheduled `npm
      audit`" (the 2026-08-04 `undici` advisories, PR #101, were the first) —
      the fix for *this* item is scheduling that gate, and it lives there.
      Worth recording precisely because it is the **inverse** of the documented
      raw-`npm audit`-vs-`npm run audit` false alarm this project has already
      logged: that trap is a raw command crying wolf while the real gate passes.
      Here the real gate was genuinely red — and the allowlisted `react-router`
      advisory passing correctly through `audit-ci.jsonc` alongside it is the
      evidence that the allowlist still discriminates rather than having decayed
      into a blanket mute. _Source: 2026-08-07 run, found by running the one
      command the security audit had explicitly flagged that it could not run._
      _(**CORRECTED 2026-08-08 — "the breakage is closed" was measured and was
      false.** PR #114 was verified green on 08-07 and `main` was red again on
      08-08 with **nobody having touched the repo**: `GHSA-2v37-7h3g-55p8|nanoid`
      (predictable results with non-integer input, affected `<3.3.17`) published
      in between, and the tree resolved 3.3.16 via `vite → postcss → nanoid`.
      Installing PR #114's branch in isolation and re-running the real gate still
      exited red on that one advisory — so the PR that told Dom "merge this first,
      it unblocks the queue" would **not** have unblocked it. Fixed on the same
      branch (lockfile-only: `postcss` 8.5.19 → 8.5.26 and `nanoid` 3.3.16 →
      3.3.18, both already in range, so no new `overrides` and no new allowlist
      entry); `build` now passes on #114. This item stays checked because the
      breakage is now genuinely closed — but the check-off was **premature when
      written**, which is the fifth time this file has misreported its own state
      and the first time it did so by believing a verification that had expired
      rather than by forgetting to tick a box. **It also raises the residue from
      HIGH-with-a-home to its own item:** three newly-published advisories in
      five days (`undici` 08-04, `js-yaml` 08-07, `nanoid` 08-08) is not a
      streak, it is the base rate, and "the fix lives in the P2 batch" is no
      longer a proportionate answer — see the promoted item below. **Standing
      lesson, the verification-side twin of the one in `audit-ci.jsonc`:** a
      green audit result is a measurement with a timestamp, not a property of the
      branch. Re-run it at merge time, not once at authoring time.)_
      _(Both fixes above shipped on one branch: `team/2026-08-07-jsyaml-advisory`,
      merged as PR #114 — the `js-yaml` bump on 2026-08-07 and the `nanoid` /
      `postcss` lockfile correction on 2026-08-08, the second pushed to the
      existing branch rather than opening a new PR. Named here because this item
      cited only the PR number, and `check-backlog-checkoffs` matches on the
      **branch** — so a genuinely closed, genuinely `[x]` lane still counted as
      unreferenced. See `reports/2026-08-07.md` and `reports/2026-08-08.md`.)_
- [ ] **MEDIUM — `*.test.ts`/`*.test.tsx` sit in the `safe-auto` allowlist as
      "non-code", and they are code the required `build` job executes.**
      `.github/workflows/auto-merge.yml` treats any `*.test.ts` / `*.test.tsx`
      as safe, and `.github/AUTO-MERGE-SETUP.md` describes the label as a claim
      that a PR touches "low-risk, **non-code** paths (blog/content posts, docs,
      test-only changes, reports)". A test file is not a non-code path: `npm
      test` runs it inside the required `build` job, so a PR consisting only of
      test files can execute arbitrary code in CI and then auto-merge **with no
      human ever reading it**. This is **not an outsider threat** and should not
      be written up as one — the repo is public but `contents: read`, and every
      author is one of Dom's own agents; the finding is narrower and more
      useful: **the gate's own description overstates its safety**, and that
      description is what a future run will reason from. Two honest fixes, pick
      one: drop `*.test.ts`/`*.test.tsx` from the allowlist, or relabel the
      allowlist as "low-review-cost" rather than "non-code" and say plainly that
      it includes executable test code. Also note the pattern is **unanchored**
      (a shell `case` glob), so it matches `scripts/anything.test.ts` and any
      other path ending in those suffixes, not just files under `src/`. Already
      named in the P2 batch as "drop `*.test.*` from the auto-merge allowlist"
      — this item is the reasoning that batch entry never carried. _Source:
      security-auditor, 2026-08-07 pre-launch review._
- [ ] **MEDIUM — Nothing verifies the LIVE site serves any security header.**
      Both CSP gates are source-side: they compare `dist/index.html` against a
      string in `vercel.json`. That proves the two files agree — it proves
      nothing about what Vercel actually sends. `scripts/check-deployed-
      routes.mjs`, the only thing that talks to the deployed site at all,
      asserts exactly two properties per route (status 200, body contains
      `id="root"`) and never touches `response.headers`. So a misconfigured
      Vercel project, a dropped `headers` block, or a platform-side override
      would be **completely invisible to every gate here**, all green. And the
      script only runs when `SMOKE_URL` is set, which it is not. Fix, both
      halves or neither: assert the six headers `vercel.json` declares (CSP,
      `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
      `Strict-Transport-Security`, `Permissions-Policy`) in that script,
      **reusing the existing `extractCspHashes` rather than reimplementing hash
      parsing a third time**, and set the variable. (Costing note, so whoever
      takes this is not surprised: that helper lives in
      `src/lib/csp/inlineScriptHash.ts` — TypeScript under `src/` — while
      `check-deployed-routes.mjs` is deliberately dependency-free plain `.mjs`.
      Reuse is the right call, but it means deciding how the script consumes it,
      not a one-line import. That decision is part of the work, not a reason to
      copy the parser.) **See the existing HIGH item
      "Set the `SMOKE_URL` repo variable so `deployed-smoke` checks something"
      above — this is not a duplicate of it, it is what that variable would
      unlock.** Today that item's payoff is two assertions per route; with this,
      it becomes the only thing in the project that can see production.
      **Recorded decision:** the lead **dropped** the auditor's suggestion to
      add COOP/CORP headers from PR #115 for exactly this reason. Adding
      unverifiable headers to a live site *before* the verification exists is
      the pattern that keeps costing this project (a config that claims a
      property, a green check that never looks). They should ship together, in
      that order. _Source: security-auditor, 2026-08-07._
- [ ] **MEDIUM — Three visual questions cannot be answered from source, and
      they gate Dom's design sign-off.** The designer's critique was read-only
      and it **declined to guess** on three points rather than asserting them,
      which is the right call and also means they stay open until someone looks
      at a rendered page: (a) **is the paper-grain layer perceptible at all** at
      its shipped 0.03 / 0.025 opacities — if it is invisible, then the
      "warmth" half of the "machine faking paper" direction is carried entirely
      by the analog marks and the grain is dead weight; (b) **does Fraunces'
      optical-size axis actually do its job** — read characterful at H1 and calm
      at body size, or is the difference imperceptible outside a type specimen;
      (c) **does `MediaGallery`'s scatter composition land as scrapbook or as
      SaaS** — `docs/project-page-v2.md` §4.2 flags this itself as the spec's
      "higher-risk, higher-reward" taste call and explicitly routes it to Dom,
      with the standing advice to build scatter first and pull back if it fights
      the ~6/10 analog dial. All three are cheap to settle and
      impossible to settle by reading code. Ask: a **visual-media browser pass
      over `/` in both light and dark, plus one project detail page**, captured
      so Dom can judge rather than re-derive. _Source: designer, 2026-08-07
      pre-launch critique._
- [ ] **LOW — Draft posts ship inside the production bundle.** `src/content/
      loader.ts` eagerly `import.meta.glob`s every `content/posts/*.md` as raw
      text and filters `draft` **at runtime** (`isProd ? items.filter(...)`), so
      every draft's full body is in the shipped JS whether or not it renders.
      **Nothing is exposed today** and this should not be dressed up as an
      incident: all 22 posts are `draft: false`, and the repo is public, so the
      same text is a click away on GitHub regardless. The real finding is a
      contract that over-claims: the `draft` field is documented as "preview in
      `npm run dev` but never ship", and what the code delivers is "does not
      render". The moment someone drafts a genuinely unpublished post — an
      unannounced project, a post naming a client — the field will be trusted to
      do something it has never done. Fixes range from a build-time filter in
      the loader to simply not shipping drafts in the repo. **Declining is
      entirely legitimate** given the public repo — but decline it *in writing*
      here, rather than leaving the documented contract promising more than the
      code does. _Source: security-auditor, 2026-08-07._
- [ ] **LOW — `img-src 'self'` directly contradicts what the content schema
      permits.** `vercel.json`'s CSP pins `img-src 'self'`, while
      `src/content/validate-content.test.ts` (~line 243) deliberately leaves
      absolute `http(s)://` cover values unchecked, in a comment that says why:
      "some future post cover could legitimately point at an externally-hosted
      image". `schemas.ts` leaves `cover` unconstrained too. So the schema
      explicitly anticipates a case the CSP explicitly forbids, and the first
      person to use one gets a **silently blocked image and a fully green
      suite** — no validation error, no build failure, nothing until someone
      opens the page. Pick a side and make the other one enforce it: either
      constrain `cover`/`media[].src` to local paths in the schema (and say the
      CSP is the reason), or widen `img-src` to the specific host that is
      actually wanted. What must not persist is two files documenting opposite
      intentions. _Source: security-auditor, 2026-08-07._
- [ ] **LOW — The auto-merge guard's completeness rests on one unverified
      assumption.** The entire allowlist decision — "does this PR touch anything
      outside the safe set" — depends on `gh pr diff --name-only` returning the
      **complete** file list. GitHub's compare APIs truncate very large diffs,
      and if that truncation applies here, a sufficiently large PR could have
      its unsafe files fall off the end of the list and auto-merge. **This is a
      hypothesis with a named verification, not a conclusion** — it is unproven
      in both directions and is filed that way on purpose. Settle it by running
      the guard's own command against a >300-file PR, or sidestep it entirely by
      switching to the explicitly paginated `gh api
      repos/:owner/:repo/pulls/N/files --paginate --jq '.[].filename'`.
      Likelihood at this repo's actual PR sizes is low, which is why it is LOW
      and not higher. _Source: security-auditor, 2026-08-07._
- [ ] **LOW — Whether the `e2e` lane should cover Firefox/WebKit is still an
      unmade cost decision.** PR #116 closed the *honesty* half of the 2026-08-06
      item by stating the Chromium-only boundary in `README.md`, where a reader
      of a green `e2e` check will see it. It did not decide the boundary. The
      open question is a straight trade with no evidence yet on either side:
      every browser bug this project has actually measured was found in
      Chromium, and adding two more projects multiplies CI minutes on the
      slowest lane — against the fact that nobody has ever looked, so "no
      WebKit bugs found" is not a finding. Cheapest honest middle: add the other
      engines to the layout-measuring specs only (contrast, overflow,
      reading-order, timeline-overlap), not the whole lane. _Source: devops,
      2026-08-07._

### Added 2026-08-08 (impact-ranked; slot above "Pre-launch review")

- [ ] **HIGH — Promote "scheduled `npm audit`" out of the P2 batch: three
      newly-published advisories in five days is the base rate, not a streak.**
      The P2 batch has carried a one-line "scheduled `npm audit`" entry since
      2026-07-21, and the 08-07 item above concluded "the fix for *this* item is
      scheduling that gate, and it lives there." One day later that answer stopped
      being proportionate. The measured record: **`undici` 2026-08-04** (PR #101),
      **`js-yaml` 2026-08-07** (PR #114), **`nanoid` 2026-08-08** (this run) —
      three separate advisories published against dependencies that were already
      installed and unchanged, turning `main`'s required gate red three times in
      five days without a single commit touching the repo. The gate's only
      trigger is a PR, so each time, the queue went red and the *reason* was
      invisible until somebody happened to run the command by hand. All three
      times, somebody did — which is luck, not a control. **What makes this HIGH
      rather than housekeeping is the compounding failure it already caused
      once:** PR #114 verified green on 08-07 and was silently stale by 08-08,
      so the PR whose entire job was to unblock the queue would have merged and
      left `main` red. A scheduled run makes that visible within a day instead of
      within a run. Right-sized scope, deliberately small: a `schedule:` cron in
      a workflow that runs `npm ci && npm run audit` against `main` and opens (or
      updates) a single issue on failure — no new dependency, no change to the
      `build` job, and explicitly **not** an auto-bumping bot, which would push
      lockfile changes past the review this project has repeatedly shown it needs.
      Also fold in the verification-side lesson from the corrected item above:
      whatever runs this should be the thing an "unblocker" PR is re-checked
      against at merge time. _Source: 2026-08-08 run — measured, and the third
      instance in five days; supersedes the P2 batch's one-line entry, which
      should be struck when this lands._
- [ ] **MEDIUM — The Notion reconciliation rule assumes the previous run's
      bookkeeping PR has merged, and with a full queue it corrupts the mirror.**
      The scheduled task says to reconcile every Notion row against "the freshly-
      synced `BACKLOG.md`" on `main`. That is correct only when the last run's
      bookkeeping PR has landed. On 2026-08-08 it had not — seven PRs were open,
      the oldest from 08-06 — and following the rule literally would have done
      real damage: **8 rows correctly marked "In progress" would have been reset
      to "Not started"**, and 8 further rows describing findings that exist only
      on `team/2026-08-07-backlog-and-report` (PR #117) had no counterpart on
      `main` to reconcile against at all. Every one of those apparent
      discrepancies was verified this run to be the mirror tracking the unmerged
      branch **correctly** — zero genuine drift — so the rule would have
      manufactured the drift it exists to heal. Note this is the *inverse* of the
      2026-08-05 finding (an item in `BACKLOG.md` with no Notion row) and of the
      2026-07-31 one (findings only in Notion): the mirror has now been observed
      out of step in three distinct directions, and in this third case the mirror
      was right and the rule was wrong. Fix: reconcile against `main` **plus the
      tips of any open bookkeeping PRs**, and treat a row marked "In progress"
      whose branch has an open PR as authoritative rather than as drift. Cheap
      and mechanical — the branch names are already in the `Branch` column.
      _Source: Project Lead, 2026-08-08 Notion reconciliation — observed, and the
      reason this run deliberately changed **no** Notion statuses._

- [ ] **HIGH — CI does not run on stacked PRs at all, so the documented
      bookkeeping-stacking convention produces PRs with zero gates.**
      `.github/workflows/ci.yml` triggers on `pull_request:` filtered to
      `branches: [main]`. A stacked PR — one whose **base** is another `team/*`
      branch rather than `main` — therefore matches no trigger and runs **no
      `build`, no `e2e`, no `backlog-checkoffs`, no `deployed-smoke`**. Only the
      two Vercel checks report, and both are green regardless of whether the code
      compiles. Confirmed on PR #119 this run: `gh pr checks 119` lists exactly
      two Vercel rows and nothing else. This is not a hypothetical or a
      one-off — the stacking convention is **already documented as load-bearing**
      by the LOW item above ("Bookkeeping PRs now stack three deep"), which
      analysed the merge-order and review-in-isolation costs and never noticed
      that the stacked PRs were also **entirely ungated**. Every stacked
      bookkeeping PR in this repo's history ran its gates for the first time only
      when the stack collapsed onto `main`. The exposure is exactly the class
      this project keeps paying for: a PR that looks reviewed and checked, whose
      checks never ran. It compounds with the throttle — the fuller the queue,
      the more stacking happens, so gates disappear precisely when the queue is
      least reviewable by hand. Fixes, cheapest first: (a) add
      `branches: [main, 'team/**']` to the `pull_request` trigger, which is a
      one-line change and makes every stacked PR run the same gates; (b) drop the
      `branches` filter entirely and let CI run on every PR; (c) stop stacking,
      per the `BACKLOG-INBOX.md` idea in the LOW item. Prefer (a) — it fixes the
      gap without touching the convention or the required-check name that branch
      protection depends on. Note the required check for branch protection is
      still only evaluated on the final `→ main` PR, so (a) adds signal without
      changing what gates a merge. _Source: 2026-08-08 run — found because this
      run's own draft PR came back with two Vercel checks and nothing else; its
      585/585, typecheck, lint and `validate:content` results are from **local**
      runs, which is the only reason the work is verified at all._

### Added 2026-08-09 (impact-ranked; slot above "Pre-launch review")

- [ ] **LOW — `check-report-claims` recorded its first false positive, and the
      shape it fires on is the one bookkeeping reports keep producing.** The gate
      treats "a text block containing my own branch string" as a claim about my
      own branch, and fails if a path in that block is not in the diff. On this
      branch it fired on `reports/2026-08-08.md`, where the block was:
      "`.github/workflows/ci.yml` triggers on `pull_request:` filtered to
      `branches: [main]`. This PR's base is `team/2026-08-07-backlog-and-report`,
      so it matches no trigger" — a **citation** of the workflow file explaining
      why a stacked PR ran no gates, in a sentence that mentions the branch as a
      PR *base*. The report never claimed to have edited `ci.yml`, and did not.
      Fixed on 2026-08-09 by splitting that block into two paragraphs, which is
      a real fix (the checker's unit is one paragraph, so the split makes the
      structural signal match what the prose actually asserts) but also a fix
      nobody would find without reading the checker's source. **This is not an
      argument to widen the extraction** — that file's header argues at length
      against exactly that, and the argument still holds. It is an argument that
      the failure output should teach the reader the paragraph rule: the message
      offers only "the report is wrong" or "the change is missing", and the
      third and actual case — "this is a citation, and the branch name in the
      same paragraph is what pulled it in" — is not among them. Cheapest fix is
      a third bullet in the `Fix:` block naming the paragraph rule; nothing else
      changes. _Source: 2026-08-09 run — hit while making PR #117 green, the
      first time this gate has fired on a report in review rather than on a real
      drift._

### Added 2026-08-10 (impact-ranked; slot above "Pre-launch review")

- [ ] **HIGH — The ≤6 review throttle is enforced by one of the two tasks that
      open PRs, so it cannot hold the queue.** `studio-site-build` checks the
      open-PR count and declines to build when it is over ~6 — it did exactly
      that on 2026-08-10, and in effect on 2026-08-09 too. `daily-logbook`
      (21:30) opens a PR **every day unconditionally**: it has no view of the
      review queue and no throttle of its own. Measured across those two runs:
      the build task shipped **zero** new feature PRs and the queue still went
      **6 → 7**, because #121 landed overnight. Three of the seven PRs open at
      2026-08-10 run start were logbook posts (#118, #120, #121). A throttle on
      one producer is not a throttle on the system; the current design lets the
      disciplined task starve itself while the undisciplined one sets the queue
      depth. Options, cheapest first: (a) `daily-logbook` checks the open-PR
      count and, when over throttle, appends the post to the existing logbook
      branch instead of opening a new PR — same content, one PR per batch
      rather than per day; (b) logbook posts get the `safe-auto` label so they
      never consume a review slot (depends on the auto-merge question above);
      (c) logbook PRs are excluded from the throttle count on the grounds that
      reviewing a blog post is not the same cost as reviewing a diff — which is
      arguably true and would want Dom to say so explicitly. **This is a
      process change to a task Dom owns, so it is a question, not a task the
      studio should action unilaterally** — same posture as the auto-merge item
      above, and it should probably be answered at the same time as it, since
      (b) collapses both into one decision. _Source: Project Lead, 2026-08-10 —
      measured on this run's own queue state, not inferred; see
      `reports/2026-08-10.md`._

### Added 2026-08-11 (impact-ranked; slot above "Pre-launch review")

- [ ] **HIGH — Two PRs that are each green against `main` can merge into a
      defect neither of them contains, and nothing checks the combination.**
      Concrete, reproduced this run, not hypothetical. PR #117 replaced a
      snapshot assertion in `scripts/check-backlog-checkoffs.test.ts`
      (`expect(result.referencedButOpen).toHaveLength(1)`) with a shape-based
      one, because the snapshot had gone red on 2026-08-08 at length 3 on
      healthy repo growth. PR #116 independently **moved that whole block** into
      the new `scripts/check-backlog-checkoffs.real-corpus.test.ts` as part of
      making the default `npm test` hermetic — and carried the **pre-fix**
      assertion across with it. The two therefore conflict, and the natural
      resolution (take #116's side, since #116 owns the file split) silently
      reinstates the known-red snapshot. Real transcript from the merged tree:
      `expected [ { …(4) }, { …(4) }, { …(4) } ] to have a length of 1 but got 3`.
      **No gate in this repo can see this.** Both PRs are based on `main`, so
      both run full CI and both are green — this is a *different* mechanism from
      the "stacked PRs run no CI at all" item above (that one is about PRs based
      on other `team/*` branches matching no `ci.yml` trigger; these are based on
      `main` and do run every check). The general shape: **when PR A *moves*
      code that PR B *fixes*, git resolves the text and loses the intent**, and
      the only artifact that would show it is a tree neither PR's CI ever
      builds. Found only by merging all nine open PRs locally and running the
      full suite — about 15 minutes by hand. Options, cheapest first: (a) a
      queue-integration CI job that merges every open green PR and runs the full
      suite, reporting which pair conflicts; (b) require branches to be
      up-to-date with `main` before merge (GitHub branch-protection setting —
      catches nothing here, because the offender is another *open* PR, not
      `main`; noted so it is not mistaken for a fix); (c) accept it and keep
      doing the manual pre-merge integration run whenever the queue exceeds ~3
      PRs that touch overlapping files. **The specific instance is already
      fixed** — the corrected assertion was ported onto #116's branch this run
      (commit `1b7a17b`), so the queue is safe to merge in any order; this item
      is about the class. _Source: Project Lead, 2026-08-11 — reproduced red on
      the merged tree, then green after the port._
- [ ] **LOW — A real-corpus assertion pinned to `BACKLOG.md` content is a
      snapshot that ordinary backlog growth turns red.** The assertion above
      (`referencedButOpen` having exactly length 1) was not wrong when written:
      `referencedButOpen` is *derived from `BACKLOG.md`*, and on #116's branch,
      which carries `main`'s backlog, the real count genuinely **is** 1 —
      verified by running `npm run check:backlog-checkoffs` there. It becomes 3
      only once #117's `BACKLOG.md` lands. That is worth naming as its own
      hazard: a "real corpus" test is only as stable as the corpus, and this
      corpus is a file every run edits. The count assertion is now shape-based,
      so the immediate case is closed; the open question is whether any *other*
      real-corpus assertion in `scripts/*.real-corpus.test.ts` is pinned to a
      value that normal repo activity moves. Worth one pass over that lane
      asking, per assertion, "what repo activity makes this red without anything
      being wrong?" _Source: 2026-08-11 run — found while falsifying the fix
      above, when the falsification **failed to fail** on #116's branch alone
      and the reason turned out to be legitimate rather than a weak test._

- [ ] **MEDIUM — `check-backlog-checkoffs` treats a passing *mention* of a
      branch as a check-off, so closing one item can silently uncover another.**
      Measured this run, as a side effect of checking off the shipped-lanes item
      above. Before: the gate reported **3** `referencedButOpen` notes
      (`team/2026-08-04-runs-api` #98, `team/2026-08-06-report-contract` #110,
      `team/2026-08-06-stranded-records` #108). After one check-off: **1**. Two
      notes disappeared, but only one item was closed. The extra one is
      `runs-api`, whose genuine home is the still-`[ ]` "No on-site surface for
      the run reports" epic — it stopped being reported because the item I
      checked off happens to *discuss* `team/2026-08-04-runs-api` in its prose,
      and `scripts/check-backlog-checkoffs.mjs` matches with
      `block.text.includes(branch)` then `if (block.checked) return 'checked'`.
      Any mention inside any `[x]` bullet counts, including a narrative aside in
      a completely unrelated item. The consequence is the quiet kind: PR #98's
      real multi-PR-epic status is now **invisible** to the gate, and it was
      hidden by an edit that had nothing to do with it. This repo's backlog is
      unusually prose-heavy and routinely names other branches when explaining a
      decision, so the collision rate will only grow. Not urgent — the gate's
      hard failure (`unreferenced`) is unaffected, and this only degrades the
      advisory note — but the note is the half that catches the "softer shape"
      the gate's own header says it is deliberately not failing on, so losing it
      silently is worse than never having had it. Cheapest fix: require the
      branch mention to sit in a bullet that also *claims* it (e.g. inside the
      trailing `_( … )_` provenance note), or scope matching to the bullet whose
      item the report row names, rather than any bullet in the file. _Source:
      Project Lead, 2026-08-11 — found by diffing the gate's own output before
      and after a one-checkbox edit, not by reading its source._

### Added 2026-08-13 (impact-ranked; slot above "Pre-launch review")

- [ ] **HIGH — The `react-router` allowlist entry's stated cost has expired: a
      patch release now clears the advisory, and nothing re-checked.**
      `audit-ci.jsonc`'s entry for GHSA-qwww-vcr4-c8h2 (written 2026-08-04)
      justifies the deferral with "The 7.x line's latest (7.18.2) is still
      INSIDE that range, so no patch release clears this on 7.x — only the 8.x
      major does", and prices the fix as the ~28-file 8.x migration the
      2026-08-03 sweep measured. **Both halves are now false against the live
      advisory.** Verified this run: `npm audit --omit=dev --json` reports the
      range as `>=7.12.0 <7.18.2` — it **narrowed**; the entry was written when
      it read `<8.3.0` — `react-router@7.18.2` is published (`npm view
      react-router versions`), `package.json` declares `react-router-dom:
      ^7.18.1`, and npm's own output says "fix available via `npm audit fix`"
      with no `--force`. So the remedy is an in-range patch bump, not a major
      migration. The CI gate is green only because this entry suppresses the
      finding. _Source: this run, reading today's CI log. It is the exact
      failure mode `audit-ci.jsonc`'s own STANDING LESSON names — "an allowlist
      entry justified by [a version claim] is only true against the advisory's
      range AS IT READS TODAY" — written about a range that widened, and now
      fired by one that narrowed, which is the case the lesson did not
      anticipate. **Not done this run only because the PR queue was already at
      7, over Dom's review throttle.** Top of the list: one lockfile bump, one
      deleted allowlist entry, one test pass._

- [ ] **HIGH — Two of the studio's own PRs sat red for six days and no run
      noticed.** #116 (typecheck) and #117 (`check:report-claims`) went red on
      2026-08-07. Every scheduled run since fast-forwarded `main`, reconciled
      Notion, planned, and opened **more** PRs — without once asking whether the
      queue it had already built was healthy. The red was surfaced correctly at
      the PR: `notify-on-failure` (`ci.yml:480`) comments naming the failed
      check and the artifact command, which is the item above at line 1695
      working as designed. Nothing reads PR comments. This is the gap one level
      out: the run-start preflight checks the checkout, dependency drift and
      `main`, and never looks at the studio's own open work. The cost was not
      abstract — the queue-unjam PR was itself jammed, and the throttle stayed
      pinned at 7 for six days, blocking every new item. Fix: a preflight step
      running `gh pr list --json number,statusCheckRollup,mergeStateStatus` over
      the studio's own open PRs, reporting every red one **before** planning,
      with "repair the queue" outranking "start new items". _Source: 2026-08-13
      run — the first thing it did was look, and it found six-day-old red._

- [ ] **HIGH — `check-merge-revert` is path-granular, so an intra-file merge
      revert walks straight past it.** Demonstrated, not argued. On
      `team/2026-08-07-gate-and-doc-truth` the in-branch `git merge main`
      (`ea05490`) resurrected a `describe` block the branch had deliberately
      **moved** to another file, without its helpers — six `TS2304`/`TS2552`
      errors, PR red for six days. Running `node scripts/check-merge-revert.mjs`
      on that exact branch prints `OK — … 14 path(s) touched by the branch's own
      commits, all still present`, because the *file* is still in the net diff;
      only a hunk inside it was reverted. The gate detects "the branch's edit to
      path P vanished" and structurally cannot detect "the branch's edit to hunk
      H inside surviving path P vanished" — PR #81's incident class, one level
      down. The cleanest possible control ran the same morning: the sibling
      branch `team/2026-08-07-backlog-and-report` took the path-granular version
      of the same bad merge and the gate **did** catch it, naming both paths and
      the merge commit. Fix options: compare per-hunk (expensive, noisy), or
      cheaply flag any merge commit whose resolution differs from the branch's
      pre-merge content on a path the branch itself had edited — which is what
      the existing walk already computes, one granularity finer. _Source:
      2026-08-13 run; both branches diagnosed the same morning._

- [ ] **HIGH — CI gate ordering let the weaker gate mask the stronger one for
      six days.** `check:report-claims` runs at `ci.yml:178` and
      `check:merge-revert` at `ci.yml:205`; the job stops at the first red. So
      PR #117 announced "a new report claims a path its own branch does not
      touch" — sending readers hunting for a lying report — while
      `check:merge-revert` sat four steps later holding the actual diagnosis,
      naming both silently reverted paths and the merge commit that ate them.
      The reports were never wrong. This is not a hypothetical ordering
      preference: it cost six days and two runs' worth of misdirection, and the
      repo already owns the better gate. Fix: order gates by diagnostic strength
      (root-cause gates ahead of symptom gates), or run the cheap diagnostic
      gates unconditionally and report them together rather than short-circuiting
      at the first failure. _Source: qa-tester, 2026-08-13 run — found by running
      the later gate by hand on the red branch._

#### Pre-launch review deferrals — Notion rows that never had a BACKLOG.md item

Found 2026-08-13 during the Notion reconciliation: rows created 2026-08-07 from
`docs/pre-launch-review-2026-08-07.md` §2 ("Deferred to Dom as decisions") exist
in the mirror with **no counterpart in this file**. Not an oversight by that run
— its §7 says so out loud ("No BACKLOG.md edit — … that's a call for whoever
owns that file's edit process"), and this is that call, six days late. The known
mirror-completeness gap is logged in the other direction (an item with no row);
this is the direction nobody checked. Sourced below from the merged review doc,
never from Notion. Deduped rather than re-added: the review's live-header
bullet folds into the existing `SMOKE_URL` item, its "curated Start here rail"
bullet into the existing blog-entry-point item, and its Firefox/WebKit bullet
into the existing Chromium-only item.

- [ ] **MEDIUM — `*.test.ts` is on the `safe-auto` allowlist, and it is the one
      member of that list that executes.** The allowlist treats any
      `*.test.ts`/`*.test.tsx` path anywhere in the repo as safe to auto-merge,
      while `.github/AUTO-MERGE-SETUP.md`'s "What `safe-auto` means" describes
      the allowlist as "non-code" paths (content, docs, tests, reports). CI runs
      `npm test`, so a test file is arbitrary code execution inside the runner,
      not merely "changes app behaviour". Dom's decision, tradeoff stated:
      dropping `*.test.ts` from the allowlist makes routine QA-authored test PRs
      no longer auto-mergeable. Narrow in practice — the runner is isolated and
      the lane is dormant per that review's Fix 1 — but the doc should stop
      calling it non-code either way, which is free. _Source:
      `docs/pre-launch-review-2026-08-07.md` §2 (security-auditor)._

- [ ] **MEDIUM — `img-src 'self'` contradicts the content schema, which permits
      an external `cover` URL.** `vercel.json`'s CSP allows no external image
      hosts; `cover: z.string().optional()` in `schemas.ts` imposes no
      root-relative constraint. An external `cover` would validate cleanly at the
      content layer and silently fail to load in production — a green build
      carrying a broken page, which is this project's recurring shape. Decide one
      direction: tighten the schema to require root-relative paths (matches the
      CSP; blocks hotlinking a repo's own README image) or widen `img-src` to
      named trusted hosts. _Source: `docs/pre-launch-review-2026-08-07.md` §2._

- [ ] **MEDIUM — Nothing has ever made an HTTP request to the live site.** The
      security-auditor had read-only file tools and said so: it did not run
      `npm audit` (that pass ran it and found a real, then-unfixed CVE), did not
      scan git history for secrets, and made no request to
      `doms-ai-studio.vercel.app`. The review pass did not close the last two
      either. So the six security headers shipped in PR #42 are verified only as
      *config text in `vercel.json`* — no one has confirmed the deployed site
      actually serves them, and `vercel.json` headers are unverifiable on the
      Vite dev server by construction. Two cheap, separable jobs: a `curl -I`
      assertion per header against the deployed URL (the natural home is the
      `deployed-smoke` lane, which needs the `SMOKE_URL` item above), and a
      one-off git-history secret scan. _Source:
      `docs/pre-launch-review-2026-08-07.md` §6/§7._

- [ ] **LOW — `style-src 'unsafe-inline'` (scripts are hash-pinned; styles are
      not).** `script-src` is `'self'` + sha256 with no `unsafe-inline`;
      `style-src` still carries `'unsafe-inline'` because Tailwind and inline
      `style={{…}}` props are used throughout (e.g. `Badge`'s `color-mix` tints).
      Removing it needs per-style hashing or a nonce scheme — real engineering
      against a style-only injection surface, lower severity than script
      injection but not zero (CSS can exfiltrate via attribute selectors in some
      browsers). Dom's call whether it is worth doing before launch. _Source:
      `docs/pre-launch-review-2026-08-07.md` §2._

- [ ] **LOW — Draft posts may ship in the production bundle (code shape flagged,
      bundle never inspected).** `filterVisiblePosts` filters drafts out of the
      rendered `posts` array in JS, *after* `import.meta.glob` has already loaded
      every post file — so a draft's raw markdown is plausibly present in the
      shipped chunks even though no route or link reaches it. The reviewer was
      explicit that this is the code shape that would produce it and **not a
      confirmed finding**: nobody has grepped `dist/assets/*.js` for draft-only
      content. That grep is the whole first step and takes minutes; only after it
      is there a decision to make. Kept LOW deliberately — unreachable-but-present
      draft prose on a logbook about building in the open is embarrassing, not
      dangerous. _Source: `docs/pre-launch-review-2026-08-07.md` §2._

- [ ] **LOW — The auto-merge guard's file list rests on `gh pr diff
      --name-only`, which can truncate.** The guard step in
      `.github/workflows/auto-merge.yml` enumerates changed files that way; if
      `gh` truncates on a large diff the guard under-counts and a PR touching
      unsafe paths could read as "safe" — a fail-open on the one control
      standing between the label and an unreviewed merge. Named by the auditor
      as a hypothesis **with its own verification command**, never run: compare
      `gh pr diff --name-only` against `gh pr view --json files` (or paginated
      `gh api …/files`) on a deliberately large synthetic PR. Until someone
      runs it, the guard's completeness is assumed rather than known. _Source:
      `docs/pre-launch-review-2026-08-07.md` §2._

Add new items to this list (bottom, or prioritized with a note) when run
reports surface work worth doing — but never reorder Dom's edits.

## Run report format (`reports/YYYY-MM-DD.md`)

- **Item worked on** and branch name
- **What was done** — agents deployed, output summary
- **Decisions made** and why
- **For Dom to review** — the branch, plus any open questions
- **Learnings** — anything blog-worthy: surprises, failures, costs, wins

### "Items worked on" table — Files produced/changed column (proposed 2026-08-06, pending Dom's sign-off — see below)

**Dom checkpoint, per the backlog item this answers** ("Give the 'Items
worked on' table a files-produced column"): this changes the run report
format, so it is documented here for ratification, not declared binding the
way §13/§14 below are. Once agreed, every "Items worked on" table row states
its item, branch, the files it produced/changed, and its PR **in one row**:

```
| Item | Branch | Files produced/changed | PR |
|---|---|---|---|
| Backlog checkoff gate | `team/2026-08-06-report-contract` | `scripts/check-backlog-checkoffs.mjs`, `scripts/check-backlog-checkoffs.test.ts`, `scripts/check-backlog-checkoffs.d.mts`, `BACKLOG.md` | [#NNN](…) |
```

**Empirically verified, not assumed** (per the backlog item's own instruction
to check rather than claim): a row in this shape needs **zero code change**
to `scripts/check-report-claims.mjs`'s existing extractor —
`extractClaims`/`splitIntoScanBlocks` already treats one markdown table row
as one scan block, and a row naming this branch already had its
backtick-quoted paths pulled out (`check-report-claims.test.ts`'s "table row
naming this branch scopes extraction" case predates this item). **One real
bug WAS found and fixed while verifying this**, so the claim is not
unconditionally true: `PATH_TOKEN_RE`'s final path segment forbade a dot in
the name part, so `scripts/x.mjs` matched but `scripts/x.test.ts` and
`scripts/x.d.mts` silently did not — meaning a Files-produced cell listing
this repo's own normal deliverable shape (a script plus its `.test.ts` and
`.d.mts` siblings) would have dropped two of the three paths. Fixed by
widening the name-part character class to allow interior dots (see that
file's own header, "COMPOUND EXTENSIONS", for the false-positive analysis
proving this doesn't reopen the contrast-ratio/timing/semver false-positive
class the extension whitelist exists to block). With that one-line fix, the
row shape above extracts all four paths correctly (regression test:
`check-report-claims.test.ts`, "THE FILES-PRODUCED-COLUMN EMPIRICAL CHECK").

Not retrofitted onto the 23 existing reports — this is a going-forward
convention for new reports once Dom ratifies it, same as this repo's other
report-format changes (§13/§14 below were adopted the same way, forward-only).

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

**Ordering constraint (binding since 2026-08-01 — `docs/provenance-model.md`
§13):** if a run's report is opened before every PR it describes has merged,
a block whose `produced` path doesn't exist on `main` yet will be correctly
rejected by the generator. Do not force it, and do not hold the report PR
open waiting on the other PRs. Instead: (1) leave the block out of the report
PR, (2) preserve its exact intended content — branch, produced paths,
authors, reviewer(s) + kind, `judge`, `tokens` — in prose under a clearly
labelled subsection, naming which PRs it's waiting on, (3) open/reuse a
backlog item tracking the deferral, (4) once those PRs merge, append the
preserved blocks in a small follow-up commit, run `npm run
provenance:generate`, and commit the regenerated
`src/content/provenance.generated.json` alongside the report edit. This is a
routine step on any multi-lane run, not a failure state — see
`reports/2026-07-30.md` ("Provenance blocks — deliberately deferred, and
why") for a worked example of both halves.

**Creation-only constraint (binding since 2026-08-02 — `docs/provenance-model.md`
§14):** every report gets a `## Provenance blocks` section, **including when
there is nothing to claim**. A block is a *creation* record; if a run's
deliverable was an *edit*, it has no block to write, and that is the format
working, not a gap to fill.

1. **Never list a file the run edited under `produced:`.** The generator will
   accept it and resolve an earlier run's creation commit — a green build
   carrying a false claim. Nothing in CI catches this; the rule is the only
   guard.
2. **Record every file the run genuinely created, and nothing else.** Do not
   hunt for a creatable file so the run has a block, and never claim the
   report itself (`reports/2026-07-29.md` already refused this — reports are
   the *source* of provenance, not a subject of it).
3. **When a run created nothing (or little) a block can carry, say so in prose
   under `## Provenance blocks`**: what the run's actual deliverable was, which
   files it *modified*, and the PR number for each — the PR diff is where an
   edit is verifiable. Head that list "Modified, not claimed — a `produced`
   list is a creation record (§14)."
4. **This prose is never parsed and must never become parseable** (§14.5).
   Making it machine-readable rebuilds a rejected option with extra steps.
5. A run may hit this **and** the ordering constraint above at once — deferred
   creations *and* unclaimable edits. Separate paragraphs in the same section;
   do not merge them.

Worked examples: `reports/2026-07-29.md` ("**None — deliberately**", including
the two blocks it drafted and removed on inspection) and
`reports/2026-07-27.md`'s closing line.

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
