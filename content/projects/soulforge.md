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
goal:
  text: |-
    SoulForge is Dom's own habit-and-journaling life turned into a walkable game — the working theory is that real tasks feel less like admin if leveling six character stats is the reward for doing them. It reads like an attempt to make personal discipline as compelling as a save file.
  source: read
brief:
  source: read
  bullets:
    - text: |-
        Turn the boring parts of self-improvement into something you'd actually want to open — a real 2D pixel-art world, not a checklist wearing an RPG skin.
      source: read
    - text: |-
        Plan the architecture up front: a 487-line design doc, before writing any game code, so the port from prototype to app had a fixed target.
      source: read
    - text: |-
        Get one vertical slice fully walkable before building any of the actual habit, quest or journal mechanics behind it.
      source: read
    - text: |-
        Choose the heavier stack (Phaser, not just React+CSS) once being the one hand-coding stopped being the deciding factor — the plan says so directly: "this reverses my earlier lean toward plain React+CSS — the deciding factor there was 'your comfort zone,' which no longer applies since you're not hand-coding."
      source: read
process:
  commits:
    - date: "2026-06-15"
      count: 9
    - date: "2026-07-16"
      count: 1
      isCleanupSweep: true
  phases:
    - from: "2026-06-15"
      to: "2026-06-15"
      title: "The prototype becomes the app"
      narrative: |-
        Seventeen minutes into the very first commit, the fresh scaffold got scrapped in favour of inlining the existing 587-line HTML prototype as the real running app. The same idea — that porting must not touch the design — gets restated across the next few commits in slightly different words each time, like someone checking their own work against a spec they didn't fully trust yet.
      tone: pivot
    - from: "2026-06-15"
      to: "2026-06-15"
      title: "A walkable world, built fast and slightly wrong"
      narrative: |-
        Over the same eleven-hour day all seven interactive elements went in. The Journal Cave became the Journal Tent mid-build, because the art pack shipped a tent and not a cave. A licence call on that pack got reversed four hours after it was made, and a sprite recycled between two elements was caught six minutes after shipping. It reads like building against the clock and correcting course in real time.
      tone: build
    - from: "2026-07-16"
      to: "2026-07-16"
      title: "A month of quiet, then a sweep"
      narrative: |-
        Nothing landed for about a month. The July 16 sweep finally committed an in-flight refactor pulling progression logic into its own module — but it also left the build broken: useGame.ts calls a loadLocalStats function that profile.ts never defines, so the production build doesn't currently compile. That's still true today.
      tone: cleanup
---

SoulForge is a personal "life-RPG" habit tracker built as a 2D side-scrolling pixel-art game. The idea: the player IS the user. Real-life habits, journaling, and quests level up six in-game stats — Vitality, Presence, Courage, Connection, Creation, Peace — each running 1 to 10 via XP thresholds. Four "Realms" group stat pairs around a psychological loop (Embodiment, Serenity, Momentum, Authenticity — e.g. Serenity fights the "Insight Trap," over-analyzing instead of feeling). Leo, a black Labrador modeled on the real dog, follows the player as a procedurally-drawn AI companion. It's explicitly not a combat game — it's built for exploration and interaction.

We built it on Vite, React 19, TypeScript, Phaser 3.90, Zustand 5, and Supabase, with an architecture we consider "locked": Phaser owns the game world, React owns the DOM/UI, Zustand bridges the two. Persistence is localStorage-first with a best-effort Supabase upsert layered on top, so the app runs fully offline with no backend required.

What worked: in a single nine-commit build day, we went from a 587-line HTML prototype to a genuinely playable slice — character creation with live LPC sprite composition, a full walkable and jumpable world with all seven interactive elements placed (Habit Shrine, Quest Board, Journal Cave, Leo's Campfire, Monument, Todo Board, Level Archive), each with distinct art and proximity prompts, plus mobile touch controls and working local persistence. The porting strategy — build the standalone prototype first, then port it into the bundled app in layers — was planned upfront in a 486-line design doc, and it held.

What didn't: every one of those seven elements currently opens the same placeholder panel, literally labeled "PLACEHOLDER — the real panel arrives in a later slice." None of the actual habit, quest, or journal mechanics exist yet; stats are hardcoded seeds, and there's no auth. We hit an asset-loading bug during an art re-skin pass and had to redo art that had been recycled between elements. Momentum stalled hard after day one — the next commit didn't land until a month later, in a July 16 cleanup sweep that finally captured the in-flight work of extracting the progression logic into its own module. The Supabase row-level security policy is also flagged in a code comment as deliberately permissive tech debt, to be tightened once real accounts land.

Status: in progress, and honestly stalled. The world exists; the game inside it doesn't yet.
