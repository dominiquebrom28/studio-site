# Project dossiers — git archaeology, 2026-07-19

Source material for the project-page v2 redesign. Three research agents read all
six repos: full `git log`, real diffs on load-bearing commits, every doc.

**How to use this file.** Everything below is *recorded* — sourced from commits,
diffs, docs or code, with hashes. Dom has authorised inference and dramatization
on top of it ("I dont mind if some of it is 'fiction', i can steer it"), but the
scaffold must stay real: **never invent a commit hash, date, count, quote or
metric.** Interpretation is free; fabricated evidence is not. Anything inferred
must be marked so Dom can steer it.

**Correction on the record:** an earlier briefing claimed LoveDiary contained
`AGENTS.md`/`CLAUDE.md` written by Dom as instructions for an AI. **False.** They
are auto-generated Next.js scaffolding (`BEGIN:/END:nextjs-agent-rules` markers,
never edited after the scaffold commit). No human-written AI brief exists in any
of these repos.

---

## Evidence density at a glance

| Project | Commits | Density | Honest shape |
|---|---|---|---|
| **MensApp** | 24 | **RICH** | Five bursts over 3 months; a real shipped, used product |
| **SoulForge** | 10 | MODERATE | One 11-hour build day + a 487-line plan doc |
| **LoveDiary** | 10 | MODERATE | One 2h40m evening |
| **Portfolio** | 5 | MODERATE | One ~8-hour day + a bug fix 12 days later |
| **PizzaParty** | 5 | MODERATE | One 67-minute sitting |
| **Chart Token Playground** | 1 | **THIN** | Arrived whole: 39 files, 6,435 lines, one snapshot |

**The unifying honest frame: these are one-sitting builds.** Not projects with
phases. A timeline that assumes weeks must fabricate; a timeline that works in
minutes and hours has abundant real material.

**A trap:** five repos have a final commit on 2026-07-16 within seconds of each
other (SoulForge 20:37:27, MensApp 20:37:36, LoveDiary 20:37:31, PizzaParty
20:37:54, CTP 20:37:49). That is **one housekeeping sweep across all repos**, not
resumed work. Never render it as a second chapter.

**Every substantive commit carries a `Co-Authored-By` trailer** naming the model
(Claude Sonnet 4.6, Opus 4.8, Fable 5). Since no AI instruction files exist, this
trailer is the only hard evidence of how the collaboration worked — and it is
genuinely verifiable provenance.

---

## SoulForge — `SoulForce-V2`
10 commits, 2026-06-15 → 2026-07-16. Nine of ten on **one day**, 12:03–23:10.

**The pivot, 17 minutes in.** `e557668` deletes the fresh scaffold's approach and
inlines the 587-line prototype as the running app: *"Makes the prototype's exact
design the repo's running app … no design changes."*

**The methodology signal.** "Design must stay byte-identical" is restated three
times across the port — `c3e53bb`: *"Design and behavior byte-identical — verified
in browser."* `7dfc338`: *"Design verified pixel-identical."*

**A real bug with a real cause** — `bfc11e6`: *"the Phaser loader stalled at its
default 32-file cap once the world grew to 44 loads — raise maxParallelDownloads
so the whole scene actually builds."*

**A licence decision that reversed in 4 hours.** `bfc11e6` gitignores the art pack
(*"its licence forbids redistribution"*); `6673e52` reverses: *"Licence is fine to
use, so commit the prepared GH sprites."* Read it, got it wrong, re-read, fixed.

**Art recycling caught 6 minutes after shipping** — `36833d4`: *"Stop reusing the
same sprite for different elements."*

**THE BEST QUOTE IN THE PORTFOLIO** — `soulforge-master-plan.md:289`, on choosing
a heavier stack:
> *"this reverses my earlier lean toward plain React+CSS — the deciding factor
> there was 'your comfort zone,' which no longer applies since you're not
> hand-coding"*

A technical decision changing **because the author stopped being the one typing.**
That is the whole thesis of this site, written down a month before the site
existed.

**Plan vs reality — the richest seam.** The 487-line plan specifies, and the code
does NOT contain: **Leo the dog** (the plan's emotional centre, lines 120–145,
*"Leo's behavior mirrors the player's nervous system state"* — in the repo `leo`
is a **campfire sprite you walk up to**); all **7 interaction panels** (every one
renders the literal word `PLACEHOLDER` and *"🚧 The real panel arrives in a later
slice"*); the gear/wardrobe system (survives only as tier-name strings); owner/
visitor access modes (reduced to one regex on the query string); **12 Supabase
tables** (one exists, uncreated, SQL commented out); focus-realm theming (which
the plan calls *"the literal payoff of the whole concept"*).

**Silent drifts:** the plan's "Journal Cave" became "THE JOURNAL TENT" because the
art pack had a tent, not a cave — *available art overrode the design doc.* The
plan's MapleStory visual direction was never pursued. The plan's own build
roadmap was left as `- **Slice 1 —** _(TBD with Dom)_` and never filled in, even
though slice 1 was demonstrably built.

**⚠️ HEAD does not compile.** `useGame.ts` imports `loadLocalStats` from
`profile.ts`, which never defines it. `npm run build` runs `tsc -b` first, so the
production build is broken — and has been for a month, since `9facba8`
(*"WIP from Dom's session"*).

---

## MensApp — `mensdag-app` · RICHEST
24 commits, 2026-04-29 → 2026-07-16, in five bursts. A real, deployed, used app
for a Dutch friend group's recurring "Mensday" event.

**The cleanest reversal in the whole portfolio, and it stuck.** `b0f39bc` adds
Supabase realtime subscriptions. `4f52629`, **four minutes later**, replaces them
with `setInterval(…, 30000)`. The 30-second poll is still the sync mechanism
today. **No reason is recorded anywhere** — the reversal is visible, the why is
not. (Prime candidate for marked inference.)

**A product decision hidden inside a bugfix.** `b9ffb8a` is titled *"Fix
registration: proper async, error feedback, direct insert"* — but the same diff
silently rewrites every user-facing string from English to Dutch
(`"Request Access"` → `"Toegang aanvragen"`). The app changed language and the
commit message never says so.

**The same bug, three times, from one root cause.** The JS/Postgres naming
boundary bit at `cbd3351` (*"Fix column name joinedAt -> joined_at"*), again at
`2f6e6c5` (*"Renamed startTime -> start_time for Postgres"*), and again a week
later at `0737842`: *"the mismatch was causing silent upsert failures so
announcements never reached the DB."*

**A bug caused by an architectural choice.** `117c4a1`, verbatim: *"React doesn't
re-render on mouseLeave, so clearing `el.style.background=""` left React-set
values permanently gone until the next state-triggered render."* Direct
consequence of the initial commit's decision that **all styling is inline
`style={{}}` objects with no stylesheet.**

**Shipping over purity, 28 times.** `localStorage` is repeatedly used as a shim
for missing DB columns. `0737842`: *"archive/reactivate remains localStorage-only
until the column is added."* The column was never added. 28 `localStorage` call
sites in the current file.

**A database used as a feature flag.** System state is stored as sentinel rows in
the `announcements` table (`__sara_jay__`, `__deleted_notifs__`) and filtered out
at render.

**Evidence it had real users by 2 May:** `237dc1e` renames member→lad
*"backwards-compatible with existing DB"* — a rename done carefully enough not to
break live data.

**The ambition spike:** `f34759f` is **+2,316/−469** in one commit — team creator,
timer, and an entire quiz system (builder, presenter, dashboard, participant view,
music player). Clustered 4–5 May then silence: reads as building toward a date.

**⚠️ Security note for public copy:** auth is homegrown — SHA-256 PIN hashing via
`crypto.subtle`, bypassing Supabase Auth entirely. The whole app is a single
**6,180-line `App.jsx`**. Flag before writing anything admiring about the
architecture.

---

## LoveDiary — `lovetimeline-app`
10 commits. Six of them in **2h40m** on the evening of 2026-05-04, one every ~27
minutes. Then 73 days of silence.

**The sharpest beat in the portfolio: a page built and thrown away in 11
minutes.** `04294d1` (20:10) builds a profile settings *page*, 514 lines changed.
`86d7932` (20:21) replaces it with a drawer: *"Settings gear icon on hero opens
the drawer instead of navigating to /profile."* **The abandoned files are still in
the repo** — `/profile`, `/add`, `BottomNav.tsx` — tracked, present, unreachable
from the live UI. Dead code left standing as visible evidence of the pivot.

**A whole page rewritten from scratch** — `186447f` deletes the original `/story`
three-step flow and its bespoke theme system, replacing it with *"fullscreen
presentation slides with swipe, keyboard nav, and progress bars."* Note the arc:
the killed 3-theme idea returns 60 minutes later in `04294d1` as a global app
concern — **same idea, correct altitude.**

**A navigation paradigm abandoned entirely** — `e6f318d`: *"Remove BottomNav
entirely; layout is now unconstrained full-width."*

**Bitten twice by shipping schema changes against a live store.** Two separate
`localStorage` migration patches; code comment: *"Backfill imageUrl from sample
defaults for moments that predate image support."*

**Three names, one project, never unified:** repo `lovediary`, folder
`lovetimeline-app`, page title **"Love Builder"**.

---

## Portfolio — `dominiquebrom-portfolio`
5 commits. Four in one ~8-hour day (2026-07-06), then 12 days, then one bug fix.

**Escalating ambition across a single day:** base portfolio → four alternative
creative directions with a live switcher → a fifth, riskier one (Quest, the
portfolio as a 2D RPG) → **that fifth one rebuilt as a playable side-scroller**,
discarding 616 of its 713 lines 2h46m after shipping it. The content survived;
the *navigation model* was thrown away — sections stopped being scrolled-to and
became places you walk to.

**A stated "why", quotable** — `ConceptIndex.tsx`: *"Same designer, same work,
four different creative directions. Each one is a live, working concept — open
them, feel them, react. The winner gets built out across the whole site."* Build
five directions as working sites rather than mockups, then pick one.

**And it was never picked.** No decision is recorded. The index still says "Four
directions" while five have existed since `ea44eac`.

**Motion reversed by a browser constraint** — `a5ed8f0`: *"Drop AnimatePresence
exit phase (froze under rAF throttling); keep entrance fade."* Directly relevant
to our own motion work.

**The sticky-nav bug, and how it was found** — `c89ec2b`: the nav backdrop was
applied only via a JS-toggled class at 72% opacity, so content read through the
bar. Fixed by making the backdrop unconditional at 92%. **It was discovered while
capturing a GIF of the site** — scripted scrolling exposed a race the human eye
had been forgiving. (This is the bug the studio's own visual-media agent found on
its first night.)

**Not repo-sourced:** the "replacing a Figma Sites build" framing appears nowhere
in this repo. Do not present it as sourced.

---

## Chart Token Playground — THE THIN CASE
**1 commit. 39 files, 6,435 insertions, 0 deletions, one snapshot.**

There is no commit-level process history. None. No branches, no reverts, no
TODOs, no follow-ups.

**Design implication — this is the case the pattern must survive.** It needs a
mode that presents a **system** (structure, stated decisions, the shape of the
artefact) rather than a **journey**. "One commit, 6,435 lines, arrived whole" is
a genuinely interesting fact and should be stated as one, not padded into a
five-step timeline the evidence cannot support.

**What it is:** a multi-brand semantic chart-token workbench for the Sollie design
system. Define brand-independent tokens (`chart.categorical.1`,
`chart.sequential.300`), map them per brand, and every chart re-colors on brand
switch. Nine hand-rolled SVG charts, per-chart accessibility validation,
colour-blindness simulation, one-click suggested mapping shown as an accept/reject
diff.

**Two stated architecture decisions, both citable:**
- README: *"Charts are custom SVG — no chart library — which keeps the token →
  pixel mapping transparent and makes CVD simulation and theming trivial."*
- `vite.config.ts`: builds to **one self-contained HTML file** that opens from
  `file://` with no dev server — *a distribution decision.* The tool was made
  shareable with people who won't run `npm install`. A built 291KB copy is
  committed into the repo.

**Honest drift:** the README says "26 semantic tokens across 6 groups";
`schema.ts` has **8** groups. The artefact outran its documentation.

**Soft evidence, label it as such if used:** file mtimes suggest the work spanned
2026-06-24 → 06-30 across three sessions, but git init happened 2026-07-16. The
honest headline is *"version-controlled only after the work was finished."*

---

## What no repo contains

**None of the six states why it exists.** No README motivation, no commit
explaining the trigger, no brief. Portfolio and CTP come closest (a stated
concepts-exercise, a stated client context) — the rest have nothing. Per Dom's
updated brief this may now be inferred, but every inferred "why" must be visibly
marked as our reading, because this is exactly the content he will want to steer.

Also absent everywhere: user feedback, testing, usage data, and any recorded
decision to stop. Four of the six simply go quiet.
