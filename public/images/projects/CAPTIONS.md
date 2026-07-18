# Project media — alt text & captions

Captured by the visual-media agent (Lucas), 2026-07-18, first assignment.
All captures are REAL product states — no staged data, no cropped flaws
(house rule). Rendering these on ProjectCard/ProjectDetail is the DOM-4
follow-up; until then they ship as inert assets.

## portfolio/

- **portfolio-hero-desktop.png** — alt: "Dominique van den Brom portfolio
  hero: 'I design systems' headline over a dark grid background, with
  stats (7+ years, 9 brands, 50+ components, 8 UI libraries)." Caption:
  Portfolio homepage, fully settled desktop hero.
- **portfolio-hero-mobile.png** — alt: "Portfolio hero on mobile:
  condensed nav, 'I design systems' headline, intro paragraph and two
  CTAs stacked full-width." Caption: Portfolio homepage, mobile hero.
- **portfolio-flow.gif** — alt: "Scrolling through the portfolio: hero,
  stats bar, 'What I do' expertise cards, selected work case studies, and
  closing contact CTA." Caption: 8-frame, 8s honest scroll-through of the
  real page content. (Known artifact: the sticky-nav content bleed-through
  visible mid-scroll is a REAL bug in the portfolio site, reported
  separately — not a capture flaw. House rule: flaws get captured and
  reported, not cropped.)

## chart-token-playground/

- **ctp-hero-desktop.png** — alt: "Chart Token Playground desktop view:
  brand list, chart-token mapping panel, and a live preview grid of 6
  chart types for the ABP brand, all checks passing." Caption: Chart Token
  Playground default workspace.
- **ctp-hero-mobile.png** — alt: "Chart Token Playground mobile view:
  tabbed Brands/Tokens/Preview layout showing the categorical and
  sequential token mapping list." Caption: Chart Token Playground,
  responsive mobile layout.
- **ctp-flow.gif** — alt: "Chart Token Playground flow: switching from ABP
  to BPF Bouw brand, opening multi-brand Compare view, then simulating
  Protanopia and Deuteranopia color-blindness on the same charts."
  Caption: 6-frame, 8s real-state walkthrough of brand switching, compare
  mode, and accessibility simulation.

## Pipeline notes (for the DOM-4 continuation)

- Settle rule: headless Chrome's --virtual-time-budget does NOT advance
  wall-clock animation timers; captures need CDP + a real 2–3.5s wait
  after Page.loadEventFired. Verified by side-by-side comparison.
- GIFs are honest slideshows of real states (fixed frame duration via
  ffmpeg, gifsicle -O3 --lossy=80), not continuous recordings. True motion
  needs a CDP screencast script — backlogged, not faked.
- Toolchain gap: no pngquant on this machine; palette-reducing the dark
  portfolio hero introduced banding, so it ships at 866KB rather than
  degraded. Add pngquant for future runs.
