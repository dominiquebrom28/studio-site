# Run report — 2026-07-17 (auto-merge infrastructure)

## Item worked on
**Auto-merge infrastructure** (new backlog item, added this run — first exercise
of the studio's new backlog ownership). Branch: `team/2026-07-17-auto-merge-infra`.

## Why
Dom raised daily throughput to "a human team's week per day." The real limit isn't
tokens, it's Dom's review capacity — a merge now deploys to production via Vercel.
Safe, low-risk output (blog content, tests, docs) shouldn't need a human merge.
Encoding "auto-merge + push main" into the headless daily routine was correctly
blocked by the permission classifier (an AI cron auto-deploying to prod is exactly
what that guard prevents). The right design keeps the deploy gate in GitHub.

## What was done
devops (lead-reviewed) built GitHub-native auto-merge:
- **`.github/workflows/ci.yml`** — on every PR to `main` (and manual dispatch):
  `npm ci` → `npm run typecheck` → `npm test` → `npm run build` on Node 22,
  least-privilege (`contents: read`). Publishes the required check **`CI / build`**.
- **`.github/workflows/auto-merge.yml`** — fires only when a PR carries the
  `safe-auto` label. A guard step lists the PR's changed files and confirms every
  one is within the safe allowlist (`content/**`, `docs/**`, `reports/**`,
  root-level `*.md`, `**/*.test.ts(x)`); if anything else is touched it **removes
  the label + comments** so app code can't slip through. Only on a clean pass does
  it call `gh pr merge --auto --squash`, which GitHub completes **after** the
  required CI check passes. Re-runs on `synchronize`, so a later unsafe commit is
  caught and un-labeled.
- **`.github/AUTO-MERGE-SETUP.md`** — the one-time manual steps only Dom can do.

## Verification
- YAML validated for both workflows (Ruby `Psych` parser — no actionlint/pyyaml in
  env); both parse clean. npm scripts referenced by CI confirmed present.
- The path-guard shell logic was extracted and dry-run against a mixed file list
  (safe content/docs/reports/root-md/nested-test vs. `src/App.tsx`, `src/README.md`,
  `package.json`, lockfile, `.github/**`, config) — safe passed, all unsafe correctly
  rejected, including nested `*.md` not counting as root-level.
- Cannot run GitHub Actions locally, so CI's real pass is unproven until it runs on
  the PR itself (that's the point of putting it in CI).

## Decisions made
- **GitHub-native, not a local push.** The AI never merges; GitHub does, gated by
  branch protection + CI. This both satisfies the safety guard and is the more
  robust design.
- **Defense in depth:** label AND path guard AND required CI check must all hold.
  A mislabeled code PR still cannot auto-merge.
- **Scoped to spec:** did NOT add `npm audit` to CI (flagged as a follow-up backlog
  item instead) to keep this PR single-purpose.

## For Dom to review
- **Branch/PR:** `team/2026-07-17-auto-merge-infra`.
- **One-time config only you can do** (in `.github/AUTO-MERGE-SETUP.md`): enable
  **Allow auto-merge**, add a `main` branch-protection rule requiring **`CI / build`**,
  create the `safe-auto` label, and `gh auth login`. **The branch-protection rule is
  the actual safety gate** — without it, `gh pr merge --auto` has no required check to
  wait on and could merge without CI. Until you do steps 1–2 the workflow is
  inert-but-safe.
- Follow-up queued: wire `safe-auto` labeling into the daily `studio-site-build`
  run once you've enabled the above (studio-ops change, not a repo change).

## Learnings
- The permission classifier drew the line in the right place: it blocked an AI
  automation from self-authorizing production deploys, but let the same capability
  through when it's expressed as reviewable GitHub config gated by human-set branch
  protection. The guard pushed us toward the better architecture, not just a safer one.
- "More output" is governed by review throughput, not tokens. Auto-merging only the
  genuinely-safe categories is what makes higher volume survivable — and the path
  guard is what makes "safe category" trustworthy rather than a label anyone trusts.
