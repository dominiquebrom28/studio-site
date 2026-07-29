/**
 * Canonical public links back to this repo's own GitHub presence — the
 * evidence PROJECT-BRIEF.md goal 3 ("the site's own git history and run
 * reports ARE content") asks every "proof" link on the site to point at.
 *
 * Centralized here (backlog "point at the right thing", 2026-07-29) so
 * `Footer.tsx`, `BlogIndex.tsx`, and `BacklogChip.tsx` share one source of
 * truth instead of each hand-rolling its own `.../dominiquebrom28/
 * studio-site/...` string — the exact drift that let `Footer.tsx` and
 * `BlogIndex.tsx` both point at Dom's GitHub *profile* instead of this
 * repo (or its `reports/` folder) for as long as they did. Every value
 * below has been verified to resolve 200, publicly, logged out
 * (`curl -sIL`) — see that backlog item for the check.
 */
export const STUDIO_SITE_REPO_URL = 'https://github.com/dominiquebrom28/studio-site';

/** The `reports/` folder itself — where each team run's report lives
 * (PROJECT-BRIEF.md goal 3, `BACKLOG.md` "Run report format"). */
export const STUDIO_SITE_REPORTS_URL = `${STUDIO_SITE_REPO_URL}/tree/main/reports`;

/** No stable per-item anchor exists in `BACKLOG.md` today (docs/blog-format-v2.md
 * §6) — links go to the file itself, not a fragile line anchor. */
export const STUDIO_SITE_BACKLOG_URL = `${STUDIO_SITE_REPO_URL}/blob/main/BACKLOG.md`;
