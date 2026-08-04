import { posts, projects, provenanceArtifact } from './loader';
import {
  RunsArtifactSchema,
  type RunsArtifact,
  type RunsArtifactRow,
  type ProvenanceArtifact,
  type ProvenanceRecord,
} from './provenance-schema';
import type { Post, Project } from './schemas';

/**
 * The `/reports` index data API (`docs/reports-surface.md` §3.2/§6 PR 2).
 * **No UI consumes this yet** (PR 3 is a design checkpoint that gates the
 * route — see the spec) — this module only produces the join.
 *
 * Loads `src/content/runs.generated.json` the same way `loader.ts` loads
 * `provenance.generated.json`: an eager `import.meta.glob` on the literal
 * path (the one primitive whose "nothing matched" case degrades to `{}`
 * rather than a bundler-level resolution error), so `resolveRunsArtifact`
 * below can tell "artifact missing at import time" apart from "artifact
 * present and legitimately empty" — see `loader.ts`'s header comment on
 * `provenanceArtifact` for the full rationale, which applies unchanged here.
 */
const runsArtifactModules = import.meta.glob('/src/content/runs.generated.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

const RUNS_ARTIFACT_PATH = '/src/content/runs.generated.json';

/**
 * Validates (and fails loud on) the raw glob result for the generated runs
 * artifact. Extracted to a pure function of its input — no glob, no
 * filesystem — so both failure messages and the success path are
 * unit-testable without a real generated file on disk (see runs.test.ts),
 * mirroring `resolveProvenanceArtifact` (loader.ts) exactly.
 */
export function resolveRunsArtifact(rawArtifact: unknown): RunsArtifact {
  if (rawArtifact === undefined) {
    throw new Error(
      '[content] Missing generated runs artifact at "src/content/runs.generated.json". ' +
        'It is written by `scripts/provenance/generate.mjs` and normally regenerated automatically by ' +
        '`predev`/`prebuild`/`pretest` (package.json). Run `npm run provenance:generate` and retry — ' +
        'a missing artifact must never be treated the same as one that legitimately resolved zero ' +
        'runs (docs/provenance-model.md §5.2).',
    );
  }

  const result = RunsArtifactSchema.safeParse(rawArtifact);
  if (!result.success) {
    throw new Error(
      `[content] Generated runs artifact at "src/content/runs.generated.json" failed validation:\n${result.error.issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n')}\nRegenerate it with \`npm run provenance:generate\`.`,
    );
  }

  return result.data;
}

const runsArtifact = resolveRunsArtifact(runsArtifactModules[RUNS_ARTIFACT_PATH]);

/**
 * Fully deterministic — never falls back to `runs.generated.json`'s own
 * (incidental) array order. Chain, in priority order:
 *   1. date descending (newest run first)
 *   2. `runId` ascending — the report's filename stem, the one
 *      content-derived value every run has (a run has no `slug` of its own).
 *      Mirrors `sortPosts`'s final rule (loader.ts): a guaranteed,
 *      content-derived tie-break, never glob/array-input order. Real example
 *      this resolves: 2026-07-15 has three reports
 *      (`2026-07-15.md`, `2026-07-15-design-brief.md`,
 *      `2026-07-15-persona-and-build.md`) sharing one date.
 */
export function sortRuns(rows: readonly RunsArtifactRow[]): RunsArtifactRow[] {
  return [...rows].sort((a, b) => {
    const dateDiff = Date.parse(b.date) - Date.parse(a.date);
    if (dateDiff !== 0) return dateDiff;
    return a.runId.localeCompare(b.runId);
  });
}

/** A post or project a run's `yaml provenance` block(s) named as `produced`,
 * resolved to its live, current title/slug — never a string read out of a
 * report (docs/reports-surface.md §3.2: "Titles therefore have exactly one
 * source ... and cannot drift into the artifact"). */
export interface RunProducedRef {
  kind: 'post' | 'project';
  slug: string;
  title: string;
}

/** One `/reports` index row: a `runs.generated.json` row plus its resolved
 * `produced` outputs. `produced: []` is the common, honest, DESIGNED "no
 * recorded output" case (§2.1) — never evidence the run produced nothing,
 * only that nothing it produced is a publishable, linkable post/project. */
export interface Run extends RunsArtifactRow {
  produced: RunProducedRef[];
}

/**
 * Builds the `Post`/`Project` reverse index — the same object reference
 * `buildCollection` (loader.ts) already attached as `post.provenance` /
 * `project.provenance` for the FORWARD join, keyed here by that exact
 * record object so a produced path can be resolved back to a live item
 * without re-deriving a path->slug mapping (posts/projects don't carry
 * their own frontmatter `slug`s back out to a filename — dates are
 * stripped, `slug:` overrides are the norm — see every file under
 * `content/`). This is why `provenanceArtifact` had to become an export
 * rather than `runs.ts` re-globbing `content/**` itself (spec: "one export,
 * not a second glob and second failure path").
 */
function buildProducedByRecord(postsList: readonly Post[], projectsList: readonly Project[]): Map<ProvenanceRecord, RunProducedRef> {
  const index = new Map<ProvenanceRecord, RunProducedRef>();
  for (const post of postsList) {
    if (post.provenance) index.set(post.provenance, { kind: 'post', slug: post.slug, title: post.title });
  }
  for (const project of projectsList) {
    if (project.provenance) index.set(project.provenance, { kind: 'project', slug: project.slug, title: project.title });
  }
  return index;
}

/**
 * The reverse join (docs/reports-surface.md §3.2): groups the resolved
 * provenance artifact by `reportPath`, resolving each produced path to a
 * live `Post`/`Project` via `buildProducedByRecord` above. A produced path
 * that isn't in `postsList`/`projectsList` — because it names a non-content
 * file (`docs/`, `scripts/`: `reports/2026-07-30.md`'s real produced set is
 * entirely docs/scripts changes, zero posts/projects), or because it names a
 * post filtered out of the live collection (a draft in production) —
 * resolves to nothing for that report. That is not a bug: it is the exact
 * "no recorded output" state the spec's UI mock (§2.1) describes, since
 * there is no in-site link to show either way.
 *
 * Exported as a pure function of its three inputs (no `loader.ts` import)
 * specifically so the join logic is unit-testable against synthetic
 * fixtures — including the batch case (one report, several produced paths)
 * — without needing real content files or a real generated artifact on
 * disk (see runs.test.ts).
 */
export function buildProducedByReportPath(
  artifact: ProvenanceArtifact,
  postsList: readonly Post[],
  projectsList: readonly Project[],
): Map<string, RunProducedRef[]> {
  const producedByRecord = buildProducedByRecord(postsList, projectsList);
  const byReportPath = new Map<string, RunProducedRef[]>();

  for (const record of Object.values(artifact)) {
    const ref = producedByRecord.get(record);
    if (!ref) continue; // not a live post/project — see doc comment above

    const existing = byReportPath.get(record.reportPath);
    if (existing) {
      existing.push(ref);
    } else {
      byReportPath.set(record.reportPath, [ref]);
    }
  }

  // Deterministic order within a run, independent of `provenanceArtifact`'s
  // own (incidental) key order — the same "never rely on parse/glob order"
  // rule `sortPosts`/`sortProjects` enforce for content collections.
  for (const refs of byReportPath.values()) {
    refs.sort((a, b) => a.slug.localeCompare(b.slug));
  }

  return byReportPath;
}

const producedByReportPath = buildProducedByReportPath(provenanceArtifact, posts, projects);

/**
 * All runs (`reports/*.md`), one row per file, sorted newest-first
 * (`sortRuns`), each carrying its resolved `produced` Post/Project outputs
 * (`buildProducedByReportPath`) — the complete data the `/reports` index
 * (not yet built; see this file's header) needs. **No UI change in this PR.**
 */
export function getAllRuns(): Run[] {
  return sortRuns(runsArtifact).map((row) => ({
    ...row,
    produced: producedByReportPath.get(row.reportPath) ?? [],
  }));
}
