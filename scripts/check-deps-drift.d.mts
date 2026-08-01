/**
 * Hand-written ambient declarations for `check-deps-drift.mjs` — see
 * `scripts/provenance/generate.d.mts`'s header comment for why this file
 * exists and why it's `.d.mts` (matching TypeScript's `Bundler` resolution
 * for a `.mjs` module's sibling declaration) rather than `allowJs`-based
 * JSDoc inference across the whole implementation file.
 */

export type DependencyKind = 'dependencies' | 'devDependencies' | 'optionalDependencies';

export interface DeclaredDependency {
  name: string;
  range: string;
  kind: DependencyKind;
}

export interface MissingDependency extends DeclaredDependency {}

export interface MismatchedDependency extends DeclaredDependency {
  installedVersion: string;
}

export interface UnverifiableDependency extends DeclaredDependency {
  installedVersion?: string;
  note: string;
}

export interface NodeModulesInfo {
  exists: boolean;
  nodeModulesPath: string;
  isSymlink: boolean;
  realTarget?: string;
  fixDir: string;
}

export interface CheckDepsDriftResult {
  status: 'clean' | 'drift' | 'inconclusive';
  reason?: string;
  missing: MissingDependency[];
  mismatched: MismatchedDependency[];
  unverifiable: UnverifiableDependency[];
  nodeModulesInfo: NodeModulesInfo | null;
  declaredCount?: number;
}

export interface CheckDepsDriftOptions {
  repoRoot?: string;
}

export function checkDepsDrift(options?: CheckDepsDriftOptions): CheckDepsDriftResult;
