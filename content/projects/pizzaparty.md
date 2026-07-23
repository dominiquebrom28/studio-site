---
title: "PizzaParty"
slug: "pizzaparty"
summary: "Spin the wheel, eat the pizza — a polished demo whose coupon/partner features were scaffolded and never built."
stack: ["HTML", "JavaScript", "Tailwind CSS", "Canvas API"]
status: "archived"
liveUrl: "https://pizzaparty-mu.vercel.app"
repo: "https://github.com/dominiquebrom28/pizzaparty"
cover: "/images/projects/pizzaparty/pizzaparty-hero-mobile.png"
media:
  - src: "/images/projects/pizzaparty/pizzaparty-flow.gif"
    poster: "/images/projects/pizzaparty/pizzaparty-flow-poster.jpg"
    alt: "Pizza Roulette flow on mobile: excluding Mushrooms and Seafood in the ingredient sheet (wheel updates live to 28 pizzas), setting party size to 2, spinning twice — including a mid-spin blurred wheel frame — landing on Carbonara then Stracciatella (each with a real 'Coupon coming soon' notice and two Maastricht restaurant names, no working links), and the final Party Summary screen with the Fate Acceptor bonus and total points."
    caption: "7-frame, ~8s honest walkthrough of a full spin party — filter, configure, spin twice, summary — at 375x812."
    kind: "animation"
    viewport: "mobile"
    width: 375
    height: 812
  - src: "/images/projects/pizzaparty/pizzaparty-hero-mobile.png"
    alt: "Pizza Roulette home screen on mobile: the ingredient-accurate pizza wheel with 42 pizzas loaded, pizza count and exclude-ingredients controls, and a red 'Start Spinning!' button."
    caption: "Pizza Roulette default mobile screen, fresh session (0 pts, no cooldown)."
    kind: "still"
    viewport: "mobile"
    width: 375
    height: 812
  - src: "/images/projects/pizzaparty/pizzaparty-hero-desktop.png"
    alt: "Pizza Roulette on a 1280x800 desktop viewport: the same mobile-width layout centered with empty space on both sides."
    caption: "Pizza Roulette on desktop — a genuinely mobile-first layout, not a responsive redesign."
    kind: "still"
    viewport: "desktop"
    width: 1280
    height: 800
featured: false
order: 6
date: "2026-05-01"
goal:
  text: |-
    PizzaParty reads like a small, self-contained fun project — solving "what pizza should we get" with a spin of a wheel instead of a group-chat argument, built to be delightful in one sitting rather than to become a business.
  source: read
brief:
  source: not-stated
  bullets:
    - text: |-
        Honestly, there's no discernible brief here beyond "make the fun part work."
      source: not-stated
    - text: |-
        A commercial layer was sketched into the data model and never built: all 42 pizzas carry a null coupon and an empty partner-restaurants array, and while eight real Maastricht restaurants were added with genuine detail, every one of their website fields is null.
      source: not-stated
    - text: |-
        The shape of a business was laid out and then left empty.
      source: not-stated
process:
  commits:
    - date: "2026-05-01"
      count: 4
    - date: "2026-07-16"
      count: 1
      isCleanupSweep: true
  phases:
    - from: "2026-05-01"
      to: "2026-05-01"
      title: "One 67-minute sitting"
      narrative: |-
        It arrived almost whole — a 1,097-line initial commit with all 42 pizzas and their origin stories already written — then gained its personality in three more commits inside the same hour: a cooldown timer, a bonus for not re-spinning, and a wheel redesign from generic pie slices into an ingredient-accurate pizza. Four commits, one hour, then it stopped.
      tone: build
    - from: "2026-07-16"
      to: "2026-07-16"
      title: "The sweep"
      narrative: |-
        Like four other repos in the studio, PizzaParty picked up one small housekeeping commit on July 16 — the same day several stalled projects got their loose ends tied off at once, within about thirty seconds of each other. Nothing about the app changed; this was tidying, not a return to building.
      tone: cleanup
---

PizzaParty — internally "Pizza Roulette" — is a mobile-first web app with one job: spin the wheel, eat the pizza. Users spin a canvas-drawn roulette wheel stocked with 42 pizzas to decide what to eat, after picking how many pizzas are in play and excluding ingredients or allergens from nine filter chips. It layers on gamification: points, a "fate bonus" for never re-spinning, a three-point penalty for re-spinning paired with a guilt-trip "Denying Fate?" modal, and a one-hour cooldown between parties. Five screens cover the wheel, a party summary, spin history, a restaurants page ("Spots" — eight curated Maastricht pizzerias, likely illustrative rather than real partnerships), and a profile/stats view. The wheel itself is drawn as an actual pizza, with sauce and topping colors computed per ingredient rather than generic pie-chart segments.

The whole thing is one file: `index.html`, 1,549 lines of vanilla JavaScript, styled with the Tailwind dev CDN, using Canvas 2D for the wheel and localStorage for persistence, plus the Web Share API for sharing results. No package.json, no build step, no framework, no backend, no tests, no README.

What worked: as a frontend demo, it's complete and it holds together. The full spin loop runs end to end — allergen filtering, a live cooldown countdown, idle wheel rotation, and respect for `prefers-reduced-motion` all work. It arrived essentially whole in a 1,097-line initial commit — heavily AI-assisted, all 42 pizza origin stories included — then gained the cooldown and fate-bonus mechanics, restaurant data, a wheel redesign from generic segments into the ingredient-accurate pizza, and the restaurants page: four commits in roughly one hour on a single afternoon.

What didn't: the business layer was never built. There are four separate "coming soon" notices in the UI (three for coupons, one for restaurant websites), and the data model has fields — `coupon`, `partnerRestaurants`, `website` — that are always null or empty. It's a schema built for a restaurant-partnership business model that was scaffolded and never wired up. The Tailwind CDN approach is fine for a demo and not production-appropriate as-is. There are no fix commits in its history, which cuts both ways: nothing visibly broke, but nothing kept moving either. It's been untouched for roughly two and a half months since that one build session.

Status: archived. A genuinely polished demo of the fun part — spin, filter, gamify — that stopped exactly at the edge of the part that would have made it a real product.
