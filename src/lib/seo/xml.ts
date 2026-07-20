import type { Post, Project } from '@/content/schemas';

/**
 * Pure, dependency-free XML string builders for `sitemap.xml` + the RSS
 * feed (BACKLOG "RSS/Atom feed + sitemap.xml", 2026-07-20). Kept separate
 * from `scripts/generate-seo-files.mjs` (the Node/Vite orchestration layer)
 * so this file — the part that actually assembles user-authored strings
 * into XML and is therefore the one place a raw `&` could produce an
 * invalid document — is unit-testable with plain `vitest run` (no Vite SSR,
 * no filesystem) via `xml.test.ts`.
 *
 * These functions do NOT parse frontmatter, validate schemas, derive slugs,
 * filter drafts, or sort — all of that stays in `src/content/loader.ts` /
 * `schemas.ts` and is reused as-is by the orchestrator script (spec §3.3;
 * "do not duplicate the content-parsing logic" per the backlog item). This
 * file only turns already-loaded, already-sorted, already-filtered
 * `Project[]` / `Post[]` into route lists and escaped XML strings.
 */

/**
 * The four static routes the app actually renders (see `src/router.tsx`'s
 * `routes` array — `/about` is in `docs/spec.md`'s route table as "optional,
 * phase 2" but is NOT an implemented route today, so it's deliberately
 * excluded here rather than sitemapped as a 404). `*` (NotFound) is excluded
 * per the backlog item's explicit requirement. Kept as a small hardcoded
 * list rather than introspected from `router.tsx`'s React-Router route
 * objects — the same pattern `scripts/check-deployed-routes.mjs` already
 * uses for the same reason (a `RouteObject[]` isn't a plain list of paths
 * without executing React/JSX, which this Node-side generation step has no
 * reason to do). Keep in sync with `src/router.tsx` by hand.
 */
export const STATIC_ROUTES: readonly string[] = ['/', '/projects', '/blog', '/cast'];

/** XML-escapes the five predefined entities. Every user-authored string
 * (title, summary, author, or any URL built from a slug) MUST pass through
 * this before landing in generated XML — a raw `&` (titles/summaries
 * regularly contain plain ampersands, em-dashes, and quotes) produces an
 * invalid feed/sitemap that most readers/crawlers will refuse to parse. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface SitemapEntry {
  /** Site-relative path, leading slash, no trailing slash (spec §2 canonical
   * URL rule), e.g. `/blog/some-post`. */
  path: string;
  /** ISO date (`YYYY-MM-DD`) — the sitemap protocol accepts a bare date. */
  lastmod: string;
}

/**
 * Every real, public, non-draft route: the four static pages plus one entry
 * per project and per post. `projects`/`posts` must already be the
 * production-visible, sorted arrays (drafts filtered, per `filterVisiblePosts`
 * in loader.ts) — this function does not filter or sort anything itself.
 */
export function buildSitemapEntries(
  projects: readonly Pick<Project, 'slug' | 'date'>[],
  posts: readonly Pick<Post, 'slug' | 'date'>[],
  buildDate: string,
): SitemapEntry[] {
  const staticEntries: SitemapEntry[] = STATIC_ROUTES.map((path) => ({ path, lastmod: buildDate }));
  const projectEntries: SitemapEntry[] = projects.map((project) => ({
    path: `/projects/${project.slug}`,
    lastmod: project.date,
  }));
  const postEntries: SitemapEntry[] = posts.map((post) => ({
    path: `/blog/${post.slug}`,
    lastmod: post.date,
  }));
  return [...staticEntries, ...projectEntries, ...postEntries];
}

/** Sitemap protocol (sitemaps.org 0.9) — `<loc>` + optional `<lastmod>` per
 * `<url>`. Deliberately omits `<changefreq>`/`<priority>`: both are hints
 * search engines have long since said they mostly ignore, and a hand-picked
 * priority per route would be an unverifiable guess (never invent facts). */
export function buildSitemapXml(baseUrl: string, entries: readonly SitemapEntry[]): string {
  const urls = entries.map((entry) => {
    const loc = escapeXml(`${baseUrl}${entry.path}`);
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n  </url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

export interface FeedItem {
  title: string;
  /** Site-relative path, e.g. `/blog/some-post`. */
  path: string;
  summary: string;
  /** ISO date (`YYYY-MM-DD`). */
  date: string;
  author: string;
}

/**
 * Feed items from an already draft-filtered, already `sortPosts`-ordered
 * `Post[]` (spec: "the same deterministic date→order→slug sort the site
 * already uses"). Deliberately does not re-sort or re-filter — the caller
 * (the orchestrator script) reuses `sortPosts`/`filterVisiblePosts` from
 * `src/content/loader.ts` directly, and this function trusts the order it's
 * handed, i.e. the feed is newest-first for free, with zero reimplemented
 * ordering logic.
 */
export function buildFeedItems(posts: readonly Post[]): FeedItem[] {
  return posts.map((post) => ({
    title: post.title,
    path: `/blog/${post.slug}`,
    summary: post.summary,
    date: post.date,
    author: post.author,
  }));
}

export interface FeedOptions {
  baseUrl: string;
  siteTitle: string;
  siteDescription: string;
  /** Site-relative path of the feed document itself, e.g. `/feed.xml` —
   * used for the required RSS `atom:link rel="self"` self-reference. */
  feedPath: string;
  items: readonly FeedItem[];
  /** Injectable for deterministic tests; defaults to "now". */
  now?: Date;
}

/**
 * RSS 2.0 (with the `atom:link rel="self"` extension RSS readers expect, and
 * `dc:creator` for attribution — RSS 2.0's own `<author>` element is
 * specified as an email address, which this site's posts don't have, so
 * `dc:creator` is the correct field for a plain display name rather than
 * abusing `<author>`). Chosen over Atom because RSS 2.0 needs no XML
 * namespace on the *content* elements (title/link/description), which keeps
 * this generator's escaping surface smaller and easier to verify by hand.
 */
export function buildRssXml(options: FeedOptions): string {
  const { baseUrl, siteTitle, siteDescription, feedPath, items, now = new Date() } = options;
  const selfLink = `${baseUrl}${feedPath}`;

  const itemsXml = items.map((item) => {
    const link = `${baseUrl}${item.path}`;
    const pubDate = new Date(`${item.date}T00:00:00Z`).toUTCString();
    return [
      '  <item>',
      `    <title>${escapeXml(item.title)}</title>`,
      `    <link>${escapeXml(link)}</link>`,
      `    <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `    <pubDate>${pubDate}</pubDate>`,
      `    <dc:creator>${escapeXml(item.author)}</dc:creator>`,
      `    <description>${escapeXml(item.summary)}</description>`,
      '  </item>',
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${escapeXml(siteTitle)}</title>`,
    `    <link>${escapeXml(baseUrl)}</link>`,
    `    <description>${escapeXml(siteDescription)}</description>`,
    '    <language>en</language>',
    `    <lastBuildDate>${now.toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(selfLink)}" rel="self" type="application/rss+xml" />`,
    ...itemsXml,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

/**
 * Appends a `Sitemap:` directive (the robots.txt convention every crawler
 * supports for pointing at a sitemap without a `Sitemap:` header/Search
 * Console submission — see Google Search Central's robots.txt spec) to an
 * existing robots.txt body. Idempotent: if the exact directive is already
 * present, the input is returned unchanged rather than duplicated (this
 * runs on every build).
 */
export function buildRobotsTxt(existingContent: string, sitemapUrl: string): string {
  const directive = `Sitemap: ${sitemapUrl}`;
  if (existingContent.includes(directive)) return existingContent;
  const trimmed = existingContent.replace(/\s+$/, '');
  return `${trimmed}\n\n${directive}\n`;
}
