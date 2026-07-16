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
---

MensApp is a private, invite-style web app built for organizing an annual Dutch friends-group event — Mensdag, a lads' day out. The footer says it plainly: "Built for the lads." It's a genuinely full-featured event tool: events with schedules, secret stops, and a fullscreen presentation mode; per-event tabs for polls, a quiz, teams, photos, winners and highlights, an FAQ, and a live beer-crate counter; a full pub-quiz builder with a live host mode — multi-round, music rounds with YouTube/Spotify embeds, timers, image questions, keyboard shortcuts, live scoring; member profiles with auto-computed stats and a Hall of Fame; username-and-PIN auth with admin approval and role tiers; cross-device notifications; and a random team generator. There's also an admin-unlockable easter-egg minigame — guess which images are real versus AI-generated — sitting uncommitted.

Stack is React 18, Vite 5, and Supabase (Postgres, Storage, realtime broadcast channels), with no TypeScript, no router, and no CSS framework. It's essentially a one-file app: `src/App.jsx` runs 6,180 lines and holds every component, seed data, and inline style. Sync is a mix of an initial fetch, 30-second polling, and realtime broadcast, with notifications derived by diffing event snapshots — plus one notable hack: rows in the announcements table doubling as a poor-man's key-value store for feature flags.

What worked: this one actually got used. Built in 23 commits over five active days and deployed for the group's real event, it carries the group's actual history as data — past editions like Mensday 2023, "Racing Edition": go-karting, a pub quiz, and a bar crawl in Amsterdam. Day one was rough (Supabase realtime subscriptions had to be replaced with polling almost immediately, plus a schema mismatch fix), but the build accelerated fast from there: members, avatars, a full UI/UX pass for a "festive lads feel," role tiers, presentation mode, rich text, an updates feed, the beer-crate counter, quiz improvements.

What's honestly rough: PINs are hashed client-side with unsalted SHA-256, and permissions are enforced client-side only — acceptable for a closed friend group, not something we'd ship for strangers. Commit discipline also collapsed after May 5: roughly six weeks of further work, including the entire minigame, sits uncommitted, so the deployed app on Vercel is well ahead of what's in the repo. There's no README.

Status: shipped and used for the real event it was built for — the clearest "it worked" in this portfolio, with the process debt to match.
