# Auto-merge setup (one-time, manual)

This repo has two GitHub Actions workflows that let safe-category PRs
(content, docs, tests, reports) merge themselves once CI passes, while
everything else always waits for a human. The workflows alone don't do
anything until Dom does the following four things once, by hand, in the
GitHub UI / CLI.

## 1. Enable auto-merge on the repo

Repo → **Settings → General → Pull Requests** → check **Allow auto-merge**.

Without this, `gh pr merge --auto` will fail outright.

## 2. Require the CI check on `main`

Repo → **Settings → Branches** → add (or edit) a branch protection rule for
`main`:

- Check **Require status checks to pass before merging**.
- In the search box, select the check named **`build`** (it will show up as
  `CI / build` once the CI workflow has run at least once on a PR — GitHub
  only lists checks it has seen before, so open one throwaway PR first if the
  search box is empty).
- **Also select `backlog-checkoffs`** (shows up as `CI / backlog-checkoffs`).
  See "A consequence of the 2026-08-07 real-corpus test move" below for why
  this is no longer optional the way the rest of this doc's "promote once
  proven" advice for that job used to suggest.
- Optionally also check **Require a pull request before merging**.

This is the actual deploy/merge gate. It lives in GitHub, not in any script —
even a PR with `safe-auto` enabled cannot merge until this required check is
green.

### A consequence of the 2026-08-07 real-corpus test move — read before requiring only `build`

As of 2026-08-07 (BACKLOG.md MEDIUM), `npm test` (the `build` job's default
suite) no longer contains the real-`gh` corpus tests for
`check-backlog-checkoffs.mjs` and `check-stranded-branches.mjs` — they moved
to `npm run test:real-corpus`, which runs as its own step inside the
**`backlog-checkoffs`** job, not `build` (see `.github/workflows/ci.yml`'s
comment on that job, and `vitest.real-corpus.config.ts`'s header). That move
was free the day it happened, because **branch protection on `main` is not
currently configured at all** (`gh api repos/.../branches/main/protection`
returns 404 as of this writing — a separate open HIGH backlog item) — with
nothing required, moving work between jobs costs nothing.

**The moment branch protection is configured by following step 2 above, that
stops being true.** If only `build` is made required (the letter of this
doc's ORIGINAL step 2, before this note was added), the real-corpus
assertion for both scripts sits OUTSIDE the required check entirely — a PR
could merge with a red `backlog-checkoffs` job and nobody would be blocked.
This is why step 2 above now says to select **both** `build` AND
`backlog-checkoffs`. Do both at the same time, in the same branch-protection
rule, the first time this is set up — don't require `build` alone now and
add `backlog-checkoffs` "later," since "later" is exactly how a gate quietly
stops gating (this repo's own `SMOKE_URL`/non-required-content-gate lesson).

One honest tradeoff this creates, worth Dom's eyes rather than silently
accepted: requiring the whole `backlog-checkoffs` JOB also requires its
FIRST step (`check:backlog-checkoffs` itself, the "does BACKLOG.md cite
every merged branch" reporting check) — which `ci.yml`'s own comment on that
job still calls "deliberately not required... promote it once it's run
clean across real PR traffic for a while," unchanged by this note. If that
script isn't proven out yet, requiring the job makes it a merge blocker
alongside the real-corpus tests, not just those tests alone. The clean fix,
if that script turns out not to be ready to gate merges when this is set up,
is to split the job in two (one required job for the real-corpus tests
only, one still-advisory job for the backlog-checkoff report) rather than
leaving the real-corpus assertion unrequired to avoid promoting the report
too early.

## 3. Create the `safe-auto` label

```
gh label create safe-auto -d "auto-merge when CI passes & paths are safe" -c 2EA043
```

## 4. Install and authenticate `gh` locally

So the daily routine (or Dom) can open PRs and apply the label:

```
brew install gh   # if not already installed
gh auth login
```

---

## How it fits together

- **`.github/workflows/ci.yml`** runs on every PR into `main`: `npm ci` →
  `npm run typecheck` → `npm test` → `npm run build`. Its job is named
  `build`, so the check GitHub publishes is **`CI / build`** — that's the
  exact name to require in step 2.

- **`.github/workflows/auto-merge.yml`** runs whenever a PR is labeled,
  synchronized (new commits pushed), or reopened. It only does anything if
  the PR currently carries the `safe-auto` label. When it runs, it:
  1. Lists every file changed in the PR.
  2. Checks each one against the safe-path allowlist: `content/**`,
     `docs/**`, `reports/**`, root-level `*.md`, and any `*.test.ts` /
     `*.test.tsx` file (anywhere).
  3. If **any** changed file falls outside that allowlist — including
     anything under `src/` that isn't a test file, anything under
     `.github/`, `package.json`, either lockfile, or any config file — it
     first runs `gh pr merge --disable-auto` to cancel any auto-merge that
     may already be armed on this PR, then posts a comment explaining why,
     **removes the `safe-auto` label**, and stops.
  4. Only if every changed file is in the allowlist does it run
     `gh pr merge --auto --squash`, which tells GitHub "merge this the moment
     its required checks pass." GitHub — not this workflow — is what
     actually waits for the `CI / build` check and does the merge.

- **Why the disarm step in 3 exists:** `gh pr merge --auto` is *sticky*
  repo-side state, not something scoped to a single workflow run. Sequence
  that used to slip through before this was added: a PR's first commit only
  touches `content/**` → gets `safe-auto` → step 4 arms auto-merge. A later
  commit on the *same* PR adds a change under `src/` → `synchronize` fires
  again → the guard correctly flags the unsafe path and removes the label —
  but auto-merge was already armed on GitHub's side, and removing a label
  does not un-arm it. Without an explicit `--disable-auto` call, GitHub would
  still squash-merge the (now unsafe, unreviewed) PR the moment `CI / build`
  went green. `--disable-auto` exits non-zero when nothing was armed (the
  common case), which the step treats as expected, not a failure — it always
  still posts the comment and removes the label.

- **What `safe-auto` means:** it's a claim that a PR only touches
  low-risk, non-code paths (blog/content posts, docs, test-only changes,
  reports). It should only ever be applied by a trusted process (e.g. the
  daily content routine), never by an untrusted contributor. The path guard
  above is defense-in-depth for the case where the label gets applied to a
  PR that turns out to touch app code — the guard strips the label and
  refuses to enable auto-merge rather than trusting the label alone.

- **Nothing here bypasses review policy.** Auto-merge only ever fires after
  the `CI / build` required check is green. If branch protection isn't
  configured (steps 1–2), `gh pr merge --auto` either fails to arm (auto-merge
  not allowed) or has no required check to wait on, and its behavior can't be
  trusted — so until steps 1 and 2 are done, treat this whole system as
  **inert but safe**: the workflows can run, but they have nothing correct to
  gate merges on.

## How to turn it off

Any one of these fully disables the system:

- Push a commit that touches a path outside the allowlist (stops that PR
  only): `synchronize` re-runs the guard, which now both disarms any
  already-armed auto-merge (`gh pr merge --disable-auto`) and removes the
  label. This is the safe, automatic way to stop a single PR.
- Manually removing the `safe-auto` label yourself (e.g. `gh pr edit
  --remove-label`) does **not** by itself disarm auto-merge if this workflow
  had already armed it on an earlier commit — label removal done outside
  this workflow doesn't trigger the disarm step, because GitHub doesn't fire
  this workflow on unlabeling. If you remove the label by hand, also run
  `gh pr merge <PR> --repo <REPO> --disable-auto` to be sure.
- Delete `.github/workflows/auto-merge.yml` (stops the feature repo-wide;
  `ci.yml` keeps running as normal required CI).
- Remove the `build` required-status-check rule from `main`'s branch
  protection (removes the deploy gate — not recommended; this is what makes
  the whole thing safe).
- Delete the `safe-auto` label entirely (`gh label delete safe-auto`) — any
  PR that previously had it loses it, and the workflow's `if` condition will
  simply never match going forward.
