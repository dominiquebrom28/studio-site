#!/usr/bin/env node
/**
 * Human-readable provenance table (`npm run provenance:print`). The
 * mitigation `docs/provenance-model.md` §5.3 names for the artifact not
 * being committed (so it never shows up in a PR diff): this script prints
 * file -> author -> reviewer -> judge -> commit -> tokens, and CI runs it
 * so the same table lands in the PR's check log instead.
 *
 * Self-sufficient on purpose — regenerates the records itself (via
 * `generateProvenance`, the same pure function `generate.mjs`'s CLI uses)
 * rather than reading `provenance.generated.json` off disk. That means
 * `npm run provenance:print` works standalone at any time (no ordering
 * dependency on having just run `dev`/`build`/`test`), at the cost of
 * re-running a "milliseconds" regen (§9: no incremental cache needed at
 * this repo's size) — an explicit, deliberate tradeoff for a script whose
 * only job is human legibility.
 */
import { generateProvenance } from './generate.mjs';

function formatJudge(judge) {
  if (judge === undefined) return '(unrecorded)';
  if (judge === null) return 'not Judge-reviewed';
  return `${judge.verdict} · round ${judge.round} · ${judge.score}/${judge.outOf}`;
}

function formatTokens(tokens) {
  if (tokens === undefined) return '(unrecorded)';
  if (tokens === null) return '(none)';
  const agentSuffix = tokens.scope === 'agent' && tokens.agent ? `: ${tokens.agent}` : '';
  return `~${tokens.approx.toLocaleString('en-US')} (${tokens.scope}${agentSuffix})`;
}

function formatCommit(commit) {
  return commit ? commit.short : '(no commit yet)';
}

async function main() {
  let records;
  try {
    records = await generateProvenance();
  } catch (error) {
    console.error('[provenance:print] generation failed:\n');
    console.error(error?.message ?? String(error));
    process.exitCode = 1;
    return;
  }

  const paths = Object.keys(records).sort();
  if (paths.length === 0) {
    console.log('[provenance] no records yet — no `yaml provenance` block in reports/*.md resolves to a produced file (this is expected until a report ships one; see docs/provenance-model.md §12 PR 6).');
    return;
  }

  console.log(`[provenance] ${paths.length} record${paths.length === 1 ? '' : 's'}:\n`);
  const rows = paths.map((filePath) => {
    const record = records[filePath];
    return {
      file: filePath,
      author: record.authors.join(', '),
      reviewer: record.reviewers.length > 0 ? record.reviewers.map((reviewer) => `${reviewer.by} (${reviewer.kind})`).join(', ') : '(none)',
      judge: formatJudge(record.judge),
      commit: formatCommit(record.commit),
      tokens: formatTokens(record.tokens),
    };
  });
  console.table(rows);
}

await main();
