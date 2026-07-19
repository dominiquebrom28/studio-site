import { type ReactNode, useRef } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import type { NarrativeField, Provenance } from '@/content/schemas';
import { ProvenanceTag } from './ProvenanceTag';

/**
 * The reading/interpretive type role (docs/project-page-v2.md §1B, adding
 * one row to design-brief §3's serif table — same Fraunces typeface, no new
 * font): 18px/16px desktop/mobile, 1.65 line-height, 400 weight. `read`
 * provenance sets italic; everything else sets roman. This is the
 * load-bearing mechanism the spec calls out — once a reader learns
 * "slanted = us guessing," it reads at a glance with zero added chrome.
 */
const READING_PROSE = 'text-base sm:text-lg leading-[1.65] text-ink';

/** A single narrative sentence/paragraph, italicized only when its own
 * provenance is `read` — exported so `NarrativeBullets` (the Brief card's
 * per-bullet list, which needs the SAME italic rule applied per-bullet
 * rather than once for the whole block) can reuse the exact same class
 * logic instead of re-deriving it. */
export function narrativeTextClass(source: Provenance): string {
  return source === 'read' ? `${READING_PROSE} italic` : `${READING_PROSE} not-italic`;
}

interface NarrativeBlockProps {
  /** Mono eyebrow label, e.g. "WHY THIS EXISTS" / "THE BRIEF". */
  eyebrow: string;
  /** Drives the `ProvenanceTag` shown in the eyebrow row — for `variant:
   * "card"`, this is the block's overall/summarizing tag; individual
   * bullets (rendered via `NarrativeBullets`) carry their own source too. */
  source: Provenance;
  heading: string;
  children: ReactNode;
  variant?: 'prose' | 'card';
}

/**
 * `NarrativeBlock` (docs/project-page-v2.md §3/§7) — the shared eyebrow +
 * `ProvenanceTag` + H2 + body wrapper used for both "Why this exists" and
 * "The Brief". `variant: "card"` wraps the same header over a
 * `TLDRBlock`-style bordered card (radius-sm, `--paper-raised`, `--hairline`,
 * `shadow-card`); `variant: "prose"` (default) renders a plain band — no
 * ruling, no card — so these read as distinct sections rather than more
 * notebook page (spec §7 "Reused as-is" note on `Prose`).
 *
 * Motion (spec §5.2 "Why/Brief entrance"): fade+rise 20px, eyebrow 60ms
 * before body, 400ms ease-out, `whileInView` `{ once: true }`. Reduced
 * motion collapses to an instant opacity-only appearance via
 * `useReducedMotion()` (not Tailwind's `motion-reduce:`, since this is
 * JS-driven scroll-triggered motion, not a hover/press transition).
 */
export function NarrativeBlock({ eyebrow, source, heading, children, variant = 'prose' }: NarrativeBlockProps) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);

  const eyebrowMotion = prefersReducedMotion
    ? { initial: { opacity: 1 }, whileInView: { opacity: 1 }, viewport: { once: true } }
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
      };

  const bodyMotion = prefersReducedMotion
    ? { initial: { opacity: 1 }, whileInView: { opacity: 1 }, viewport: { once: true } }
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const, delay: 0.06 },
      };

  const header = (
    <m.div ref={ref} className="mb-3 flex items-center gap-2" {...eyebrowMotion}>
      <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{eyebrow}</p>
      <ProvenanceTag source={source} />
    </m.div>
  );

  if (variant === 'card') {
    return (
      <section className="mb-10 rounded-sm border border-hairline bg-paper-raised p-6 shadow-[var(--shadow-card)]">
        {header}
        <h2 className="mb-3">{heading}</h2>
        <m.div {...bodyMotion}>{children}</m.div>
      </section>
    );
  }

  return (
    <section className="mb-10">
      {header}
      <h2 className="mb-3">{heading}</h2>
      <m.p className={narrativeTextClass(source)} {...bodyMotion}>
        {children}
      </m.p>
    </section>
  );
}

/**
 * The Brief's bullet list (spec §3: 2-4 bullets, `TLDRBlock`'s riso-dot
 * grammar, per-bullet provenance — "mostly `read`... one line may honestly
 * be `not-stated`"). A sibling of `NarrativeBlock` rather than a `children`
 * prop of it, because each bullet needs its OWN italic/roman treatment
 * (see `NarrativeCardFieldSchema`'s doc comment in schemas.ts for why the
 * schema shape supports this).
 */
export function NarrativeBullets({ bullets }: { bullets: NarrativeField[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {bullets.map((bullet, index) => (
        <li key={index} className="flex gap-2.5 text-ink">
          <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-marker-600 opacity-[0.55]" />
          <span className={narrativeTextClass(bullet.source)}>
            {bullet.text}
            {bullet.source === 'not-stated' && (
              <span className="ml-2 not-italic font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                (not stated)
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
