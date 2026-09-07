# Maintenance sweep — 2026-09-07

Baseline: `reports/maintenance-2026-08-31.md`. This report covers what changed
since then.

13 git repositories under `VibeCodeProjects/`. Since 2026-08-31 **two** have new
work: **mensApp** (5 commits, 14 files, +2,383/−52 — a summary/overview feature
and an image export) and **studio-site** (6 logbook posts, content only). The
other 11 are untouched since mid-July.

**The headline is not in the code, it is in the queue.** studio-site has
published nothing since 2026-08-31. Six logbook posts — 2026-09-01 through
2026-09-06 — are written, committed, and sitting in six open PRs (#147–#152),
every one of them blocked by the same red `build` check. The cause is a
dependency advisory that has nothing to do with any of them, and this is the
**fourth** time this exact pattern has hit this repo. The difference this time
is that nobody ran the command by hand, so it ran for six days instead of one.

That is H1, and **it is fixed on this branch** — verified, not asserted.

mensApp's week is in better shape: build, lint, 1085 tests and CI are all green,
and the new image-export feature routes through the same masking choke point the
on-screen card uses. Two specialists reviewed it. **I verified every load-bearing
claim in their reports myself against the working tree**, and one of them I
reframed rather than repeating — see M1, where the behaviour reported as a defect
turns out to be a deliberate, explicitly tested product choice. The finding
survives, but not in the shape it arrived in.

---

## Gate results

| Repo | Build | Tests | Lint | Audit | CI |
|---|---|---|---|---|---|
| mensApp | ✅ | ✅ 1085 / 104 files | ✅ 0 problems | ✅ 0 prod vulns | ✅ green, 4/4 pushes |
| studio-site | ✅ | ✅ 607 / 27 files | ✅ 0 errors, 12 known warnings | ❌ → ✅ **fixed here** | ❌ red since 09-01 → ✅ green on this PR |

studio-site self-checks: `check:deps`, `check:report-claims`, `check:merge-revert`
all OK. `check:backlog-checkoffs` reports the same 4 multi-PR epics as last week
(expected, never auto-failed). `check:stranded-branches` reports 10, unchanged.
`check:clean-checkout` flagged only this run's own lockfile edit.

---

## HIGH

### H1 — studio-site has published nothing for six days, and the gate that blocked it is one nobody was watching. **FIXED ON THIS BRANCH.**

The last post on `main` is `2026-08-31-every-gate-went-green-and-the-report-got-worse.md`.
Six posts exist and are not live:

| PR | Post |
|---|---|
| #147 | 2026-09-01 the safe version was already there, used once in thirteen |
| #148 | 2026-09-02 yesterday's post never published, and the post wasn't the problem |
| #149 | 2026-09-03 four rounds chasing code that was already correct |
| #150 | 2026-09-04 yesterday's correction was the thing that needed correcting |
| #151 | 2026-09-05 the only check runs when something tries to leave |
| #152 | 2026-09-06 not exploitable here is what the removed entry said too |

All six are `MERGEABLE` with a **failing `build`** check, which is the single
required status check on `main`
(`repos/dominiquebrom28/studio-site/rules/branches/main` →
`required_status_checks: [build]`). So the queue is not stuck on review or on
conflicts. It is stuck on one red gate.

**The cause is not the react-router allowlist entry.** That one is working
exactly as designed — CI reports it as `Found vulnerable allowlisted advisories:
GHSA-qwww-vcr4-c8h2` and moves on. Reading the advisory count instead of the two
lists is the trap here, and it is worth naming because the count says "3 high"
while only two of them fail. The two that fail are both **`browserslist`**:

```
GHSA-c83g-rgw3-j3cx  unbounded memory growth (no cache eviction) → eventual OOM
GHSA-73wf-gq98-2v4g  crash / prototype write via untrusted browserslist-stats.json
```

Both carry the range `<=4.28.6`. `package-lock.json` pinned exactly `4.28.6` — one
patch inside the range. `browserslist` is a dev-only transitive dependency
(`@vitejs/plugin-react` → `@babel/core` → `@babel/helper-compilation-targets`), so
nothing shipped to a visitor was ever affected; the damage was entirely to the
ability to ship at all.

**Fix applied and verified:** `npm update browserslist` → `4.28.9`, carrying its
data siblings (`caniuse-lite`, `electron-to-chromium`, `node-releases`,
`update-browserslist-db`, `baseline-browser-mapping`). Lockfile only —
`package.json` is untouched. After the bump: `npm run audit` passes, 607 tests
across 27 files pass, lint is unchanged at 0 errors / 12 warnings, and **the
emitted bundle hashes are byte-identical to the pre-bump build**
(`index-DBuhoGjw.js`, `index-CjZ1aa9o.js`), which is the strongest available
evidence that nothing user-facing moved.

Deliberately **not** allowlisted. A real fix exists inside the current major, and
`audit-ci.jsonc`'s own standing lesson is that an exception must be a reviewed
deferral with a known cost, not a way to get a gate green.

**Confirmed in CI, not just locally.** This report's own PR ran the real gate on
GitHub and `build` passed in 1m15s — the first green `build` in this repo since
2026-09-01. `e2e` also ran and passed, having been `SKIPPED` on all six blocked PRs.

**One operational detail that matters, and is easy to get wrong:** merging this
does **not** turn the other six PRs green on its own. `strict_required_status_checks_policy`
is `false`, so GitHub will not force them to update — but each PR's CI runs
`npm ci` against **its own** lockfile, and all six still carry `browserslist@4.28.6`
(verified on #152's branch). Each branch needs main merged in (the "Update branch"
button) to re-run CI green. Merge this first, then update the six.

### H2 — The root cause is an open backlog item that predicted this exact failure, one month ago. **CARRIED, now with a measured cost.**

`BACKLOG.md:2636` — open `[ ]` **HIGH**, "Promote scheduled `npm audit` out of the
P2 batch: three newly-published advisories in five days is the base rate, not a
streak." It documents `undici` (08-04, PR #101), `js-yaml` (08-07, PR #114) and
`nanoid` (08-08), and states the mechanism precisely: *"The gate's only trigger is
a PR, so each time, the queue went red and the reason was invisible until somebody
happened to run the command by hand. All three times, somebody did — which is luck,
not a control."*

I verified the trigger is still PR-only. `.github/workflows/ci.yml` fires on
`pull_request` (branches: main) and `workflow_dispatch`. There is no `push` trigger
and no `schedule:`/`cron:` anywhere in either workflow.

`browserslist` is the fourth occurrence, and the first where the luck ran out.
Prior rounds cost hours because someone ran the command; this one cost six days of
publishing because nobody did. The item's proposed scope is still the right one and
still small: a `schedule:` cron running `npm ci && npm run audit` against `main`,
opening or updating a single issue on failure. Explicitly not an auto-bumping bot.

**This is the one thing on this report I would actually spend time on.** H1 buys
back the queue; H2 is why it emptied in the first place.

### H3 — mensApp: "secret" means "not painted on screen", not "confidential". **STANDING — verified not made worse this week.**

Anyone who can load the deployed URL, with no account, can read every unrevealed
surprise. `src/App.jsx:6040` (and the 30s poll at `:6140`) issue
`supabase.from("events").select("*")`, returning whole rows — `schedule` is JSONB
carrying each stop's `activity`, `location`, `note` and `secret`. `boot()` runs in a
`useEffect` before `currentUser` resolves. The same shape applies to secret quizzes
(`src/features/quiz/results.js:61-64`) and tournaments
(`src/features/mensgames/tournamentResults.js:86-89`), where the `.filter()` that
drops secrets runs on the client, **after** the round trip. Per
`docs/quiz-unification-spec.md:470-480` the policies are `for all to anon using
(true)`.

This is the owner-accepted trust model for a private friends' tool and I am not
relitigating it. It is here for two reasons. First, it is the ceiling on every other
secrecy control in the app — presentation mode's "🔒 The organisation is keeping this
one a surprise" slide is defeated by opening devtools on the same page. Second,
`9d6f4e9` this week corrected a comment that had claimed the *server* filtered
secrets, which is the right posture: document it honestly. A real fix needs a server
boundary (RLS returning a redacted `schedule`, or a `security definer` view). Anything
short of that is UI.

No new read path, table, column or broadcast field was added this week.

---

## MEDIUM

### M1 — mensApp: an editor's exported PNG contains every secret in full. Deliberate, tested — and the risk changed when it became a file. **NEW.**

`buildScheduleSummary` masks at the data layer, which is the right design:
`src/App.jsx:593` blanks `activity`/`location` to `""` rather than trusting a render
branch, and `note`/`image` are never emitted at all. But the mask is
`masked = secret && !isEditor` (`:592`), and the call site passes the live role:
`buildScheduleSummary(evt.schedule, evt.date, isScheduleEditor)` (`:2829`). For an
org user the rows render in full, and `summaryRef` (`:2840`) wraps exactly those rows
— so the captured node contains the real activity and location.

**This is not an oversight, and reporting it as one would be wrong.** There is a test
asserting it on purpose: `src/test/summaryImageShare.wiring.test.jsx:288-302`, *"an
editor's captured node DOES include the secret stop — same as the existing Stops view
already shows them."* The reasoning is sound as far as it goes.

What I think it misses is that the premise stopped holding this week. The Stops view
is a screen an organiser looks at; the export is a **file**, produced by a button
labelled `⬇ Download als afbeelding` on a card whose own subtitle is
"One overview, screenshot-ready" and whose implementation comment says it is built to
be "screenshotted into the group chat." The only thing distinguishing a secret row in
the exported image is a small 🔒 at the start of the line, which reads as decoration.
So the app now has exactly one path by which a surprise reaches the group chat, it is
one tap long, and it belongs to the person who created the surprises.

Cheapest correct fix: always capture the member view — render a hidden node built with
`buildScheduleSummary(..., false)` and point the capture at that. If the editor
genuinely needs their own copy, gate it behind a confirm naming the count.

Not a security hole (the holder of the device already knows the secrets — see H3).
A product-risk finding, and the one most likely to actually cost something at the next
event.

### M2 — SoulForce-V2: the build fix has been stranded on a local branch for seven weeks. **CARRIED, re-verified.**

Local `main` is `9facba8`, one commit ahead of `origin/main`, and does not compile.
The fix — `301bf1e` "Restore loadLocalStats so main builds again" — exists only on the
local branch `team/maintenance-2026-07-20`, which has no remote counterpart.

Re-verified this week rather than carried on trust: `npx tsc -b` on the branch holding
the fix exits **0**. The repair is finished and correct; it has simply never landed.
`origin/main` never received the breaking commit, so nothing public is broken — the
cost is that the working checkout of the studio's flagship game has been unbuildable
since 2026-07-20.

This needs a decision, not more verification: land `301bf1e` on `main`, or drop it.

---

## LOW

### L1 — mensApp: the false "server-side" claim was corrected in one file and survives verbatim in another.
`src/features/mensgames/RoundEditor.jsx:175-176` still reads *"`fetchQuizResults()`
filters those server-side before we ever see them."* That is the same claim, about the
same function, that `9d6f4e9` corrected in `src/features/mensgames/quizPicker.js:76-82`
— and that commit's stated reason for existing is that it is "exactly the kind of claim
a future reviewer would trust instead of re-checking." A reviewer landing in
`RoundEditor.jsx` first gets the wrong version. No runtime impact; a two-word edit.

### L2 — mensApp: the iOS download fallback is dead code on the platform it targets.
`src/App.jsx:2685-2687` guards with `"download" in document.createElement("a")`. That
tests whether the IDL property exists, and in iOS Safari it does — what iOS ignores is
the attribute's *effect* on a `blob:` URL. So `downloadSupported` is always `true`, the
`window.open` fallback never fires, and iOS users get precisely the silent dead button
the comment above it says is being prevented. The comment claims detection "by
capability, not by sniffing the user agent" — the intent is right, but a property-
existence check cannot detect a behavioural no-op.

**Both specialists found this independently**, from different angles (one auditing the
export path for egress, one auditing correctness), which is the strongest signal on
this report that it is real. Neither could confirm it on a physical device, and neither
needs to: the flaw is in the detection mechanism, readable from the source.

There is also **no test that forces the `!downloadSupported` branch** — it has never
executed, in production or in the suite. Fix the check and cover the branch together.
Not a security issue; flagged because an asserted protection that isn't there is the
same failure shape as L1.

### L3 — mensApp: "stop counting secrets" is scoped to the Summary card only.
The count is gone from the summary, but two member-visible counters remain:
`src/App.jsx:2248` (`🔒 +{hiddenCount} geheim`, EventCard) and `:2988-2992`
(`🔒 {hiddenCount} stop(s) nog geheim`, Overview → Stops). Given H3 this leaks nothing
that isn't already fully readable, so it is genuinely Low — noted because the commit
message reads as a global change and it isn't. Decide whether the count is wanted
("something is coming" is arguably good UX) and make it consistent either way.

### L4 — mensApp: one of the new tests re-implements the code it claims to test.
`src/test/presentationModeSummary.test.jsx:734-781` — the "direction 2" backwards-
compatibility test does not render `PresentationMode` and does not dispatch a real
broadcast. It defines its own local `resolvePayloadRealIdx(...)`, marked in the file as
*"Reproduced here, not imported"*, hand-computes the expected index, and asserts against
its own arithmetic. It would keep passing if the real `applySlide`/`resolveLiveIdx`
logic in `src/App.jsx` regressed for exactly the scenario it is named after.

The test's own comment concedes this — *"if you touch the real one in App.jsx, update
this copy or this test stops proving what it says it proves"* — which is honest, and
still leaves a green check standing in for a guarantee it does not provide. Its sibling
"direction 1" is the correct shape: it renders the real component and dispatches a real
broadcast. Make direction 2 match it.

Worth stating plainly: this was the one weak spot in ~1,400 lines of new tests, and it
was found by looking for it. The rest hold up — `updateEvent.writeFailure.test.js`
evaluates the real source rather than a copy, and the secret-masking tests assert on the
actual node handed to the capture library.

### L5 — mensApp: two coverage gaps worth knowing about, neither a bug today.
First, the `!downloadSupported` branch in L2 is untested (noted there). Second, there is
no test for **the presenter's own** schedule shrinking while parked on the summary
slide; only a *viewer's* schedule-shrink-while-pinned is covered
(`src/test/presentationModeRobustness.test.jsx:328`). Reading the effect ordering, there
is a plausible one-tick window where a presenter editing the schedule while on the
summary broadcasts a transient `isSummary:false` with a stale `idx`. **This could not be
reproduced** in the time available and is recorded as an architecturally plausible risk,
not a confirmed bug — deliberately not promoted above LOW on the strength of a
reading alone.

### L6 — mensApp: core dev tooling is several majors behind; the only vulns are dev-only.
`npm audit --omit=dev` → **0 vulnerabilities**. The full tree has 2 (1 moderate, 1 high),
both `vite` → `esbuild`, dev-server only, not shipped. Outdated: `vite` 5.4.21 → 8.2.2,
`vitest` 3.2.7 → 5.0.0, `eslint` 9.39.5 → 10.10.0, `react`/`react-dom` 18.3.1 → 19.2.8.
No action needed this week — but a 1085-test suite is exactly the asset that makes a
`vite`/`vitest` major upgrade cheap, and that leverage decays the longer it waits.

### L7 — studio-site: 10 stranded branches, unchanged from last week.
`check:stranded-branches` reports 10 against `origin/main` across 151 branches and 152
PRs. `check:backlog-checkoffs` reports the same 4 merged branches cited only inside
still-open multi-PR epics. Both are reporting checks, never auto-failed, unchanged in
count since 2026-08-31. Recorded for continuity only.

---

## Quiet repos — nothing to do

All clean working trees, no commits since the dates shown, no action:

- **Soulforge** (2026-07-16) · **Travel plan app** (2026-07-16) ·
  **chart-token-playground** (2026-07-16) · **claude-dev-company** (2026-07-16) ·
  **dominiquebrom-portfolio** (2026-07-18) · **lovetimeline-app** (2026-07-16) ·
  **pizzaparty-app** (2026-07-16) · **sollie-aem-prototype** (2026-07-16) ·
  **sollie-process-presentation** (2026-07-16) · **token-impact-mapper** (2026-07-16)

**SoulForce-V2** had no commits since the last sweep either — its entry under M2 is a
carried finding, not new work. Its only working-tree change is an uncommitted
`.claude/launch.json` (preview server config, +27 lines), left alone.

---

## The three things worth Dom's attention

1. **Merge this report's PR, then press "Update branch" on #147–#152.** That is six
   days of writing going live. The fix is verified; the six PRs will not go green by
   themselves, because each installs from its own lockfile.

2. **Schedule the audit gate** — `BACKLOG.md:2636`, open HIGH for a month. Four
   advisories have now turned the queue red without a single commit touching the repo,
   and this one ran unnoticed for six days. A `schedule:` cron running
   `npm ci && npm run audit` against `main` is the whole fix.

3. **Decide about the editor's PNG export before the next event** (M1). Either always
   export the member view, or put a confirm in front of it. It is currently one tap
   from an organiser's phone to the surprises being in the group chat.
