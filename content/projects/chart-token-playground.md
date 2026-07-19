---
title: "Chart Token Playground"
slug: "chart-token-playground"
summary: "A semantic chart-token workbench for the Sollie design system, shipped as a single self-contained HTML file."
stack: ["React", "Zustand", "TypeScript", "Vite", "Tailwind CSS"]
status: "shipped"
cover: "/images/projects/chart-token-playground/ctp-hero-desktop.png"
media:
  - src: "/images/projects/chart-token-playground/ctp-flow.gif"
    poster: "/images/projects/chart-token-playground/ctp-flow-poster.jpg"
    alt: "Chart Token Playground flow: switching from ABP to BPF Bouw brand, opening multi-brand Compare view, then simulating Protanopia and Deuteranopia color-blindness on the same charts."
    caption: "6-frame, 8s real-state walkthrough of brand switching, compare mode, and accessibility simulation."
    kind: "animation"
    viewport: "desktop"
    width: 1000
    height: 625
  - src: "/images/projects/chart-token-playground/ctp-hero-desktop.png"
    alt: "Chart Token Playground desktop view: brand list, chart-token mapping panel, and a live preview grid of 6 chart types for the ABP brand, all checks passing."
    caption: "Chart Token Playground default workspace."
    kind: "still"
    viewport: "desktop"
    width: 1280
    height: 800
  - src: "/images/projects/chart-token-playground/ctp-hero-mobile.png"
    alt: "Chart Token Playground mobile view: tabbed Brands/Tokens/Preview layout showing the categorical and sequential token mapping list."
    caption: "Chart Token Playground, responsive mobile layout."
    kind: "still"
    viewport: "mobile"
    width: 375
    height: 812
featured: true
order: 3
date: "2026-06-24"
---

Chart Token Playground is a multi-brand semantic chart-token workbench built for the Sollie design system — the README describes it as "Figma Variables × Token Studio × Storybook, focused on one job: defining, validating and comparing chart colors across brands." Instead of wiring chart colors directly to brand colors, you define brand-independent semantic tokens — `chart.categorical.1`, `chart.sequential.300`, `chart.diverging.positive`, and so on — map them per brand, and every chart consumes the tokens. Switch brands and everything re-colors at once.

The UI is a three-panel workbench: brands, token configuration, and live SVG previews, with a compare-brands mode alongside it. It includes auto-suggest mapping with an accept/reject diff, accessibility validation (catching duplicate or too-similar colors, low contrast, and unassigned tokens), and color-blindness simulation via SVG dichromacy matrices.

Built with React 19, Zustand, TypeScript, Vite 6, and Tailwind 4, at around 3,760 lines of TS/TSX. The deliberate technical choice here: no charting library. All 13 chart types are hand-rolled in SVG (649 lines), specifically because it keeps the token-to-pixel mapping transparent and makes both CVD simulation and live theming trivial to implement correctly. The production build uses `vite-plugin-singlefile` — the entire tool ships as one self-contained 291 KB HTML file that opens straight from the filesystem with no server. That's the actual distribution model, not a fallback.

What worked: the tool grew past its own documentation within a week of building — the README describes 26 tokens across 9 chart types, while the code has 34 tokens across 8 groups and 13 chart types, because trend and UI token groups got added as the concept kept proving itself out. That's a good sign for a prototype: it kept finding real uses for itself.

What's honestly unusual: this repo spent its first three weeks with zero commits. It was `git init`-ed and then nothing was ever committed — no history, no remote, nothing recoverable if the folder had been lost — until a July 16 cleanup sweep finally made its initial commit. File timestamps suggest about three build sessions across one week in late June. And "Sollie design system" exists here only as a name — there's no imported Sollie token source, so all the brands in the tool are user-created example brands, not the real thing.

Status: functionally complete and shipped as its single-file build — genuinely useful as a standalone tool — but with a process gap (three weeks of work before the first commit) that's the honest flip side of building fast.
