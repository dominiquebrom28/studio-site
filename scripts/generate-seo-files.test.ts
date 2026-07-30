import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContentAndBuilders } from './generate-seo-files.mjs';
import * as loader from '../src/content/loader';
import * as schemas from '../src/content/schemas';
import * as seoXml from '../src/lib/seo/xml';

/**
 * Contract tests for `generate-seo-files.mjs` — the ~23 tests in
 * `src/lib/seo/xml.test.ts` cover the pure XML builders in isolation, and
 * `src/content/loader.test.ts` covers `sortPosts` / `sortProjects` /
 * `filterVisiblePosts` as pure functions. Neither suite asserts the thing
 * this generator's own header comment stakes its whole design on: that it
 * actually WIRES those real functions together — via the real loader, with
 * `isProd: true` hardcoded (not `import.meta.env.PROD`, which the header
 * comment documents as empirically false under `ssrLoadModule`) — so drafts
 * can never leak and sort order can never silently drift from the site's.
 * This file closes that gap.
 */

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(DIRNAME, '..');

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Test double for the Vite `ssrLoadModule` boot in `generate-seo-files.mjs`'s
 * real `defaultLoadModules`: returns the REAL `loader.ts` / `schemas.ts` /
 * `xml.ts` exports (imported directly by Vitest, which — unlike the plain
 * `node` process this script runs under in `npm run build` — can import
 * `.ts` with no loader) rather than a duplicated/mocked shape, so this
 * suite fails the moment the real loader's exports or behavior drift. Same
 * pattern as `scripts/provenance/generate.test.ts`'s `fakeLoadModules`.
 */
async function realModules() {
  return { loaderMod: loader, schemasMod: schemas, seoMod: seoXml };
}

interface FixtureSpec {
  projects?: Record<string, string>;
  posts?: Record<string, string>;
}

function makeFixtureContentDir(spec: FixtureSpec): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'seo-gen-fixture-'));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, 'projects'), { recursive: true });
  mkdirSync(path.join(dir, 'posts'), { recursive: true });
  for (const [name, content] of Object.entries(spec.projects ?? {})) {
    writeFileSync(path.join(dir, 'projects', name), content, 'utf8');
  }
  for (const [name, content] of Object.entries(spec.posts ?? {})) {
    writeFileSync(path.join(dir, 'posts', name), content, 'utf8');
  }
  return dir;
}

function projectFixture(overrides: Partial<{ title: string; date: string }> = {}): string {
  const title = overrides.title ?? 'Fixture Project';
  const date = overrides.date ?? '2026-01-01';
  return `---\ntitle: "${title}"\nsummary: "A fixture project for generator contract tests."\nstack: ["TypeScript"]\nstatus: "shipped"\ndate: "${date}"\n---\nBody.\n`;
}

function postFixture({
  title,
  date,
  draft = false,
  order,
}: {
  title: string;
  date: string;
  draft?: boolean;
  order?: number;
}): string {
  const orderLine = order !== undefined ? `\norder: ${order}` : '';
  return `---\ntitle: "${title}"\ndate: "${date}"\nsummary: "Fixture post: ${title}."\ntags: ["fixture"]\ndraft: ${draft}${orderLine}\n---\nBody of "${title}".\n`;
}

describe('loadContentAndBuilders — draft exclusion is wired end-to-end (contract points b + c)', () => {
  it('excludes a draft post from the loaded posts array, and from BOTH the rendered sitemap and feed XML', async () => {
    const contentDir = makeFixtureContentDir({
      projects: { 'fixture-project.md': projectFixture() },
      posts: {
        'published.md': postFixture({ title: 'Published Post', date: '2026-01-02', draft: false }),
        'a-draft.md': postFixture({ title: 'Secret Draft', date: '2026-01-03', draft: true }),
      },
    });

    const { projects, posts, seo } = await loadContentAndBuilders({ contentDir, loadModules: realModules });

    expect(posts.map((p) => p.slug)).toEqual(['published']);
    expect(posts.some((p) => p.slug === 'a-draft')).toBe(false);

    const sitemapXml = seo.buildSitemapXml('https://example.test', seo.buildSitemapEntries(projects, posts, '2026-01-10'));
    const feedXml = seo.buildRssXml({
      baseUrl: 'https://example.test',
      siteTitle: 'Test',
      siteDescription: 'Test feed',
      feedPath: '/feed.xml',
      items: seo.buildFeedItems(posts),
    });

    expect(sitemapXml).not.toContain('a-draft');
    expect(sitemapXml).toContain('/blog/published');
    expect(feedXml).not.toContain('Secret Draft');
    expect(feedXml).toContain('Published Post');
  });

  it('would leak a draft if the generator ever stopped passing isProd:true — proven via a real Vite SSR boot, not the injected fake', async () => {
    // No `loadModules` override here: this exercises `defaultLoadModules`,
    // the actual production code path, which boots a real Vite dev server
    // and calls the real `ssrLoadModule('/src/content/loader.ts')`. This is
    // the single most faithful regression test for the header comment's
    // documented, empirically-verified claim that `import.meta.env.PROD` is
    // false under `ssrLoadModule` — if the hardcoded `isProd: true` literal
    // were ever swapped for that env read, THIS test (unlike a plain
    // vitest-only fake-module test, which could theoretically differ from
    // real Vite SSR behavior) would catch it because it runs the real boot.
    const contentDir = makeFixtureContentDir({
      posts: {
        'published.md': postFixture({ title: 'Published Post', date: '2026-01-02', draft: false }),
        'a-draft.md': postFixture({ title: 'Secret Draft', date: '2026-01-03', draft: true }),
      },
    });

    const { posts } = await loadContentAndBuilders({ contentDir });
    expect(posts.map((p) => p.slug)).toEqual(['published']);
  }, 20_000);
});

describe('loadContentAndBuilders — sort order is wired to the real sortPosts/sortProjects, not reimplemented or dropped', () => {
  it('orders posts by the real date -> order -> slug chain, NOT filesystem/glob (alphabetical filename) order', async () => {
    // Filenames are deliberately alphabetical (a, b, c, d) in an order that
    // does NOT match the expected date/order-sorted output — if the
    // generator ever stopped calling `sortPosts` (e.g. returned
    // `visiblePosts` unsorted, or reused glob order), this test's expected
    // order and the actual order would diverge.
    const contentDir = makeFixtureContentDir({
      posts: {
        'a-early.md': postFixture({ title: 'Early', date: '2026-01-01' }),
        'b-late.md': postFixture({ title: 'Late', date: '2026-01-05' }),
        'c-mid-tiebreak-1.md': postFixture({ title: 'Mid Low Order', date: '2026-01-03', order: 1 }),
        'd-mid-tiebreak-2.md': postFixture({ title: 'Mid High Order', date: '2026-01-03', order: 5 }),
      },
    });

    const { posts } = await loadContentAndBuilders({ contentDir, loadModules: realModules });

    expect(posts.map((p) => p.slug)).toEqual(['b-late', 'd-mid-tiebreak-2', 'c-mid-tiebreak-1', 'a-early']);
  });

  it('orders projects by the real order -> date -> slug chain (sortProjects), not filesystem order', async () => {
    const contentDir = makeFixtureContentDir({
      projects: {
        'a-no-order.md': projectFixture({ title: 'No Order', date: '2026-01-01' }),
        'b-order-2.md': projectFixture({ title: 'Order Two', date: '2026-01-01' }),
        'c-order-1.md': projectFixture({ title: 'Order One', date: '2026-01-01' }),
      },
    });
    // `order` isn't in the small `projectFixture` helper's signature, so
    // hand-append it here rather than growing that helper's surface for a
    // single test.
    writeFileSync(
      path.join(contentDir, 'projects', 'b-order-2.md'),
      projectFixture({ title: 'Order Two', date: '2026-01-01' }).replace('status: "shipped"', 'status: "shipped"\norder: 2'),
      'utf8',
    );
    writeFileSync(
      path.join(contentDir, 'projects', 'c-order-1.md'),
      projectFixture({ title: 'Order One', date: '2026-01-01' }).replace('status: "shipped"', 'status: "shipped"\norder: 1'),
      'utf8',
    );

    const { projects } = await loadContentAndBuilders({ contentDir, loadModules: realModules });

    // order ascending first (1 before 2), items with no `order` sort last.
    expect(projects.map((p) => p.slug)).toEqual(['c-order-1', 'b-order-2', 'a-no-order']);
  });
});

describe('loadContentAndBuilders — a renamed/removed loader export fails loudly, not silently', () => {
  it('rejects (rather than silently returning an empty/partial feed) when `sortPosts` is missing from the loader module', async () => {
    const contentDir = makeFixtureContentDir({
      posts: { 'only-post.md': postFixture({ title: 'Only Post', date: '2026-01-01' }) },
    });
    const brokenLoaderMod: Record<string, unknown> = { ...loader };
    delete brokenLoaderMod.sortPosts;

    await expect(
      loadContentAndBuilders({
        contentDir,
        loadModules: async () => ({ loaderMod: brokenLoaderMod, schemasMod: schemas, seoMod: seoXml }),
      }),
    ).rejects.toThrow(/sortPosts/);
  });

  it('rejects (rather than silently shipping drafts) when `filterVisiblePosts` is missing from the loader module', async () => {
    const contentDir = makeFixtureContentDir({
      posts: { 'only-post.md': postFixture({ title: 'Only Post', date: '2026-01-01' }) },
    });
    const brokenLoaderMod: Record<string, unknown> = { ...loader };
    delete brokenLoaderMod.filterVisiblePosts;

    await expect(
      loadContentAndBuilders({
        contentDir,
        loadModules: async () => ({ loaderMod: brokenLoaderMod, schemasMod: schemas, seoMod: seoXml }),
      }),
    ).rejects.toThrow(/filterVisiblePosts/);
  });
});

describe('generate-seo-files.mjs — loads the real loader.ts, not a copy (contract point a)', () => {
  it('calls ssrLoadModule with the exact real repo-relative path to loader.ts', () => {
    const source = readFileSync(path.join(REPO_ROOT, 'scripts', 'generate-seo-files.mjs'), 'utf8');
    expect(source).toContain("server.ssrLoadModule('/src/content/loader.ts')");
  });
});
