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
  closing contact CTA, with an opaque dark nav bar that stays solid over
  content at every scroll position." Caption: 8-frame, 8s honest
  scroll-through of the real page content at 1280x800. (Re-shot 2026-07-18
  after the portfolio's sticky-nav bleed-through bug was fixed upstream —
  the artifact visible in the first capture is gone; all mid-scroll frames
  verified with content clipped behind a solid nav band.)

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

## pizzaparty/

Captured 2026-07-23 from the live deployment (`https://pizzaparty-mu.vercel.app`),
mobile viewport (375x812) — the app is genuinely mobile-first; desktop just
centers the same narrow layout with dead space on both sides (captured
honestly, not cropped to hide it — see Findings below).

- **pizzaparty-hero-mobile.png** — alt: "Pizza Roulette home screen on
  mobile: the ingredient-accurate pizza wheel with 42 pizzas loaded, pizza
  count and exclude-ingredients controls, and a red 'Start Spinning!'
  button." Caption: Pizza Roulette default mobile screen, fresh session
  (0 pts, no cooldown).
- **pizzaparty-hero-desktop.png** — alt: "Pizza Roulette on a 1280x800
  desktop viewport: the same mobile-width layout centered with empty space
  on both sides." Caption: Pizza Roulette on desktop — a genuinely
  mobile-first layout, not a responsive redesign.
- **pizzaparty-flow.gif** — alt: "Pizza Roulette flow on mobile: excluding
  Mushrooms and Seafood in the ingredient sheet (wheel updates live to 28
  pizzas), setting party size to 2, spinning twice — including a mid-spin
  blurred wheel frame — landing on Carbonara then Stracciatella (each with
  a real 'Coupon coming soon' notice and two Maastricht restaurant names,
  no working links), and the final Party Summary screen with the Fate
  Acceptor bonus and total points." Caption: 7-frame, ~8s honest walkthrough
  of a full spin party — filter, configure, spin twice, summary — at
  375x812.

## mensapp/

Captured 2026-07-23 from the live deployment (`https://mensapp.vercel.app`).
**Limitation:** MensApp is real username+PIN gated auth for a closed friend
group ("Built for the lads") — no test credentials were provided or
available for this run, and guessing/brute-forcing a login was out of
scope. The "Request access" link did not open any visible form. Only the
public login screen could be captured honestly; the polls/quiz/beer-counter
flow described in the project's own writeup could **not** be verified or
shot this run. No flow GIF — stills only, and this is reported as a real
gap rather than staged around.

- **mensapp-login-desktop.png** — alt: "MensDay login screen on a 1280x800
  desktop viewport: a dark amber beer-themed 'Welcome back' card with
  username and PIN fields and a 'New here? Request access' link." Caption:
  MensDay's public login gate — the only screen reachable without an
  account.
- **mensapp-login-mobile.png** — alt: "MensDay login screen on mobile,
  same dark amber theme and login form, full-width stacked layout."
  Caption: MensDay login gate, mobile.

## lovediary/

Captured 2026-07-23 from the live deployment (`https://lovediary-zeta.vercel.app`).
The deployed tab title reads "Love Builder", not "LoveDiary" — matches the
discrepancy already logged in `content/projects/lovediary.md` ("confirmed
2026-07-20 ... serving as 'Love Builder'"), re-confirmed here, not a new
finding. The live instance shows generic placeholder content ("You & Your
Partner", 8 seeded demo moments) rather than personal data — safe to
capture and ship as-is.

- **lovediary-hero-desktop.png** — alt: "LoveDiary desktop hero: full-width
  restaurant photo, 'You & Your Partner' headline, 'Together for 3y 4m',
  and the Our Timeline section with category filter chips below." Caption:
  LoveDiary desktop hero, default Parchment theme.
- **lovediary-hero-mobile.png** — alt: "LoveDiary mobile hero: the same
  full-bleed photo and headline reflowed to a single column." Caption:
  LoveDiary hero, mobile.
- **lovediary-flow.gif** — alt: "LoveDiary flow: the desktop hero and
  timeline, opening the Instagram-style Story mode and swiping through two
  moment slides (including a real mid-swipe transition frame), then the
  Settings drawer showing the 'Partner Connection' invite code, the Theme
  tab with the Parchment/Midnight/Sage picker, and the whole page switching
  live to the dark Midnight theme." Caption: 7-frame, ~8s walkthrough of
  the timeline, story mode, and live theme switching, all real interactions
  at 1280x800.

  **Finding (not shipped in the GIF, reported here instead):** the Story
  mode's slide 2/8, "First 'I Love You'" (Milestone, May 20 2023,
  Keukenhof Gardens), rendered as a solid black frame with a small
  broken-image icon in the top-left corner instead of its background photo
  — the caption text and progress bar still rendered correctly. Reproduced
  twice by re-entering the slide. Slides 1 and 3 loaded their photos fine,
  so this looks like a single missing/broken image asset for that specific
  moment, not a systemic story-mode failure. Not included as a gallery
  asset (a black frame shows nothing useful) but the raw capture exists in
  the visual-media agent's scratchpad if engineering wants to look at it.

## soulforge/

Captured 2026-07-23 from a local `npm run dev` server (Vite, port 5301)
against the working copy at `/Users/doom/Documents/VibeCodeProjects/SoulForce-V2`,
**on its existing branch `team/maintenance-2026-07-20`** — per instructions,
that repo's branch was never switched. Not deployed anywhere; no live URL
exists for this project. The repo's own `.claude/launch.json` had a
`soulforge-static` config pointing at a plain `python3` static file server,
but the app's `index.html` loads `/src/main.tsx` as an unbuilt ES module —
a plain static server can't transform TS/JSX, so that config would not
actually render the app. Used a real Vite dev server instead (not
committed to the SoulForce-V2 repo, since only studio-site work ships in
this PR).

- **soulforge-hero-desktop.png** — alt: "SoulForge character-creation
  screen: a live LPC pixel-art sprite preview next to Name/Body/Hairstyle/
  Hair colour/Eyes/Weapon controls, with an orange 'Enter the World' button
  below." Caption: SoulForge's character creator, default Wanderer.
- **soulforge-hero-mobile.png** — alt: "SoulForge walkable world on mobile:
  the player character and companion dog Leo standing between the Journal
  tent and Leo's Campfire, with an on-screen directional pad and interact
  button overlaid at the bottom." Caption: SoulForge's world on mobile,
  with touch controls.
- **soulforge-explore-mobile.png** — alt: "SoulForge world, camera panned
  left after walking: the Journal tent centered, Leo the dog and the
  player character entering frame from the right." Caption: Walking toward
  the Journal tent using the on-screen D-pad.
- **soulforge-flow.gif** — alt: "SoulForge flow: the character creator with
  live sprite composition (switching hairstyle to Curly and equipping a
  Sword, both reflected instantly on the preview sprite), then entering the
  walkable world showing all seven interactive elements — Habit Shrine
  (rock), Journal tent, Leo's Campfire, Todo Board — with companion dog Leo
  and full-screen movement/jump/interact controls." Caption: 3-frame,
  ~5.4s walkthrough of character creation and entering the world, 1280x800.

  **Finding:** could not automate reaching an interact prompt (the
  documented "PLACEHOLDER" panel) within this session. Keyboard input
  (`a`/`ArrowLeft`/`e`, including after explicitly focusing the canvas)
  produced no visible movement on desktop. On mobile the on-screen D-pad
  did move the character and pan the camera for the first ~8 taps toward
  the Journal tent, then stopped responding to further taps on either
  arrow — the character never closed the last few pixels to the tent while
  standing next to the Leo sprite, and the interact button stayed dimmed
  throughout. This reads like an input-handling quirk in this build (a
  stuck key-state, or the companion's collision box blocking the final
  approach) rather than something in the capture tooling, since the same
  d-pad worked repeatedly before stalling — flagging for engineering to
  look at, not fixed here. The world/character-creation captures above are
  real and unaffected; the "every element opens a placeholder" behavior
  described in `content/projects/soulforge.md` was not independently
  re-verified visually this run.

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
- 2026-07-23 addendum: `computer{action:"click", coordinate:[x,y]}` clicks
  are unreliable on this machine — screenshots are delivered to the agent
  at 2x the browser's logical viewport (e.g. a 375x812 mobile viewport
  renders as a 750x1624 image), but click coordinates must be given in the
  *logical* (1x) space, so any coordinate eyeballed off the displayed
  screenshot needs to be halved. `computer{action:"click", ref:"ref_N"}`
  (from `read_page`) dispatches on the real DOM element and sidesteps this
  entirely — prefer refs over eyeballed coordinates whenever an element has
  one. For canvas-only UI with no DOM refs (SoulForge's Phaser touch
  D-pad), halved coordinates did work once the scale factor was known.
- 2026-07-23 addendum: screenshots aren't written to any file the agent can
  read directly — they arrive as inline base64 image blocks. This agent's
  own live transcript JSONL (under `~/.claude/projects/<project>/<session>/
  subagents/agent-<id>.jsonl`) carries the same base64 data in each
  `tool_result`, so a small script that greps the latest image block out of
  that file and writes it to disk is how every PNG/JPG in this run got from
  "thing the agent can see" to "thing `sips`/`ffmpeg` can process." Worth
  promoting to a real utility if this keeps coming up.

## Addendum — DOM-4 rendering pass (2026-07-19, frontend-dev)

- **`portfolio-flow-poster.jpg` / `ctp-flow-poster.jpg`** — not new captures.
  Each is `ffmpeg`-extracted frame 0 of the adjacent `*-flow.gif`, same pixel
  dimensions, re-encoded as JPEG for a smaller first-paint payload. Used only
  as the static poster in the gallery's click-to-play GIF treatment (see
  `MediaGallery`/`GalleryItem` in `src/pages/ProjectDetail.tsx`) — it carries
  no information the GIF doesn't already show, so it reuses the GIF's alt
  text rather than inventing a new description.
