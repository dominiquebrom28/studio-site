import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractProvenanceBlocks,
  parseReportBlocks,
  parseAllReports,
  readReportFiles,
  ProvenanceValidationError,
} from './parse.mjs';
import { ProvenanceBlockSchema } from '../../src/content/provenance-schema';
import { cast } from '../../src/content/cast';

// Real cast names + "Dom" — the exact roster the author/reviewer
// cross-check must accept, imported directly (not duplicated) so this
// suite fails the moment the real roster and the check drift apart.
const castNames = cast.map((member) => member.name);

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = path.join(DIRNAME, '__fixtures__', 'repo');
const REPORTS_ROOT = path.join(FIXTURES_ROOT, 'reports');

function reportsDir(scenario: string): string {
  return path.join(REPORTS_ROOT, scenario);
}

function parseScenario(scenario: string) {
  const files = readReportFiles(reportsDir(scenario), FIXTURES_ROOT);
  return parseAllReports({ files, schema: ProvenanceBlockSchema, castNames });
}

describe('extractProvenanceBlocks', () => {
  it('extracts a single yaml provenance fenced block, prose untouched', () => {
    const markdown = 'Some prose.\n\n```yaml provenance\nitem: foo\n```\n\nMore prose.';
    expect(extractProvenanceBlocks(markdown)).toEqual(['item: foo']);
  });

  it('extracts multiple blocks from one report, in document order', () => {
    const markdown = '```yaml provenance\nitem: a\n```\n\nprose\n\n```yaml provenance\nitem: b\n```\n';
    expect(extractProvenanceBlocks(markdown)).toEqual(['item: a', 'item: b']);
  });

  it('returns an empty array for a report with no block at all', () => {
    expect(extractProvenanceBlocks('Just prose. No fenced block here.')).toEqual([]);
  });

  it('does not match a plain yaml fence (wrong info string)', () => {
    const markdown = '```yaml\nitem: foo\n```\n';
    expect(extractProvenanceBlocks(markdown)).toEqual([]);
  });

  it('does not match a fence with a different info string entirely', () => {
    const markdown = '```ts\nconst x = 1;\n```\n';
    expect(extractProvenanceBlocks(markdown)).toEqual([]);
  });
});

describe('readReportFiles', () => {
  it('reads every *.md file under a directory, keyed repo-relative with forward slashes', () => {
    const files = readReportFiles(reportsDir('happy'), FIXTURES_ROOT);
    expect(Object.keys(files)).toEqual(['reports/happy/2026-01-01-happy.md']);
    expect(files['reports/happy/2026-01-01-happy.md']).toContain('item: happy-item');
  });

  it('returns {} for a directory that does not exist (never throws)', () => {
    expect(readReportFiles(path.join(REPORTS_ROOT, 'nonexistent'), FIXTURES_ROOT)).toEqual({});
  });

  it('returns {} for an existing directory with zero markdown files', () => {
    expect(readReportFiles(reportsDir('empty'), FIXTURES_ROOT)).toEqual({});
  });
});

describe('parseAllReports — happy path', () => {
  it('parses a single valid block: judge: null, tokens: null, one produced path', () => {
    const items = parseScenario('happy');
    expect(items).toHaveLength(1);
    expect(items[0].runId).toBe('2026-01-01-happy');
    expect(items[0].reportPath).toBe('reports/happy/2026-01-01-happy.md');
    expect(items[0].block).toMatchObject({
      item: 'happy-item',
      title: 'Happy item',
      branch: 'team/2026-01-01-happy',
      produced: ['content/happy-item.md'],
      authors: ['architect'],
      judge: null,
      tokens: null,
    });
    expect(items[0].block.reviewers).toEqual([{ by: 'Dom', kind: 'lead-review' }]);
  });

  it('parses two blocks from one report (multi-item), including a real Judge verdict + tokens object', () => {
    const items = parseScenario('multi-item');
    expect(items).toHaveLength(2);
    expect(items.map((entry) => entry.block.item)).toEqual(['multi-a', 'multi-b']);
    expect(items[0].block.judge).toBeNull();
    expect(items[1].block.judge).toEqual({ verdict: 'PASS', round: 1, score: 91, outOf: 100 });
    expect(items[1].block.tokens).toEqual({ approx: 12000, scope: 'run' });
  });

  it('the judge/tokens key being absent entirely is distinct from `null` — the third, "unrecorded" state', () => {
    const items = parseScenario('no-judge-key');
    expect(items).toHaveLength(1);
    expect(items[0].block.judge).toBeUndefined();
    expect('judge' in items[0].block).toBe(false);
    expect(items[0].block.tokens).toBeUndefined();
  });

  it('a report with no yaml provenance block at all yields zero items and zero issues — never an error', () => {
    expect(parseScenario('no-block')).toEqual([]);
  });

  it('an entirely empty/missing reports directory yields zero items — never an error', () => {
    const files = readReportFiles(reportsDir('nonexistent-scenario'), FIXTURES_ROOT);
    expect(parseAllReports({ files, schema: ProvenanceBlockSchema, castNames })).toEqual([]);
  });
});

describe('parseAllReports — failure table (§5.2)', () => {
  it('a block that fails Zod validation throws, naming the report, item, and field', () => {
    expect(() => parseScenario('bad-schema')).toThrow(ProvenanceValidationError);
    try {
      parseScenario('bad-schema');
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof ProvenanceValidationError>;
      expect(err.issues).toHaveLength(1);
      expect(err.issues[0]).toContain('reports/bad-schema/2026-01-04-bad-schema.md');
      expect(err.issues[0]).toContain('bad-schema-item');
      expect(err.issues[0]).toContain('judge.verdict');
    }
  });

  it('an author that does not resolve to a cast member or "Dom" throws, naming the report, item, and field', () => {
    try {
      parseScenario('bad-author');
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof ProvenanceValidationError>;
      expect(err.issues).toHaveLength(1);
      expect(err.issues[0]).toContain('reports/bad-author/2026-01-05-bad-author.md');
      expect(err.issues[0]).toContain('bad-author-item');
      expect(err.issues[0]).toContain('authors[0]');
      expect(err.issues[0]).toContain('Totally Not A Cast Member');
    }
  });

  it('a reviewer.by that does not resolve to a cast member or "Dom" throws, naming the report, item, and field', () => {
    try {
      parseScenario('bad-reviewer');
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof ProvenanceValidationError>;
      expect(err.issues).toHaveLength(1);
      expect(err.issues[0]).toContain('bad-reviewer-item');
      expect(err.issues[0]).toContain('reviewers[0].by');
      expect(err.issues[0]).toContain('Nobody In Particular');
    }
  });

  it('malformed YAML syntax throws, naming the report and block position', () => {
    try {
      parseScenario('bad-yaml');
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof ProvenanceValidationError>;
      expect(err.issues).toHaveLength(1);
      expect(err.issues[0]).toContain('reports/bad-yaml/2026-01-06-bad-yaml.md');
      expect(err.issues[0]).toContain('invalid YAML');
    }
  });

  it('tokens.scope: agent without tokens.agent fails the refine, naming the field', () => {
    try {
      parseScenario('tokens-agent-missing');
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof ProvenanceValidationError>;
      expect(err.issues).toHaveLength(1);
      expect(err.issues[0]).toContain('tokens.agent');
    }
  });

  it('aggregates every issue across every report into one thrown error, not just the first', () => {
    // A reports dir containing BOTH the bad-schema and bad-author fixtures
    // at once (built here, not on disk, to exercise the cross-file
    // aggregation without adding a fifth fixture directory).
    const files = {
      ...readReportFiles(reportsDir('bad-schema'), FIXTURES_ROOT),
      ...readReportFiles(reportsDir('bad-author'), FIXTURES_ROOT),
    };
    try {
      parseAllReports({ files, schema: ProvenanceBlockSchema, castNames });
      expect.unreachable();
    } catch (error) {
      const err = error as InstanceType<typeof ProvenanceValidationError>;
      expect(err.issues).toHaveLength(2);
    }
  });
});

describe('parseReportBlocks — direct, single-report call', () => {
  it('returns { items: [], issues: [] } for a clean report, never throwing itself (aggregation is the caller\'s job)', () => {
    const raw = readReportFiles(reportsDir('happy'), FIXTURES_ROOT)['reports/happy/2026-01-01-happy.md'];
    const { items, issues } = parseReportBlocks({
      reportPath: 'reports/happy/2026-01-01-happy.md',
      raw,
      schema: ProvenanceBlockSchema,
      castNames,
    });
    expect(issues).toEqual([]);
    expect(items).toHaveLength(1);
  });
});
