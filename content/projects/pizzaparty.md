---
title: "PizzaParty"
slug: "pizzaparty"
summary: "Spin the wheel, eat the pizza — a polished demo whose coupon/partner features were scaffolded and never built."
stack: ["HTML", "JavaScript", "Tailwind CSS", "Canvas API"]
status: "archived"
repo: "https://github.com/dominiquebrom28/pizzaparty"
featured: false
order: 6
date: "2026-05-01"
---

PizzaParty — internally "Pizza Roulette" — is a mobile-first web app with one job: spin the wheel, eat the pizza. Users spin a canvas-drawn roulette wheel stocked with 42 pizzas to decide what to eat, after picking how many pizzas are in play and excluding ingredients or allergens from nine filter chips. It layers on gamification: points, a "fate bonus" for never re-spinning, a three-point penalty for re-spinning paired with a guilt-trip "Denying Fate?" modal, and a one-hour cooldown between parties. Five screens cover the wheel, a party summary, spin history, a restaurants page ("Spots" — eight curated Maastricht pizzerias, likely illustrative rather than real partnerships), and a profile/stats view. The wheel itself is drawn as an actual pizza, with sauce and topping colors computed per ingredient rather than generic pie-chart segments.

The whole thing is one file: `index.html`, 1,549 lines of vanilla JavaScript, styled with the Tailwind dev CDN, using Canvas 2D for the wheel and localStorage for persistence, plus the Web Share API for sharing results. No package.json, no build step, no framework, no backend, no tests, no README.

What worked: as a frontend demo, it's complete and it holds together. The full spin loop runs end to end — allergen filtering, a live cooldown countdown, idle wheel rotation, and respect for `prefers-reduced-motion` all work. It arrived essentially whole in a 1,097-line initial commit — heavily AI-assisted, all 42 pizza origin stories included — then gained the cooldown and fate-bonus mechanics, restaurant data, a wheel redesign from generic segments into the ingredient-accurate pizza, and the restaurants page: four commits in roughly one hour on a single afternoon.

What didn't: the business layer was never built. There are four separate "coming soon" notices in the UI (three for coupons, one for restaurant websites), and the data model has fields — `coupon`, `partnerRestaurants`, `website` — that are always null or empty. It's a schema built for a restaurant-partnership business model that was scaffolded and never wired up. The Tailwind CDN approach is fine for a demo and not production-appropriate as-is. There are no fix commits in its history, which cuts both ways: nothing visibly broke, but nothing kept moving either. It's been untouched for roughly two and a half months since that one build session.

Status: archived. A genuinely polished demo of the fun part — spin, filter, gamify — that stopped exactly at the edge of the part that would have made it a real product.
