#!/usr/bin/env node
/**
 * Build-time generation of `sitemap.xml`, `feed.xml`, and the robots.txt
 * `Sitemap:` reference — run as a `postbuild`-style step, AFTER `vite build`
 * (see the `build` script in package.json). BACKLOG: "RSS/Atom feed +
 * sitemap.xml" — both derived from the exact same content the site itself
 * renders, never hand-maintained.
 *
 * WHY THIS DOESN'T DUPLICATE THE CONTENT-PARSING LOGIC: frontmatter
 * splitting (`frontmatter.ts`), Zod validation + slug derivation
 * (`buildCollection` in `loader.ts`), the author-normalization rule
 * (`normalizePost`), draft-filtering (`filterVisiblePosts`), and the
 * date -> order -> slug sort (`sortProjects` / `sortPosts`) are all
 * IMPORTED from `src/content/loader.ts` / `schemas.ts` below and called
 * exactly as the app calls them. The only thing this script does itself is
 * list `content/**\/*.md` off disk (a few lines of `fs.readdirSync`, not
 * parsing) and turn the resulting `Project[]` / `Post[]` into XML via the
 * pure, unit-tested builders in `src/lib/seo/xml.ts`.
 *
 * WHY VITE'S PROGRAMMATIC API INSTEAD OF A NEW DEPENDENCY: this repo has a
 * standing preference for zero new npm packages (see BACKLOG history / the
 * PR review pattern of rejecting "one more small dep"). Running TypeScript
 * that itself contains `import.meta.glob`/aliases outside the browser
 * bundle normally reaches for `ts-node`/`tsx`/`jiti`. Vite is ALREADY a
 * devDependency and ships exactly this capability as its Node-side SSR
 * module runner (`createServer` + `ssrLoadModule`) — reusing it needs
 * nothing new in package.json.
 *
 * A DELIBERATE CORRECTNESS CHOICE, VERIFIED NOT ASSUMED: Vite's dev server
 * (which `createServer` always constructs, regardless of the `mode` option)
 * reports `import.meta.env.PROD === false` — confirmed empirically against
 * this exact vite.config.ts before writing this script, not assumed from
 * docs. That means `loader.ts`'s own top-level `posts`/`projects` exports
 * (which gate drafts on `import.meta.env.PROD`) are NOT safe to read here —
 * under this script they would include drafts. So this script never reads
 * those exports; it calls the underlying pure functions (`buildCollection`,
 * `normalizePost`, `filterVisiblePosts`, `sortProjects`, `sortPosts`)
 * directly and passes `isProd = true` explicitly. The generated feed and
 * sitemap must never contain a draft, full stop, regardless of how or in
 * what mode this script is invoked.
 */
import { createServer } from 'vite';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DIST_DIR = path.join(REPO_ROOT, 'dist');
const CONTENT_DIR = path.join(REPO_ROOT, 'content');

// Configurable base URL (backlog requirement: "Make the base URL
// configurable ... rather than hardcoding it in five places"). The
// confirmed-live production URL is the default so a plain `npm run build`
// (e.g. Vercel's build step, with no extra env config) produces correct
// absolute URLs out of the box; override with SITE_URL for a preview
// deploy or a future domain change.
const SITE_URL = (process.env.SITE_URL || 'https://doms-ai-studio.vercel.app').replace(/\/+$/, '');

const SITE_TITLE = "Dom's AI Studio";
// Same copy as the <meta name="description"> in index.html, kept in one
// place would be nicer still, but that's an HTML file, not a JS module —
// duplicating this one string (not logic) across the two is a reasonable
// stopping point.
const SITE_DESCRIPTION =
  "Dom's AI Studio — 1 human + 10 AI characters building software in the open. Portfolio and process, written down as it happens.";
const FEED_PATH = '/feed.xml';
const SITEMAP_PATH = '/sitemap.xml';

/** Reads `content/<dir>/*.md` off disk into the same `Record<path, raw>`
 * shape `import.meta.glob(..., { eager: true, query: '?raw' })` produces,
 * so it can be handed straight to `buildCollection` unchanged. This is
 * listing, not parsing — `buildCollection` still does 100% of the actual
 * frontmatter/Zod work. */
function readContentDir(contentDir, dir) {
  const full = path.join(contentDir, dir);
  if (!existsSync(full)) return {};
  const files = readdirSync(full).filter((file) => file.endsWith('.md'));
  const record = {};
  for (const file of files) {
    record[`/content/${dir}/${file}`] = readFileSync(path.join(full, file), 'utf8');
  }
  return record;
}

/**
 * Boots a Vite SSR server just long enough to load the three TS modules
 * this script needs, then closes it. Extracted + made an injectable
 * parameter of `loadContentAndBuilders` (QA testability pass — no behavior
 * change for the real CLI, which still uses this exact function) for the
 * identical reason `scripts/provenance/generate.mjs`'s sibling
 * `loadContentModules` already is: booting a real Vite dev server per test
 * is slow, and the whole point of a contract test here is to assert against
 * the REAL `loader.ts`/`schemas.ts`/`xml.ts` — which a plain `vitest`
 * process can already `import()` directly (it's a TS-aware runtime, unlike
 * the plain `node` CLI process this script normally runs under) — so tests
 * can inject a `loadModules` that skips the SSR boot but still exercises
 * every line of `loadContentAndBuilders` below against the real exports.
 */
async function defaultLoadModules(repoRoot) {
  const server = await createServer({
    root: repoRoot,
    configFile: path.join(repoRoot, 'vite.config.ts'),
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'error',
    // This script only ever loads three specific modules by path — never
    // the app's real entry (`index.html` -> `src/main.tsx`) — so Vite's
    // automatic dependency pre-bundling scan (which crawls from
    // `index.html` and pulls in react/react-dom/react-router/etc. for
    // nothing) is both wasted work and noisy stderr output here.
    optimizeDeps: { noDiscovery: true },
  });

  try {
    const loaderMod = await server.ssrLoadModule('/src/content/loader.ts');
    const schemasMod = await server.ssrLoadModule('/src/content/schemas.ts');
    const seoMod = await server.ssrLoadModule('/src/lib/seo/xml.ts');
    return { loaderMod, schemasMod, seoMod };
  } finally {
    await server.close();
  }
}

/**
 * @param {object} [options]
 * @param {string} [options.repoRoot]
 * @param {string} [options.contentDir]
 * @param {(repoRoot: string) => Promise<{loaderMod: any, schemasMod: any, seoMod: any}>} [options.loadModules]
 */
export async function loadContentAndBuilders({
  repoRoot = REPO_ROOT,
  contentDir = CONTENT_DIR,
  loadModules = defaultLoadModules,
} = {}) {
  const { loaderMod, schemasMod, seoMod } = await loadModules(repoRoot);

  const projectFiles = readContentDir(contentDir, 'projects');
  const postFiles = readContentDir(contentDir, 'posts');

  const rawProjects = loaderMod.buildCollection(projectFiles, schemasMod.ProjectFrontmatterSchema, 'project');
  const rawPosts = loaderMod.buildCollection(postFiles, schemasMod.PostFrontmatterSchema, 'post');

  const normalizedPosts = rawPosts.map(loaderMod.normalizePost);
  // `isProd: true` — see the file-level comment above for why this is
  // hardcoded rather than read from `import.meta.env.PROD`.
  const visiblePosts = loaderMod.filterVisiblePosts(normalizedPosts, true);

  return {
    projects: loaderMod.sortProjects(rawProjects),
    posts: loaderMod.sortPosts(visiblePosts),
    seo: seoMod,
  };
}

async function main() {
  if (!existsSync(DIST_DIR)) {
    throw new Error(
      `[generate-seo-files] dist/ not found at "${DIST_DIR}" — this script must run AFTER "vite build" ` +
        '(see the "build" script in package.json).',
    );
  }

  const { projects, posts, seo } = await loadContentAndBuilders();

  const buildDate = new Date().toISOString().slice(0, 10);

  const sitemapEntries = seo.buildSitemapEntries(projects, posts, buildDate);
  const sitemapXml = seo.buildSitemapXml(SITE_URL, sitemapEntries);
  writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf8');

  const feedItems = seo.buildFeedItems(posts);
  const feedXml = seo.buildRssXml({
    baseUrl: SITE_URL,
    siteTitle: SITE_TITLE,
    siteDescription: SITE_DESCRIPTION,
    feedPath: FEED_PATH,
    items: feedItems,
  });
  writeFileSync(path.join(DIST_DIR, 'feed.xml'), feedXml, 'utf8');

  // `dist/robots.txt` already exists at this point — Vite's `vite build`
  // copies `public/robots.txt` verbatim before this script runs. Append the
  // Sitemap directive (needs the configurable, possibly-non-default
  // SITE_URL, so it can't be hand-written as a static string in
  // public/robots.txt) rather than overwriting the file outright.
  const robotsPath = path.join(DIST_DIR, 'robots.txt');
  const existingRobots = existsSync(robotsPath) ? readFileSync(robotsPath, 'utf8') : 'User-agent: *\nAllow: /\n';
  const updatedRobots = seo.buildRobotsTxt(existingRobots, `${SITE_URL}${SITEMAP_PATH}`);
  writeFileSync(robotsPath, updatedRobots, 'utf8');

  console.log(
    `[generate-seo-files] wrote sitemap.xml (${sitemapEntries.length} URLs) and feed.xml ` +
      `(${feedItems.length} post${feedItems.length === 1 ? '' : 's'}); updated robots.txt. Base URL: ${SITE_URL}`,
  );
}

// Guards the CLI invocation so this module can be safely `import()`-ed by
// tests (`scripts/generate-seo-files.test.ts`) without running `main()` —
// same guard, same reasoning, as `scripts/provenance/generate.mjs`.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main().catch((error) => {
    console.error('[generate-seo-files] FAILED:', error);
    process.exitCode = 1;
  });
}
