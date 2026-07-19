---
title: "LoveDiary"
slug: "lovediary"
summary: "A couples' timeline app for logging relationship moments — polished single-player, but its partner sync is UI-only fake."
stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Zustand", "framer-motion"]
status: "in-progress"
repo: "https://github.com/dominiquebrom28/lovediary"
featured: false
order: 5
date: "2026-05-03"
goal:
  text: |-
    LoveDiary reads like a personal project built for a couple rather than a market — a private, aesthetic timeline for logging the moments in a relationship as something closer to a shared scrapbook than a productivity app.
  source: read
brief:
  source: read
  bullets:
    - text: |-
        Let two people log meaningful moments — photo, mood, location, date — on one shared timeline.
      source: read
    - text: |-
        Present it beautifully: a full-width hero, a running relationship-duration counter, a swipeable story mode.
      source: read
    - text: |-
        Give it real settings — theme, hero customisation — without slowing down the core add-a-moment loop.
      source: read
    - text: |-
        Make it feel like two people are using it together, even before there's a backend to make that literally true.
      source: read
process:
  commits:
    - date: "2026-05-03"
      count: 1
    - date: "2026-05-04"
      count: 8
    - date: "2026-07-16"
      count: 1
      isCleanupSweep: true
  phases:
    - from: "2026-05-03"
      to: "2026-05-03"
      title: "The scaffold"
      narrative: |-
        One commit: the Next.js boilerplate. The quiet, unremarkable start before the real building happened the next evening.
      tone: build
    - from: "2026-05-04"
      to: "2026-05-04"
      title: "Eight commits in one evening, and a page built to be thrown away"
      narrative: |-
        The core loop — moments, reactions, comments, the story slideshow, theme switching — lands in about three hours. In the middle of it a full settings page gets built, shipped, and replaced by a drawer eleven minutes later; the abandoned page is still sitting in the repo, unreachable from the live app. A bottom-tab nav is removed entirely the same evening. It reads like someone iterating fast enough to correct a decision before it had time to feel wrong.
      tone: pivot
    - from: "2026-07-16"
      to: "2026-07-16"
      title: "73 days quiet, then the sweep"
      narrative: |-
        Work stopped mid-iteration; real follow-up files sat uncommitted for over two months before the sweep landed them. Nothing about the app's core promise changed in that time — the partner-sync screen still shows a couple code that can never connect to anyone, because there's no backend behind it.
      tone: cleanup
---

LoveDiary is a couples' relationship-timeline app. Couples log "moments" — typed entries for firsts, dates, trips, milestones, random moments, surprises, inside jokes, and growth — each with a title, date, location, description, mood, image, reactions, and comments, laid out on a vertical timeline under a full-width hero. There's also a fullscreen, swipeable story-slideshow mode in the style of Instagram stories, a settings drawer offering three themes (parchment, midnight, sage), hero customization, and a running relationship-duration display.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Zustand with persist middleware, and framer-motion — about 3,065 lines across 14 files, entirely client-side, with no backend, no API routes, and no auth. Everything lives in localStorage, including a real migration path: a custom persist-merge function backfills default images into moments that were saved before image support existed, which is the kind of detail that only shows up when an app has actually been iterated on rather than just demoed.

What worked: the core loop is solid — add, edit, and delete moments, reactions, comments, filtering, two view modes, the story slideshow, live theme switching, and persistence with that migration logic all function. Nine commits landed in about 24 hours, seven of them substantive features packed into roughly three hours on the second day, including two decisive pivots made and shipped within the same hour: a bottom-tab mobile nav replaced by a drawer-driven single page, and page-based settings replaced by a tabbed drawer.

The honest catch: partner sync is fake. The UI shows a "Partner Connection" screen with a couple code, claiming to "sync timelines in real-time" — but there's no backend behind it. The code is hardcoded, `partnerConnected` can never actually become true, and every comment is always authored as "me." It's a single-user, localStorage-only app wearing a multiplayer interface. Image "upload" is URL-paste only, not a real upload. The fast pivots also left dead code behind — an orphaned bottom nav and a 405-line orphaned profile page that's no longer reachable — and the README is still the untouched create-next-app default.

Status: in progress, stopped mid-iteration — seven files of follow-up work sat uncommitted for over two months before a July 16 cleanup sweep landed them. It's linked to a Vercel project but not confirmed live. The honest state of it: a well-built single-player diary that visually promises a two-player feature it doesn't yet have.
