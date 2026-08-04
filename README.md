# Studio Site

Portfolio + blog of Dom's AI dev studio, built by the studio's own AI team
on a schedule. See [PROJECT-BRIEF.md](PROJECT-BRIEF.md) for what this is and
[BACKLOG.md](BACKLOG.md) for what's next.

- Team work lands on `team/*` branches — review with
  `git branch --list 'team/*'` and merge what's good.
- Every automated run writes a report to `reports/`.
- The team never pushes, deploys, or commits to main.

## CI gates (`.github/workflows/ci.yml`)

- **`build`** (required — this is the `CI / build` check branch protection
  depends on, see `.github/AUTO-MERGE-SETUP.md`): dependency audit
  (`npx audit-ci --config ./audit-ci.jsonc`, i.e. `npm run audit` — **not**
  raw `npm audit`, see the preflight note below) → typecheck → unit tests →
  a real-DOM smoke test (`npm run test:smoke` — mounts every key route in
  jsdom under `<StrictMode>`, the only way to catch double-invoke-only bugs
  a static render can't reproduce) → production build.

  **Preflight before treating a dependency audit as a merge blocker:** run
  `npm run audit` (the real CI gate), not raw `npm audit --audit-level=high`.
  The two can disagree — raw `npm audit` has no per-advisory allowlist, so it
  flags advisories `audit-ci.jsonc` has already reviewed and excluded as
  non-applicable or already-patched-but-misreported (see that file's own
  comments for the current allowlist and why). A 2026-07-28 run lost time
  treating a raw-`npm-audit` "7 high vulns" as blocking before checking
  `npm run audit`, which passed.
- **`validate-content`** (runs on every PR, **not yet required**): frontmatter
  rules over `content/posts/*.md` — `npm run validate:content`. Currently
  RED against real content (two posts share a date, 2026-07-18) — a known,
  reported finding, not a bug in the check. Fix the content, then add this
  job to branch protection if it should block merges.
- **`deployed-smoke`** (runs on every PR, **not required**, skips cleanly
  with no URL configured): plain HTTP check that a deployed URL's routes
  return 200 with the app shell — `npm run smoke:deployed -- <url>` to run
  by hand, or set the `SMOKE_URL` repo variable / pass `deployed_url` on a
  manual workflow run to wire it up. See the job's comment in `ci.yml` for
  the full one-time setup.
- **`e2e`** (runs on every PR, **not required** — deliberately, see the
  job's own header comment in `ci.yml`): Playwright against `dist/` at
  375/768/1280. On failure, uploads the `playwright-report` artifact
  (HTML report + trace).

**A red check posts a PR comment automatically** (the `notify-on-failure`
job, `ci.yml`) naming which job failed and the exact `gh run download`
command, and edits that same comment in place on every re-run instead of
piling up new ones. It does not fire for a `workflow_dispatch` run (no PR to
comment on), and it **skips cleanly (shows as `skipped`, not `failure`) on a
fork PR** — a `pull_request` run from a fork gets a read-only `GITHUB_TOKEN`
that this job couldn't use to comment anyway, so it doesn't try, rather than
leaving a permanently-red check that has nothing to do with the code under
review. No comment gets posted on a fork PR either way; the `gh run
download` step below still works there manually — only the auto-comment is
skipped, not the artifact.

**Download the artifact BEFORE you re-run a red check.** A re-run's logs and
artifacts overwrite/expire independently of the failed run — re-running
first is how PR #69's `e2e` failure sat undiagnosed for two days in
2026-07-29–31 even though the evidence (`playwright-report`, 2MB, a full
Playwright trace) was sitting there the whole time; it only got root-caused
once someone ran `gh run download` against the original failed run instead
of re-running it blind. Same idea applies to `smoke-test-results` (the
`build` job's smoke-test artifact, uploaded only when that specific step
fails). Concretely, before clicking "Re-run jobs":

```
gh run download <run-id> --repo <owner>/<repo>          # every artifact on that run
gh run download <run-id> --repo <owner>/<repo> -n <name> # just one, e.g. -n playwright-report
```

`<run-id>` is in the failing check's URL, in `gh pr checks <pr-number>`
output, or in the auto-posted PR comment above.

## Local dev preflight: `node_modules` drift from `package.json`

CI always runs `npm ci`, so it can never see a stale local `node_modules` —
which is exactly why this is a **local-only trap**: a PR adds a dependency
and merges, nobody re-runs `npm install` in a local checkout, and the next
`npm run build`/`typecheck` fails with a confusing `Cannot find module`
that has nothing to do with the change actually being worked on (real
incident: `axe-core`/PR #43, BACKLOG.md, 2026-07-24 — cost a full day
before anyone connected the failure to its cause).

`scripts/check-deps-drift.mjs` (Node built-ins only, no new dependency)
compares `package.json` against what's actually installed and reports —
loudly, never silently — whether they agree:

- Run it by hand any time: `npm run check:deps`.
- It also runs **automatically**, non-blocking, after `git checkout`/`git
  switch` and after `git merge` (including a fast-forward `git pull`), via
  the committed `.githooks/` directory. `npm install`/`npm ci` wires this up
  for you (`prepare` script runs `scripts/setup-git-hooks.mjs`, which sets
  `core.hooksPath` to `.githooks`) — nothing to remember, nothing to
  configure by hand. Because `core.hooksPath` lives in the repo's shared
  git config, this activates for every `git worktree` of this repo the
  moment it's set once anywhere, including worktrees created afterward.
- It never runs `npm install` itself and never touches `node_modules` —
  it only reports, and prints the exact fix command. If your `node_modules`
  is a **symlink** (the normal setup for an agent worktree here, sharing the
  main checkout's install), the printed fix points at the symlink's real
  target, not `cwd` — running `npm install` inside a worktree instead would
  silently fork a private copy for that worktree only, per the existing
  worktree-isolation BACKLOG item.
- If it can't determine an answer (no `node_modules` at all, unreadable
  `package.json`) it exits **inconclusive**, distinct from a clean pass —
  it never reports green when it didn't actually check anything.
