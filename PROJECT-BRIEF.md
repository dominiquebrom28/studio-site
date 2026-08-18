# Studio Site — Project Brief

## What this is

The public website of Dom's AI development studio — a portfolio and blog that
documents the process of building software with an AI dev team (a Claude Code
"virtual product studio": one Project Lead orchestrating 9 specialist
subagents — 10 AI characters total, counting the Project Lead; see
`docs/persona-bible.md` for the binding framing). The site is itself built by
that team, which makes it both the portfolio and the proof.

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
  session). **Never commit directly to main** — everything goes through a PR,
  which is also what `main`'s ruleset enforces (the `build` check is required
  and nothing bypasses it).
- **The team merges its own PRs (Dom's decision, 2026-08-18).** Merge authority
  for this repository was delegated to the Project Lead and the team in full:
  _"YOU + the team is in full control. that is the whole point. so everything in
  this repository is up to YOUR judgement to merge."_ This replaces the previous
  rule that Dom reviewed and merged every PR — he had hand-merged 124 PRs in 34
  days and the queue had jammed at 8 twice. **A merge still deploys to
  production**, so the judgement the delegation asks for is real: merge on green
  CI plus a reason to believe the change is right, not on green CI alone.
- **Still Dom's, and not delegated by the above:** anything outside this
  repository (scheduled-task definitions, GitHub settings, spending), and
  anything that commits him personally — his name, his opinions, or claims about
  what he thinks. When a PR poses a genuine open question to him, merge the work
  if it stands on its own and carry the question forward; do not answer it in his
  voice.
- Every run ends with a report in `reports/` (see BACKLOG.md for format).
- Blog posts describe what actually happened — check the repos and reports;
  never invent results.
