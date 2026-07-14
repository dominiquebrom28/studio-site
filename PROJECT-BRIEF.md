# Studio Site — Project Brief

## What this is

The public website of Dom's AI development studio — a portfolio and blog that
documents the process of building software with an AI dev team (a Claude Code
"virtual product studio": one Project Lead orchestrating 8 specialist
subagents). The site is itself built by that team, which makes it both the
portfolio and the proof.

## Goals

1. **Portfolio** — showcase the projects the studio has built, with honest
   write-ups: what it is, stack, what worked, what didn't.
2. **Blog** — posts on learnings, experiences, and results from AI-driven
   development: process, prompts, failures, costs, quality tradeoffs.
3. **Living case study** — the site's own git history and run reports ARE
   content. Each team run logs learnings in `reports/`; blog posts get
   distilled from them.

## Known projects to feature (verify against the actual repos before writing)

| Project | Path | Notes |
|---|---|---|
| SoulForge | ../SoulForce-V2 | Gamified productivity RPG — Vite+React+TS+Phaser+Zustand+Supabase |
| PizzaParty | ../pizzaparty-app | github.com/dominiquebrom28/pizzaparty |
| MensApp | ../mensdag-app | github.com/dominiquebrom28/mensapp |
| LoveDiary | ../lovetimeline-app | github.com/dominiquebrom28/lovediary |
| Portfolio | ../dominiquebrom-portfolio | Dom's personal portfolio site |
| Chart Token Playground | ../chart-token-playground | Design-token tool for the Sollie design system |

## Stack

Studio default: React + Vite + TypeScript, Tailwind CSS. Static content from
markdown files in-repo (no CMS, no database — this site has no auth and no
user data). Deploy target: Vercel, later, only with Dom's explicit go-ahead.

## Voice & design

Honest, concrete, personal — an indie builder documenting a real experiment,
not a corporate agency. No fabricated clients, metrics, or testimonials.
Avoid the generic AI-app look; the designer agent sets a distinctive direction.

## Hard rules for the team

- All work happens on `team/*` branches (`claude/*` when running as a cloud
  session). **Never commit to main** — Dom reviews and merges.
- Never push, deploy, or publish anything without Dom's explicit approval.
- Every run ends with a report in `reports/` (see BACKLOG.md for format).
- Blog posts describe what actually happened — check the repos and reports;
  never invent results.
