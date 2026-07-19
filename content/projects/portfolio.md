---
title: "Portfolio"
slug: "portfolio"
summary: "Dom's own portfolio, rebuilt as five switchable design directions — including a playable RPG version of itself."
stack: ["React", "react-router", "framer-motion", "Vite", "TypeScript"]
status: "in-progress"
cover: "/images/projects/portfolio/portfolio-hero-desktop.png"
media:
  - src: "/images/projects/portfolio/portfolio-flow.gif"
    poster: "/images/projects/portfolio/portfolio-flow-poster.jpg"
    alt: "Scrolling through the portfolio: hero, stats bar, 'What I do' expertise cards, selected work case studies, and closing contact CTA, with an opaque dark nav bar that stays solid over content at every scroll position."
    caption: "8-frame, 8s honest scroll-through of the real page content at 1280x800."
    kind: "animation"
    viewport: "desktop"
    width: 1280
    height: 800
  - src: "/images/projects/portfolio/portfolio-hero-desktop.png"
    alt: "Dominique van den Brom portfolio hero: 'I design systems' headline over a dark grid background, with stats (7+ years, 9 brands, 50+ components, 8 UI libraries)."
    caption: "Portfolio homepage, fully settled desktop hero."
    kind: "still"
    viewport: "desktop"
    width: 1280
    height: 800
  - src: "/images/projects/portfolio/portfolio-hero-mobile.png"
    alt: "Portfolio hero on mobile: condensed nav, 'I design systems' headline, intro paragraph and two CTAs stacked full-width."
    caption: "Portfolio homepage, mobile hero."
    kind: "still"
    viewport: "mobile"
    width: 375
    height: 812
featured: true
order: 2
date: "2026-07-06"
goal:
  text: |-
    "Same designer, same work, four different creative directions. Each one is a live, working concept — open them, feel them, react. The winner gets built out across the whole site." That's the stated purpose, straight from the portfolio's own ConceptIndex.tsx.
  source: logged
brief:
  source: read
  bullets:
    - text: |-
        Build a personal portfolio that doubles as proof of design-systems thinking, not just a case-study gallery.
      source: read
    - text: |-
        Protect three NDA case studies without using real client screenshots — every diagram is a hand-built SVG abstraction instead.
      source: read
    - text: |-
        Prove the pitch instead of stating it: "inspect mode" lets a visitor press a key and watch the site annotate itself with its own design tokens, live.
      source: read
    - text: |-
        Don't commit to one visual language too early — ship several full, live creative directions and let the strongest earn the win.
      source: read
process:
  commits:
    - date: "2026-07-06"
      count: 4
    - date: "2026-07-18"
      count: 1
  phases:
    - from: "2026-07-06"
      to: "2026-07-06"
      title: "Base site, then four more directions"
      narrative: |-
        The first commit ships a complete, working portfolio. The same day the concept escalates: four full alternate creative directions, each built as a real switchable site rather than a mockup, landing in one pass.
      tone: build
    - from: "2026-07-06"
      to: "2026-07-06"
      title: "A fifth, riskier direction — rebuilt within hours"
      narrative: |-
        A fifth concept goes further than the others: the portfolio rebuilt as a playable 2D side-scrolling RPG. It's ambitious enough that it gets rebuilt almost immediately — 616 of its first 713 lines discarded within hours to turn it from a static concept into something you can actually walk through. As far as the record shows none of the five was ever declared the winner: the site's own concept index still says "four directions" while five exist.
      tone: pivot
    - from: "2026-07-18"
      to: "2026-07-18"
      title: "A bug found while filming it"
      narrative: |-
        Twelve days of quiet, then one real fix: a sticky-nav bug where the header backdrop was only applied by a JS-toggled class, so content read through it while scrolling. It was caught while capturing a scrolling GIF of the site, not while looking at it normally — scripted, repeatable scrolling exposed a race the eye had been quietly forgiving.
      tone: reactivation
---

This is Dom's own portfolio — "Product & UX Designer, 7+ years in design systems, multi-brand foundations and end-to-end product design." It's a single-page app with a home screen and three case studies (a nine-brand, five-platform design system; a marketing-automation project spanning eight UI libraries; a pension app), all flagged NDA, which shaped two of its more unusual decisions.

The first is inspect mode: press "i" and the site annotates itself with its own design tokens, dropping a 12-column grid overlay and a HUD over elements that each carry a `data-token` attribute — the portfolio explaining its own construction in real time. The second is zero images, anywhere. Every visual is a hand-built, animated SVG or CSS diagram; a code comment states the reasoning directly: no client assets are used, because every diagram is an abstraction of the real work, which also keeps NDA material safe.

The third move, and the one that ran furthest, is five live creative-direction concepts of the same portfolio, switchable in-app: Signal (dark, kinetic, the default), Blueprint (engineering drawing), Monograph (printed book), Terminal (self-typing), and Quest — the portfolio rebuilt as a playable 2D side-scrolling RPG, with character creation, camera follow, parallax, and five interactive stations across a 5,600px world.

Stack is React 19, react-router 7, framer-motion 12, Vite, and TypeScript — no CSS framework, all hand-written CSS, about 8,400 lines across the five concepts. It came together in four commits, all on July 6: the full site first, then four alternate art directions in one pass, then the RPG concept — which was itself rewritten from a static concept into a genuinely playable side-scroller the same day, replacing most of its first version within hours.

What worked: five distinct, coherent visual languages sharing one data layer, a production build that succeeds, and a design conceit (inspect mode) that actually demonstrates design-systems thinking rather than just claiming it.

What's missing, honestly: no CV or resume download, no photos anywhere (by design, but still a gap for a portfolio), and contact is mailto plus LinkedIn only. There's no README and no deploy — the intended domain shows up in the page's own metadata, but nothing is live yet, and the repo has stayed untouched since build day.

Status: in progress — built, reviewed by no one but its author so far, waiting on content (CV, a real contact flow) and a deploy decision before it's public.
