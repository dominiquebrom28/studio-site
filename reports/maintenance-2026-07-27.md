# Maintenance sweep — 2026-07-27

Baseline: the previous sweep, `reports/maintenance-2026-07-20.md`. This report
covers only what changed since then.

13 git repositories under `VibeCodeProjects/`. Since 2026-07-20 only **two** have
new work: **studio-site** (36 commits, very active) and **SoulForce-V2** (no new
work — its one "new" commit is last week's own unmerged build fix). The other 11
are unchanged since before the baseline; each is a one-line "nothing to do" below.

**No fixes were applied this week.** Everything actionable is either already fixed
and awaiting a merge decision (SoulForce build; studio-site CI gate) or a
dependency-upgrade judgement call — none met the "trivial, obviously-safe" bar.

---

## Findings by severity

### HIGH — studio-site: CI is red repo-wide; the fix is written, green, and unmerged (PR #56)

**Every open studio-site PR is currently failing CI**, and it is not their fault.
On ~2026-07-24 two advisories were freshly published against already-installed
deps, and the CI gate `npm audit --audit-level=high` (`.github/workflows/ci.yml:52`)
started failing repo-wide. Reproduced locally on `main` (be40ff1): the command
exits `1`.

- **react-router 7.18.1** — GHSA-qwww-vcr4-c8h2, "RSC Mode CSRF Bypass." **Not
  exploitable here**: studio-site is a client-only Vite SPA with no RSC/server
  routers. 7.18.1 is both installed *and* latest and sits inside the vulnerable
  range — the only audit-clean move is a *downgrade* to 7.11.0.
- **brace-expansion** — GHSA-mh99-v99m-4gvg, DoS. Transitive (eslint / ts-eslint),
  genuinely patchable.

The team **already handled this correctly** on 2026-07-25: branch
`team/2026-07-25-dep-audit-fix` → **PR #56** patches brace-expansion via `overrides`
and replaces the blunt `npm audit` with `audit-ci` + an allowlist for the
non-applicable react-router advisory. That branch **passed CI** (run of 2026-07-25
01:17 = success) and the PR is **MERGEABLE**.

**But PR #56 was never merged.** So `main` still carries the blunt gate, and the
three PRs opened on 2026-07-27 (#57 callout-contrast a11y fix, #58 provenance
backfill, #59 backlog/report) plus #55 (07-24 logbook) all fail CI on the exact
same step — verified: the only failing step in each run is
`Audit dependencies (fail on high/critical)`, nothing else is broken.

The whole pipeline is jammed one merge away from green. This is the single
highest-value action in this sweep.

### HIGH — SoulForce-V2: `main` still does not build — last week's fix is still unmerged (a full week)

Unchanged since the 2026-07-20 sweep. `main` is still `9facba8`; the one-line fix
that repairs the `loadLocalStats` build break (`301bf1e`) still lives **only** on
`team/maintenance-2026-07-20` and has not been merged (`git merge-base
--is-ancestor 301bf1e main` → NO). The fix branch builds clean (verified:
`npm run build` passes, 76 modules). No new SoulForce work happened this week, so
nothing regressed — but the repo has now shipped an unbuildable `main` for eleven
days. It has no CI, which is why nothing forces the issue.

Not re-fixed (the fix already exists); the action is to merge it.

### HIGH (pre-publish gate, unchanged) — SoulForce-V2: the `profiles` "anon all" SQL

Carried forward verbatim from 2026-07-20 — no code changed, so the finding stands
exactly as written. `src/lib/profile.ts` still contains the commented
`create policy "anon all" ... for all to anon using (true) with check (true)` block.
Nothing is exposed today (table not created, localStorage fallback in use); this is
a gate to settle **before any public URL**, not an open incident. See last week's
report for the two acceptable resolutions (leave the table uncreated, or anonymous
sign-in scoped to `auth.uid()`). Delete the SQL block once decided.

### LOW ×3 — studio-site provenance engine: three untested edge cases (none blocking, one timely)

qa-tester reviewed the new provenance engine (`generate.mjs`, `parse.mjs`, schema,
loader join, `ProvenanceStrip`) against `docs/provenance-model.md` and returned a
**PASS**. The generator's "0 records" on a clean run is **confirmed expected and
tested** (no `yaml provenance` fences exist in `reports/*.md` yet; the empty-path
fast-return is deliberate and covered) — not a silent failure. Three real-but-LOW
edge cases are worth a regression test each:

1. **Rename resolution has no `-M`/`--follow`** (`generate.mjs:97`). `git log
   --diff-filter=A -- <path>` reports a later `git mv` as the "adding" commit, so a
   file authored, committed, then renamed with unchanged content resolves to the
   *rename* commit's hash/date, not its true creation commit — silently. Doesn't
   misfire on today's history, but **PR #58 (`provenance-backfill`) is in flight and
   backfills real records** — worth a deliberate decision or doc callout before it
   touches any renamed content file. This is the one to look at first.
2. **Token rounding shows `~0k tokens`** for any self-reported cost under 500
   (`ProvenanceStrip.tsx:79`) — reads as "cost nothing," the opposite of the
   field's honest-disclosure purpose. Schema allows it; boundary untested.
3. **Case-mismatch join drops a record silently on macOS** (`existsSync`/`git
   core.ignorecase` accept wrong-case `produced` paths; the loader's exact-case join
   then misses and falls back to the "no record" state). Self-corrects into a loud
   failure on Linux CI, so it can only bite a report author locally. Untested.


### LOW — SoulForce-V2: postcss high advisory (build-time only)

New this week in `npm audit`: 2 high, both `postcss` GHSA-r28c-9q8g-f849 (path
traversal in source-map auto-loading). Reached **only** via `vite` (build tooling),
not shipped to the browser at runtime, and only relevant when processing untrusted
CSS at build time — which this repo does not. `npm audit fix` reports a
non-breaking fix. Low priority; fold into the next dependency pass.

---

## Per-repo results

| Repo | Build | Tests | `npm audit` | Verdict |
|---|---|---|---|---|
| studio-site | pass (local) | **341 passed / 16 files** | 7 high (react-router SPA-N/A + brace-expansion) | **CI red — PR #56 unmerged** |
| SoulForce-V2 | fix branch passes; **`main` broken** | none | 2 high (postcss, build-time) | HIGH ×3, all carried/known |
| 11 other repos | — | — | — | unchanged since baseline |

### studio-site

Genuinely healthy *code*: build passes locally, the test suite grew from 217 to
**341 tests, all green**, in one week. The security-relevant new surfaces this week
were reviewed and came back clean:

- **Security headers** (`vercel.json`, spec §46): strong hash-based CSP (no
  `script-src 'unsafe-inline'`), HSTS, `X-Frame-Options: DENY`,
  `frame-ancestors 'none'`, sane `Permissions-Policy`. Well done.
- **MCP permission allowlist** (`.claude/settings.json`): genuinely read-only
  (`notion-query-data-sources`, `notion-fetch`, `list_pull_requests`) — no write
  ops. No concern.
- **Provenance engine + Vercel full-clone build** (security-auditor pass): no
  command injection (`execFileSync` with arg arrays, no shell), no path traversal
  (`assertSafeRepoRelativePath` before any fs/git call), no stored-XSS (React
  auto-escapes; git author strings never enter records — only `%H`/`%cI` are
  pulled; names cross-checked against the cast roster). The `git fetch --unshallow`
  build command is a fixed literal with no content-derived args. Two informational
  notes only: `produced` symlinks are followed by `existsSync/statSync` (integrity,
  not exploit) and `commit.date` is unconstrained-but-unrendered.

`npm outdated`: only the deliberate majors remain (vite 7→8, vitest 3→4, typescript
5.7→7, plugin-react 5→6) plus routine patch bumps (react 19.2.7→.8). Nothing urgent.

Note on process: a concurrent studio-site session was flipping branches in and out
of the shared working tree during this sweep (observed via reflog). No data was
lost; this report was committed from an isolated branch to avoid the collision.

### SoulForce-V2

No new commits since the baseline. State is exactly the 2026-07-20 picture: fix
branch builds, `main` does not, `profiles` SQL gate outstanding, plus the new
build-time postcss advisory (LOW above). See the three HIGH findings.

### Quiet repos — nothing to do

No commits since before the 2026-07-20 baseline; working trees clean.

- **Soulforge** — superseded by SoulForce-V2 (slice-1 archive).
- **Travel plan app** — quiet.
- **chart-token-playground** — quiet.
- **claude-dev-company** — quiet.
- **dominiquebrom-portfolio** — quiet (last commit 2026-07-18, pre-baseline;
  clean build confirmed last sweep).
- **lovetimeline-app** — quiet. (Local `node_modules` exec-bit defect from last
  sweep still unrepaired; a plain `npm install` fixes it. Next-sweep build still
  unverifiable until then.)
- **mensdag-app** — quiet. (Same `node_modules` defect; the 27 MB committed-image
  and `ws` advisory findings from last week stand, unchanged.)
- **pizzaparty-app** — quiet.
- **sollie-aem-prototype** — quiet.
- **sollie-process-presentation** — quiet.
- **token-impact-mapper** — quiet.

---

## The 3 most important actions for Dom

1. **Merge studio-site PR #56 (`team/2026-07-25-dep-audit-fix`).** It is green,
   mergeable, and unblocks the entire repo — four PRs (#55, #57, #58, #59) are
   failing CI on nothing but the audit gate this fix replaces. After it lands, the
   others need a trivial merge-from-main to pick up the new gate. This is the
   highest-leverage single action available anywhere in the studio this week.

2. **Merge the SoulForce-V2 build fix (`301bf1e`) into `main`.** `main` has not
   built for eleven days; the one-line fix is written and verified, just unmerged.
   Then consider the smallest possible CI (even a bare `tsc -b` on push) so a
   broken `main` cannot go unnoticed for that long again.

3. **Decide the SoulForce-V2 Supabase persistence model before any public URL**,
   and delete the `"anon all"` SQL from `profile.ts` once decided so it can't be
   pasted later. Unchanged from last week and still cheap only while settled before
   launch.

---

### Sweep notes

- **Fixes applied:** none. All actionable items were already-fixed-pending-merge or
  upgrade judgement calls, not trivial safe fixes.
- **Coverage:** studio-site and SoulForce-V2 builds/tests/audits run directly;
  the 11 quiet repos assessed by git state only (no changes since baseline).
  lovetimeline-app / mensdag-app builds remain unverified (the `node_modules`
  exec-bit defect noted last week; this sweep installs nothing).
- Both HIGH "unmerged fix" findings share a theme: **work is getting done, then
  stranding on the merge-to-`main` step.** Two green fixes are sitting one click
  from resolving the two biggest issues in this report.
