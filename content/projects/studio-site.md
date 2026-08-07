---
title: "Studio Site"
slug: "studio-site"
summary: "The AI studio's own site, its first team-built portfolio entry — four browser-only bugs, three wrong CI gates, and a merge lane unused for 12 days."
stack: ["React", "Vite", "TypeScript", "Tailwind CSS", "Zod", "Vitest", "Playwright"]
status: "in-progress"
repo: "https://github.com/dominiquebrom28/studio-site"
liveUrl: "https://doms-ai-studio.vercel.app"
featured: true
order: 0
date: "2026-07-14"
soloBuild: false
goal:
  text: |-
    This is the studio's own website — the project every other write-up on this site implicitly stands behind, and the first one the AI team built rather than Dom alone. PROJECT-BRIEF.md says it plainly: "The site is itself built by that team, which makes it both the portfolio and the proof." This entry turns that proof back on itself — a portfolio write-up about the portfolio, written under the same never-invent rule as every other page here.
  source: logged
brief:
  source: logged
  bullets:
    - text: |-
        One Project Lead orchestrating specialist subagents, working only on `team/*` branches — the hard rule, quoted directly: "Never commit to main — Dom reviews and merges."
      source: logged
    - text: |-
        "Every run ends with a report in `reports/`" — the project's own build history is written as content from day one, not reconstructed for marketing afterward.
      source: logged
    - text: |-
        Voice rule, quoted directly from the brief: "Honest, concrete, personal — an indie builder documenting a real experiment, not a corporate agency. No fabricated clients, metrics, or testimonials."
      source: logged
process:
  commits:
    - date: "2026-07-14"
      count: 3
    - date: "2026-07-15"
      count: 4
    - date: "2026-07-16"
      count: 7
    - date: "2026-07-17"
      count: 6
    - date: "2026-07-18"
      count: 28
    - date: "2026-07-19"
      count: 31
    - date: "2026-07-20"
      count: 13
    - date: "2026-07-21"
      count: 18
    - date: "2026-07-22"
      count: 2
    - date: "2026-07-23"
      count: 13
    - date: "2026-07-24"
      count: 19
    - date: "2026-07-25"
      count: 2
    - date: "2026-07-27"
      count: 20
    - date: "2026-07-28"
      count: 10
    - date: "2026-07-29"
      count: 15
    - date: "2026-07-30"
      count: 6
    - date: "2026-07-31"
      count: 13
  phases:
    - from: "2026-07-14"
      to: "2026-07-16"
      title: "Spec, brief, scaffold — and the first browser-only miss"
      narrative: |-
        The architecture spec passed the Judge 91/100 on round one; the design brief passed 93/100 on round two. The scaffold that followed was green on every automated gate the team had — lint, typecheck, a 56-test loader suite — until a human opened it in a real browser and found a hero design-token collision none of them had caught. First of what became four browser-only P0s.
      tone: build
    - from: "2026-07-17"
      to: "2026-07-18"
      title: "Auto-merge ships; three more browser-only bugs land the same week"
      narrative: |-
        devops shipped a label-triggered CI auto-merge lane on the 17th, built to protect Dom's review time. The next day brought two more misses no gate saw: a mobile reading-order bug, and every blog table-of-contents anchor silently dead, because a render-time id mutation only misbehaves under React StrictMode's double-invoke — which the site's own static-render QA harness could not, by construction, reproduce. Hours later, a fourth: every route but `/` returned 404 on the real Vercel deployment while localhost worked perfectly, because Vite's dev server fakes an SPA rewrite production never had.
      tone: pivot
    - from: "2026-07-19"
      to: "2026-07-20"
      title: "Three gates found wrong in three days"
      narrative: |-
        The browser-level smoke test built in direct response to the week before turned out to mount one blog post out of eleven while reporting full route coverage. A new content-validation rule banning two posts from sharing a date was overturned by Dom the same day, because it punished exactly the productive days the studio's own policy was meant to celebrate. Then the site's first real multi-author post was rejected by that same gate, for a case its author-field check had simply never been written to see. Three wrong-gate incidents in three days.
      tone: pivot
    - from: "2026-07-21"
      to: "2026-07-24"
      title: "A provenance, security and real-browser pass"
      narrative: |-
        A whole-team review found the hero overclaiming its own honesty device, no favicon or social-preview image anywhere, and no way for an engaged reader to leave — three more P0s. Closed out with real security headers (a CSP that required hashing the app's own inline theme-bootstrap script), automated axe accessibility scans, and a real-browser Playwright suite, because jsdom cannot see a responsive layout bug by construction.
      tone: cleanup
    - from: "2026-07-27"
      to: "2026-07-31"
      title: "Maintenance weeks, and the lane nobody labeled"
      narrative: |-
        The team settled into weekly maintenance sweeps — a CLS fix, a real SEO/loader-contract gate — while still shipping new work. A 2026-07-31 audit of the review queue found the auto-merge lane from the week before had merged exactly four PRs, all on its first day, then sat unused: no PR had carried its label in 12 days, and the branch-protection rule its own setup doc said was required for it to be safe had never actually been turned on.
      tone: cleanup
---

This is the studio's own site — the project every other write-up in this portfolio implicitly stands behind, and the first one built by the AI team rather than by Dom alone. Every other project in this portfolio was built by Dom alone; this is the first entry that wasn't, which is a gap the team only noticed in its own portfolio on 2026-07-30. So the same team that shipped the site wrote this page about the site, under the same rule as every other entry — real events, sourced from git and `reports/`, never invented.

Four times, the bug that mattered most got past every automated gate and was only caught by a human opening a real browser. On 2026-07-15, a hero design-token collision. On 2026-07-17, a mobile reading-order defect. On 2026-07-18, every table-of-contents anchor on the blog was silently dead — a render-time id mutation that only misbehaves under React StrictMode's double-invoke, which the site's own `renderToStaticMarkup` QA harness could not, by construction, reproduce. Hours later that same day, a fourth: every route except `/` returned 404 on the real Vercel deployment while localhost worked fine, because Vite's dev server silently fakes the SPA fallback production needed a real rewrite rule for. All four had passed typecheck, lint, and the unit-test suite at the time.

The CI gates the team built in response weren't reliably right either. Three separate times within a few days, a check turned out to be the thing that was wrong, not the content it was judging: a content-validation rule that banned two blog posts from sharing a date, which punished exactly the productive days it should have celebrated (Dom overturned it the same day); a new browser-level smoke test that reported full route coverage while actually mounting one post out of eleven; and the site's first real multi-author blog post, rejected by that same content gate because its author-field check had never been written to look at `authors[]`, only `author`. The team's own conclusion, recorded verbatim in the backlog: "a gate that fails should be suspected as hard as the content it fails on."

The backlog — this project's own record of what's done — misreported its own state three separate times. Two items shipped and merged, then sat still unchecked for a day before a later run went looking in git history, found the real merges, and corrected the file. A shipped fix for the site's missing social-preview images lagged two days behind its own merge before a routine reconciliation pass caught that gap too, and named it explicitly as the third such incident.

The clearest example of a green check covering nothing: devops built a label-triggered auto-merge lane on 2026-07-17, specifically to protect Dom's review time as the queue grew. It merged four pull requests — on the day it launched — and then nobody applied the label again. A 2026-07-31 audit found no PR had carried it in 12 days, the review queue had grown past its own stated throttle, and the branch-protection rule the lane's own setup document said was required for it to be safe had never actually been turned on. Five of the seven pull requests then blocking the queue would have passed the lane's own path check untouched — roughly two-thirds of the blockage was work built to merge itself that never did.

What the team got right, mechanically verified rather than asserted: 210 commits (118 of them not merge commits) landed across 17 of the 18 calendar days between 2026-07-14 and 2026-07-31, and 81 pull requests merged in that span — 77 reviewed and merged by Dom by hand, 4 auto-merged the one day the lane above actually worked. 23 run reports in `reports/`, one per scheduled session, each ending with an honest account of what shipped and what didn't; this write-up is built from them and from git history, not from memory. A real content-validation gate, a real cross-viewport Playwright suite, automated axe accessibility scans, and a CSP the team had to hash its own inline bootstrap script to satisfy — none of it existed on day one, and all of it was built because a real gap was found, not because a checklist demanded it.

Status: in progress, and it will likely stay that way — the studio's model is continuous small runs, not a finish line. What's true right now: `main` is deployed and live at the URL above, Dom is still the only merge button that reliably gets pressed, and the automation built specifically to reduce that bottleneck is, at the time of writing, not doing that job.
