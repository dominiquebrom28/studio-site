import type { ReactNode } from 'react';
import { getCastMemberByName } from '@/content/cast';
import type { ProvenanceRecord } from '@/content/provenance-schema';
import { Badge } from './ui/Badge';
import { CharacterAvatar } from './ui/CharacterAvatar';

/**
 * ProvenanceStrip v2 (docs/provenance-model.md §6, design-brief §5/§6) — the
 * transparency device made real. v1 (2026-07-18) rendered exactly one field
 * ("Written by X") because no other field existed anywhere in the content
 * model; §12 PR 1-3 built the engine that derives real reviewer/Judge/
 * commit/token data from `reports/*.md`, joined against git, and PR 4 wired
 * the result onto `Post`/`Project` as `provenance?: ProvenanceRecord`. This
 * component is the last mile: render whatever subset of that record exists,
 * exactly as it exists, in two registers (§6):
 *
 *  - `variant="inline"` — the full-width mono ledger bar (mobile/tablet,
 *    under the byline): fields joined by " · ", each a dotted-border chip.
 *  - `variant="rail"` — the desktop sticky card: the same facts as stacked,
 *    labelled rows, plus the graded-paper Judge badge (design-brief §5) and
 *    the one row the inline strip deliberately omits (`judge: null` — §6).
 *
 * THE THREE STATES this component implements, and how each degrades:
 *
 *  - **full** — every optional field on the record is populated. Every
 *    chip/row in `buildFields` below renders.
 *  - **partial** — some fields are populated, some are `null`/absent on the
 *    record. Not a separate code path from "full": `buildFields` already
 *    only emits an entry for a field that actually has data, so a record
 *    missing (say) `tokens` simply produces one fewer field. §6, binding:
 *    "present chips render, absent chips are simply absent. No `—`, no
 *    `n/a`, no greyed placeholder" — a placeholder is a slot inviting a
 *    plausible guess, which is exactly what this whole feature exists to
 *    prevent (PROJECT-BRIEF.md: "never invent results").
 *  - **none** — `provenance` itself is `undefined` (today's real production
 *    state: zero reports have shipped a `yaml provenance` block yet — see
 *    `npm run provenance:print`). This IS a distinct code path (`hasRecord`
 *    below), because the honest-degrade sentence it renders ("no run record
 *    for this entry") is not a missing chip, it's new, deliberately visible
 *    content — §6: "silently implying there was nothing more to say ...
 *    saying so turns a hidden gap into a visible one."
 *
 * HONESTY, MECHANICALLY: every string below is either a literal (§6's own
 * fixed vocabulary — "reviewed by", "built on commit", "no run record...")
 * or interpolated straight from a `ProvenanceRecordSchema`-validated field.
 * Nothing here rounds a whole number into an "approximate" one, invents a
 * reviewer, or normalizes a verdict into different words than the enum
 * already gives it — the Judge chip is a rendered PROJECTION of structured
 * fields, never a quotation (§6: a direct response to the persona-bible
 * incident where a normalized verdict string was passed off as verbatim).
 *
 * COMMIT/RUN LINKS: constructed from `REPO_BASE` (hardcoded, matching the
 * existing repo-link convention in this codebase — `BacklogChip.tsx` and
 * `Footer.tsx` each declare their own local `..._URL` constant the same way;
 * there is no shared repo-link helper to reuse) plus a schema-validated
 * 40-hex commit hash / `reportPath`. Per docs/provenance-model.md §4.3/§7:
 * "The commit URL is constructed in app code ... A URL is never read from a
 * report" — this is the feature's one real injection path, and it's closed
 * by construction: nothing here ever reads a `href` out of content.
 */

const REPO_BASE = 'https://github.com/dominiquebrom28/studio-site';

const NO_RECORD_TOOLTIP = "This entry predates the provenance model, or its run wasn't recorded.";

/** "Nora, Project Lead" for a resolved cast member (byline register, matches
 * `Byline`/`BylineGroup`'s identical `{firstName}, {name}` convention); the
 * raw string unchanged for anyone who isn't one of the ten characters (e.g.
 * "Dom", the human) — never a fabricated identity for an unresolved name. */
function displayName(rawName: string): string {
  const member = getCastMemberByName(rawName);
  return member ? `${member.firstName}, ${member.name}` : rawName;
}

/** `~173k` — the tokens field's ONLY numeric transform: round to the
 * nearest thousand for a compact ledger reading. The `~` and "self-reported"
 * qualifier are supplied by the render function, never stored in data (§4.3:
 * "so they cannot be edited away in content"). */
function formatApproxTokens(approx: number): string {
  return `~${Math.round(approx / 1000)}k`;
}

function tokensScopeLabel(tokens: NonNullable<ProvenanceRecord['tokens']>): string {
  return tokens.scope === 'agent' ? tokens.agent! : 'whole run';
}

function judgeBadgeTone(verdict: 'PASS' | 'REVISE' | 'FAIL'): 'success' | 'warning' | 'error' {
  if (verdict === 'PASS') return 'success';
  if (verdict === 'REVISE') return 'warning';
  return 'error';
}

/** One ledger fact. `inline` is a complete sentence fragment for the mobile
 * strip's " · "-joined chip row; `label`/`value` split the same fact into a
 * rail row's mono eyebrow + content. Both are built once per fact so the two
 * variants can never drift out of sync with each other. */
interface ProvenanceField {
  key: string;
  label: string;
  inline: ReactNode;
  value: ReactNode;
}

/** The commit chip/row — a real link when the file has a commit
 * (`commit !== null`), entirely absent when it doesn't. §6: "Strip omits
 * the chip" for the "not yet committed" case — no placeholder, no "pending"
 * text, just nothing, which is itself the honest statement (§5.2: "Legitimate
 * and expected ... self-heals on the next build after merge"). */
function commitField(commit: ProvenanceRecord['commit']): ProvenanceField | null {
  if (!commit) return null;
  const link = (
    <a
      key="commit-link"
      href={`${REPO_BASE}/commit/${commit.hash}`}
      target="_blank"
      rel="noreferrer"
      className="underline decoration-transparent hover:decoration-current"
    >
      {commit.short}
    </a>
  );
  return {
    key: 'commit',
    label: 'Commit',
    inline: <>built on commit {link}</>,
    value: link,
  };
}

function tokensField(tokens: ProvenanceRecord['tokens']): ProvenanceField | null {
  if (!tokens) return null;
  const text = `${formatApproxTokens(tokens.approx)} tokens (self-reported, ${tokensScopeLabel(tokens)})`;
  return { key: 'tokens', label: 'Tokens', inline: text, value: text };
}

/** The Judge chip — ONLY for a real verdict (`judge` is a populated object).
 * `judge === null` ("explicitly not Judge-reviewed", §3.1) is handled
 * separately by the rail-only `JudgeNullRow` below; `judge === undefined`
 * ("unrecorded") renders nothing at all, anywhere — the third of the three
 * states §3.1 is binding about keeping distinct. */
function judgeField(judge: ProvenanceRecord['judge']): ProvenanceField | null {
  if (!judge) return null;
  const text = `Judge (Fable-5): ${judge.verdict}, round ${judge.round}, ${judge.score}/${judge.outOf}`;
  return { key: 'judge', label: 'Judge (Fable-5)', inline: text, value: text };
}

function reviewerFields(reviewers: ProvenanceRecord['reviewers']): ProvenanceField[] {
  return reviewers.map((reviewer, index) => {
    const text = `reviewed by ${displayName(reviewer.by)} (${reviewer.kind})`;
    return {
      key: `reviewer-${index}`,
      label: reviewers.length > 1 ? `Reviewed (${index + 1}/${reviewers.length})` : 'Reviewed',
      inline: text,
      value: `${displayName(reviewer.by)} (${reviewer.kind})`,
    };
  });
}

/** "run of 2026-07-18" — always present whenever a record exists at all
 * (`runId`/`reportPath` are non-optional on `ProvenanceRecordSchema`, §4.2),
 * so unlike every other field here this one needs no null-check. Links to
 * the report itself on GitHub — "the run link is how a reader checks the
 * original wording" (§6), the mechanism that keeps the Judge chip above an
 * honest projection rather than an unverifiable quotation. */
function runField(record: ProvenanceRecord): ProvenanceField {
  const link = (
    <a
      key="run-link"
      href={`${REPO_BASE}/blob/main/${record.reportPath}`}
      target="_blank"
      rel="noreferrer"
      className="underline decoration-transparent hover:decoration-current"
    >
      {record.runId}
    </a>
  );
  return { key: 'run', label: 'Run', inline: <>run of {link}</>, value: link };
}

/** The full ledger for a record that exists — every field that has data, in
 * §6's fixed order (reviewers, then Judge, then commit, then tokens, then
 * run), and nothing that doesn't. `written` (the author chip) is passed in
 * separately rather than derived from `record.authors`, because the "Written
 * by" chip has always been driven by the `author` prop (the same identity
 * `Byline`/`BylineGroup` render above this component) — see the component
 * doc comment on why that stays a prop, not a record read. */
function buildFields(written: ProvenanceField, record: ProvenanceRecord): ProvenanceField[] {
  return [
    written,
    ...reviewerFields(record.reviewers),
    judgeField(record.judge),
    commitField(record.commit),
    tokensField(record.tokens),
    runField(record),
  ].filter((field): field is ProvenanceField => field !== null);
}

function writtenField(author: string): ProvenanceField {
  const member = getCastMemberByName(author);
  const label = displayName(author);
  const icon = member ? (
    // The one "icon+Name" field format design-brief §6 calls out by name,
    // with the riso-offset backing §4 reserves for exactly this use (H2
    // underlines and the blockquote left bar are the other two — three uses
    // total, never a fourth). `size="inline"` (24px) is the CharacterAvatar
    // size design-brief §6 names for this exact context ("24px (inline
    // byline)"), deliberately smaller/quieter than the 56px avatar `Byline`/
    // `BylineGroup` already render just above this strip — a different
    // typographic register, not a repeat of the same visual.
    <span key="icon" className="riso-offset relative inline-flex shrink-0">
      <CharacterAvatar id={member.id} tintVar={member.tintVar} name={member.name} size="inline" />
    </span>
  ) : null;
  return {
    key: 'written',
    label: 'Written by',
    inline: (
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {`Written by ${label}`}
      </span>
    ),
    value: (
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    ),
  };
}

/** Inline separators between chips are `aria-hidden` — the sentence-like
 * chip text is what a screen reader announces, matching the plain-sentence
 * requirement in §6 ("no abbreviation carries meaning alone"). */
function InlineChips({ fields }: { fields: ProvenanceField[] }) {
  return (
    <>
      {fields.map((field, index) => (
        <span key={field.key} className="inline-flex items-center gap-2">
          {index > 0 && <span aria-hidden="true">·</span>}
          {field.inline}
        </span>
      ))}
    </>
  );
}

function RailRows({ fields }: { fields: ProvenanceField[] }) {
  return (
    <dl className="flex flex-col gap-2.5">
      {fields.map((field) => (
        <div key={field.key}>
          <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{field.label}</dt>
          <dd className="mt-0.5 font-mono text-[13px] text-ink">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Rail-only: the `judge: null` state (§3.1 — "explicitly not Judge-reviewed",
 * a positive claim, distinct from the key being merely absent). §6: "The
 * inline strip suppresses [this]" — there's no room in a two-line wrapped
 * mobile ledger for an explanatory sentence, so it's rail-exclusive, the
 * same way the design brief already makes the graded-paper badge rail-
 * exclusive. Reuses the SAME reviewer summary the standalone "Reviewed" rows
 * above already render — deliberately redundant with those rows (this
 * codebase's established pattern for honesty-critical content: the
 * handwritten/plain signature block, the desktop/mobile margin-note
 * fallback — §9 "nothing is only expressed" in one place).
 */
function JudgeNullRow({ reviewers }: { reviewers: ProvenanceRecord['reviewers'] }) {
  const reviewedBy =
    reviewers.length > 0 ? `; reviewed by ${reviewers.map((r) => `${displayName(r.by)} (${r.kind})`).join(', ')}` : '';
  return (
    <div className="mt-2.5 border-t border-dashed border-hairline pt-2.5">
      <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Judge review</p>
      <p className="mt-0.5 font-mono text-[13px] text-ink-muted">none for this entry{reviewedBy}.</p>
    </div>
  );
}

/**
 * The graded-paper badge (design-brief §5: "a small graded-paper badge,
 * e.g. 'PASS · Round 1 · 91/100'"). Rail-only, decorative: it restates the
 * JUDGE row's own plain-text content in a rotated stamp treatment, so it is
 * marked `aria-hidden` — the same "handwritten face is decorative-only,
 * enforced structurally" rule design-brief §9 applies everywhere else a
 * flourish restates already-accessible plain text (nothing here is EVER the
 * sole carrier of the verdict; the JUDGE row above/below it always is).
 */
function GradedPaperBadge({ judge }: { judge: NonNullable<ProvenanceRecord['judge']> }) {
  return (
    <div aria-hidden="true" className="mb-3">
      <Badge tone={judgeBadgeTone(judge.verdict)} rotate={-2}>
        {judge.verdict} · Round {judge.round} · {judge.score}/{judge.outOf}
      </Badge>
    </div>
  );
}

export function ProvenanceStrip({
  author,
  provenance,
  variant = 'inline',
}: {
  /** The post/project's primary credited author (raw frontmatter value,
   * e.g. "designer", or "Dom") — drives the "Written by" chip independently
   * of whether `provenance` exists at all (see `buildFields`'s doc comment). */
  author: string;
  /** `undefined` is the honest, designed "no run record" state (§4.2) — not
   * a loading state, not an error. See the component doc comment's "none". */
  provenance?: ProvenanceRecord;
  /** `inline` (default): the full-width mono ledger bar, mobile/tablet.
   * `rail`: the desktop sticky-card register — labelled rows + the
   * graded-paper badge + the `judge: null` explanatory row. */
  variant?: 'inline' | 'rail';
}) {
  const written = writtenField(author);

  if (!provenance) {
    // The "none" state (§6): visibly, deliberately present — never a silent
    // blank. `title` carries the same explanatory tooltip in both variants;
    // the muted color + absent `href` are the only visual difference from a
    // real chip, never color-only per WCAG 1.4.1 (the text itself already
    // says "no run record", it doesn't rely on the muted tone to be understood).
    if (variant === 'inline') {
      return (
        <div
          role="note"
          aria-label="Provenance"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 border-y border-dashed border-hairline px-3 py-2 font-mono text-[13px] text-ink-muted"
        >
          <InlineChips
            fields={[
              written,
              { key: 'no-record', label: '', inline: <span title={NO_RECORD_TOOLTIP}>no run record for this entry</span>, value: null },
            ]}
          />
        </div>
      );
    }

    return (
      <div role="note" aria-label="Provenance" className="font-mono text-[13px]">
        <RailRows fields={[written]} />
        <p className="mt-2.5 border-t border-dashed border-hairline pt-2.5 text-ink-muted" title={NO_RECORD_TOOLTIP}>
          no run record for this entry
        </p>
      </div>
    );
  }

  const fields = buildFields(written, provenance);

  if (variant === 'rail') {
    return (
      <div role="note" aria-label="Provenance">
        {provenance.judge && <GradedPaperBadge judge={provenance.judge} />}
        <RailRows fields={fields} />
        {provenance.judge === null && <JudgeNullRow reviewers={provenance.reviewers} />}
      </div>
    );
  }

  return (
    <div
      role="note"
      aria-label="Provenance"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 border-y border-dashed border-hairline px-3 py-2 font-mono text-[13px] text-ink-muted"
    >
      <InlineChips fields={fields} />
    </div>
  );
}
