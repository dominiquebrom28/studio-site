/**
 * Hand-written ambient declarations for `generate-seo-files.mjs` — see
 * `scripts/provenance/generate.d.mts`'s header comment for why this file
 * exists and why it's `.d.mts` (matching TypeScript's `Bundler` resolution
 * for a `.mjs` module's sibling declaration) rather than `allowJs`-based
 * JSDoc inference across the whole implementation file.
 */
import type { Project, Post } from '../src/content/schemas';
import type * as SeoXml from '../src/lib/seo/xml';

export interface LoadedSeoModules {
  loaderMod: Record<string, unknown>;
  schemasMod: Record<string, unknown>;
  seoMod: typeof SeoXml;
}

export interface LoadContentAndBuildersOptions {
  repoRoot?: string;
  contentDir?: string;
  loadModules?: (repoRoot: string) => Promise<LoadedSeoModules>;
}

export interface ContentAndBuilders {
  projects: Project[];
  posts: Post[];
  seo: typeof SeoXml;
}

export function loadContentAndBuilders(options?: LoadContentAndBuildersOptions): Promise<ContentAndBuilders>;
