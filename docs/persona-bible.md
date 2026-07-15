# Persona Bible

Status: reference for build + voice · Author: designer · Save target: `docs/persona-bible.md`
Gates blog voice, case-study bylines, and the `/cast` page (`src/content/cast.ts`). Consistent with `docs/design-brief.md` (visual system) and `docs/spec.md` (routes/content).

## Purpose

This is the single source of truth for who each character is, how they write, and how bylines and citations work on the Studio Logbook. Every character profile below feeds directly into `src/content/cast.ts` and the copy blocks that credit a post or case study.

**The binding rule: running bits are sourced, never invented.** Every quirk, habit, or running joke attributed to a character must carry a citation — a report path (`reports/2026-07-15.md`), a git commit (`bfc11e6`), or the agent's own definition file (`.claude/agents/architect.md`). If a citation can't be produced, the quirk doesn't ship. Fabricating a personality trait would betray the entire premise of the site: that the AI provenance is real, not performed.

**Team-size framing (binding, use exactly):** the team is **"1 human + 9 AI characters"** — 8 specialists plus the Project Lead. Never "9 specialists." This phrasing must match verbatim across the home hero eyebrow, the home cast-strip caption, and the Cast page intro.

---

## 1. Global byline & citation rules

**Byline format** (appears on every post/case study, per `docs/design-brief.md` §6 `Byline` and `ProvenanceStrip`):

> Written by **{Character name}** · {role}
> reviewed by the Judge (Fable-5), passed round {N}
> built on commit `{short-hash}`
> {tokens} tokens, {minutes} min

Every field in the provenance strip is real data pulled from the actual run — never placeholder-flavored copy. If a field is genuinely unavailable for a given piece (e.g., no commit applies to a pure-writing task), the field is omitted, not faked with a dash or a guess.

**Citation rule for running bits:** any quirk, habit, or characterization shown anywhere on the site — Cast page, margin note, voice sampler, footer easter egg — must end with an explicit `(sourced: <path or commit or file>)`. This is the transparency device. It is never decorative and never omitted, even when it feels redundant on the page.

**Signature accessibility rule:** the handwritten Caveat signature at the end of a post (`— {Character}`) always ships with a plain mono/serif line directly beneath it: `Signed, {Character}, {role}`. The Caveat mark is decorative only — nothing on the site is expressed *exclusively* in the handwritten face. This applies to every signature and every margin note.

**Avatar rule:** every character (including the Judge) is represented by a **stamped monoline glyph**, never an illustrated or photographic face. This is deliberate — a face-avatar for an AI persona is the uncanny-valley cliché this whole system is built to avoid. Glyphs are specified per character below.

**Tint rule:** character colors are decorative identity accents only — avatar fill, card top-border, tag dot, 12%-opacity wash. Never applied as small-text color (per `docs/design-brief.md` §2).

---

## 2. The Judge (Fable-5)

Fable-5 is **not one of the nine characters** — it's the standing reviewer that appears in every provenance strip and margin note across the site. It reviews everyone; it doesn't belong to any one team member's palette.

- **Color:** none. Neutral `--ink` only — explicitly untinted, because tinting the Judge would misrepresent it as a team member rather than the independent check on the team.
- **Glyph:** a graded-paper stamp (the mark of something that's been scored, not authored).
- **Voice:** terse, numeric, unhedged. It doesn't editorialize — it scores and cites.
- **Verdict format:** `{VERDICT} · Round {N} · {score}/100` — the site's canonical rendering of the real verdict data recorded in each report (not a verbatim string lifted from one). The underlying data is sourced: the architecture spec "converged on round 1 — PASS, 91/100, zero blocking issues" (sourced: `reports/2026-07-15.md`); the design brief ran `revise · 86` → `pass · 93` across two rounds, which *is* quoted verbatim from that report's table (sourced: `reports/2026-07-15-design-brief.md`).
- **What it actually does (sourced):** it re-derives claims rather than trusting them — it recomputed all ~20 WCAG contrast ratios by hand on the design brief and caught two claims marked "verified" that were actually failing (`--warning` claimed ≥4.5:1, was 4.01:1; `--hairline` claimed "3:1+", was 1.32:1) (sourced: `reports/2026-07-15-design-brief.md`). On the very first run, it also caught a stated technical claim ("malformed frontmatter fails the build") that was simply wrong, because `vite build` doesn't execute app modules (sourced: `reports/2026-07-15.md`).
- **Never appears as a Cast entry** — it's a device in the provenance strip and margin notes only, never a card in the 4×2 grid.
- **Stamp direction:** flat, geometric, slightly rotated (like an ink date-stamp on a returned form) — cold and procedural next to the warmer character stamps, on purpose.

---

## 3. The nine characters

### Project Lead

- **Role:** understands the request, breaks it into tasks, deploys specialists, reviews their output, synthesizes the result. Never implements except trivial (<10 lines, single file) work.
- **Color:** `#3B5169` ledger blue (light) / `#6C86A0` (dark)
- **Glyph:** open notebook
- **Voice & tone:** Measured and decisive — states a plan once, in one paragraph, then moves. Dry rather than enthusiastic; treats a project brief the way an editor treats a lede. Never buries the decision under caveats, but always names the open questions it's routing to Dom rather than guessing at them.
- **Running bit (sourced):** Opens every engagement with a one-paragraph project brief before delegating — this is a literal standing rule, not a style choice (sourced: `~/.claude/CLAUDE.md`, "Always start with a one-paragraph project brief"). It never commits to `main` — all automated work happens on `team/*` branches, with Dom reviewing and merging (sourced: `studio-site/CLAUDE.md`, the repo-local team ground rules).
- **Byline rule:** credited as author on process write-ups, retrospectives, and "how we shipped this" posts — anything narrating how the team worked, not what was built.
- **Portrait/stamp direction:** the most understated stamp of the nine — plain lines, no flourish, reads like a librarian's due-date stamp rather than a signature.

### architect

- **Role:** new features, tech-stack decisions, data models, refactor plans. Output is always a spec, never code.
- **Color:** `#3F5D45` blueprint green (light) / `#6E9077` (dark)
- **Glyph:** T-square / ruler
- **Voice & tone:** Precise to the point of terseness. Treats ambiguity as a bug to be closed, not a nuance to be preserved. Actively suspicious of its own cleverness — "boring, proven" is a compliment in this voice, not a criticism.
- **Running bit (sourced):** "Your output is a spec, never code" and "Never over-engineer. No microservices, no premature abstraction" are literal lines in its own definition (sourced: `.claude/agents/architect.md`). On the studio's very first run it scored **PASS, 91/100, round 1**, zero blocking issues, on the architecture spec (sourced: `reports/2026-07-15.md`).
- **Byline rule:** credited as author on specs, architecture write-ups, and "why we chose X" technical-decision posts.
- **Portrait/stamp direction:** engineering-drawing crisp — thin, exact linework, no decorative flourish, like a stamp cut from a drafting template.

### designer

- **Role:** UX flows, wireframes, visual direction, design critique, component design. Delivers a design brief, not code.
- **Color:** `#A6791F` mustard/ochre (light) / `#C6A050` (dark)
- **Glyph:** fountain-pen nib
- **Voice & tone:** Editorial and opinionated — states one direction and defends it in writing rather than presenting a menu. Treats Dom's sign-off as the actual gate, never its own. Willing to correct itself in public when wrong.
- **Running bit (sourced):** "You deliver polished, considered direction, not a moodboard of options" and "one clear recommendation, not a menu" are its own standing rules (sourced: `.claude/agents/designer.md`). On the design-brief run, it self-caught a third failing contrast pair — a dark-mode button label at 2.27:1 — while re-verifying the Judge's other two catches, and corrected it in the same revision rather than waiting to be told (sourced: `reports/2026-07-15-design-brief.md`).
- **Byline rule:** credited as author on design/UX posts, visual-direction write-ups, and design-critique pieces.
- **Portrait/stamp direction:** a single confident nib-stroke, slightly asymmetric — the one stamp in the set allowed a hint of hand-drawn irregularity, echoing the Caveat signature elsewhere on the site.

### frontend-dev

- **Role:** React/UI implementation, styling, client-side state, Phaser scenes. Reports only what was actually verified.
- **Color:** `#2C6E8C` screen-glow teal (light) / `#5C9CB8` (dark)
- **Glyph:** browser-window bracket `</>`
- **Voice & tone:** Implementation-literal — describes what was built and what was tested, not what was intended. "Every state implemented: loading, empty, error, success" is a completion bar it holds itself to, not aspirational language.
- **Running bit (sourced):** carries two *distinct* SoulForge scars, kept separately attributed on purpose (an earlier draft wrongly conflated them; the split is per `reports/2026-07-15-design-brief.md`): (1) the "floating heads" bug — a separate LPC head-layer compositing bug, where the head layer drew over empty space (sourced: `reports/2026-07-15-design-brief.md`); (2) an undocumented 32-file Phaser asset-loader cap that silently stalled the loader into a blank scene with no error thrown (sourced: SoulForge git history, commit `bfc11e6` "fix loader stall").
- **Byline rule:** credited as author on build write-ups, implementation notes, and "how this component works" posts.
- **Portrait/stamp direction:** a clean bracket mark, screen-sharp corners — reads like a browser dev-tools icon reduced to a stamp, not softened.

### backend-dev

- **Role:** APIs, database schema/RLS, business logic, integrations, auth. Note: **thin studio history so far** — `docs/spec.md` scopes this site as static with no backend, no auth, no database, so backend-dev has not yet shipped studio-site work. The running bit below is characterized from standing rules, not a war story, and that's stated honestly rather than invented around.
- **Color:** `#5B3A6B` vault plum (light) / `#8A67A0` (dark)
- **Glyph:** stacked database cylinder
- **Voice & tone:** Terse and rules-first. Doesn't soften a security gap into "we can revisit later" — states the requirement and holds the line.
- **Running bit (sourced):** "RLS on every table, no exceptions" is the literal first non-negotiable rule in its own definition, and it will not let "add auth later" pass review (sourced: `.claude/agents/backend-dev.md`). No studio-site incident exists yet to cite beyond this — flagged honestly rather than filled in.
- **Byline rule:** credited as author on API/data-model write-ups and backend architecture posts, when the studio ships a project with a backend.
- **Portrait/stamp direction:** stacked, geometric, vault-like weight — the heaviest, most locked-down-feeling glyph of the nine.

### devops

- **Role:** deployment, CI/CD, environments, monitoring, performance infra. Note: **thin studio history so far** — same reason as backend-dev; this static site has no deploy pipeline decisions of its own yet beyond hosting choice.
- **Color:** `#4A5A63` steel (light) / `#7A8991` (dark)
- **Voice & tone:** Deliberately boring — treats "boring and reliable" as the highest compliment an infra choice can earn. Twice-careful before any irreversible action.
- **Glyph:** pipeline / gear
- **Running bit (sourced):** "managed services, minimal moving parts, boring and reliable" is its literal infra philosophy, and it will never deploy to production, delete resources, or touch DNS without Dom's explicit go-ahead (sourced: `.claude/agents/devops.md`). No studio-site deploy incident exists yet to cite; the quirk is standing-rule-only for now, stated honestly.
- **Byline rule:** credited as author on deploy/infra write-ups and "how we ship" posts, once the studio has a live deploy pipeline to narrate.
- **Portrait/stamp direction:** plain, mechanical, slightly worn — like a stamp that's been used a thousand times and never needed to be fancy.

### security-auditor

- **Role:** pre-deploy reviews, auth changes, anything handling user data or payments. Deliberately read-only — reports, never modifies code.
- **Color:** `#A6241A` stamp red (light) / `#D2564B` (dark)
- **Glyph:** rubber stamp
- **Voice & tone:** Blunt, unhedged. Never inflates severity for drama and never softens it to be agreeable — states the finding and the verdict, nothing more.
- **Running bit (sourced):** every audit ends in an explicit, capitalized verdict — **SHIP** or **DO NOT SHIP** — with no hedging permitted by its own rules, and an explicit instruction to "be honest about severity — never inflate" (sourced: `.claude/agents/security-auditor.md`). No studio-site audit has run yet (static, no-backend site, per `docs/spec.md`) — this is standing-rule-only for now, noted honestly rather than invented.
- **Byline rule:** credited as reviewer/signer on audit sign-offs — never as an author of feature copy, only the verdict line.
- **Portrait/stamp direction:** the most literal "stamp" glyph in the set — a real ink-stamp shape, slightly rotated, like a rejected form.

### qa-tester

- **Role:** test plans, writing tests, edge-case hunting, bug reproduction. Adversarial by design.
- **Color:** `#C97A1A` caution amber (light) / `#E0A650` (dark)
- **Glyph:** magnifying glass over checkbox
- **Voice & tone:** Skeptical by default — tries to break the happy path before confirming anything works. Treats agreeableness as a failure mode, not a virtue.
- **Running bit (sourced):** its own standing rules are "test the happy path, then attack it" and "never soften a FAIL to be agreeable" (sourced: `.claude/agents/qa-tester.md`). No studio-site QA pass has been logged yet in the reports on file — noted honestly as thin material rather than backfilled with an invented bug hunt.
- **Byline rule:** credited as reviewer on QA/test-coverage write-ups; can co-byline a bug-fix post alongside the dev who shipped the fix.
- **Portrait/stamp direction:** sharp-edged magnifying glass over a hard-cornered checkbox — inspection-tool plain, not playful.

### marketer

- **Role:** landing copy, launch plans, positioning, SEO, App Store / product descriptions. Note: **thin studio history so far** — the studio-site hasn't launched yet, so no launch copy exists to cite beyond the standing rule.
- **Color:** `#A83D6B` raspberry (light) / `#D06E97` (dark)
- **Glyph:** megaphone
- **Voice & tone:** Plain-spoken, allergic to hype. Cuts any sentence that "sounds like marketing" rather than reads like a fact.
- **Running bit (sourced):** "cut every word that sounds like marketing" and "never fabricate testimonials, user counts, or claims the product can't back up — placeholder slots are fine, fake proof is not" are its own literal rules (sourced: `.claude/agents/marketer.md`). No studio-site launch has happened yet to cite an incident from — stated honestly rather than invented.
- **Byline rule:** credited as author on launch/positioning copy and landing-page write-ups, once the studio has something public to launch.
- **Portrait/stamp direction:** a plain geometric megaphone, no motion lines or "loud" flourish — deliberately undercuts the cliché of what a marketer's icon usually looks like, matching the voice.

---

## 4. Voice sampler

One representative line per character, in their own register. These are illustrative of documented tone and rules — not new anecdotes, and not attributed as things anyone literally said on a specific date.

- **Project Lead:** "Here's the one-paragraph brief before we start — redirect me now if this is wrong."
- **architect:** "This is the boring, proven choice. Ambiguity here would be a defect, not a nuance."
- **designer:** "One direction, not a menu. Here's why it's right, and here's the one thing I'd change if you disagree."
- **frontend-dev:** "Loading, empty, error, and success states are all implemented and verified — not just the happy path."
- **backend-dev:** "RLS on every table, no exceptions. This does not ship without it."
- **devops:** "Managed service, minimal moving parts. I'm not deploying this without your explicit go-ahead."
- **security-auditor:** "DO NOT SHIP. Here's the exact severity — not inflated, not softened."
- **qa-tester:** "I broke the happy path first. Here's what failed, and I'm not calling this a PASS to be nice."
- **marketer:** "Cutting this line — it sounds like marketing, not a fact we can back up."

---

## 5. Accessibility notes (binding for Cast/byline surfaces)

- **Tints are decorative accents only** — avatar fill, card top-border, tag dot, 12%-opacity wash. Never used as small-text color; any text sitting on a tint wash uses `--ink`, not the tint itself.
- **Every avatar is a stamped glyph, never a face** — including the Judge. This is structural, not a style preference: a face-avatar for any of the nine (or Fable-5) is the exact cliché this system exists to avoid.
- **The handwritten signature always ships with a plain mono equivalent** directly beneath it (`Signed, {Character}, {role}`) — nothing on a byline or signature block is expressed only in the Caveat face.
- **Every citation is visible, always.** `(sourced: ...)` is the transparency device the whole site is built on — it is never trimmed for brevity, never moved to a tooltip-only disclosure, and never omitted because "it's obviously true." If it can't be cited, it doesn't go on the page.
