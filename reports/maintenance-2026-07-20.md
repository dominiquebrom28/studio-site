# Maintenance sweep — 2026-07-20

First sweep; no prior `maintenance-*.md` exists, so the baseline is the 2026-07-16
bulk "preserve project as-is" archival commits rather than a previous report.

13 git repositories discovered under `VibeCodeProjects/` (the task file listed 7 —
`Soulforge`, `Travel plan app`, `claude-dev-company`, `sollie-aem-prototype`,
`sollie-process-presentation`, and `token-impact-mapper` were not in that list).

**One fix applied** (SoulForce-V2 broken build), on a local branch, unpushed.
Everything else is a finding.

---

## Findings by severity

### HIGH — SoulForce-V2: `main` did not build *(fixed)*

`main` has been unbuildable since 9facba8 (2026-07-16, four days). The progression
commit wired `loadLocalStats` into the store and added the `Stats` import to
`profile.ts`, but never landed the function itself:

```
src/lib/profile.ts(3,1): error TS6133: 'Stats' is declared but its value is never read.
src/store/useGame.ts(4,30): error TS2305: Module '"../lib/profile"' has no exported member 'loadLocalStats'.
```

Both errors are the same missing function. This repo has no CI, which is why four
days passed without anyone noticing.

Fixed on `team/maintenance-2026-07-20` (commit 301bf1e, **local only, not pushed**)
by adding the reader mirroring `loadLocalCharacter`. `npm run build` now passes.
Nothing writes the key yet, so it returns `null` and the store still falls back to
`SEED_STATS` — **runtime behaviour today is unchanged**; only the build is repaired.

### HIGH — SoulForce-V2: do not run the `profiles` SQL as written before going public

`src/lib/profile.ts:57-64` carries a commented-out setup block instructing that
this be run in the Supabase SQL editor:

```sql
create policy "anon all" on public.profiles
  for all to anon using (true) with check (true);
```

`for all to anon using (true) with check (true)` grants SELECT/INSERT/UPDATE/DELETE
to the public role with no row predicate. If run and shipped, anyone with the anon
key (correctly public in the bundle) can dump every row, overwrite any player's
save, or `DELETE ?id=neq.<uuid>` the entire table in one request. Enabling RLS in
this form is **not materially different from leaving RLS off** — `anon` is the only
role the client uses.

The root cause is not the policy: identity is a client-generated
`crypto.randomUUID()` in localStorage (`profile.ts:12-16`) sent as ordinary request
data, so `auth.uid()` is null and *no* policy is enforceable against this model.

**Nothing is exposed today** — the SQL has not been run, the table does not exist,
and the fallback to localStorage works. This is a pre-publish gate, not an open
incident. Severity is HIGH rather than critical because the payload is cosmetic
(name, hair, eyes, weapon) with no PII, no auth, no payments.

Two acceptable resolutions:
- **Leave the table uncreated** (localStorage-only). Zero cloud surface. Defensible
  for pre-alpha, and requires no work.
- **Anonymous sign-in** (`supabase.auth.signInAnonymously()`), making `getOwnerId()`
  the session user id, then scope every policy to `auth.uid() = id`, `revoke all
  ... from anon`, no delete policy, and a `pg_column_size(character) < 4096` check.
  Enable captcha on anonymous sign-in, or the sign-in endpoint becomes the abuse
  vector.

The in-code comment says to tighten "when real accounts land" — the correct trigger
is when the *site* goes public, not when accounts do.

### MEDIUM — studio-site: MensApp phase captions still overlap on desktop

Known and deliberately deferred in 70a205e's commit message ("escalated, needs a
design decision not a padding tweak"), but **not tracked in `BACKLOG.md`** — it
exists only in a commit message and will be lost.

Verified independently: `content/projects/mensapp.md` has 5 phases dated 04-29,
04-30, 05-02, 05-04, 07-16. `BuildTimeline.tsx:293` assigns caption sides by
`index % 2 === 0` with no collision avoidance, so phases 0 and 2 (04-29 and 05-02,
3 days apart across a ~78-day domain) both render "above" at nearly the same
horizontal position in 224px boxes. A desktop visitor to the MensApp project page
sees two overlapping captions.

This is the fourth distinct overlap bug in this component. The lane-packing
approach was already proven unfixable and removed; parity assignment inherits the
same flaw for clustered dates.

### MEDIUM — mensdag-app: ~27 MB of images committed into `src/`, imported by the bundler

`src/SaraJay/` is 27 MB — nine PNGs over 2 MB each (one 2.7 MB), referenced 18
times from `App.jsx`, so Vite processes and emits them. The repo's `.git` is 29 MB,
essentially all of it these assets. On a deployed site this is multi-megabyte
image payload per visitor, mostly ChatGPT-generated PNGs that should be resized
and converted to WebP/AVIF (or moved to `public/` and served unprocessed).

The history rewrite needed to shrink `.git` is destructive — not recommended
without a specific reason. Fixing the *shipped* weight does not require it.

### MEDIUM — lovetimeline-app: Next.js has two high-severity advisories

`npm audit`: 5 vulnerabilities (1 low, 3 moderate, 1 high). The high is `next`
itself (9.3.4-canary.0 – 16.3.0-canary.5): a Server Components DoS
(GHSA-8h8q-6873-q5fj) and a middleware/proxy bypass in App Router
(GHSA-26hh-7cqf-hhc6). This is a production framework dependency, not dev tooling.
Worth a deliberate `next` upgrade rather than `npm audit fix --force`, which may
jump majors.

### LOW — studio-site: content loader fails the whole site on one bad file

`src/content/loader.ts:50-61` — `buildCollection` throws at module-eval time on any
single malformed frontmatter (bad date, duplicate slug, `brief.bullets` under 2
items). Because the loader is imported transitively by the router and every page,
one bad content file blanks the entire site, not just that route.

This is a deliberate fail-loud choice and is guarded by the content-validation CI
gate, so it is not a bug. Naming it as a standing single point of failure: any
content-only change that bypasses the gate can whitewash the site.

### LOW — mensdag-app: `ws` high-severity advisories in the production tree

`npm audit`: 4 vulnerabilities (1 low, 1 moderate, 2 high). The highs are `ws@8.20.0`
(uninitialized memory disclosure, memory-exhaustion DoS) reached via
`@supabase/supabase-js → realtime-js → ws` — a **production** dependency chain, not
dev-only. In a browser build `realtime-js` uses the native WebSocket and the `ws`
fallback is not typically executed, which is why this is LOW rather than higher.
`npm audit fix` reports a non-breaking fix available.

### LOW — mensdag-app: `App.jsx` is 6,180 lines

Single-file app, +1,178 lines in the last commit. Not a defect; flagged because it
is now past the point where review or safe change is realistic without splitting.

---

## Per-repo results

| Repo | Build | Tests | `npm audit` | Verdict |
|---|---|---|---|---|
| studio-site | pass | 1 failed / 217 (see below) | 0 vulns | CI green, active |
| SoulForce-V2 | **was broken → fixed** | none | 0 vulns | see HIGH ×2 |
| dominiquebrom-portfolio | pass | none | 0 vulns | healthy |
| lovetimeline-app | blocked (local) | none | 5 (1 high) | see MEDIUM |
| mensdag-app | blocked (local) | none | 4 (2 high) | see MEDIUM/LOW |

### studio-site

Build passes, `npm audit` clean, CI green on every recent PR run. **Live concurrent
work in progress** — the working tree is on `team/2026-07-20-land-orphan-post` with
uncommitted changes, and a second worktree holds `team/2026-07-20-fix-post-count`.
This sweep did not touch that tree; the report was committed from a separate
worktree instead.

Two things this sweep found are **already being fixed by that concurrent session**:

- `content/posts/2026-07-19-three-tries-at-the-same-overlap.md` is complete,
  `draft: false`, and uncommitted — a finished logbook entry that never landed.
- `src/content/index.test.ts:47` hardcodes `expect(posts.length).toBe(5)`, so
  publishing that post turns the suite red. This is the sole test failure
  (1 failed / 216 passed). The in-progress fix replaces the count with a named
  `LEGACY_POSTS` list — the right call, since the assertion never matched its
  stated backward-compatibility intent.

The commit series 0bb0aad→47ef724 reviewed clean otherwise. Notably the team caught
its own P0 (opacity-hidden entrances that could leave content permanently invisible)
and added a regression test pinning the resting state. Motion work correctly
separates always-legible content from `aria-hidden` decorative layers, and
reduced-motion skips the accent layer rather than freezing it invisible.

`npm outdated`: nothing urgent. Several majors available (vite 7→8, vitest 3→4,
eslint 9→10, typescript 5.7→7, js-yaml 4→5), all dev tooling, all deliberate
upgrades rather than maintenance chores.

### dominiquebrom-portfolio

Build passes clean (474 modules, 1.05s). `npm audit` clean. Only stale dev deps
(vite 6→8, typescript 5.8→7, plugin-react 4→6). Nothing to do.

The side-scroller commit (2354445) was flagged for a game-loop leak review; the
build and audit are clean and no leak was confirmed in this pass. Not a claim that
it is clean — it was not exhaustively reviewed. Worth a dedicated pass if that
concept ships.

### lovetimeline-app / mensdag-app — builds blocked by a local `node_modules` defect

Neither builds locally, but **not because of their code**:

```
sh: .../node_modules/.bin/next: Permission denied
sh: .../node_modules/.bin/vite: Permission denied
```

Both `.bin` entries are regular files with mode `0666` and no exec bit, where a
healthy install has symlinks (`lrwxr-xr-x`). Their `node_modules` were copied or
restored without preserving symlinks and permissions — most likely collateral from
the 2026-07-16 archival. A plain `npm install` in each repo restores them; this
sweep installs nothing, so both builds are **unverified**, not failing.

The reviewed commits themselves are fine:
- lovetimeline `d1dcf66` — adds `deleteMoment` with an immutable filter, no
  persisted-shape change. State is zustand `persist` → localStorage, with a `merge`
  handling image migration. **User data is local-only**: relationship moments and
  photos in the browser, nothing transmitted to a server. No security review needed.
- mensdag `e9635b0` — `vercel.json` uses the standard SPA rewrite
  (`/(.*)` → `/index.html`). This is correct: Vercel matches static files before
  rewrites, so assets and deep-route refreshes both work.

### Quiet repos — nothing to do

No changes since the 2026-07-16 archival baseline; each has exactly one
"preserve project as-is" or initial commit and a clean working tree.

- **Soulforge** — superseded by SoulForce-V2; the memory index notes slice 1 lives
  in `reference/` awaiting a port.
- **Travel plan app** — quiet.
- **chart-token-playground** — quiet.
- **claude-dev-company** — quiet, no `node_modules`.
- **pizzaparty-app** — quiet; last change was a `.gitignore` addition.
- **sollie-aem-prototype** — quiet, no `node_modules`.
- **sollie-process-presentation** — quiet.
- **token-impact-mapper** — quiet.

---

## The 3 most important actions for Dom

1. **Decide the SoulForce-V2 Supabase persistence model before any public URL.**
   Either leave the `profiles` table uncreated (localStorage-only, zero work) or
   move to anonymous sign-in with `auth.uid()`-scoped policies. Do not run the
   `"anon all"` SQL sitting in `profile.ts` — and delete that block once decided,
   so it cannot be pasted later by mistake. Nothing is exposed today; this stays
   cheap only as long as it is settled before launch.

2. **Land the orphan studio-site post and the post-count test fix.** Both are
   already in flight in a concurrent session — they just need to be committed and
   merged. A finished logbook entry sitting uncommitted on a site whose entire
   premise is public build transparency is the highest-value thing here.

3. **Put the MensApp caption overlap in `BACKLOG.md`.** It is real, user-visible on
   desktop, and currently recorded only in a commit message. It needs a design
   decision (collision-aware placement, or captions out of the alternating layout
   entirely) rather than another positioning attempt — three have failed.

Also worth a few minutes when convenient: `npm install` in lovetimeline-app and
mensdag-app to repair the broken `node_modules` permissions, which would let the
next sweep actually verify those two builds.

---

### Sweep notes

- **Fixes applied:** one, SoulForce-V2 `team/maintenance-2026-07-20` (301bf1e),
  local and unpushed. No other repo was modified.
- **Coverage gap:** lovetimeline-app and mensdag-app builds are unverified (local
  `node_modules` defect above, and this sweep installs nothing).
- The safety classifier backing tool execution was intermittently unavailable
  throughout this run. Every result above was obtained by retry, not skipped — but
  the studio-site commit review ran while it was down, so its two findings were
  re-verified by hand against `mensapp.md` and `BuildTimeline.tsx:293` before being
  reported here.
