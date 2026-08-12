# Pre-launch review — 2026-08-07

Closes the backlog's oldest open item, "**Pre-launch review** — security-auditor
+ designer critique; fix findings" (open since 2026-07-15). Two reviews ran
(security-auditor, designer). This document records both: what got fixed in
this PR, what's deferred to Dom as decisions, and the clean list of what was
checked and found sound. Implemented on `team/2026-08-07-pre-launch-review`.

---

## 1. Fixed in this PR

### Fix 1 (P1, security-auditor) — auto-merge armed but never disarmed

**Finding.** `.github/workflows/auto-merge.yml`'s "Enable auto-merge (squash)"
step calls `gh pr merge --auto --squash`, which arms **sticky, repo-side**
state on GitHub — not something scoped to a single workflow run. The "Block
auto-merge and remove label" step only removed the `safe-auto` label; it never
called anything to cancel an already-armed auto-merge. Failure sequence: a
content-only commit gets `safe-auto` and arms auto-merge → a later commit on
the same PR adds a change under `src/` → `synchronize` re-runs the guard,
which correctly flags the unsafe path and strips the label — but auto-merge is
still armed, so GitHub squash-merges the unreviewed source change into `main`
the moment CI goes green, and Vercel auto-deploys it.

**Fix.** Added `gh pr merge "$PR_NUMBER" --repo "$REPO" --disable-auto` at the
start of the block step, before the comment/label-removal.

**Handling the non-zero exit.** `--disable-auto` exits non-zero when the PR
never had auto-merge armed (the common case — most PRs that touch an unsafe
path were never labeled `safe-auto` in the first place). Under `set -euo
pipefail`, letting that propagate would abort the step *before* the comment
and label removal ran — silently defeating the guard on the majority of
invocations. Fixed by capturing the exit code explicitly instead of a blanket
`|| true`:

```sh
disable_status=0
gh pr merge "$PR_NUMBER" --repo "$REPO" --disable-auto || disable_status=$?
if [ "$disable_status" -ne 0 ]; then
  echo "note: 'gh pr merge --disable-auto' exited $disable_status — PR most likely had no auto-merge armed. Continuing."
else
  echo "Auto-merge disarmed for PR #$PR_NUMBER."
fi
```

This keeps the step fail-safe (comment + label removal always run, regardless
of whether anything was actually armed) while still surfacing a genuine `gh`
failure (auth, API outage) in the log rather than swallowing it silently —
`|| true` alone would have hidden that distinction.

Also corrected `.github/AUTO-MERGE-SETUP.md`, which stated this incorrectly in
two places:
- Around the old line 66 ("Auto-merge is never enabled in this case") — now
  describes the disarm call and explains *why* it's necessary (the sticky-state
  mechanics above), as its own bullet under "How it fits together."
- Around the old line 92 ("Remove the `safe-auto` label from a PR (stops that
  PR only)") — this was ALSO false, in a way the original finding didn't name
  but the fix exposed: a **human** manually removing the label (`gh pr edit
  --remove-label`, outside the workflow) does not trigger the disarm step
  either, because GitHub doesn't fire this workflow on unlabeling. The
  "How to turn it off" section now says so explicitly and gives the correct
  manual command (`gh pr merge <PR> --repo <REPO> --disable-auto`), and
  separately documents that pushing a commit which trips the path guard *is*
  now the safe, fully-automatic way to stop a single PR.

**Status of the risk today.** The P1 **cannot fire right now** — `gh pr list`
history shows no PR has carried `safe-auto` since 2026-07-18 (confirmed
2026-08-01, and unchanged since). The lane is dormant. This was a latent trap
in dormant infrastructure, not an active compromise — stated plainly, not
overstated.

**Backlog sequencing note.** BACKLOG.md already has an open HIGH item
("Branch protection on `main` was never configured...") that says the
`safe-auto` labeling habit should only be re-adopted *after* branch protection
is configured. This fix adds a prerequisite *ahead of* that: the disarm gap
had to be fixed before branch protection is configured and the lane is
re-armed, because turning the lane back on today — even with branch
protection freshly configured — would be re-enabling a guard that only
*reports* being fail-closed while actually leaving a sticky auto-merge state
uncancelled on any PR whose safety classification changes mid-flight. Fix
order should now read: **disarm gap (this PR) → branch protection → re-adopt
`safe-auto` labeling.** (This document records that ordering; it does not
edit BACKLOG.md itself — that's Dom's/the routine's call.)

Files: `.github/workflows/auto-merge.yml`, `.github/AUTO-MERGE-SETUP.md`.

### Fix 3 (P3, security-auditor) — markdown fence break-out in the bot comment

**Finding.** The same block step wrapped a `cat` of PR-controlled filenames
between ` ``` ` fences in the PR comment body. A file named with a triple
backtick in its path could escape the fence (cosmetic only — no code
execution; this is a comment body, not rendered as executable anything).

**Fix.** Replaced the fenced `cat` with a loop that prints each unsafe
filename indented four spaces (a plain GFM code block by indentation, same
visual result, no fence to break out of):

```sh
while IFS= read -r f; do
  [ -z "$f" ] && continue
  echo "    $f"
done < "$UNSAFE_FILE"
```

Landed in the same edit as Fix 1 since both touch the same step.

File: `.github/workflows/auto-merge.yml`.

### Fix 2 (P3, security-auditor) — every nonexistent URL is an indexable, self-canonicalising soft-404

**Finding.** `vercel.json`'s SPA rewrite returns HTTP 200 for any path;
`NotFound.tsx` rendered `<Seo>` with no noindex; `Seo.tsx` set `canonical`
from `window.location.pathname` (the arbitrary requested path); `robots.txt`
is `Allow: /`. Net effect: `https://doms-ai-studio.vercel.app/<anything>`
returns a 200, indexable page that canonicalizes to itself — a spam-SEO
vector (anyone can post a link to a nonsense path and get it treated as a
real, canonical page).

**Fix.** Added an optional `noindex` prop to `Seo`. When set: emits
`<meta name="robots" content="noindex">` and skips setting the canonical
link entirely. `NotFound.tsx` now passes `noindex`.

**The teardown case, tested explicitly.** `Seo` mutates `document.head`
imperatively and reuses tags by selector across mounts rather than removing
them on unmount — so a naive implementation that only *adds* `noindex` when
true would leak it: navigate 404 → real page, and the stale `<meta
name="robots" content="noindex">` would silently persist onto the real page,
deindexing it with no visible symptom. Fixed by making both branches
authoritative every render — the `else` branch actively removes any leftover
`robots` meta tag and (re-)sets the canonical link:

```ts
if (noindex) {
  setMetaTag('robots', 'noindex');
  removeLinkTag('canonical');
} else {
  removeMetaTag('robots');
  setLinkTag('canonical', canonicalUrl);
}
```

`src/components/Seo.test.tsx` (new, 5 tests) asserts both leak directions
explicitly: real page → noindex page must not keep a stale canonical, AND —
the direction called out as the one that could do real damage — noindex page
→ real page must not leave a stale `noindex` tag, both via full
unmount/remount (the real route-change shape) and via a same-instance
re-render (prop flip without unmount).

Files: `src/components/Seo.tsx`, `src/pages/NotFound.tsx`,
`src/components/Seo.test.tsx` (new).

### Fix 4 (design) — the one team-built project is hidden from the homepage

**Finding.** `content/projects/studio-site.md` is the only project with
`soloBuild: false` — the single piece of evidence for the hero's claim that
an AI dev team builds this software. It had `featured: false` and was the
only project file with no `order`. `sortProjects` sorts undefined `order` to
`Number.POSITIVE_INFINITY`, so it also landed last on `/projects`. Net
effect: the homepage's "Recent builds" 3-up grid showed three cards all
stamped SOLO BUILD directly under a hero claiming an AI team builds this
software, and the one card that proves the claim was absent.

**Fix.** Frontmatter-only, per the brief: set `featured: true` and `order: 0`
on `content/projects/studio-site.md`. `sortProjects` / `getFeaturedProjects`
were NOT touched.

**Verified the `order: 0` truthiness risk specifically**, since `sortProjects`
already used nullish coalescing (`a.order ?? Number.POSITIVE_INFINITY`, not
`||` or a ternary on truthiness) — `0` was already handled correctly in the
existing code before this fix. Added `src/content/loader.test.ts` — *"sorts
`order: 0` FIRST, ahead of positive-order items — 0 must not be swallowed by
a truthiness check"* — to pin that behavior so a future refactor that
introduces a truthiness check would fail this test, not the live homepage.

**Verified the actual 3-up grid contents** against real committed content
(new test in `src/content/index.test.ts`, not synthetic fixtures):

| Slug | order | featured |
|---|---|---|
| studio-site | 0 (new) | true (new) |
| soulforge | 1 | true |
| portfolio | 2 | true |
| chart-token-playground | 3 | true |

`getFeaturedProjects(3)` now returns `['studio-site', 'soulforge',
'portfolio']` — chart-token-playground drops off the 3-up grid (still
reachable, `featured: true`, on `/projects`). Confirmed by the new test, not
just read off the frontmatter table.

Files: `content/projects/studio-site.md`, `src/content/loader.test.ts`,
`src/content/index.test.ts`.

### Fix 5 (design) — blog cards hide the TL;DR/retrospective distinction that already exists in the data

**Finding.** 22 posts exist; 17 set `tldr` (2-5 bullets), which already
drives a real `TLDRBlock` on the post page. `PostCard.tsx` — used on both `/`
and `/blog` — never read `post.tldr`, so that distinction was invisible at
the card level.

**Fix.** Added a small mono "TL;DR" `Badge` (`tone="tint"
tintVar="marker-700"`) next to the date, rendered only when `post.tldr` is
set — the same tint `TLDRBlock`'s own eyebrow uses (`ProvenanceTag.tsx`
already establishes this exact `tone="tint" tintVar="marker-700"` pairing
elsewhere in the codebase, so this isn't a new pattern). Derived purely from
`post.tldr` presence; no new frontmatter field or enum, so the chip can never
drift from whether a `TLDRBlock` actually renders on the post page.

`src/components/PostCard.test.tsx` (new, 3 tests): chip renders when `tldr`
is set, does not render when absent, zero axe violations with the chip
present.

Files: `src/components/PostCard.tsx`, `src/components/PostCard.test.tsx`
(new).

---

## 2. Deferred to Dom as decisions

Each item below is something a reviewer flagged where the right call is
Dom's, not a specialist's — tradeoff stated so he can decide without
re-reading anything.

- **Live-header verification + setting `SMOKE_URL`.** `scripts/
  check-deployed-routes.mjs` does a real HTTP smoke check against a deployed
  URL, but skips cleanly (exit 0, visible "SKIPPED") when no `SMOKE_URL` is
  configured — which is the state today. Tradeoff: leaving it unset costs
  nothing and risks nothing, but means CI cannot catch the exact class of bug
  this script exists for (the 2026-07-18 all-routes-404 incident, caught only
  by hitting a real deployed URL). Setting it requires deciding *which* URL
  (prod, or a preview pattern) and accepting that CI now depends on that
  deployment existing and being reachable when the job runs.

- **`*.test.ts` in the `safe-auto` allowlist.** The allowlist treats any
  `*.test.ts`/`*.test.tsx` file as a safe, auto-mergeable path anywhere in the
  repo. It is executable code that CI runs (`npm test`) — a malicious or
  broken test file could still do real things inside the CI runner (arbitrary
  code execution in that environment, not just "changes app behavior"). Yet
  `.github/AUTO-MERGE-SETUP.md`'s "What `safe-auto` means" section describes
  the allowlist as "non-code" paths (content, docs, tests, reports) without
  flagging that test files are the one member of that list that actually
  executes. Tradeoff: tightening this (dropping `*.test.ts` from the
  allowlist, or requiring human review specifically for test-file-only PRs)
  makes routine QA-authored test PRs no longer auto-mergeable, trading
  convenience for closing a real (if narrow — CI already runs in an isolated
  runner, and this is currently a dormant lane per Fix 1) execution surface.

- **`style-src 'unsafe-inline'`.** `vercel.json`'s CSP is `script-src 'self'
  'sha256-...'` (hash-pinned, no `unsafe-inline` for scripts) but `style-src
  'self' 'unsafe-inline'`. Tradeoff: Tailwind + inline `style={{...}}` props
  used throughout the app (confirmed present, e.g. `Badge`'s `color-mix`
  tint styles) would need per-style hashing or a nonce scheme to remove this,
  which is real engineering work for a style-only injection surface (lower
  severity than script injection, but not zero — CSS can still exfiltrate via
  attribute selectors in some browsers).

- **Drafts shipping in the bundle.** `filterVisiblePosts` (`loader.ts`) only
  filters draft posts out of the *rendered* `posts` array in production
  (`isProd` check happens in JS, after `import.meta.glob` has already loaded
  every post file, draft or not). This means a draft post's raw markdown
  content is plausibly still present somewhere in the shipped JS bundle even
  though it's unreachable via any route or link. Tradeoff: confirming this
  needs an actual bundle inspection (grep `dist/assets/*.js` for draft-only
  content) which wasn't performed as part of this review pass — flagging
  the code shape that would produce it, not a confirmed bundle finding.

- **`img-src 'self'` contradicting the schema's allowance of external `cover`
  URLs.** The CSP is `img-src 'self'` (no external image hosts allowed), but
  `cover: z.string().optional()` in `schemas.ts` places no constraint
  requiring a root-relative path — an external `cover` URL would validate at
  the content layer but silently fail to load under the current CSP.
  Tradeoff: either tighten the schema to require root-relative `cover` paths
  (matches current CSP, but blocks a legitimate future use case like hotlink-
  ing a repo's own README image) or loosen `img-src` to specific trusted
  hosts (matches the schema's current flexibility, but widens the CSP).

- **`gh pr diff --name-only` truncation.** The auto-merge guard step
  (`.github/workflows/auto-merge.yml`) lists changed files via `gh pr diff
  "$PR_NUMBER" --name-only`. This is a named hypothesis, not a confirmed
  finding — the auditor flagged that `gh`'s diff output can truncate on very
  large PRs/diffs, which would make the guard silently under-count changed
  files (falsely "safe"). Verification command named by the auditor:
  compare `gh pr diff --name-only` output against `gh pr view --json files`
  (or paginated `gh api .../files`) on a deliberately large synthetic PR.
  Not run as part of this pass.

- **The curated "Start here" blog rail.** Design suggestion, not yet built:
  a curated entry-point list on the blog for a first-time visitor, distinct
  from the reverse-chronological feed — nothing in the codebase implements
  this today. Tradeoff: it's real editorial curation work (deciding which
  posts represent the studio best) that has to be kept current as new posts
  ship, versus the status quo where a new visitor's first blog impression is
  whatever post happened to publish most recently.

---

## 3. New finding surfaced while verifying the auditor's own named commands

The auditor's report states it had read-only file tools and so did **not**
run `npm audit` — one of three items it flagged as a hypothesis with a named
verification command rather than a conclusion. Because this repo's tooling
is available in this session, that command was actually run as part of
"check your own work" for this pass:

```
npm audit --omit=dev
```

Result: **3 high-severity vulnerabilities, in production dependencies**:

- `js-yaml` 4.0.0–4.3.0 — CVE-2026-59870, quadratic CPU consumption in
  `!!omap` resolution. Installed: `js-yaml@4.3.0` (pinned via `package.json`
  `^4.1.0`).
- `react-router` 7.12.0–8.2.0 — GHSA-qwww-vcr4-c8h2, RSC-mode CSRF bypass
  allowing action execution before a 400 response. Installed (via
  `react-router-dom@7.18.1`): `react-router@7.18.1`.

This is a **confirmed finding**, not a hypothesis — upgraded from "not
checked" to "checked, and it's red." It is **not fixed in this PR**:
`package.json` and its lockfile are one of the five files explicitly off-
limits on this branch (another agent is concurrently editing them on a
separate branch), and a dependency bump is exactly the kind of change that
belongs in a coordinated PR with its own test run, not slipped into a
pre-launch-review branch that isn't supposed to touch `package.json` at all.
**Flagging this to Dom directly: this needs its own fix, soon** — `npm audit
fix` would resolve `js-yaml` non-breaking; `react-router` needs `npm audit
fix --force` (breaking change per npm's own output) or a manual upgrade past
8.2.0, either of which needs its own test pass given how central
`react-router-dom` is to this app's routing.

---

## 4. Clean list — checked and found sound

This repo has a documented history of gates that were green while checking
nothing (see BACKLOG.md's own retrospective entries), so what was actually
checked matters as much as what was fixed.

- **Build, typecheck, lint, and all four test suites are green** — see
  §5 for exact counts. Includes the full smoke suite (real-DOM route mounts
  in StrictMode, including `/this-route-does-not-exist` and
  `/projects/studio-site`) and the post-build CSP-hash verification.
- **No `dangerouslySetInnerHTML` anywhere in `src/`.** `Markdown.tsx`'s own
  header comment states the constraint explicitly and the codebase honors
  it — content rendering goes through `react-markdown` (with `remark-gfm`),
  never raw HTML injection.
- **No `any` in application code.** Grepped `src/` for `: any`, `<any>`,
  `as any` — the only match is inside a doc comment in `PullQuote.tsx`
  ("any ordinary GFM blockquote..."), not a type annotation.
- **No secrets, no source maps, and no `.map` files in the production
  bundle.** `vite.config.ts` sets `build.sourcemap: false`; `dist/assets/`
  has zero `sourceMappingURL` comments and zero `.map` files after a real
  `npm run build`. Grepped built `dist/assets/*.js` for
  `SUPABASE|service_role|sk-|SECRET|PRIVATE_KEY` — the only matches are
  `process.env.` references inside vendored library code (React/
  react-router dev-mode warnings), not actual secret material. (This app
  has no Supabase or other backend integration at all — it's a fully static
  content site; there is no anon key or equivalent to leak in the first
  place.)
- **`script-src` is hash-pinned, not `unsafe-inline`.** The one inline
  script in `index.html` is covered by a `sha256-` hash in the CSP, verified
  automatically post-build by `verify:dist-csp-hash`
  (`src/lib/csp/distIndexHash.test.ts`, 3/3 passing) — a real gate, not an
  assertion, since it fails if the built `index.html`'s inline script content
  ever drifts from the hash `vercel.json` declares.
- **Draft posts cannot reach the sitemap**, even though `robots.txt` is
  permissive. `scripts/generate-seo-files.mjs`'s own header comment states
  it deliberately does NOT reuse `loader.ts`'s `isProd`-gated draft filter
  (which would be unsafe under `node` outside a Vite build) and instead
  re-derives draft-safety independently for the sitemap/feed generator. This
  is a genuinely separate code path from the soft-404/noindex issue Fix 2
  addresses — drafts were already handled correctly; arbitrary-path
  soft-404s were not (now fixed).
- **The mobile nav drawer has real focus management**, not just visual
  hiding: `role="dialog"`, `aria-modal="true"`, and an actual focus trap
  (`useFocusTrap`) that explicitly returns focus to the triggering button on
  close — asserted by `Header.test.tsx`'s passing axe checks (12/12).
- **`ProjectCard`'s SOLO BUILD / team-build disambiguation already existed
  and is real**, not decorative: `ProjectCard.test.tsx`'s own header comment
  documents it was written and run RED against the pre-fix component before
  being made GREEN — i.e. this is a case where a past pre-launch-style gate
  demonstrably checked something real, not a rubber stamp. Fix 4 changes
  which projects surface, not this mechanism.
- **All new/changed components pass axe with zero violations**: `Seo` has
  no visible DOM (returns `null`, nothing to violate) but its head-mutation
  side effects were verified directly against `document.head`;
  `PostCard.test.tsx`'s new TL;DR-chip test includes an axe pass (0
  violations) with the chip present.

---

## 5. Gates — actual output

Run for real, on this branch, after all fixes above:

```
npm run typecheck   → clean, no errors.
npm run lint        → 0 errors, 12 pre-existing warnings (all
                       react-refresh/only-export-components, in files this
                       PR did not touch: NarrativeBlock.tsx, ui/glyphs.tsx,
                       lib/withSuspense.tsx). Nothing introduced by this PR.
npm run build       → succeeds. 865 modules transformed. Post-build
                       generate-seo-files.mjs ran cleanly (33 sitemap URLs,
                       22 feed posts).
npm test            → 26 test files, 587 tests, all passing.
npm run test:component → 17 test files, 124 tests, all passing (includes the
                       2 new files: Seo.test.tsx [5 tests],
                       PostCard.test.tsx [3 tests]).
npm run test:smoke  → 2 test files, 41 tests, all passing (real-DOM route
                       mounts including NotFound and /projects/studio-site).
npm run validate:content → 79 tests, all passing (confirms the studio-site
                       frontmatter change still validates against the
                       schema).
npm run verify:dist-csp-hash → 3 tests, all passing.
```

Total: **7 gate commands, all green, 834 tests passing across the full
suite** (587 + 124 + 41 + 79 + 3 = 834, plus the typecheck/lint/build steps
which don't report a test count).

---

## 6. Auditor's stated limits (recorded honestly)

The security-auditor had **read-only file tools only**. It explicitly did
**not**:
- run `npm audit` (see §3 above — this pass ran it directly and found a
  confirmed, unfixed result),
- scan git history,
- make any HTTP request to the live site.

Three of its findings (the `npm audit` gap now closed above, the `gh pr diff
--name-only` truncation risk, and — per the auditor's own framing — anything
else gated behind "verify against the live site") are **named hypotheses
with a stated verification command, not conclusions**, and are presented
that way in §2/§3 above rather than as confirmed problems. This pass did not
attempt the live-site or git-history checks either (no HTTP request to
`doms-ai-studio.vercel.app` was made, and git history was not scanned for
secrets) — those remain open verification work, not closed.

---

## 7. Deliberately not done

- No change to `README.md`, `package.json`, `scripts/`,
  `.github/workflows/ci.yml`, or `src/content/loader.ts` — off-limits per
  the task (another agent is concurrently editing these on a different
  branch).
- No BACKLOG.md edit — the sequencing note in Fix 1 (disarm gap must precede
  branch protection, which must precede re-adopting `safe-auto` labeling) is
  recorded here, not written into BACKLOG.md itself; that's a call for
  whoever owns that file's edit process.
- No dependency upgrade for the `js-yaml`/`react-router` CVEs found in §3 —
  needs its own PR (touches `package.json`, off-limits here) and its own
  test pass.
- No live-site HTTP verification, no git-history secret scan — see §6.
- No change to `img-src`, `style-src`, or the `cover` schema — all deferred
  per §2, Dom's call given the real tradeoffs on each side.
