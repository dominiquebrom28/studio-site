---
title: "MensApp"
slug: "mensapp"
summary: "A friend-group event app — polls, a live pub quiz, and a beer-crate counter — actually used for the real event."
stack: ["React", "Vite", "Supabase"]
status: "shipped"
repo: "https://github.com/dominiquebrom28/mensapp"
featured: false
order: 4
date: "2026-04-29"
goal:
  text: |-
    MensApp exists because a Dutch friend group needed one, and knew it — the footer says outright "Built for the lads." It's the organizing tool for Mensdag, their recurring lads'-day-out: polls, a quiz, teams, photos and a running beer count, built to actually be opened and used on the day rather than admired as a portfolio piece.
  source: logged
brief:
  source: read
  bullets:
    - text: |-
        Give one closed friend group a private hub for planning and running their event: schedule, secret stops, team assignments.
      source: read
    - text: |-
        Make it feel festive, not corporate — presentation mode, a Hall of Fame, in-jokes baked into the copy.
      source: read
    - text: |-
        Support the day itself live: a beer-crate counter, a full pub quiz with host mode, updates that reach everyone's phone fast enough to matter.
      source: read
    - text: |-
        Keep auth dead simple for a group who already trust each other — a username and a PIN, nothing more.
      source: read
process:
  commits:
    - date: "2026-04-29"
      count: 7
    - date: "2026-04-30"
      count: 6
    - date: "2026-05-02"
      count: 8
    - date: "2026-05-04"
      count: 1
    - date: "2026-05-05"
      count: 1
    - date: "2026-07-16"
      count: 1
      isCleanupSweep: true
  phases:
    - from: "2026-04-29"
      to: "2026-04-29"
      title: "Day one, the hard way"
      narrative: |-
        The opening session runs a 41-minute debugging stretch before much else lands, and the JS-camelCase-versus-Postgres-snake_case seam bites almost immediately. It reads like the first day of any real integration: slower than the ambition, faster than it felt at the time.
      tone: build
    - from: "2026-04-30"
      to: "2026-04-30"
      title: "Realtime goes in, and comes back out four minutes later"
      narrative: |-
        Supabase realtime subscriptions get added, then swapped for a 30-second poll four minutes later — and the history never says why. That poll is still the sync mechanism today. Our best guess: realtime under-delivered on something faster than it was worth debugging with an event days away, and good-enough won. But that's a guess; the log is genuinely silent on the reason.
      tone: pivot
    - from: "2026-05-02"
      to: "2026-05-02"
      title: "Eight commits, one long push toward festive"
      narrative: |-
        The biggest single day: member profiles, role tiers, presentation mode, rich text, an updates feed, the beer-crate counter — and the same camelCase mismatch resurfaces and gets fixed a second time. This is the day it stops looking like a prototype and starts looking like the thing the group would actually open on the night.
      tone: build
    - from: "2026-05-04"
      to: "2026-05-05"
      title: "The ambition spike"
      narrative: |-
        One commit adds +2,316/−469 lines in a single sitting — a team creator, a timer, and an entire pub-quiz system with a live host mode. A second lands the next day, then nothing. Two single-commit days carrying that much weight read like someone building against a real date on the calendar.
      tone: build
    - from: "2026-07-16"
      to: "2026-07-16"
      title: "72 days quiet, then the sweep"
      narrative: |-
        Commit discipline stopped on 5 May — the app didn't. Weeks of further work sat uncommitted while the deployed app ran ahead of its own repo. The July 16 sweep is what finally reconciled the two.
      tone: cleanup
---

MensApp is a private, invite-style web app built for organizing an annual Dutch friends-group event — Mensdag, a lads' day out. The footer says it plainly: "Built for the lads." It's a genuinely full-featured event tool: events with schedules, secret stops, and a fullscreen presentation mode; per-event tabs for polls, a quiz, teams, photos, winners and highlights, an FAQ, and a live beer-crate counter; a full pub-quiz builder with a live host mode — multi-round, music rounds with YouTube/Spotify embeds, timers, image questions, keyboard shortcuts, live scoring; member profiles with auto-computed stats and a Hall of Fame; username-and-PIN auth with admin approval and role tiers; cross-device notifications; and a random team generator. There's also an admin-unlockable easter-egg minigame — guess which images are real versus AI-generated.

Stack is React 18, Vite 5, and Supabase (Postgres, Storage, realtime broadcast channels), with no TypeScript, no router, and no CSS framework. It's essentially a one-file app: `src/App.jsx` runs 6,180 lines and holds every component, seed data, and inline style. Sync is a mix of an initial fetch, 30-second polling, and realtime broadcast, with notifications derived by diffing event snapshots — plus one notable hack: rows in the announcements table doubling as a poor-man's key-value store for feature flags.

What worked: this one actually got used. Built in 23 commits over five active days and deployed for the group's real event, it carries the group's actual history as data — past editions like Mensday 2023, "Racing Edition": go-karting, a pub quiz, and a bar crawl in Amsterdam. Day one was rough (Supabase realtime subscriptions had to be replaced with polling almost immediately, plus a schema mismatch fix), but the build accelerated fast from there: members, avatars, a full UI/UX pass for a "festive lads feel," role tiers, presentation mode, rich text, an updates feed, the beer-crate counter, quiz improvements.

What's honestly rough: PINs are hashed client-side with unsalted SHA-256, and permissions are enforced client-side only — acceptable for a closed friend group, not something we'd ship for strangers. Commit discipline also collapsed after May 5: roughly six weeks of further work, including the entire minigame, sat uncommitted in the working tree — the deployed app on Vercel ran well ahead of the repo the whole time — until a July 16 cleanup sweep finally landed it. There's no README.

Status: shipped and used for the real event it was built for — the clearest "it worked" in this portfolio, with the process debt to match.
