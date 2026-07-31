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
