# Maintenance sweep — 2026-08-31

Baseline: `reports/maintenance-2026-08-24.md`. This report covers what changed
since then.

13 git repositories under `VibeCodeProjects/`. Since 2026-08-24 **two** have new
work: **mensApp** (28 commits, 86 files, +16,075/−3,326 — a second full feature
week) and **studio-site** (7 logbook posts and one test tweak, content only).
The other 11 are untouched since mid-July.

**Last sweep's headline finding is closed, and I want to state that plainly
before the bad news.** H1 was "mensApp CI has never passed; 640 local tests are
enforcing nothing." The one-line Node 24 pin landed on `main`, and CI has been
green since 2026-08-26 — I checked the run history, not just the config. The
test suite has since grown to **1041 tests across 99 files**, and those are now
actually enforcing something. Build, lint (zero problems) and CI are all green
on HEAD `25b019c`.

**And yet this is the least reassuring sweep I have filed for mensApp**, because
every gate being green is precisely the situation the week's worst finding
survives in. The quiz was rewired off 39 kB full-row event upserts onto
`quiz_live` / `quiz_answers` — the right fix, well engineered, and it does
structurally eliminate the lost-update race it was built to kill. But the
participant's answer write is fire-and-forget, and the poll designed to catch a
failed write **disarms itself the moment the write is fired**. A participant
whose answer never lands sees "✓ Answer locked in." That is H1 below, and it is
the same failure shape as the 2026-08-29 incident, moved to a new code path and
not re-tested there.

Two independent specialists reviewed the week — qa-tester on the 28 commits,
security-auditor on the new data layer. **I verified every load-bearing claim in
both reports myself against the working tree before including it**, because
several are strong claims and one of them I ended up narrowing (see M1). Where a
finding is carried from a prior sweep I re-checked it rather than copying it
forward.

**One fix was applied** — a comment-only correction in mensApp, on a local
`team/maintenance-*` branch, unpushed, per the sweep rules. Everything else found
this week is real work, not a trivial fix, and is filed as a finding. studio-site
needed no fix.

---

## Gate results

| Repo | Build | Tests | Lint | Audit (prod) | CI / deploy |
|---|---|---|---|---|---|
| mensApp | ✅ | ✅ 1041 / 99 files | ✅ 0 problems | ✅ 0 vulnerabilities | ✅ green since 08-26 |
| studio-site | ✅ | ✅ 607 / 27 files | ✅ 0 errors, 12 known warnings | ✅ audit-ci passes | ✅ 6/6 routes OK |

studio-site self-checks: `check:deps`, `check:clean-checkout`, `check:report-claims`,
`check:merge-revert` all OK. `check:backlog-checkoffs` reports 4 multi-PR epics
(expected, never auto-failed). `check:stranded-branches` reports 10 — see L4.

---

## HIGH

### H1 — mensApp: a participant's answer can silently never be saved, and the safety net switches itself off. **NEW.**

`src/features/quiz/QuizParticipantView.jsx:171-182`. `toggleAnswer` sets
`submitted = true`, renders "✓ Answer locked in — tap to change", and *then*
calls `upsertAnswer(...)` with no `await`, no `.then`, no error path. The
promise's result is discarded.

`upsertAnswer` (`src/features/quiz/answers.js:54-65`) does return
`{ok: false, error}` on failure — so the failure is fully detectable. Nothing
looks at it.

What turns this from "no error toast" into a data-loss finding is the recovery
mechanism. The 3-second self-check poll at
`src/features/quiz/QuizParticipantView.jsx:131-147` exists specifically to confirm
the row landed, and it stops on this line:

```js
if(submittedRef.current)return; // answered locally meanwhile -- stop polling
```

`submittedRef.current` is set by the local optimistic update. So the poll
disarms itself on the basis of a write it never confirmed.

Failure scenario, on the hardware and network this app is actually used on: a
participant on crowded venue wifi taps an answer. The upsert fails — timeout,
transient 5xx, or an RLS reject. The UI says locked in. The poll that would have
caught it stops. The presenter's aggregation never sees the row. Final scores
silently omit that person, with no signal to the participant, the presenter, or
any log anyone reads during a live event.

I confirmed the coverage gap rather than assuming it: `src/test/quiz/answers.test.js`
tests the `{ok:false}` contract in isolation, and the protocol test asserts the
*shape* of the write (exactly one upsert, nothing touching `events`). Nothing
mounts the component with a failing upsert and checks what the participant sees.
The property the sprint exists to guarantee is the one property not tested.

**Not fixed here.** The optimistic update needs to roll back or offer a retry on
`{ok:false}`, and the poll's stop condition must become "confirmed by server",
not "attempted locally" — plus the failure-path test that should accompany it.
That is real work on a live-write path. Finding, not fix.

### H2 — mensApp: three new tables hold the app's live state, and their RLS exists only as prose. **NEW.**

There is **no `supabase/` directory, no `migrations/` directory, and no `.sql`
file anywhere in the repository.** I verified this with a repo-wide find, not by
reading the docs. The only definition of the policies for `quizzes`, `quiz_live`
and `quiz_answers` is a fenced SQL block inside `docs/quiz-unification-spec.md`
(§10.1, lines ~468-484), applied by hand against the live project.

That block documents them as:

```sql
create policy "quiz_live anon full access" on public.quiz_live for all to anon using (true) with check (true);
```

Two separate problems, and the second is the worse one.

First, under the *documented* policy an anon key holder can read every
participant's answer before the reveal, overwrite any answer, rewrite the live
scoreboard, jump all phones to the final slide, or `DELETE` the session
mid-quiz. That is a deliberate accepted tradeoff for a PIN-less party app and is
consistent with the standing posture — it is not new authority.

Second, and this is the actual finding: **nobody can prove what the live policies
are.** They could match the doc, be more permissive, or have RLS disabled
entirely if a hand-run statement failed partway. Nothing in the repo or CI would
detect any of those states. A policy that exists only in prose cannot be
reviewed, diffed, regression-tested, or restored.

**Cheapest meaningful action:** run `select * from pg_policies where
schemaname='public'` against the project and commit the result plus the DDL into
version control. That single query converts this sweep's largest unknown into a
known.

### H3 — mensApp: "secret" tournaments and quizzes are hidden by client-side JavaScript only. **NEW. Comment fixed; feature not.**

Every secrecy check is a JS `.filter()` applied *after* the rows have already
been delivered to the browser — four independent sites, in
`src/features/quiz/results.js:64`, `src/features/mensgames/tournamentResults.js:89`,
`src/features/mensgames/MensGamesShell.jsx:202`, and
`src/features/mensgames/quizPicker.js:87`. `fetchQuizzes` in
`src/features/quiz/api.js:87-97` is `select('*')` with no secret filter at all.

Anyone with the public anon key runs one request against `/rest/v1/tournaments`
or `/rest/v1/quizzes` and reads every 🤫 Geheim record — name, entrants, rounds,
scores and the deferred winner — before the reveal. The feature is defeated by a
single `curl`.

Credit where due: the *deferral* logic that avoids writing awards early
(`finishQuiz.js:306-310`, `finishTournament.js:165`) is real and worth keeping.
The record itself is just readable the whole time.

**What I fixed:** a comment at `src/features/mensgames/quizPicker.js:71-73` stated
that `fetchQuizResults()` "filters secret quizzes server-side by design." It does
not — it filters client-side, two lines after a server-side status filter. The
comment's functional conclusion is correct, but it reads as a security control,
and it is the kind of sentence a future reviewer trusts instead of re-checking.
Comment-only, no behaviour attached, lint and the 320 mensgames tests green.

**What I did not fix:** real DB enforcement needs a server-side identity this app
does not have. The honest short-term action is to relabel the feature as
"hidden" rather than "secret" in UI and docs, so it stops promising something it
cannot keep.

### H4 — mensApp: Presentation Mode still full-row-upserts the whole event. **CARRIED from 2026-08-24, unchanged, re-verified.**

Last sweep's H2. Still live, now at `src/App.jsx:3765-3766` — an automatic
`useEffect` backfills schedule-stop ids and calls `onUpdate({...evt, schedule: withIds})`,
which lands in a blind full-row `supabase.from("events").upsert([updated])` at
`src/App.jsx:5810` off whatever snapshot the component rendered with.

Unchanged reasoning from last sweep, which still holds: the same author solved
this exact problem one commit earlier in `finishTournament.js` with a
fresh-read-then-merge guard, and that guard was never applied here. Its own
comment names the hazard — a concurrent write to any other field on the event
row being silently discarded.

Two weeks carried. Given H1 sits in the same live-event window, these two should
be fixed in one pass by whoever picks up the quiz reliability work.

---

## MEDIUM

### M1 — mensApp: participants download the correct answers to every question.

`src/features/quiz/QuizParticipantView.jsx:117` calls `fetchQuiz`, which is
`select('*')` on `quizzes`, and `normalizeQuiz` (`src/features/quiz/model.js:70-71`)
preserves `answer` and `openAnswer`. So every participant device holds the
correct answer to all questions before question 1 is shown. Open the network
tab, win the quiz.

**I narrowed this one from how it was reported to me.** security-auditor called
it a false claim in the spec. It is not, quite: the spec's §4.2 sentence about
"open devtools, win the quiz" refers specifically to `_liveState.answers`
shipping *peer* answers to every phone, and that leak genuinely **is** closed by
this rewrite — participants deliberately never subscribe to `quiz_answers`. The
correct-answers leak is a separate, larger, and entirely pre-existing one that
the spec does not mention in either direction. Not a regression; not recorded
anywhere either.

Fix, if wanted: a `quizzes_participant_view` projecting `rounds` through `jsonb`
minus those keys, granted to `anon`. Otherwise document it as knowingly open.

### M2 — mensApp: a URL guard the spec committed to was never implemented, and §12 says it was.

`docs/quiz-unification-spec.md:590` records, as a shipped requirement, that
`round.bgImage`, `question.image` and `pauseConfig.image` are user-typed URLs
rendered into `<img src>` with no validation, and must be wrapped in
`isSafeImageUrl` during the move. A repo-wide grep finds **zero** references to
`isSafeImageUrl` under `src/features/quiz/` — the helper is only wired into the
App.jsx schedule/poll/trailer paths. The raw values render at five sites in
`QuizPresenter.jsx` and `QuizParticipantView.jsx`.

Impact is bounded and I want to be accurate about it: this is a **beacon, not
code execution**. CSS `url()` set via React's style property cannot break out,
and `javascript:` in `<img src>` does not execute in modern browsers. What an
attacker gets is every participant's IP, User-Agent and precise timing when the
quiz is presented.

The reason it is MEDIUM rather than LOW is the second half: the §12 table marks
this category **"ADDRESSED + one gap closed"** while the gap is open. A spec that
records unfixed issues as fixed is a liability of its own.

### M3 — mensApp: `quiz_live` load-vs-realtime race can show a stale slide.

`src/features/quiz/QuizParticipantView.jsx:85-99`. The `cancelled` flag guards
unmount but not out-of-order resolution. A slow initial `load()` can resolve
*after* a realtime UPDATE for the next slide has already been applied,
overwriting it with the older row. Self-heals on the next 5s poll, so this is a
transient flicker rather than data loss — but it is a stale-read race in the
exact protocol this sprint rewired for reliability, and nothing tests a slow
fetch racing a realtime event.

### M4 — mensApp: the presenter's broadcast writes are equally fire-and-forget.

`src/features/quiz/QuizPresenter.jsx:89-126` — roughly 15 call sites of
`upsertQuizLive` / `deleteQuizLive` / `deleteAnswersForQuiz` with no `await` or
error handling. If a phase-advance write fails mid-quiz, the presenter's screen
moves on while every participant device stays frozen, and nothing tells the
presenter. `liveError` is only set on a failed *read*, never on a stale row.

Fair caveat: this matches a deliberate, documented app-wide "local state is
truth, remote is best-effort" posture, so it is not a regression from this week.
But it sits in the reliability-critical path this rewrite exists to harden, and
from the front of the room it would look exactly like the original outage.

### M5 — mensApp: `answer_key` is client-supplied, so the captain gate is cosmetic.

`src/features/quiz/QuizParticipantView.jsx:77-82`. The row's identity is computed
in the browser from local state and sent as an ordinary column; `canAnswer` only
decides whether buttons render. A non-captain — or someone on another team, or
not in the quiz at all — can call `upsertAnswer` from the console with any
`answer_key` and **overwrite** that team's answer, because the composite PK is
`(quiz_id, round_idx, q_idx, answer_key)`. The victim's UI keeps showing
`submitted` from local state and only re-polls while unsubmitted, so the swap is
invisible.

Genuine improvement worth crediting: the blast radius of a malicious write is now
one ~150-byte row instead of the entire 39 kB event object.

Unenforceable without server-side identity. The realistic mitigation is to make
the presenter authoritative — it already aggregates every row, so it could reject
an `answer_key` absent from its own team snapshot.

### M6 — mensApp: dev-toolchain vulnerabilities and a three-major Vite gap. **CARRIED, unchanged.**

`npm audit` reports 2 vulnerabilities (1 moderate, 1 high), both from
`esbuild <=0.24.2` reachable through `vite 5.4.21`. **Production dependencies are
clean — `npm audit --omit=dev` finds 0.** The CI audit gate is correctly scoped to
prod high/critical and passes honestly.

Vite is 3 majors behind (5.4.21 → 8.2.2); `npm audit fix --force` would jump
straight there. Also outdated: `@supabase/supabase-js` 2.105.1 → 2.112.4 (a safe
minor), vitest 3 → 4, React 18 → 19, ESLint 9 → 10. None urgent; the Vite gap
grows more expensive each week it is left.

### M7 — mensApp: no security headers on a live public site. **CARRIED, unchanged.**

`vercel.json` contains only the SPA rewrite — no `headers` block. Missing CSP,
`X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`.
HSTS is present, but that is Vercel's default, not a project choice. A restrictive
`img-src` would also have blunted M2.

### M8 — SoulForce-V2: local `main` still does not build, seventh sweep running, and the fix is still written and still stranded. **CARRIED.**

Local `main` is missing `loadLocalStats`, which is imported elsewhere, so
`tsc -b` fails. The 14-line fix has existed on a local branch since 2026-07-20 —
**42 days**. I verified today that `tsc -b` passes on that branch and that the
only difference is those 14 lines in `src/lib/profile.ts`.

`origin` is unaffected; the broken commit is local and unpushed. This blocks
nobody but Dom, and it costs a merge. It has now been carried longer than any
other finding in this report's history, which is itself the finding.

### M9 — studio-site: the react-router 8.x migration. **CARRIED, unchanged.**

`audit-ci` passes but explicitly reports `GHSA-qwww-vcr4-c8h2` as an allowlisted
vulnerable advisory. Installed `react-router-dom` is 7.18.2; the 7.x line is
still inside the vulnerable range, and only 8.x clears it. The allowlist entry is
an honestly-labelled deferral with a costed migration behind it — as re-verified
last sweep — so what remains is the unstarted migration itself, not a
documentation problem.

---

## LOW

- **mensApp: unsequenced rapid answer changes.** Two quick taps fire two
  independent upserts at the same PK with no debounce or sequencing; out-of-order
  delivery could persist the earlier tap. Low likelihood, easy fix, not urgent.
- **mensApp: `quiz_live` global feed allows anonymous enumeration.**
  `subscribeLiveQuizFeed` subscribes with no filter, so any anon client learns
  whenever any quiz anywhere goes live. Intentional (it powers the discovery
  banner) and low-sensitivity, but a genuinely new read surface.
- **mensApp: no `.env.example`.** `.env.local` is correctly gitignored and holds
  only the URL and a correctly-scoped anon JWT. On a public repo, a committed
  example file would document the required variables and give an obvious place to
  write "never put a service-role key here."
- **studio-site: 10 stranded branches**, up from the same chronic set — 3 with no
  PR ever opened, 7 whose PR does not cover the current tip, the oldest 47 days
  old. This is a reporting check, not a merge gate, and most are single-file
  backlog/report leftovers.
- **mensApp: the merged `team/maintenance-2026-08-24` branch can be deleted** —
  its content is on `main` and the diff is empty. Left in place; deleting
  branches is not a sweep action.
- **SoulForce-V2: uncommitted `.claude/launch.json`** adding local preview server
  entries. Harmless local tooling config, no action needed.

---

## Checked and explicitly clear

Recording these so they are not re-audited next week:

- **No secrets reach the client bundle.** No service-role key anywhere; a repo-wide
  grep returns nothing outside the gitignored `.env.local`. `vite.config.js` has
  no `define` and no `build.sourcemap`, so no source maps ship. *Caveat: whether a
  secret was ever committed historically was not verified — one `gitleaks` pass on
  a public repo would close that.*
- **`renderMd` is not XSS.** Checked properly rather than pattern-matching on
  `dangerouslySetInnerHTML`: it escapes `&`, `<`, `>` in the correct order before
  any markup substitution, and user content only ever lands in element text, never
  an attribute. All three sinks are safe.
- **Legacy quiz team import and event-linking are sound.** The guard that matters —
  an already-run quiz gets `teamSetId` only, with `teams` passed through
  unchanged — is real and correctly gated in both code paths. The one residual
  risk (a stale duplicate if cleanup fails after a verified write) is honestly
  flagged in-code and surfaces a visible error banner.
- **Awards and trophy-room scoring are clean.** Every reducer is defensive against
  malformed and empty input, filters rather than throws, and no input was found
  that produces a wrong winner or a crash.
- **Nothing was silently dropped by a merge.** No merge commits in the range, no
  conflict markers, no duplicate definitions.
- **Both test-weakening commits are legitimate.** `e764f99` re-orders which
  assertion sits inside `waitFor` without removing either — strictly more correct
  under Suspense timing. `25b019c` switches from counting all Supabase calls to
  filtering to writes, but *adds* a stricter whole-lifecycle assertion that no
  write reached any table other than `quiz_answers`. Net stricter on the dimension
  the acceptance criterion is about. Neither hides a defect.
- **studio-site's week is content-only** — 7 logbook posts plus one test tweak, 506
  insertions, no source changes. Nothing to review.
- **mensApp CI is genuinely well-built**: `permissions: contents: read`, no repo
  secrets, documented fork-PR safety, and a real prod-scoped audit gate.

---

## Quiet repos — nothing to do

No commits since mid-July, clean working trees, no action:
Soulforge · Travel plan app · chart-token-playground · claude-dev-company ·
dominiquebrom-portfolio · lovetimeline-app · pizzaparty-app ·
sollie-aem-prototype · sollie-process-presentation · token-impact-mapper.

SoulForce-V2 has no new commits either, but is not "quiet" — see M8.

---

## The three most important actions for Dom

1. **Fix H1 before the next time this quiz is run in front of people.** A
   participant's answer can silently fail to save while the UI tells them it
   landed, and the poll built to catch that turns itself off. Every gate is green
   because no test exercises a failing write against the mounted component. This
   is the same failure shape as the 2026-08-29 incident in a new code path — and
   H4, still carried from two weeks ago, sits in the same live-event window. Fix
   them in one pass.

2. **Run one SQL query and commit the answer.** `select * from pg_policies where
   schemaname='public'` — then check the DDL into version control. Three tables
   holding the app's live state currently have RLS that exists only as prose in a
   markdown file, applied by hand. Nobody, including you, can prove what the live
   policies actually are, and nothing would detect it if a statement had failed
   partway. This is the cheapest large risk reduction available this week.

3. **Spend two minutes closing the 42-day-old SoulForce-V2 build break.** The fix
   is 14 lines, already written, already verified green on its branch, and has now
   been carried through seven consecutive sweeps. It blocks only you, and it costs
   one merge. Either land it or delete it and re-decide — but it should not appear
   in an eighth report.

One honest caveat on all three: findings H2/H3/M1/M2 are all downstream of the
same root cause, which is worth naming separately. `docs/quiz-unification-spec.md`
is a genuinely good document, and the engineering under it is thoughtful and
unusually well-commented — but its §12 security table now records as fixed at
least one thing that is not, and a spec that is trusted instead of re-checked is
how a known-open issue becomes an invisible one.
