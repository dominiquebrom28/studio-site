#!/usr/bin/env node
/**
 * Plain HTTP smoke check against a REAL deployed URL (Vercel preview or
 * production) — deliberately not a browser at all.
 *
 * WHY THIS EXISTS: 2026-07-18, every route except `/` returned 404 in
 * production because the SPA had no rewrite rule (fixed by `vercel.json`,
 * PR #9). `localhost` stayed green throughout the incident because Vite's
 * dev server does the SPA fallback silently — so neither `npm run dev` nor
 * a jsdom-mounted smoke test (src/smoke/routes.smoke.test.tsx) would ever
 * see this class of bug: they never talk to the actual hosting/routing
 * layer. The only thing that reproduces it is asking a REAL deployed URL
 * for a REAL non-root path and checking what comes back. A full browser
 * (Playwright etc.) buys nothing extra here — the failure mode is entirely
 * at the HTTP layer (wrong status / wrong body), not anything a DOM or a
 * screenshot would reveal that a raw fetch() doesn't already show.
 *
 * WHAT IT CHECKS, per route: the response is `200 OK` (a rewrite-less SPA
 * 404s on any non-root path; a redirect loop or 5xx is caught the same way)
 * and the body actually contains the app shell (`<div id="root">`) rather
 * than some other 200 (e.g. a hosting provider's custom "soft 404" page
 * that returns status 200 with the wrong content).
 *
 * WHY IT SKIPS CLEANLY WITH NO URL: this script must never make the
 * PR-time `CI / build` check depend on a deployment that may not exist yet
 * (a fresh PR's Vercel preview can take longer to build than CI, or Vercel
 * previews may not be wired to fire an event this repo listens for at all
 * yet — see `.github/workflows/ci.yml`'s `deployed-smoke` job and its
 * comment for exactly how Dom turns this on). No URL configured -> this
 * exits 0 with a clearly visible "SKIPPED" message, not a silent no-op and
 * not a failure.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const targetUrl = process.argv[2] || process.env.SMOKE_URL || process.env.DEPLOYED_SMOKE_URL || '';

if (!targetUrl) {
  console.log('[check-deployed-routes] SKIPPED — no deployed URL supplied.');
  console.log('[check-deployed-routes] Pass one via `npm run smoke:deployed -- <url>`,');
  console.log('[check-deployed-routes] or set SMOKE_URL / DEPLOYED_SMOKE_URL in the environment.');
  console.log('[check-deployed-routes] See .github/workflows/ci.yml (job: deployed-smoke) for how CI wires this.');
  process.exit(0);
}

const base = targetUrl.replace(/\/+$/, '');

/**
 * Effective slug for one content file — an explicit frontmatter `slug:`
 * override if present, else the filename stem (matches `slugFromPath` in
 * src/content/loader.ts). Deliberately NOT a full frontmatter parse (no
 * `js-yaml` import here, on purpose — this script has zero dependencies
 * beyond Node itself): a plain regex is enough to pick ONE real, resolvable
 * route to probe. Full frontmatter validation is `validate:content`'s job,
 * not this HTTP-layer check's.
 */
function firstSlug(dir) {
  const files = readdirSync(path.join(REPO_ROOT, 'content', dir)).filter((f) => f.endsWith('.md'));
  if (files.length === 0) return null;

  const file = files[0];
  const raw = readFileSync(path.join(REPO_ROOT, 'content', dir, file), 'utf8');
  const explicit = /^\s*slug:\s*["']?([a-z0-9-]+)["']?\s*$/m.exec(raw);
  return explicit ? explicit[1] : file.replace(/\.md$/, '');
}

const projectSlug = firstSlug('projects');
const postSlug = firstSlug('posts');

const routes = ['/', '/projects', '/blog', '/cast'];
if (projectSlug) routes.push(`/projects/${projectSlug}`);
if (postSlug) routes.push(`/blog/${postSlug}`);

const APP_SHELL_MARKER = 'id="root"';

async function checkRoute(routePath) {
  const url = `${base}${routePath}`;
  let response;
  try {
    response = await fetch(url, { redirect: 'follow' });
  } catch (error) {
    return { routePath, ok: false, reason: `request failed: ${error instanceof Error ? error.message : String(error)}` };
  }

  if (response.status !== 200) {
    return { routePath, ok: false, reason: `expected 200, got ${response.status}` };
  }

  const body = await response.text();
  if (!body.includes(APP_SHELL_MARKER)) {
    return { routePath, ok: false, reason: `200 but body missing app shell (no ${APP_SHELL_MARKER}) — likely a hosting-provider soft-404 page` };
  }

  return { routePath, ok: true };
}

console.log(`[check-deployed-routes] Checking ${routes.length} route(s) against ${base}`);

const results = await Promise.all(routes.map(checkRoute));

let allOk = true;
for (const result of results) {
  if (result.ok) {
    console.log(`  OK    ${result.routePath}`);
  } else {
    allOk = false;
    console.error(`  FAIL  ${result.routePath} — ${result.reason}`);
  }
}

if (!allOk) {
  console.error('[check-deployed-routes] FAILED — one or more routes did not serve the app shell with a 200.');
  process.exit(1);
}

console.log('[check-deployed-routes] All routes OK.');
