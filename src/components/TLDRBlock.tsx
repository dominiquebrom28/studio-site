/**
 * TLDRBlock (docs/blog-format-v2.md §2) — the scannable entry point: 2-5
 * plain-text bullets, always at a fixed position (directly above the body,
 * BlogPost.tsx), always structured, never freeform prose. Frontmatter-
 * driven (`post.tldr`, schemas.ts) rather than an in-body `## TL;DR`
 * section, precisely so it never enters `extractTableOfContents`'s H2 scan
 * (see toc.ts / design-brief §5's TOC-parity note) and gets build-time
 * shape validation (2-5 bullets, ≤140 chars each — schemas.ts) a body
 * heading never would.
 *
 * Semantics (binding, §5): the visible "TL;DR" label is a styled `<p>`,
 * never a heading element — this keeps it out of the document's heading
 * outline. The section itself carries the accessible name instead, via
 * `aria-label`.
 *
 * Visual treatment — existing tokens only: bordered card (`radius-sm`,
 * `--paper-raised`, `--hairline`, `--shadow-card`, `padding: var(--space-lg)`
 * = `p-6`). The "TL;DR" eyebrow is the one eyebrow in the system allowed
 * `--marker-700` (the accent/emphasis color) instead of `--ink-muted` — a
 * deliberate call-out to skim, not routine metadata. Bullet marker is a
 * small riso-style dot in `--marker-600` at 55% opacity, not the browser
 * default disc.
 */
export function TLDRBlock({ bullets }: { bullets: string[] }) {
  return (
    <section
      aria-label="TL;DR"
      className="mb-8 rounded-sm border border-hairline bg-paper-raised p-6 shadow-[var(--shadow-card)]"
    >
      <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-marker-700">TL;DR</p>
      <ul className="flex flex-col gap-2.5">
        {bullets.map((bullet, index) => (
          <li key={index} className="flex gap-2.5 text-base leading-[1.5] text-ink sm:text-lg">
            <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-marker-600 opacity-[0.55]" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
