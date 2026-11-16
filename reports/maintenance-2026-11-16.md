# Maintenance sweep — 2026-11-16

Baseline: the previous sweep ran **2026-11-14 10:59** (PR #171, still open). This
report covers the two days since. 17 git repositories were discovered under
`VibeCodeProjects/`; three had commits since the baseline (beatreel, japan-reel,
studio-site). Two of those are brand-new repos that no sweep has seen before, so they
got a full first review rather than a diff review.

No fixes were applied this week. Nothing found was both trivial and obviously safe.

---

## studio-site — HIGH, unchanged, and the queue is one deeper

**The audit gate still blocks every new PR.** `npm audit` on `main` today: **19
vulnerabilities (2 critical, 7 high, 10 moderate)** — identical to 2026-11-14. The fix
is still `npm audit fix` with no `--force`, and it still has to be run by a person:
the permission classifier does not let an unattended run change the dependency tree.

**Open PR queue: 8** (was 6 at the last sweep): #162, #166, #167, #168, #169, #170,
#171, #172. The two new ones are logbook posts; nothing else changed in the repo, so
no build/test re-run and no security review were needed beyond the audit.

Checked on GitHub today:

- #171 and #172 — `build` check **fails** (the audit gate), merge state `BLOCKED`.
- #162 (the 2026-09-14 sweep, which carries the react-router fix) — all checks green,
  merge state `CLEAN`. Those checks ran on 2026-09-14, before the newer advisories
  were published, so the green is stale: it would likely fail if re-run. It is
  mergeable as it stands today, but merging it does not unblock the other seven.

This sweep's own PR will fail the same `build` check for the same reason.

---

## beatreel — HIGH (new repo, first review)

New since 2026-11-14: 6 commits, a local web app that cuts photos and clips to the
beat of a song. Fastify API + Vite/React web + Python/Swift worker. No git remote.

**Health:** `npm run build` ✅, `npm run typecheck` ✅, `npm audit` 0 vulnerabilities,
`npm outdated` nothing. There is **no test script and no tests**, so everything below
comes from reading the code, not from running it. I spot-checked findings 1 and 2 and
the security binding against the source myself.

### Bugs (qa-tester)

**HIGH**

1. **A short clip chosen as the closing shot fails the whole make.**
   `worker/autocut.py:667` — when the closing clip is too short for `video_shot`, the
   code falls back to `photo_shot(cl)`, which emits `type: "photo"` with a video
   source. The engine rejects that (`worker/reelengine/edl.py:270`) and the user gets
   "The automatic cut came out wrong", with no retry on another closer. Trigger: the
   last clip of the trip is about 2 s long. Fix is a few lines (keep too-short clips
   out of the closer pool), but it changes editing behaviour, so it is left as a
   finding.
2. **Memory blow-up on large libraries.** `worker/autocut.py:557` builds an
   n × n × dim difference array to compare every shot with every other. Estimated
   ~0.3 GB at 300 files and ~2 GB at 600; the server accepts up to 2000 files per
   upload. A big trip will hang or run out of memory. (Sizes are the reviewer's
   estimate; the embedding dimension was not measured.)

**MEDIUM**

3. A library with no photos and only very short clips crashes with a bare
   `ValueError` (`autocut.py:609`, `max()` of an empty list).
4. A failed full-quality render leaves both download buttons disabled on
   "Getting full quality ready… 0%" until the page is reloaded
   (`web/src/Project.tsx:117-127, 263-267`).
5. Deleting a photo or clip does not mark the cut stale (`server/index.ts:239-251`).
   The draft still says "Your video is ready"; the next Update or Download fails on
   the missing file and lands in finding 4.
6. No `error` handler on the spawned worker (`server/index.ts:80-95`). A missing or
   wrong Python path takes the whole API process down.
7. HEIC conversion (`worker/analyze_media.py:191-198`): `IMG_1.heic` is converted
   over an existing `IMG_1.jpg` and the HEIC is deleted, so one photo is lost.
   A failed conversion is silently dropped rather than listed as skipped. Starred
   must-haves keep the old `.heic` name and go stale.
8. A very short or silent song crashes with a generic error before the friendly
   "too short" check runs (`worker/analyze_song.py:187`).
9. One bad file (oversized panorama, one-frame clip) aborts the whole analysis job
   (`analyze_media.py:217` catches too narrow a set of errors).
10. Deleting a project while its job is running leaves an orphan folder in `data/`
    that nothing lists or cleans up.

**LOW:** Japanese filenames all collapse to `_`, `_-2`, … (`safeName` is ASCII-only);
swap/remove/candidates block the whole API (`execFileSync`, `index.ts:301`); a
half-finished upload batch leaves a truncated file that is analysed later; no cleanup
of `data/` other than deleting a project.

**The newest change — must-haves lengthen or speed up the video — held up.** The
loop is bounded (at most 5 lengths × 3 paces), handles zero must-haves, more
must-haves than beats, and a song shorter than the wanted length, and no division by
zero was found. Not run, only read.

### Security (security-auditor)

**Verdict: fine as a local-only tool; not ready to be hosted or shared.** Process
calls use argument lists and no shell, captions are drawn with Pillow rather than
ffmpeg text filters, questionnaire answers are checked against fixed lists, and
neither `data/` nor any secret is tracked in git.

Matters today:

- **MEDIUM — DNS rebinding.** The API listens on `127.0.0.1:5221` (good) but has no
  auth and does not check the `Host` header. A malicious web page open while the
  server runs could re-point its own domain at localhost and then list projects,
  download private photos and clips, and delete projects. Fix: reject requests whose
  `Host` is not localhost, and require a custom header on anything that changes data.
- **LOW** — other sites can create empty projects blind (no response is readable);
  uploads have no total size cap (8 GiB × 2000 files per request) and leave partial
  files behind; error messages can include absolute paths under `/Users/…`.

Must be fixed before hosting or multiple users: **no accounts and full cross-project
access** (critical — every project and its files are reachable by id), ffmpeg run on
untrusted uploads without a format or protocol whitelist (high), no rate limits or
job caps (high), no sandbox around the media parsers, no security headers or HTTPS.

---

## japan-reel — LOW (new repo, first review)

New since 2026-11-14: 4 commits, a personal Python render engine for one Instagram
reel. No `package.json`, so no build or audit applies. No remote. Source media stays
outside the repo and `.gitignore` covers renders and media; nothing media-sized is
tracked (`.git` is 316 KB).

Checked without rendering: every `.py` file parses, all three cut lists parse and are
internally consistent, and the durations match the commit messages (33.2 s, 52.5 s,
89.3 s). The engine's own `--validate` was not run, because it reads the media folder.

- `engine/reelengine/beats.py:81` — `is_downbeat` hard-codes a downbeat position that
  is wrong for the 133 BPM grid used by the medium cut. Nothing calls it today.
- `README.md` does not mention the medium cut or that it needs
  `--beats data/beats-133.json`, and points at an `engine/README.md` that does not
  exist.

---

## SoulForce-V2 — MEDIUM, unchanged carry-over (since 2026-07-20)

No commits. Local `main` still fails `tsc -b`; the fix (`301bf1e`) still sits only on
local branch `team/maintenance-2026-07-20`, unmerged and unpushed. Local `main` is one
commit ahead of `origin/main`. Also one uncommitted change: `.claude/launch.json` has
gained preview entries for other projects (studio-site, mensapp, and more). Harmless,
left untouched.

---

## Automation — recovered

The scheduled tasks that went dark before the last sweep are running again.
`daily-logbook` ran 2026-11-14 and 2026-11-15; `mensapp-daily-review` ran 2026-11-14
and 2026-11-16 and is no longer held on `global_limit`; this sweep fired on schedule.
One oddity: the `mensapp-daily-review` run due the evening of 2026-11-15 only started
at 06:20 on 2026-11-16, about 12 hours late. `studio-site-build` remains paused on
purpose.

---

## Quiet repos — no commits since 2026-11-14, nothing to do

mensApp (last commit 2026-09-03), ds-roadmap (the missing-`jsdom` smoke test from the
last report is unchanged), Soulforge, `Travel plan app`, chart-token-playground,
claude-dev-company, dominiquebrom-portfolio, lovetimeline-app, pizzaparty-app,
sollie-aem-prototype, sollie-process-presentation, token-impact-mapper.

---

## Top 3 actions for Dom

1. **Run `npm audit fix` (no `--force`) in studio-site and merge it.** Same action as
   last sweep. It clears 19 advisories including 2 critical, and it is the only thing
   holding 8 PRs. Each blocked branch then needs "Update branch".
2. **Decide whether beatreel's two HIGH bugs get fixed before you use it on a real
   trip.** A short final clip fails the whole make, and a library of several hundred
   files is likely to run out of memory. Both are small fixes for backend-dev; the
   repo also has no tests at all.
3. **Add the localhost `Host` check to the beatreel API** before running it while
   browsing. It is a few lines and closes the one way a web page could reach your
   private media today. Accounts and the rest only matter if beatreel is ever hosted.
