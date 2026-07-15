import type { ReactNode } from 'react';

/**
 * ProvenanceStrip (design-brief §6) — the transparency device: full-width
 * thin bar, mono, dotted-border "ledger row" chips joined by " · ".
 *
 * v1 honesty note: `content/posts/*.md` frontmatter (spec §3.2) only
 * carries `author`, not a per-post reviewer/round/commit/token-cost record
 * — that richer provenance data doesn't exist yet as a content field, so
 * this component only renders the fields it actually has rather than
 * fabricating a round number or commit hash per post (PROJECT-BRIEF.md:
 * "never invent results"). Fields are additive — wire them up once the
 * content schema/authoring pipeline carries them.
 */
export function ProvenanceStrip({
  author,
  reviewedBy,
  commitUrl,
  commitLabel,
}: {
  author: string;
  reviewedBy?: string;
  commitUrl?: string;
  commitLabel?: string;
}) {
  const fields: ReactNode[] = [`Written by ${author}`];
  if (reviewedBy) fields.push(reviewedBy);
  if (commitUrl && commitLabel) {
    fields.push(
      <a
        key="commit"
        href={commitUrl}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-transparent hover:decoration-current"
      >
        built on commit {commitLabel}
      </a>,
    );
  }

  return (
    <div
      role="note"
      aria-label="Provenance"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 border-y border-dashed border-hairline px-3 py-2 font-mono text-[13px] text-ink-muted"
    >
      {fields.map((field, index) => (
        <span key={index} className="inline-flex items-center gap-2">
          {index > 0 && <span aria-hidden="true">·</span>}
          {field}
        </span>
      ))}
    </div>
  );
}
