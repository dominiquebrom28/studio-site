# Maintenance sweep — 2026-08-24

Baseline: `reports/maintenance-2026-08-17.md`. This report covers what changed
since then.

13 git repositories under `VibeCodeProjects/`. Since 2026-08-17 **two** have new
work: **mensApp** (~25 commits, 119 files, +23,408/−770 — the studio's first real
feature week on it) and **studio-site** (4 logbook posts plus one substantive
commit). The other 11 are untouched — though "untouched" is not the same as
"fine", and SoulForce-V2's six-sweep-old build break (**M5**) is the standing
reminder of that.

**The headline is mensApp, and it is a good-news/bad-news pair.**

The good news is the work itself. Locally mensApp is green on every gate: the
build passes, **640 tests across 60 files pass** (up from 344 last week and 53
the week before), and ESLint reports **zero problems** — the 30-finding lint debt
is genuinely cleared, not suppressed. qa-tester read all ~25 commits
adversarially. The scoring plugins, standings, quiz round adapter, team library
API and the multi-day/schedule-day helpers came back clean, with edge cases
(reversed date ranges, duplicate entrant names, malformed JSONB) defensively
handled and unit-tested. **The merge everyone should have been worried about is
fine:** `e44aba1 Merge origin/main: reconcile PR #1 with the 11 later commits`
dropped nothing — `git diff dd811a0 e44aba1` is empty, and PR #1's head
(`d6787fb`) was already an ancestor of `d8bd893`, so the GitHub side had
converged to a no-op before the merge ran. I verified both independently. The
studio's recurring "a merge silently reverted my edits" failure mode did **not**
happen here.

The bad news is that **none of those 640 tests have ever run in CI.** CI was
added on 2026-08-21 in `c267e9b` and its `Test & build` job has failed on
**every single run since** — four for four. Not one green build exists. The cause
is a one-line version pin, and it is fixed on a branch below.

**One fix was applied,** in mensApp, on `team/maintenance-2026-08-24` — local
and unpushed, per the sweep rules that keep non-studio-site fixes off remotes.
studio-site needed none. Nothing else in this report met the trivial-and-safe
bar, and the two places where I deliberately stopped short are called out at the
findings themselves.

**studio-site is green and the queue is drained.** Build, typecheck, 607 tests,
lint (0 errors / 12 pre-existing react-refresh warnings), five of six self-checks,
and all six routes on the production deploy return OK. Zero open PRs; local `main`
is exactly `origin/main`. qa-tester found **one** real defect, in a self-check
gate, and it is latent rather than live. Details below.

**Last sweep's carried MEDIUM is now resolved and I am closing it.** The
`audit-ci.jsonc` justification was flagged three sweeps running as "expired." It
was rewritten on 2026-08-04 and I re-verified every factual claim in it today
against live npm: installed `react-router` is 7.18.1, the 7.x line's latest is
7.18.2 (**still inside** the vulnerable `>=7.12.0 <8.3.0` range, so no 7.x patch
clears it), and `react-router@latest` is 8.3.0 (**clears** it). The file says
exactly that. The entry is now an honestly-labelled deferral with a costed
migration behind it, not a stale rationalisation. What remains is not a
documentation problem — it is the unstarted 8.x migration itself, filed at its
real severity below.

---

## Gate results

| Repo | Build | Tests | Lint | Typecheck | Other |
|---|---|---|---|---|---|
| mensApp | PASS | PASS 640/640 (60 files) | PASS 0 problems | n/a (plain JS) | **CI red on GitHub — 4/4 runs** |
| studio-site | PASS | PASS 607/607 (27 files) | PASS 0 err / 12 warn | PASS | 5/6 self-checks; 6/6 prod routes OK |

studio-site self-checks: `check:deps`, `check:clean-checkout`, `check:report-claims`,
`check:backlog-checkoffs`, `check:merge-revert` all PASS. `check:stranded-branches`
FAIL — see LOW-2; it is a reporting check, not a merge gate.

---

## HIGH

### H1 — mensApp CI has never passed; 640 local tests are enforcing nothing. **FIXED on a branch.**

`.github/workflows/ci.yml:35` pinned `NODE_VERSION: '20'`. `jsdom@30.0.1`
declares `engines: "^22.22.2 || ^24.15.0 || >=26.0.0"` and pulls `undici@8.10.0`
(`engines: ">=22.19.0"`), which calls `webidl.util.markAsUncloneable` at import
time. That function does not exist on Node 20, so **all 60 test files died during
collection** and the step reported `no tests / 60 errors` before exiting 1.

Every run since CI was introduced:

```
32499485462  failure  Teaser takes over the whole screen                main
32496807999  failure  Merge origin/main: reconcile PR #1 ...            main
32486124623  failure  Tap targets and a banner that no longer traps you team/mensapp-2026-08-20
32479040401  failure  Clear the lint debt: 30 findings to zero          team/mensapp-2026-08-20
```

This was never a test failure — the suite is green on Node v24.16.0, which is
what the app is developed on locally. The `lint` and `audit` jobs were unaffected
and were already passing, which is why the redness read as background noise
rather than a broken gate.

**Fix applied** on `team/maintenance-2026-08-24` in mensApp (commit `250de12`,
local only, not pushed): `NODE_VERSION: '20'` → `'24'`, with a comment recording
the engines constraint so nobody re-pins it. One line of behaviour change,
YAML-validated, no runtime effect on users. This met the trivial-fix bar; nothing
else in this report did.

**Consequence worth stating plainly:** the entire feature week — mens-games
engine, tournaments, team library, trailer, multi-day events — landed on `main`
with a red build and, after PR #1, **without PRs at all** (the CI run list shows
`main / push` for the later commits). The 640 tests are excellent work that has
so far protected nothing.

### H2 — mensApp: opening Presentation Mode can silently overwrite concurrent edits to the whole event row.

`src/App.jsx:5526-5532`. A `useEffect` fires automatically — no user action beyond
clicking `▶ Present` — whenever an event has a schedule stop lacking an `id`, i.e.
**essentially every event created before `7f5ef2a` shipped on 2026-08-21**, since
stop ids did not exist before it. It calls
`onUpdate({...evt, schedule: withIds})`, and `updateEvent`'s object branch
(`src/App.jsx:7442-7456`) is a blind full-row `supabase.from("events").upsert([updated])`
off whatever `evt` snapshot that component rendered with.

Failure scenario: an admin hits Present as the mens day starts — exactly when
others are RSVPing, bumping the kretjes counter, or uploading photos. If this
client's `evt` is stale by even one missed realtime message (Supabase realtime
does not replay changes missed during a reconnect, and phones on patchy signal at
a bar background and reconnect constantly), the full-row upsert reverts those
writes to the stale snapshot. Silently — no error, no conflict.

What makes this a clear finding rather than a judgement call: **the same author
solved this exact problem one commit earlier.** `src/features/mensgames/finishTournament.js:157-170`
re-reads the event row before writing, with a comment naming the precise hazard —
*"could silently discard a concurrent write to any other field on the same event
— live quiz scores, RSVPs, kretjes, photos."* That fresh-read-then-merge guard
simply was not applied here. The fix is to reuse it.

Not covered by tests: `src/test/presentationModeOrder.test.jsx:253-261` gives every
test stop a real `id` up front, specifically so this backfill is a no-op — so its
write behaviour is never exercised.

Not fixed here: applying the fresh-read pattern to a live-write path, plus the
test that would need to accompany it, is real work with real risk. Finding, not
fix.

### H3 — mensApp: every member's PIN hash is world-readable, and the anon key can write any row. **Unchanged, now documented in-repo.**

security-auditor re-verified last sweep's finding rather than re-asserting it, and
it holds verbatim. Condensed, with evidence:

- `src/supabase.js:3-6` — the anon client is the only client. There is **no**
  `supabase.auth` call anywhere in `src/`. No session, no JWT, no `auth.uid()`.
- `src/App.jsx:7189` — `from("users").select("*")` ships **every** user row
  including `pin_hash` to every browser at boot, and again every 30s (`:7252`).
  It must, because `src/App.jsx:631` authenticates with
  `users.find(u => … && u.pin_hash === pinH)` — login is a `.find()` in browser
  memory.
- `src/supabase.js:8-11` — bare unsalted SHA-256 over a 4–6 digit PIN
  (`:642`). The whole keyspace is 1.1M hashes: **sub-second on a laptop.**
- `docs/mensgames-spec.md:324-326, 342-344` — the shipped migrations are literally
  `create policy … for all to anon using (true) with check (true)`, and `:64` notes
  this is "identical to `events`/`users` today." `:267` states it outright: *"Any
  user of the deployed site can read and write any row."*

The practical consequence is not the brute force, it is that `PATCH /rest/v1/users?id=eq.<you>`
with `{"role":"admin"}` also works, and so does deleting every user — after which
the next client to boot re-seeds admin **"Doom" with PIN `1234`** (`src/App.jsx:604, 7213-7216`).
`H1` in the security report — the mens-games admin switch (`b240355`) — is a
`localStorage` flag plus render guards (`src/App.jsx:7153, 7512, 7614, 1974`); it
gates the UI correctly and gates the data not at all. Both agents reached that
conclusion independently.

**This is knowingly-carried debt, not a surprise** — `docs/mensgames-spec.md:265-277`
documents it deliberately, which is the right way to hold a gap. It is filed HIGH
rather than CRITICAL on proportionality: a private friend-group app where the
realistic harm is PIN reuse and the exposure of real names, ages, bios and photos
of identifiable people — not a targeted attacker. But it has now been "next
sprint" for three sprints while three more feature surfaces were built on top of
it, and the north-star of a public multi-tenant version needs exactly the fix
that keeps being deferred. Supabase Auth + `auth.uid()`-scoped RLS is one piece
of work that retires the PIN exposure, the anon write access, the forgeable
`md-session` localStorage identity (`src/App.jsx:7403, 7221-7222`), the seeded
`1234` admin, and the unrated registration endpoint together.

---

## MEDIUM

### M1 — studio-site: `check-backlog-checkoffs` reports a branch as checked off when it was never mentioned.

`scripts/check-backlog-checkoffs.mjs:401` — `if (!block.text.includes(branch)) continue;`
is a bare substring test with no word boundary. A branch whose name is a **prefix**
of a different, checked-off branch inherits that check-off.

Reproduced independently against the real module:

```
parseBacklogBlocks("- [x] Ran the audit\n  _(2026-08-01, team/2026-08-04-runs-api-v2, PR #999)_\n")
classifyBranchAgainstBacklog("team/2026-08-04-runs-api", blocks)  ->  "checked"
```

`team/2026-08-04-runs-api` appears nowhere in that text. The gate says it is
checked off.

This matters because this repo's branch names are `team/YYYY-MM-DD-slug` and
same-day follow-up lanes with `-v2` / `-audit` / `-followup` suffixes are an
established convention here — the collision shape is the house naming scheme. And
it is precisely the "gate silently passes when it should fail" mode, on the gate
written to catch the never-checked-off incident (`PR #97/#98/#99`).

**Latent, not live:** I swept every `team/…` branch string cited in `BACKLOG.md`
for prefix collisions. The only hit —
`team/2026-08-04-undici-` vs `team/2026-08-04-undici-advisories` — is a markdown
line-wrap artifact at `BACKLOG.md:2420`, not two real branches. No current
false-negative.

The line predates the review range (introduced in `a98ec4a`, untouched by
`30e19f6`). Fix is a delimiter-anchored match, e.g. `(?<![\w-])branch(?![\w-])`,
with a fixture alongside the existing `describe('parseBacklogBlocks / classifyBranchAgainstBacklog', …)`
block at `scripts/check-backlog-checkoffs.test.ts:238`. **Not applied** —
changing a gate's matching semantics can change what it lets through, which is
exactly the kind of change that wants its own reviewed PR.

### M2 — studio-site: the react-router 8.x migration, not its allowlist entry.

`npm audit` reports 2 high (`GHSA-qwww-vcr4-c8h2`, react-router RSC-mode CSRF
bypass). `npm run audit` passes because the advisory is allowlisted, and — verified
today — the allowlist's reasoning is accurate: this is a client-only SPA that
mounts no RSC/server router, and no 7.x release clears the range (7.18.2 is still
inside it). So the gate is behaving correctly and the exception is honest.

What is not resolved is the underlying work. `audit-ci.jsonc`'s own REVISIT rule
says to drop the entry on either trigger, and trigger 1 (**react-router 8.3.0
published**) fired on 2026-08-04 — twenty days ago. The entry is retained by
explicit deferral, correctly, because dropping it before the ~28-file major
migration lands just turns CI red with no fix staged. Recording it here so the
deferral stays visible instead of aging into background: this is a scheduled
migration that has not been scheduled.

Free patch available meanwhile: 7.18.1 → 7.18.2. Not security-relevant (still in
range), so not applied unattended.

### M3 — mensApp: dev-toolchain vulnerabilities and a three-major Vite gap.

`npm audit`: 2 vulnerabilities (1 moderate, 1 high), both dev-only —
`GHSA-67mh-4wv8-2f99` (esbuild dev-server request forgery, moderate, transitive)
and `GHSA-4w7w-66w2-5vf9` (Vite path traversal in optimized-deps `.map` handling,
reported high on the direct `vite` dep). Neither ships to users; the CI `audit`
job scopes to `--omit=dev` and is right to.

But the reason both exist is that **mensApp is on Vite 5.4.21 while 8.2.2 is
current** — three majors behind, and the fix is `npm audit fix --force` → vite@8,
a breaking change. React is 18.3.1 against 19.2.8, and vitest is pinned to 3.x
precisely because 4.x requires Vite ≥6. This is a knot, not three independent
bumps: vite → vitest → jsdom → the Node pin from H1 all move together. Worth
scheduling as one deliberate upgrade rather than discovering it during an
unrelated fix.

One caveat from the security pass on the CI audit job, recorded because it is a
real limitation of a gate rather than a bug: `--omit=dev` excludes the tools that
*produce* the shipped artifact, so a compromised build tool would ship to users
without failing that gate. The job never claims otherwise — its name is
"Dependency audit (production deps, high/critical)" — but the gap is worth
knowing.

### M4 — mensApp: no security headers on a live public site.

`vercel.json` contains a SPA rewrite and nothing else — no CSP, HSTS,
X-Content-Type-Options, frame-ancestors, or Referrer-Policy. The app is
clickjackable and has no defence-in-depth. This is a `vercel.json` `headers`
block; it is small, but it is a production-behaviour change on a live site, so it
is a finding rather than an unattended fix.

### M5 — SoulForce-V2: local `main` still does not build, sixth sweep running — and the fix is already written.

Carried since 2026-07-20 and understated in my own first draft of this report, so
recording it properly. `npm run build` is `tsc -b && vite build`, and on
`main` (`9facba8`) the `tsc -b` step fails:

- `src/store/useGame.ts:4` imports `loadLocalStats` from `../lib/profile`
- `src/lib/profile.ts` on that commit exports `getOwnerId`, `loadLocalCharacter`,
  `loadProfile`, `saveProfile` — and **not** `loadLocalStats`
- plus `TS6133: 'Stats' is declared but never read` in the same file

The progression commit wired the function in without landing it. **The fix
exists**: commit `301bf1e` "Restore loadLocalStats so main builds again" adds the
reader, mirroring `loadLocalCharacter`, with no behaviour change (it returns null,
the store still falls back to `SEED_STATS`). It has been sitting unmerged on the
local branch `team/maintenance-2026-07-20` for five weeks. I confirmed the branch
carries exactly that one commit and nothing else, and that the branch builds.

**The published repo is unaffected** — `origin/main` is `6673e52`, one commit
*behind* the breaking commit, so nothing broken was ever pushed. Re-verified
today; last sweep's assessment of that still holds. This is a local-only break,
which is why it has been survivable for six sweeps — and also why it keeps not
getting fixed.

Not merged unattended: merging a branch into `main` is Dom's call, not a sweep's,
even for a one-commit fix that is already reviewed and written.

---

## LOW

- **L1 — mensApp: photo uploads accept any type and any size** into public buckets
  (`src/App.jsx:4858-4869` event photos, `:1350-1358` profile photos). The trailer
  video field at `:6005-6006` does it correctly with `TRAILER_VIDEO_TYPES` +
  `TRAILER_VIDEO_MAX_BYTES` — the pattern to copy already exists in the repo.
  Filenames *are* sanitized, so there is no path traversal.
- **L2 — mensApp: unauthenticated realtime broadcast.** `src/App.jsx:7290-7325`
  accepts `push-notif` / `del-notif` / `clear-notifs` on channel `notif-ctrl` with
  no sender validation — anyone with the anon key can push a notification
  attributed to anyone, or wipe everyone's. A social-engineering vector more than
  a data one. Subsumed by the H3 fix.
- **L3 — mensApp: `finishTournament` leaves inconsistent state on partial failure.**
  `src/features/mensgames/TournamentEditor.jsx:150-161` writes medals to
  `event.winners` first; if the team-award write then fails it returns early
  without updating tournament `status`, leaving "Bezig" showing while medals are
  already public. Both writes are idempotent so a retry fixes it — but nothing
  forces the retry.
- **L4 — mensApp: raw DB error text shown to users** at registration
  (`src/App.jsx:7407` → rendered `:672`), leaking constraint and policy names.
  The outlier — everywhere else in the codebase classifies errors properly.
- **L5 — studio-site: one stranded branch.** `team/2026-07-21-backlog-and-report`,
  33 days old, 1 commit ahead of `main`; PR #34 is merged but does not cover the
  tip. **It is safe to delete:** `reports/2026-07-21-review.md` already landed on
  `main` via `1f5b5fa`, and the branch's only remaining delta is a `BACKLOG.md`
  that is 2,659 lines *behind* `main`. Merging it would be destructive; deleting
  the ref loses nothing. Left for Dom because deleting refs is not an unattended
  action.
- **L6 — mensApp: `origin/team/mensapp-2026-08-20` still on the remote** after PR
  #1 merged. Housekeeping.
- **L7 — mensApp: identifiable people's photos in a public repo.** `src/SaraJay/Real1.jfif`
  … `Real5.jpg` and several `WhatsApp Image 2026-05-05 at *.jpeg`. Privacy, not a
  vulnerability, but the repo is public.
- **L8 — SoulForce-V2: uncommitted local config.** An uncommitted
  `.claude/launch.json` holding local preview-server entries only. Cosmetic — but
  see M5 for the non-cosmetic half of this repo's state.

---

## Checked and explicitly clear

Recorded so absence of a finding is distinguishable from absence of a check.

- **The `e44aba1` merge dropped nothing.** Verified twice, independently
  (`git diff dd811a0 e44aba1` empty; `d6787fb` is an ancestor of `d8bd893`).
- **mensApp XSS:** `renderMd` (`src/App.jsx:5202-5220`) escapes `& < >` *before*
  applying markup, and user content only reaches text-node position. The three
  `dangerouslySetInnerHTML` sites (`:1926, 5286, 5325`) are safe. Confirms the
  2026-08-18 hand check.
- **mensApp injection / traversal / redirects:** all DB access via the PostgREST
  query builder, no raw SQL, no interpolated `.rpc`. Upload paths sanitize with
  `/[^a-zA-Z0-9._-]/g`. `src/features/trailer/safeUrl.js` restricts to http(s) plus
  a video-extension allowlist.
- **mensApp secrets:** `.env.local` is gitignored and absent from the index; no
  service-role key anywhere in the repo. The anon key in the bundle is normal and
  expected — H3 is about what that key can *reach*, not that it is visible.
- **mensApp CI leaks nothing:** `permissions: contents: read`, no `secrets.*`
  reference, no `pull_request_target`. The header comment's claim that the build
  needs zero env vars is true, so fork PRs are genuinely safe to run.
- **mensApp scoring engine:** `best-of`, `first-to`, `goal-diff`, `race-time`,
  `manual`, `simple-points`, `quiz-linked`, `standings.js`, `quizRound.js`, the
  team-library API and the multi-day helpers read in full — no defects beyond
  those listed.
- **studio-site `main` is protected.** Re-verified today against
  `gh api repos/.../rules/branches/main`: `deletion`, `non_fast_forward`, and
  `required_status_checks` on context `build`. Last sweep's correction stands; the
  `/protection` 404 remains a false negative.
- **studio-site `54b35cb`, `406c6b3`, `630ace0`, `9fce67e`:** all sound. The
  unanchored `*.test.ts` allowlist entry is genuinely gone and no other pattern
  matches a test file. The worktree `cacheDir` change passes `undefined` on normal
  checkouts, which Vite treats as falsy and falls through to its default — CI and
  ordinary clones are unaffected. The `check-merge-revert` path-granularity gap is
  a disclosed tradeoff with a pinning test, not a silent bug; its real-corpus
  sweep across all 97 merge commits on `main` still finds exactly the one known
  violation (PR #81) and zero false positives.
- **studio-site production:** all six routes on `https://doms-ai-studio.vercel.app`
  return OK.

---

## Quiet repos — nothing to do

No commits since the last sweep; assessed cheaply and skipped, per the sweep rules.

- **Soulforge** — last commit 2026-07-16. Nothing to do.
- **Travel plan app** — last commit 2026-07-16. Nothing to do.
- **chart-token-playground** — last commit 2026-07-16. Nothing to do.
- **claude-dev-company** — last commit 2026-07-16. Nothing to do.
- **dominiquebrom-portfolio** — last commit 2026-07-18. Nothing to do.
- **lovetimeline-app** — last commit 2026-07-16. Nothing to do.
- **pizzaparty-app** — last commit 2026-07-16. Nothing to do.
- **sollie-aem-prototype** — last commit 2026-07-16. Nothing to do.
- **sollie-process-presentation** — last commit 2026-07-16. Nothing to do.
- **token-impact-mapper** — last commit 2026-07-16. Nothing to do.
- **SoulForce-V2** — last commit 2026-07-20, no new code this week. Not quiet
  though: local `main` still fails `tsc -b`, with the one-commit fix stranded on a
  local branch. See **M5**, and **L8** for the uncommitted local config.

---

## The three most important actions for Dom

1. **Merge the mensApp CI fix and make the build required.** The one-line Node
   bump is sitting on `team/maintenance-2026-08-24` in mensApp (commit `250de12`,
   local, unpushed). Until it lands, 640 tests are decoration. Then do for mensApp
   what studio-site already did: require `build` on `main` via a ruleset, so a
   feature week cannot land red and PR-less again. This is the cheapest item on
   the list and it unlocks the value of everything the team built last week.

2. **Do the mensApp auth rework — it is now blocking, not deferred.** Supabase
   Auth plus `auth.uid()`-scoped RLS is one piece of work that closes the PIN
   exposure, the `using(true)` anon write access, the forgeable localStorage
   session, the seeded `1234` admin, and the fake admin switch simultaneously.
   Three feature surfaces have now been built on top of it, and each one widens
   what an unauthenticated write can reach. The architect's own split plan already
   sequences the App.jsx state layer *with* the auth rework for exactly this
   reason — that sequencing is the argument for doing it before the next feature,
   not after.

3. **Fix the Presentation Mode full-row overwrite (H2).** It is a live data-loss
   path that fires automatically on legacy events, the correct pattern already
   exists sixty lines away in `finishTournament.js`, and the window is widest
   during an actual mens day — the one time the app is under concurrent load.

Below the line but worth a calendar slot: the react-router 8.x migration
(**M2**) and the mensApp Vite 5 → 8 knot (**M3**) are both scheduled work that has
not been scheduled, and the second one now has the CI Node pin tangled into it.
And the smallest item on the whole list — merge `301bf1e` in SoulForce-V2 (**M5**)
and a six-sweep-old finding disappears for the cost of one `git merge`.
