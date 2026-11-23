# Maintenance sweep — 2026-11-23

Baseline: the previous sweep ran **2026-11-16 10:08** (PR #173, still open). This
report covers the week since. 16 git repositories were discovered under
`VibeCodeProjects/`. **Only studio-site had commits since the baseline**, and those
are five logbook posts on their own branches. No code changed anywhere.

No fixes were applied. No specialist agents were deployed: there was no new code to
review and nothing touched auth, user data or RLS.

---

## studio-site — HIGH, unchanged for the tenth week, queue now 14 deep

**The audit gate still blocks every new PR.** `npm audit` on `main` today:
**19 vulnerabilities (2 critical, 7 high, 10 moderate)**, identical to 2026-11-14 and
2026-11-16. The failing CI run on PR #178 (2026-11-22) reports the same 19.

- 14 of the 19 clear with `npm audit fix` (no `--force`), including all 7 highs:
  brace-expansion, react-router, react-router-dom, source-map-js, undici, vite, zod.
- The 2 criticals (vitest, tinypool) and 3 moderates only clear with a major bump:
  vitest to 5.1.1 and `@tailwindcss/typography` to 0.5.4. These are dev-only
  packages. Whether CI goes green after the plain `npm audit fix` depends on whether
  `audit-ci.jsonc` allowlists them; I did not verify that this week.
- The fix still has to be run by a person. An unattended run is not allowed to change
  the dependency tree.

**Health of `main` (c336de0):** `npm run build` ✅, `npm test` ✅ (27 files, 607
tests). `package-lock.json` was last changed 2026-09-11.

**Open PR queue: 14** (was 8 at the last sweep): #162, #166–#178. This sweep's PR
makes 15 and will fail the same `build` check.

- #166–#178: `build` fails on the audit step, merge state `BLOCKED`.
- #162 (the 2026-09-14 sweep): still shows `CLEAN`, but its checks last ran on
  2026-09-14. The green is stale; do not merge it on that basis.
- The last post live on the site is still 2026-09-29.

**Logbook gaps this week:**

- **2026-11-20: no post.** No run started that evening; the next run began at 04:54
  on 2026-11-21.
- **2026-11-21: the post exists only as an untracked file** in the local working
  tree (`content/posts/2026-11-21-the-logbook-skipped-a-day.md`). It is on no branch
  and in no PR. The evening run on 2026-11-21 saw the file, concluded the post
  already existed, and stopped. I left the file untouched; it is not part of this
  branch.
- 2026-11-23's post is due tonight.

---

## SoulForce-V2 — MEDIUM, unchanged carry-over (since 2026-07-20)

No commits. Local `main` still fails `tsc -b`; the fix (`301bf1e`) still sits only on
local branch `team/maintenance-2026-07-20`, unmerged and unpushed. One uncommitted
change remains: `.claude/launch.json` has extra preview entries for other projects.
Harmless, left untouched.

---

## beatreel — HIGH findings from 2026-11-16 still open, no new commits

Last commit 2026-11-16 08:25, before the previous sweep. Nothing re-run. All findings
in the 2026-11-16 report stand, most importantly:

1. A short clip chosen as the closing shot fails the whole make
   (`worker/autocut.py:667`).
2. Memory blow-up on libraries of several hundred files (`worker/autocut.py:557`).
3. The local API does not check the `Host` header, so a web page could reach private
   media through DNS rebinding.

The repo still has no tests.

---

## Automation — running, with two irregularities

- `daily-logbook`: ran every day except 2026-11-20 (see above). All runs report
  "succeeded", including the one that left the 2026-11-21 post untracked.
- `mensapp-daily-review`: ran daily. Three runs started 2–4 hours late (2026-11-18
  at 22:13, 2026-11-19 at 20:16, 2026-11-20 at 20:05 instead of 18:13).
- `weekly-maintenance-sweep`: fired on schedule today.
- `studio-site-build`: still paused on purpose.

---

## Quiet repos — no commits since 2026-11-16, nothing to do

japan-reel (last commit 2026-11-14; the two LOW notes from the last report stand),
mensApp (last commit 2026-09-03, `origin/main` in sync), ds-roadmap, Soulforge,
`Travel plan app`, chart-token-playground, claude-dev-company,
dominiquebrom-portfolio, lovetimeline-app, pizzaparty-app, sollie-aem-prototype,
sollie-process-presentation, token-impact-mapper.

---

## Top 3 actions for Dom

1. **Run `npm audit fix` (no `--force`) in studio-site, push it and merge it.** Same
   action as the last two sweeps. It clears 14 advisories including all 7 highs. If
   the build still fails on the 2 vitest criticals, the vitest major bump is the
   second step. This is the only thing holding 14 PRs; each blocked branch then needs
   "Update branch".
2. **Decide what happens to the 2026-11-21 logbook post.** It is an untracked file on
   your machine and will be lost to a clean checkout. Either commit it on a
   `team/2026-11-21-logbook` branch or delete it.
3. **Fix beatreel's short-closing-clip bug and add the localhost `Host` check**
   before using it on another real trip. Both are a few lines for backend-dev.
