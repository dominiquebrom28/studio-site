---
title: "SoulForge"
slug: "soulforge"
summary: "A life-RPG habit tracker in pixel-art — one intense build day, then the plan outran the code."
stack: ["Vite", "React", "TypeScript", "Phaser", "Zustand", "Supabase"]
status: "in-progress"
repo: "https://github.com/dominiquebrom28/soulforge"
featured: true
order: 1
date: "2026-06-15"
---

SoulForge is a personal "life-RPG" habit tracker built as a 2D side-scrolling pixel-art game. The idea: the player IS the user. Real-life habits, journaling, and quests level up six in-game stats — Vitality, Presence, Courage, Connection, Creation, Peace — each running 1 to 10 via XP thresholds. Four "Realms" group stat pairs around a psychological loop (Embodiment, Serenity, Momentum, Authenticity — e.g. Serenity fights the "Insight Trap," over-analyzing instead of feeling). Leo, a black Labrador modeled on the real dog, follows the player as a procedurally-drawn AI companion. It's explicitly not a combat game — it's built for exploration and interaction.

We built it on Vite, React 19, TypeScript, Phaser 3.90, Zustand 5, and Supabase, with an architecture we consider "locked": Phaser owns the game world, React owns the DOM/UI, Zustand bridges the two. Persistence is localStorage-first with a best-effort Supabase upsert layered on top, so the app runs fully offline with no backend required.

What worked: in a single nine-commit build day, we went from a 587-line HTML prototype to a genuinely playable slice — character creation with live LPC sprite composition, a full walkable and jumpable world with all seven interactive elements placed (Habit Shrine, Quest Board, Journal Cave, Leo's Campfire, Monument, Todo Board, Level Archive), each with distinct art and proximity prompts, plus mobile touch controls and working local persistence. The porting strategy — build the standalone prototype first, then port it into the bundled app in layers — was planned upfront in a 486-line design doc, and it held.

What didn't: every one of those seven elements currently opens the same placeholder panel, literally labeled "PLACEHOLDER — the real panel arrives in a later slice." None of the actual habit, quest, or journal mechanics exist yet; stats are hardcoded seeds, and there's no auth. We hit an asset-loading bug during an art re-skin pass and had to redo art that had been recycled between elements. Momentum stalled hard after day one — no commits since June 15, only local edits a month later starting to extract the progression logic into its own module. The Supabase row-level security policy is also flagged in a code comment as deliberately permissive tech debt, to be tightened once real accounts land.

Status: in progress, and honestly stalled. The world exists; the game inside it doesn't yet.
