import { describe, it, expect } from 'vitest';
import {
  escapeXml,
  buildSitemapEntries,
  buildSitemapXml,
  buildFeedItems,
  buildRssXml,
  buildRobotsTxt,
  STATIC_ROUTES,
  type SitemapEntry,
  type FeedItem,
} from './xml';
import type { Post, Project } from '@/content/schemas';

/** Matches any `&` NOT already the start of one of the five predefined XML
 * entities — the exact bug class this whole feature exists to prevent
 * (backlog item: "a raw `&` will produce an invalid feed"). */
const UNESCAPED_AMPERSAND = /&(?!amp;|lt;|gt;|quot;|apos;)/;

function project(overrides: Partial<Pick<Project, 'slug' | 'date'>> = {}): Pick<Project, 'slug' | 'date'> {
  return { slug: 'test-project', date: '2026-01-01', ...overrides };
}

function post(overrides: Partial<Post> = {}): Post {
  return {
    title: 'Test Post',
    slug: 'test-post',
    date: '2026-01-01',
    summary: 'A test post.',
    tags: [],
    draft: false,
    body: 'Body.',
    author: 'Dom',
    authors: ['Dom'],
    ...overrides,
  };
}

describe('escapeXml', () => {
  it('escapes all five XML predefined entity characters', () => {
    expect(escapeXml('Fish & Chips')).toBe('Fish &amp; Chips');
    expect(escapeXml('<script>')).toBe('&lt;script&gt;');
    expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeXml("it's")).toBe('it&apos;s');
  });

  it('escapes ampersand BEFORE the other entities so entities are not double-escaped', () => {
    // A naive "replace & last" implementation would turn `<` into `&lt;`
    // then `&` into `&amp;`, producing the broken `&amp;lt;`.
    expect(escapeXml('<')).toBe('&lt;');
    expect(escapeXml('&lt;')).toBe('&amp;lt;');
  });

  it('handles em-dashes, real post-title punctuation, and mixed special characters together', () => {
    const input = `Six runs in — "process & product," Dom's take`;
    const out = escapeXml(input);
    expect(out).not.toMatch(UNESCAPED_AMPERSAND);
    expect(out).not.toContain('"process');
    expect(out).not.toContain("Dom's");
    // Em-dash itself is not an XML special character — passes through.
    expect(out).toContain('—');
  });

  it('is a no-op on a string with no special characters', () => {
    expect(escapeXml('Plain title')).toBe('Plain title');
  });
});

describe('buildSitemapEntries', () => {
  it('includes exactly the four static routes plus one entry per project and per post', () => {
    const entries = buildSitemapEntries(
      [project({ slug: 'a' }), project({ slug: 'b' })],
      [post({ slug: 'c' }), post({ slug: 'd' }), post({ slug: 'e' })],
      '2026-07-20',
    );

    expect(entries).toHaveLength(STATIC_ROUTES.length + 2 + 3);
    for (const staticPath of STATIC_ROUTES) {
      expect(entries.some((e) => e.path === staticPath)).toBe(true);
    }
    expect(entries.some((e) => e.path === '/projects/a')).toBe(true);
    expect(entries.some((e) => e.path === '/projects/b')).toBe(true);
    expect(entries.some((e) => e.path === '/blog/c')).toBe(true);
    expect(entries.some((e) => e.path === '/blog/d')).toBe(true);
    expect(entries.some((e) => e.path === '/blog/e')).toBe(true);
  });

  it('never includes the 404 (*) route', () => {
    const entries = buildSitemapEntries([], [], '2026-07-20');
    expect(entries.some((e) => e.path === '*' || e.path.includes('*'))).toBe(false);
  });

  it('trusts the caller for draft-filtering — passing zero posts yields zero post entries', () => {
    // (Draft exclusion is proven at the loader level — filterVisiblePosts —
    // and re-proven end-to-end in generate-seo-files; this only proves
    // buildSitemapEntries adds no posts of its own.)
    const entries = buildSitemapEntries([], [], '2026-07-20');
    expect(entries).toHaveLength(STATIC_ROUTES.length);
  });

  it('uses each project/post own `date` as lastmod, and the passed buildDate for static routes', () => {
    const entries = buildSitemapEntries(
      [project({ slug: 'p1', date: '2026-05-01' })],
      [post({ slug: 'post1', date: '2026-06-01' })],
      '2026-07-20',
    );
    expect(entries.find((e) => e.path === '/')?.lastmod).toBe('2026-07-20');
    expect(entries.find((e) => e.path === '/projects/p1')?.lastmod).toBe('2026-05-01');
    expect(entries.find((e) => e.path === '/blog/post1')?.lastmod).toBe('2026-06-01');
  });
});

describe('buildSitemapXml', () => {
  const entries: SitemapEntry[] = [
    { path: '/', lastmod: '2026-07-20' },
    { path: '/blog/fish-&-chips', lastmod: '2026-07-19' },
  ];

  it('produces a urlset with the sitemaps.org namespace and one <url> per entry', () => {
    const xml = buildSitemapXml('https://example.com', entries);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect((xml.match(/<url>/g) ?? []).length).toBe(entries.length);
    expect((xml.match(/<\/url>/g) ?? []).length).toBe(entries.length);
  });

  it('escapes a raw & in a URL path and never emits an unescaped one', () => {
    const xml = buildSitemapXml('https://example.com', entries);
    expect(xml).toContain('https://example.com/blog/fish-&amp;-chips');
    expect(xml).not.toMatch(UNESCAPED_AMPERSAND);
  });

  it('includes a <lastmod> for every entry', () => {
    const xml = buildSitemapXml('https://example.com', entries);
    expect((xml.match(/<lastmod>/g) ?? []).length).toBe(entries.length);
  });

  it('produces zero <url> entries for an empty entry list without erroring', () => {
    const xml = buildSitemapXml('https://example.com', []);
    expect(xml).toContain('<urlset');
    expect(xml).not.toContain('<url>');
  });
});

describe('buildFeedItems', () => {
  it('maps posts to feed items with a /blog/:slug path, preserving input order', () => {
    const posts = [post({ slug: 'newest', title: 'Newest' }), post({ slug: 'oldest', title: 'Oldest' })];
    const items = buildFeedItems(posts);
    expect(items.map((i) => i.path)).toEqual(['/blog/newest', '/blog/oldest']);
    expect(items.map((i) => i.title)).toEqual(['Newest', 'Oldest']);
  });

  it('does not reorder — trusts the caller already applied sortPosts', () => {
    // Deliberately out-of-date-order input; buildFeedItems must not silently
    // re-sort (that would be a second, drifting implementation of the site's
    // date -> order -> slug sort rule).
    const posts = [post({ slug: 'older', date: '2026-01-01' }), post({ slug: 'newer', date: '2026-02-01' })];
    const items = buildFeedItems(posts);
    expect(items.map((i) => i.path)).toEqual(['/blog/older', '/blog/newer']);
  });
});

describe('buildRssXml', () => {
  const now = new Date('2026-07-20T12:00:00Z');

  function feedItem(overrides: Partial<FeedItem> = {}): FeedItem {
    return {
      title: 'Test Item',
      path: '/blog/test-item',
      summary: 'A summary.',
      date: '2026-07-19',
      author: 'Dom',
      ...overrides,
    };
  }

  it('produces valid-shaped RSS 2.0 with a self-referencing atom:link', () => {
    const xml = buildRssXml({
      baseUrl: 'https://example.com',
      siteTitle: 'Test Site',
      siteDescription: 'A test site.',
      feedPath: '/feed.xml',
      items: [feedItem()],
      now,
    });
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
    expect(xml).toContain('<atom:link href="https://example.com/feed.xml" rel="self" type="application/rss+xml" />');
    expect((xml.match(/<item>/g) ?? []).length).toBe(1);
  });

  it('is sorted newest-first is the CALLER responsibility, not re-derived here — item order == input order', () => {
    const xml = buildRssXml({
      baseUrl: 'https://example.com',
      siteTitle: 'Test Site',
      siteDescription: 'A test site.',
      feedPath: '/feed.xml',
      items: [feedItem({ path: '/blog/newest' }), feedItem({ path: '/blog/oldest' })],
      now,
    });
    const newestIndex = xml.indexOf('/blog/newest');
    const oldestIndex = xml.indexOf('/blog/oldest');
    expect(newestIndex).toBeGreaterThan(-1);
    expect(oldestIndex).toBeGreaterThan(newestIndex);
  });

  it('XML-escapes title, summary, and author — em-dashes, quotes, and a raw ampersand', () => {
    const xml = buildRssXml({
      baseUrl: 'https://example.com',
      siteTitle: 'Test Site',
      siteDescription: 'A test site.',
      feedPath: '/feed.xml',
      items: [
        feedItem({
          title: `Six runs in — "process & product," Dom's take`,
          summary: 'Testing & verifying <tags> in "quotes" — it works.',
          author: "O'Brien & Sons",
        }),
      ],
      now,
    });
    expect(xml).not.toMatch(UNESCAPED_AMPERSAND);
    expect(xml).not.toContain('<tags>');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;');
    expect(xml).toContain('&apos;');
  });

  it('renders a real pubDate derived from the item date, not the empty/invalid string', () => {
    const xml = buildRssXml({
      baseUrl: 'https://example.com',
      siteTitle: 'Test Site',
      siteDescription: 'A test site.',
      feedPath: '/feed.xml',
      items: [feedItem({ date: '2026-07-19' })],
      now,
    });
    expect(xml).toContain('<pubDate>Sun, 19 Jul 2026 00:00:00 GMT</pubDate>');
  });

  it('produces a valid channel with zero items for an empty feed (empty state)', () => {
    const xml = buildRssXml({
      baseUrl: 'https://example.com',
      siteTitle: 'Test Site',
      siteDescription: 'A test site.',
      feedPath: '/feed.xml',
      items: [],
      now,
    });
    expect(xml).toContain('<channel>');
    expect(xml).not.toContain('<item>');
  });

  it('credits the author via dc:creator, not the email-shaped RSS <author> element', () => {
    const xml = buildRssXml({
      baseUrl: 'https://example.com',
      siteTitle: 'Test Site',
      siteDescription: 'A test site.',
      feedPath: '/feed.xml',
      items: [feedItem({ author: 'Dom' })],
      now,
    });
    expect(xml).toContain('<dc:creator>Dom</dc:creator>');
    expect(xml).not.toMatch(/<author>/);
  });
});

describe('buildRobotsTxt', () => {
  it('appends a Sitemap directive to existing content', () => {
    const result = buildRobotsTxt('User-agent: *\nAllow: /', 'https://example.com/sitemap.xml');
    expect(result).toContain('User-agent: *');
    expect(result).toContain('Allow: /');
    expect(result).toContain('Sitemap: https://example.com/sitemap.xml');
  });

  it('is idempotent — running it twice does not duplicate the directive', () => {
    const once = buildRobotsTxt('User-agent: *\nAllow: /', 'https://example.com/sitemap.xml');
    const twice = buildRobotsTxt(once, 'https://example.com/sitemap.xml');
    expect(twice).toBe(once);
    expect((twice.match(/Sitemap:/g) ?? []).length).toBe(1);
  });

  it('works starting from an empty robots.txt', () => {
    const result = buildRobotsTxt('', 'https://example.com/sitemap.xml');
    expect(result).toContain('Sitemap: https://example.com/sitemap.xml');
  });
});
