#!/usr/bin/env node
/**
 * Joins validated `yaml provenance` blocks (`parse.mjs`) against `git log`
 * to produce `src/content/provenance.generated.json` — the per-file
 * provenance artifact (`docs/provenance-model.md` §5.1). Implements EVERY
 * row of §5.2's failure table; see the inline comment at each check for
 * which row it is.
 *
 * WIRED into `predev` / `prebuild` / `pretest` (package.json) — regenerated
 * on every dev start, test run, and build, and gitignored (§5.2: "the
 * design removes the possibility of drift rather than policing it").
 *
 * SECURITY (§7, binding): every `produced` path is validated as
 * repo-relative with no `..` BEFORE it is ever touched by `fs` or `git`,
 * and every git invocation goes through `execFileSync` with an argument
 * array — never a shell, never string interpolation. A `--` separator
 * additionally pins every path argument as a positional path, not an
 * option, even for a (rejected) path starting with `-`.
 *
 * WHY VITE'S `ssrLoadModule` TO REACH `src/content/provenance-schema.ts` /
 * `src/content/cast.ts`: this is a plain `node` CLI process, which cannot
 * import `.ts` directly. This repo's established, zero-new-dependency
 * answer (see `scripts/generate-seo-files.mjs`'s header comment, which
 * already does exactly this for `loader.ts`/`schemas.ts`) is Vite's
 * programmatic dev server + SSR module loader — no `ts-node`/`tsx`/`jiti`
 * dependency needed.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { parseAllReports, ProvenanceValidationError, readReportFiles } from './parse.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');
export const OUTPUT_PATH = path.join(REPO_ROOT, 'src', 'content', 'provenance.generated.json');

/** Distinct from `ProvenanceValidationError` on purpose: a git failure is
 * an INFRASTRUCTURE problem (§5.2: "Non-negotiable. A silent `commit: null`
 * here is indistinguishable from ... an infrastructure failure would
 * quietly become a factual claim"), not a content problem, even though both
 * are surfaced as loud build errors. Keeping the two error classes distinct
 * lets tests (and future callers) assert on which failure mode fired. */
export class ProvenanceGitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProvenanceGitError';
  }
}

/** Default `gitRunner`: runs a real `git` subprocess via `execFileSync`
 * (array args, no shell — see the file header). Injectable so tests can
 * simulate "git not installed" / "shallow clone" / specific `git log`
 * output without needing a real repository fixture on disk. */
function defaultGitRunner({ cwd, args }) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

function runGit(gitRunner, cwd, args, context) {
  try {
    return gitRunner({ cwd, args });
  } catch (error) {
    const detail = error && typeof error.stderr === 'string' ? error.stderr.trim() : error?.message ?? String(error);
    throw new ProvenanceGitError(`\`git ${args.join(' ')}\` failed${context ? ` (${context})` : ''}: ${detail}`);
  }
}

/** §5.2 row: "`git` command fails (not installed, shallow clone, not a
 * repo)" -> build fails, loudly, unconditionally — BEFORE any per-file
 * resolution is attempted. A shallow clone does not make `git log` error;
 * it silently truncates history, which would otherwise be indistinguishable
 * from the legitimate "no commit yet" case. `--is-shallow-repository` is
 * the one direct, mechanical check for that, so it's asserted up front
 * rather than inferred from an empty `git log` result. */
function assertGitAvailable(gitRunner, repoRoot) {
  const output = runGit(gitRunner, repoRoot, ['rev-parse', '--is-shallow-repository'], 'checking repository availability').trim();
  if (output === 'true') {
    throw new ProvenanceGitError(
      'Repository is a shallow clone (`git rev-parse --is-shallow-repository` -> true). ' +
        '`git log --diff-filter=A` needs full history to resolve provenance commits, so this ' +
        'would otherwise silently mis-report real commits as "not yet committed". Fix: ' +
        '`actions/checkout@v4` with `fetch-depth: 0` in CI (docs/provenance-model.md §5.2), or ' +
        '`git fetch --unshallow` locally.',
    );
  }
}

/** §5.2 rows: "file exists but has no commit" -> `commit: null`, build
 * succeeds; "a `produced` path does not exist" is checked separately
 * (before this ever runs) so this function's only remaining job is
 * git resolution itself. Multiple `--diff-filter=A` hits (added, deleted,
 * re-added) resolve to the OLDEST — the file's original creation — since
 * `git log`'s default order is newest-first, that's the last line. */
function resolveCommit(gitRunner, repoRoot, relPath) {
  const output = runGit(gitRunner, repoRoot, ['log', '--diff-filter=A', '--format=%H%x00%cI', '--', relPath], `resolving commit for "${relPath}"`);
  const trimmed = output.trim();
  if (trimmed === '') return null; // legitimate: never committed (new/uncommitted/created in this PR)

  const lines = trimmed.split('\n');
  const [hash, date] = lines[lines.length - 1].split('\0');
  return { hash, short: hash.slice(0, 12), date };
}

/** §7: every `produced` path must be repo-relative with no `..`, checked
 * BEFORE it ever reaches `fs.existsSync` or a git argument list. Returns
 * the normalized (forward-slash) path on success. */
function assertSafeRepoRelativePath(rawPath, label) {
  const problems = [];
  if (rawPath.trim() === '') problems.push('must not be empty');
  if (path.isAbsolute(rawPath)) problems.push('must be repo-relative, not absolute');
  if (rawPath.includes('\\')) problems.push('must use forward slashes');
  const normalized = path.posix.normalize(rawPath);
  if (normalized === '..' || normalized.startsWith('../')) problems.push('must not escape the repo root ("..")');
  if (problems.length > 0) {
    throw new ProvenanceValidationError([`${label}: produced path "${rawPath}" is invalid — ${problems.join('; ')}`]);
  }
  return normalized;
}

/** Boots a Vite SSR server just long enough to load the two TS modules this
 * script needs, then closes it. See the file header for why.
 *
 * `configFile` + `optimizeDeps: { noDiscovery: true }` mirror
 * `scripts/generate-seo-files.mjs`'s identical helper exactly, for the same
 * reason documented there: this script only ever loads two specific
 * modules by path, never the app's real entry (`index.html` ->
 * `src/main.tsx`), so Vite's automatic dependency pre-bundling scan (which
 * crawls from `index.html` and pulls in react/react-dom/react-router/etc.
 * for nothing) is both wasted work and noisy stderr output — confirmed
 * noisy (though non-fatal) here before this option was added. */
async function loadContentModules(repoRoot) {
  const server = await createServer({
    root: repoRoot,
    configFile: path.join(repoRoot, 'vite.config.ts'),
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'error',
    optimizeDeps: { noDiscovery: true },
  });
  try {
    const schemaModule = await server.ssrLoadModule('/src/content/provenance-schema.ts');
    const castModule = await server.ssrLoadModule('/src/content/cast.ts');
    return {
      ProvenanceBlockSchema: schemaModule.ProvenanceBlockSchema,
      ProvenanceRecordSchema: schemaModule.ProvenanceRecordSchema,
      castNames: castModule.cast.map((member) => member.name),
    };
  } finally {
    await server.close();
  }
}

/**
 * Builds the provenance records map (repo-relative produced path -> record)
 * without writing anything to disk — the pure core `main()` (CLI) and
 * `print.mjs` both call. Every dependency that touches the filesystem,
 * git, or Vite is an injectable parameter so this is fully unit-testable
 * against fixtures with no real git/Vite in the loop.
 *
 * @param {object} [options]
 * @param {string} [options.repoRoot]
 * @param {string} [options.reportsDir]
 * @param {() => Promise<{ProvenanceBlockSchema, ProvenanceRecordSchema, castNames: string[]}>} [options.loadModules]
 * @param {(args: {cwd: string, args: string[]}) => string} [options.gitRunner]
 */
export async function generateProvenance({
  repoRoot = REPO_ROOT,
  reportsDir = REPORTS_DIR,
  loadModules = loadContentModules,
  gitRunner = defaultGitRunner,
} = {}) {
  const { ProvenanceBlockSchema, ProvenanceRecordSchema, castNames } = await loadModules(repoRoot);

  const files = readReportFiles(reportsDir, repoRoot);
  // §5.2 row: "yaml provenance block fails Zod / authors/reviewers[].by
  // doesn't resolve to a cast member" -> build fails, naming report, item,
  // field. Throws ProvenanceValidationError; propagates to the caller.
  const items = parseAllReports({ files, schema: ProvenanceBlockSchema, castNames });

  // §5.2 row: "A content file appears in no report's `produced` list" / the
  // zero-blocks case (today's reality — no report ships one yet) -> build
  // succeeds, empty artifact, and — per the CAUTION this PR was built
  // against — no git call is made at all when there's nothing to resolve.
  const totalProducedPaths = items.reduce((sum, entry) => sum + entry.block.produced.length, 0);
  if (totalProducedPaths === 0) {
    return {};
  }

  // Path safety, cross-report uniqueness, and on-disk existence — all pure
  // (no git), so validated BEFORE the git-availability check. This ordering
  // is deliberate: a dangling/duplicate/unsafe path is a content defect
  // independent of git, and should fail with that specific message even in
  // an environment where git itself would also fail (e.g. a checkout with
  // no `.git`, or CI before the fetch-depth fix lands).
  const issues = [];
  const producedIndex = new Map(); // normalizedPath -> { entry, label }

  for (const entry of items) {
    for (const rawPath of entry.block.produced) {
      const label = `${entry.reportPath} item "${entry.block.item}"`;
      let relPath;
      try {
        relPath = assertSafeRepoRelativePath(rawPath, label);
      } catch (error) {
        issues.push(...(error instanceof ProvenanceValidationError ? error.issues : [error.message]));
        continue;
      }

      const existing = producedIndex.get(relPath);
      if (existing) {
        // §5.2 row: "Two reports claim the same `produced` path" -> build fails.
        issues.push(`Duplicate \`produced\` path "${relPath}": claimed by both ${existing.label} and ${label}`);
        continue;
      }

      if (!existsSync(path.join(repoRoot, relPath))) {
        // §5.2 row: "A `produced` path does not exist on disk" -> build fails.
        issues.push(`${label}: produced path "${relPath}" does not exist on disk`);
        continue;
      }

      producedIndex.set(relPath, { entry, label });
    }
  }

  if (issues.length > 0) {
    throw new ProvenanceValidationError(issues);
  }

  assertGitAvailable(gitRunner, repoRoot);

  const records = {};
  for (const [relPath, { entry }] of producedIndex) {
    const commit = resolveCommit(gitRunner, repoRoot, relPath); // may itself throw ProvenanceGitError
    const record = {
      runId: entry.runId,
      reportPath: entry.reportPath,
      item: entry.block.item,
      ...(entry.block.branch !== undefined ? { branch: entry.block.branch } : {}),
      authors: entry.block.authors,
      reviewers: entry.block.reviewers,
      ...(entry.block.judge !== undefined ? { judge: entry.block.judge } : {}),
      ...(entry.block.tokens !== undefined ? { tokens: entry.block.tokens } : {}),
      commit,
    };
    // Defense in depth: the record is re-validated against
    // `ProvenanceRecordSchema` (not just the block schema) before it's
    // allowed into the artifact.
    records[relPath] = ProvenanceRecordSchema.parse(record);
  }

  return records;
}

async function main() {
  try {
    const records = await generateProvenance();
    const sorted = Object.fromEntries(Object.keys(records).sort().map((key) => [key, records[key]]));
    mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
    const count = Object.keys(sorted).length;
    console.log(`[provenance] wrote ${count} record${count === 1 ? '' : 's'} -> ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
  } catch (error) {
    console.error('[provenance] generation failed:\n');
    console.error(error?.message ?? String(error));
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  await main();
}
