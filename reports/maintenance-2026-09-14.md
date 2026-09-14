# Maintenance sweep — 2026-09-14

Baseline: `reports/maintenance-2026-09-07.md`. This report covers what changed
since then.

**14** git repositories under `VibeCodeProjects/` — one more than last week, and
the new one is not new work but a repo that had never been swept: **ds-roadmap**,
created 2026-09-11. Since 2026-09-07, two repos have commits: **studio-site**
(6 logbook posts and one 6-line lockfile bump — no source file changed) and
**ds-roadmap** (3 commits, its entire history). The other 12 are untouched.

**Last week's headline closed cleanly.** There are **zero open PRs**. All six
blocked logbook posts (#147–#152) merged, the publishing queue is empty, and
nothing is stranded behind a red gate. That part of last week's report worked.

**This week's headline is a fix that was fully specified 32 days ago and just
never got done.** The single entry in `audit-ci.jsonc`'s allowlist —
react-router's `GHSA-qwww-vcr4-c8h2`, a **production** high — was deferred on
2026-08-04 on the grounds that no patch release could clear it on the 7.x line,
so the only exit was an 8.x major migration costed at ~28 files.

I went in expecting to report that nobody had noticed this had stopped being
true. **That is not what happened, and the truth is worse.** The 2026-08-10 sweep
noticed, queried the GitHub advisory API live, and wrote it up correctly.
`BACKLOG.md` has carried it as an open **HIGH** since 2026-08-13, naming the
remedy to the keystroke: *"one lockfile bump, one deleted allowlist entry, one
test pass"*, deferred that day only because the PR queue was over Dom's review
throttle. Then four maintenance sweeps ran — 08-17, 08-24, 08-31, 09-07 — and
none of them did the three steps. Last week's report read the same file and
described this entry as *"working exactly as designed"*.

So the detection worked. The gate worked. The write-up worked. A production
high-severity advisory stayed live for five weeks anyway, because the item was
never picked up. That is H1, and **it is done on this branch** — bumped,
de-allowlisted, backlog item checked off, and verified against the unit suite,
the e2e suite, the CSP-hash check and the audit gate.

---

## Gate results

| Repo | Build | Tests | Lint | Audit | CI |
|---|---|---|---|---|---|
| studio-site | ✅ | ✅ 607 / 27 files + ✅ 64 e2e + ✅ CSP hash 3/3 | ✅ 0 errors, 12 known warnings | ⚠️ suppressed a prod high → ✅ **fixed here**, allowlist now empty | ✅ green, 0 open PRs |
| ds-roadmap | n/a (no package.json) | n/a (no test script) | n/a | n/a (zero dependencies) | n/a (no remote) |

All studio-site gate results above were produced **after `npm ci`**, on a tree
that matches what CI installs (see L2 — it did not start that way).

studio-site self-checks: `check:deps` (33/33), `check:report-claims`,
`check:merge-revert` and `check:clean-checkout` all OK.
`check:backlog-checkoffs` reports the same 4 multi-PR epics as the last three
weeks (expected, never auto-failed). `check:stranded-branches` reports 10,
unchanged for a fourth week.

ds-roadmap has no package manifest, no dependencies and no lockfile, so steps 1
and 3 of the sweep (build/test scripts, `npm audit` / `npm outdated`) have
nothing to run against it. It was reviewed by reading and by executing its build
scripts directly.

---

## HIGH

### H1 — A production high-severity advisory stayed live for five weeks with its fix fully specified in the backlog the whole time. **DONE ON THIS BRANCH.**

`audit-ci.jsonc` carried exactly one exception, `GHSA-qwww-vcr4-c8h2`
(react-router, "RSC Mode CSRF Bypass"). Its comment block was not lazy — it was
rewritten on 2026-08-04 specifically to record a deferral with a known cost:

> Verified 2026-08-04: `npm view react-router version` = 8.3.0, above the
> vulnerable `>=7.12.0 <8.3.0` range. The 7.x line's latest (7.18.2) is still
> INSIDE that range, so no patch release clears this on 7.x — only the 8.x major
> does.

That sentence stopped being true three days later, and **the studio caught it**.
`reports/maintenance-2026-08-10.md` queried the GitHub advisory API live, found
the advisory had been updated 2026-08-07, and tabulated the result. `BACKLOG.md`
then carried it as an open `[ ]` **HIGH** from 2026-08-13, which priced the work
itself: *"Top of the list: one lockfile bump, one deleted allowlist entry, one
test pass"*, not done that day *"only because the PR queue was already at 7, over
Dom's review throttle."*

Four sweeps ran after that — 08-17, 08-24, 08-31, 09-07 — and none did the three
steps. Last week's report read `audit-ci.jsonc` closely enough to quote its
STANDING LESSON, and still characterised this entry as *"working exactly as
designed — CI reports it ... and moves on."* It was not working as designed; it
was suppressing a real, fixable production high, and a correct write-up of that
fact was already sitting two files away.

**This is not a detection failure, and diagnosing it as one would send the fix to
the wrong place.** Everything upstream of the doing worked: the advisory was
reviewed, the exploitability analysis was right (and still is — see below), the
expiry was caught within three days, and the remedy was written down at
keystroke precision. What failed is that a HIGH item, once written, had nothing
that made anyone pick it up. The studio's own logbook has been narrating this at
increasing volume — *"Thirteen Findings, None Started"* (09-12), *"The Oldest
Open Item Is a Fix That Already Works"* (09-13) — which is a repo describing its
own bottleneck accurately and then not acting on it either.

**One correction to the record, which the security review caught and which
matters going forward.** Both the backlog item and my own first draft of this
report said the advisory range *narrowed* to `>=7.12.0 <7.18.2`. It did not
narrow — it **split**, on 2026-08-07, into two non-contiguous ranges:

| Vulnerable range | First patched |
|---|---|
| `>= 7.12.0, < 7.18.2` | **7.18.2** |
| `>= 8.0.0, < 8.3.0` | **8.3.0** |

The original `<8.3.0` was npm **flattening** those two into one span — precisely
the artifact this same file's brace-expansion entry describes, hit from the other
direction. This is not pedantry: **the 8.x line is not uniformly safe.** The open
8.x migration, if taken onto 8.0–8.2 by someone reading "the fix is in 8.x", would
reintroduce this exact advisory. It must target **≥ 8.3.0**, and that is now
written into `audit-ci.jsonc` rather than left to be re-derived.

`npm audit --omit=dev` reported **2 high severity vulnerabilities** (react-router
and react-router-dom) before the fix. This is a production dependency.

**What was done and verified:**

- `npm update react-router-dom` → react-router and react-router-dom **7.18.1 →
  7.18.3**. 7.18.2 carries the fix ("Harden RSC CSRF codepaths"); 7.18.3 adds
  further origin and redirect-URL validation, so landing on it is strictly better
  than the minimum.
- Removed the now-dead allowlist entry, leaving the allowlist **empty**. Before
  removal audit-ci itself printed `Consider not allowlisting advisory:
  GHSA-qwww-vcr4-c8h2` — the tool had begun recommending exactly this.
- Raised the declared floors in `package.json`: `react-router-dom` `^7.18.1` →
  `^7.18.2` and `js-yaml` `^4.3.1` → `^4.3.2`. Both declared ranges still had a
  **known-vulnerable version as their floor** — harmless while the lockfile holds
  (`npm ci` is exact), but a lockfile regeneration or a deliberate
  `npm i react-router-dom@7.18.1` would satisfy the manifest and land on a
  vulnerable version. The manifest should encode the security floor, not rely on
  the lockfile to remember it.
- Checked off the 2026-08-13 backlog item, with the two-range correction recorded
  against its original wording.

Verified on the final tree, after `npm ci` (which also proves `package.json` and
the lockfile agree — it hard-fails otherwise): `npm audit --omit=dev` → **0
vulnerabilities**; `npm run audit` passes with the allowlist empty; `check:deps`
OK on all 33 declared dependencies; build succeeds; **607 unit tests / 27 files**;
**64 Playwright e2e tests**, route discovery and navigation included;
`verify:dist-csp-hash` 3/3; lint unchanged at 0 errors / 12 known warnings.

The e2e run was not optional here. Unlike last week's `browserslist` fix —
dev-only, byte-identical output — react-router is shipped runtime code and the
emitted bundles **did** change (`index` grew ~1.4 kB). "Lockfile only" is not
"nothing shipped", so the routing suite is the evidence, not the bundle hashes.

**Confirmed in CI, not just locally.** This report's own PR ran the real gate on
GitHub: `build` — the single required status check on `main` — passed in 1m00s
**with the allowlist empty**, and `e2e` passed in 1m55s, alongside
`backlog-checkoffs`, `deployed-smoke` and the Vercel deployment. The suppression
is gone and the gate is green on its own merits.

Two things this deliberately does **not** claim. It does not make the 8.x
migration unnecessary — it removes the security argument for rushing it, and that
migration keeps its own backlog item (now with a minimum target). And it does not
retire the old entry's second revisit trigger: an independent security review
confirmed this app is still a static client-only SPA — `src/router.tsx:31-48` is
an element-only route tree with zero `loader`/`action`, there is no
`createStaticHandler` or RSC anywhere, and `src/` contains **no network calls at
all**, with `vercel.json` a pure static-rewrite config. So the advisory was never
reachable here and the bump clears it on the merits regardless. If that ever
changes — RSC/server mode, a mutating route `action`/`loader`, an authenticated
or mutating endpoint — the review must re-open immediately. That rule is
preserved in the file's comments rather than deleted along with the entry.

The rewritten comment also generalises the repo's own STANDING LESSON, which
until now read only "advisory ranges get widened". Both entries this file has
ever removed were invalidated by a range moving — brace-expansion by **widening**
(a version documented as safe became vulnerable), react-router by **splitting** (a
fix documented as unreachable turned out to be published). Neither direction
fails the gate to tell you.

### H2 — The scheduled-audit backlog item is now at its fifth advisory and has a measured cost every time. **CARRIED, unchanged, and I would spend the time this week.**

`BACKLOG.md` still carries the open `[ ]` **HIGH** item promoting a scheduled
`npm audit` out of the P2 batch. I re-verified the trigger is still PR-only:
`.github/workflows/ci.yml` fires on `pull_request` (branches: main) and
`workflow_dispatch`, and there is **no `schedule:` or `cron` anywhere** in
`.github/workflows/`. Nothing about this item has moved in five weeks.

The record it was opened on was three advisories in five days (`undici`,
`js-yaml`, `nanoid`). It is now **five**:

| # | Advisory | Date | Cost |
|---|---|---|---|
| 1 | `undici` | 2026-08-04 | PR #101, caught by hand |
| 2 | `js-yaml` | 2026-08-07 | PR #114, caught by hand |
| 3 | `nanoid` | 2026-08-08 | caught by hand |
| 4 | `browserslist` | 2026-09-01 | **6 days**, six posts blocked — nobody ran it |
| 5 | `js-yaml` (GHSA-2883-xcg3-v3hh) | 2026-09-11 | **~18 hours**, PR #158 |

Number 5 is this week's, and it is the mildest possible version of the pattern —
which is why it is worth measuring rather than waving at. PR #158 was opened
12:58 and merged 13:09 on 2026-09-11: an eleven-minute fix. But PR #157, the
2026-09-10 logbook post, was opened 2026-09-10 19:36 and could not merge until
2026-09-11 13:17 — **17 hours 41 minutes** blocked, on a repo whose entire
purpose is publishing daily. The fix was fast; the detection was not, because
detection is still a person noticing.

There is now also a **sixth** advisory sitting in the tree that the gate cannot
see at all (see L1) — not because anyone allowlisted it, but because it is
moderate and the gate fires on high/critical. That is correct behaviour and not
a bug. It is mentioned here because it is one more thing whose arrival nobody was
told about.

A `schedule:` cron running `npm ci && npm run audit` against `main`, opening or
updating one issue on failure, is still the whole fix, and it would have caught
#4 on day one and #5 overnight. Explicitly not an auto-bumping bot.

**But H1 sharpens what this item is worth, and it is worth less than it looks.**
A cron detects advisories nobody has seen yet. H1 was seen — correctly, within
three days, by the existing process — and still sat for five weeks. So the cron
would not have prevented this week's most serious finding. These are two
different failures wearing the same costume: #1–#5 are *detection* latency, H1 is
*execution* latency, and only the first is what a cron fixes. Both are real;
they need different fixes, and the second one is now demonstrably the more
expensive of the two. See the closing section.

---

## MEDIUM

### M1 — SoulForce-V2: the build fix has now been stranded for eight weeks. **CARRIED, re-verified, unchanged.**

No commits in this repo since the last sweep, so nothing here has moved — but the
position is worth restating precisely, because it is the oldest open item in the
studio and it is not blocked on work.

Local `main` is `9facba8`, one commit ahead of `origin/main` (`6673e52`), and does
not compile. The repair is a single commit, `301bf1e` ("Restore loadLocalStats so
main builds again"), which exists only on a local branch with no remote
counterpart.

Re-verified this week rather than carried on trust, and more sharply than last
week. The breakage is a genuinely unresolved import: on `main`,
`src/store/useGame.ts:4` imports `loadLocalStats` from `../lib/profile`, and
`src/lib/profile.ts` on `main` does not define or export it — the fix commit adds
those 14 lines, and `src/lib/profile.ts:33` on the fix branch is where
`loadLocalStats` lives. `npx tsc -b` on the branch holding the fix exits **0**.

`origin/main` never received the breaking commit, so nothing public is broken.
The cost is that the working checkout of the studio's flagship game has been
unbuildable since 2026-07-20 — **eight weeks**. This needs a decision, not more
verification: land `301bf1e` on `main`, or drop it.

### M2 — ds-roadmap: the committed build script cannot run on a fresh clone. **FIXED on a local branch in that repo.**

First sweep of this repo. It is 17 files, zero dependencies, and three commits
all dated 2026-09-11 — a v1 that was rejected as "too Jira-like", then a v2
"Altitude" concept round, currently awaiting a decision on which concept to
build. So it is an unresolved prototype, and it was reviewed as one: bugs and
risks only.

The review came back clean on everything that matters at runtime (see below), with
one real defect in the build pipeline. `assemble.mjs` reads the *file*
`seed.json`; `gen-data.mjs` is what writes that file; and `assemble.mjs` never
calls `gen-data.mjs`. `seed.json` is neither committed nor gitignored — it was
generated locally once and never tracked. The README describes the pipeline as
`style.css + app.js + gen-data.mjs -> assemble.mjs builds roadmap.html`, which
reads as one step.

I verified both halves myself against a clean `git archive` export of HEAD rather
than taking the review's word for it: `node assemble.mjs` alone throws
`ENOENT ... seed.json` immediately, and `node gen-data.mjs && node assemble.mjs`
reproduces the committed `roadmap.html` **byte-for-byte** (`cmp`: identical).

That byte-identical result is the reassuring half, and it is why this is MEDIUM
and not HIGH: the committed artifact is **current, not diverged** from its
generator. There is no hidden second source of truth and no hand-edited generated
file. The only thing missing is the intermediate needed to rebuild it — so the
failure is a footgun for the next person, not corruption of what exists.

Fixed by documenting the required order in `README.md` on a local maintenance
branch in the ds-roadmap repo (not pushed; that repo has no remote).
Deliberately **not** fixed by committing `seed.json`: whether a generated
intermediate belongs in version control is a call for whoever picks up Altitude
v2, and this repo is still waiting on the concept decision.

What the review explicitly did **not** find, recorded because a prototype that
may get built on is worth knowing this about: no XSS sink (`app.js` uses
`textContent`/`createElement` throughout with zero `innerHTML`;
`concept-board.html` does use `innerHTML` but routes every dynamic field through
an entity-escaper, and the one runtime user-input path uses `textContent` by
documented deliberate choice); no drag-and-drop code at all, so that entire bug
class is absent; no id-collision path (build-time slug IDs dedupe against a used
set, runtime IDs combine random + timestamp); `localStorage` access wrapped in
try/catch throughout; and `node --check` clean on all three JS files.

---

## LOW

### L1 — studio-site: a new moderate advisory landed this week; it cannot fail the gate, and the fix is a major.
`GHSA-82fw-gwwq-j7x9` — path traversal / arbitrary file read via
`@vitest/mocker`'s redirect mock, range `>=2.1.0 <4.1.11`, present via `vitest`
3.2.7 and `@vitest/mocker`. `audit-ci.jsonc` gates on `"high": true` and
`"critical": true`, so a moderate cannot fail it — confirmed empirically, since
`npm run audit` passed with this advisory present both before and after H1's fix.
Dev-only: it is not in `npm audit --omit=dev`, which is now 0. npm reports the fix
as `vitest@5.0.0`, **a major** (from 3.2.7), so there is no in-range bump. No
action this week; recorded so its arrival is on the record rather than discovered
later, and so that nobody reads "0 production vulnerabilities" as "0 advisories".

### L2 — studio-site: the local `node_modules` had drifted from the lockfile, and `check:deps` structurally could not see it. **FIXED incidentally.**
At the start of this sweep `package-lock.json` pinned `js-yaml` **4.3.2** (the fix
merged in PR #158 on 2026-09-11) while the installed tree still had **4.3.1** —
nobody had run `npm ci` locally after that merge. `check:deps` passed anyway, and
correctly: it validates the 33 *declared* dependencies, and `js-yaml` was
transitive at the time.

Harmless in itself — CI installs from the lockfile, so nothing shipped was
affected — but worth recording, because it means local gate runs can silently
execute against a different tree than CI does. The first half of this sweep's
studio-site gate results were produced on that drifted tree. **Every gate result
reported here was then re-run after `npm ci`**, on a tree that matches what CI
installs, which is also what closed the gap. As a side effect of H1 raising
`js-yaml`'s declared floor to `^4.3.2`, this particular drift is now visible to
`check:deps` in future.

### L3 — studio-site: a source comment cited a content-hashed filename, and the bump rotted it. **FIXED ON THIS BRANCH.**
Collateral of H1, found by the security review. `src/components/layout/RootLayout.tsx:36`
justified the single-hoisted-Suspense CLS treatment by citing
`node_modules/react-router/dist/development/chunk-SA4DP3SF.js`. That file does not
exist at 7.18.3 (the chunks are now `chunk-7SIULPXI.js`, `chunk-QPXIKN46.js`,
`chunk-YRTY65LJ.js`), so the comment became a dangling pointer — and its whole
purpose is to let a future reader *re-verify* a load-bearing claim.

I confirmed the underlying claim survives the bump before touching the comment:
`chunk-YRTY65LJ.js:293`, `:331` and `:364` still show
`React.startTransition(() => setStateImpl(newState))` unconditionally. Behaviour
intact; only the filename was wrong. Rewritten to cite the symbol and the grep
that finds it rather than a content-hashed filename, since those rot on every
bump by construction. `docs/cls-fallback-decision.md` also names 7.18.1 and was
deliberately **left alone** — it is a dated decision record of what was verified
on 2026-07-30, and editing history into it would be the wrong fix.

### L4 — studio-site: 10 stranded branches, unchanged for a fourth week.
`check:stranded-branches` reports 10 against `origin/main` across 158 branches and
161 PRs. `check:backlog-checkoffs` reports the same 4 merged branches cited only
inside still-open multi-PR epics. Both are reporting checks, never auto-failed,
and both have been static since 2026-08-31. Recorded for continuity only. Two
stale local worktrees also exist under `.claude/worktrees/` (one holding `main`,
one holding a July branch); they are local clutter, not a repo problem, but they
are why `main` could not be checked out directly during this sweep.

### L5 — mensApp: every finding from last week is still open, because nothing has been committed since 2026-09-03.
No commits since the last sweep, clean tree, so this is carried verbatim rather
than re-audited. Still open: **H3** (secrets readable by anyone who can load the
deployed URL — the accepted trust model for a private friends' tool, and the
ceiling on every other secrecy control), **M1** (an editor's exported PNG contains
every secret in full — the one most likely to cost something at the next event),
and **L1–L6** (the stale "server-side" comment in `RoundEditor.jsx`, the iOS
download-capability check that always returns true, the two remaining secret
counters, the self-reimplementing test, two coverage gaps, and core dev tooling
several majors behind). See `reports/maintenance-2026-09-07.md` for the full
analysis of each.

### L6 — studio-site: core tooling is drifting further behind, with the test suite as the asset that makes it cheap.
`npm outdated`: `vite` 7.3.6 → 8.3.0, `vitest` 3.2.7 → 5.0.0, `eslint` 9.39.5 →
10.10.0, `typescript` 5.7.3 → 7.0.2, `react`/`react-dom` 19.2.7 → 19.3.0,
`react-router-dom` now 7.18.3 → 8.3.1. Only the vitest gap has a security
dimension (L1). No action needed this week — but 607 unit tests plus 64 e2e tests
is exactly the asset that makes a major upgrade cheap to attempt, and that
leverage decays the longer it waits.

---

## Quiet repos — nothing to do

All clean working trees, no commits since the dates shown, no action:

- **Soulforge** (2026-07-16) · **Travel plan app** (2026-07-16) ·
  **chart-token-playground** (2026-07-16) · **claude-dev-company** (2026-07-16) ·
  **dominiquebrom-portfolio** (2026-07-18) · **lovetimeline-app** (2026-07-16) ·
  **pizzaparty-app** (2026-07-16) · **sollie-aem-prototype** (2026-07-16) ·
  **sollie-process-presentation** (2026-07-16) · **token-impact-mapper**
  (2026-07-16)

**mensApp** (2026-09-03) and **SoulForce-V2** (2026-07-20) also had no commits
since the last sweep; their entries under L4 and M1 are carried findings, not new
work. SoulForce-V2's only working-tree change remains an uncommitted
`.claude/launch.json` (preview server config), left alone for a ninth week.

---

## The three things worth Dom's attention

1. **Merge this report's PR.** It clears a production high-severity advisory that
   has been live for five weeks (H1), empties the allowlist, raises two declared
   floors off known-vulnerable versions, and closes a HIGH backlog item. Verified
   on a post-`npm ci` tree against 607 unit tests, 64 e2e tests, the CSP-hash
   check and the audit gate.

2. **The studio's bottleneck is not finding things. It is doing them.** This is
   the one structural conclusion I would act on, and this week is the cleanest
   evidence yet: a production security fix, correctly diagnosed on 2026-08-10,
   priced in the backlog on 2026-08-13 as "one lockfile bump, one deleted
   allowlist entry, one test pass", survived **four maintenance sweeps** and was
   done today in about twenty minutes. The logbook has been saying so out loud
   for a week ("Thirteen Findings, None Started"). Sweeps keep producing
   well-verified findings into a queue nothing drains, and the deferral that
   started it was a **review-throttle** decision — so the constraint is Dom's
   review capacity, and the fix is a policy, not a script. The cheapest version:
   let a sweep land its own already-specified HIGH fixes without waiting for a
   slot, the way this one did. The scheduled-audit cron (H2) is still worth
   building, but it addresses detection latency, and this week the expensive
   failure was execution latency.

3. **Decide on SoulForce-V2's stranded fix** (M1) — which is the same disease.
   Eight weeks, one commit, `tsc` exits 0 on the branch that holds it. Land
   `301bf1e` on `main` or drop it. It is the studio's oldest open item and it has
   never been waiting on work, only on a decision.
