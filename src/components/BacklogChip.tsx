import type { BacklogChipRef } from '@/content/schemas';
import { STUDIO_SITE_BACKLOG_URL } from '@/lib/githubLinks';

/** No stable per-item anchor exists in `BACKLOG.md` today (spec §6) — chips
 * link to the file itself, not a fragile line anchor. Shared with
 * `Footer.tsx`/`BlogIndex.tsx` via `src/lib/githubLinks.ts` (backlog "point
 * at the right thing", 2026-07-29) rather than a second local constant. */
const BACKLOG_URL = STUDIO_SITE_BACKLOG_URL;

const STATUS_LABEL: Record<BacklogChipRef['status'], string> = {
  completed: 'completed',
  'in-progress': 'in progress',
  planned: 'planned',
};

/** Same three tone classes `Badge`'s `tone` prop already covers — matched
 * (not imported) here rather than rendering an actual `<Badge>`, because
 * `Badge`'s own `px-2.5 py-1` slim-pill sizing is baked in ahead of its
 * `className` prop in its class string; Tailwind gives no reliable
 * same-property override guarantee from an appended class, so composing on
 * top of `Badge` risked silently keeping the undersized padding. Building
 * the tap target directly is the "Button-tier target wearing Badge visual
 * skin" the spec calls for (§2), not a `Badge` with an `onClick` bolted on. */
const TONE_CLASSES: Record<BacklogChipRef['status'], string> = {
  completed: 'bg-success/12 border-success/40 text-ink',
  'in-progress': 'bg-warning/12 border-warning/40 text-ink',
  planned: 'bg-paper-raised border-hairline text-ink-muted',
};

/**
 * BacklogChip (docs/blog-format-v2.md §2) — a real link to `BACKLOG.md`,
 * one per "worked on this entry" backlog reference.
 *
 * Accessibility (binding, §2/§5): because it's a real, interactive link —
 * not informational, static content — it does NOT qualify for the
 * Badge/Chip "exempt from the 44px floor" carve-out design-brief §9 grants
 * static chips. `min-h-11` (44px) + generous horizontal padding, not
 * `Badge`'s default slim-pill sizing.
 */
export function BacklogChip({ label, status }: BacklogChipRef) {
  return (
    <a
      href={BACKLOG_URL}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] underline decoration-transparent transition-transform duration-100 ease-in hover:decoration-current active:translate-y-px motion-reduce:active:translate-y-0 ${TONE_CLASSES[status]}`}
    >
      {status === 'completed' && <span aria-hidden="true">✓</span>}
      {label} · {STATUS_LABEL[status]}
    </a>
  );
}

/**
 * BacklogChipRow — the eyebrow-labeled row of `BacklogChip`s, rendered once
 * per post (BlogPost.tsx follows the exact `lg:hidden` / rail-only split
 * `Byline`/`ProvenanceStrip` already use, to avoid rendering this twice
 * visible at once — see BlogPost.tsx's own comment for the 2026-07-18
 * duplicated-content bug this guards against).
 *
 * Empty state (§2): omitted entirely — including the eyebrow — when
 * `refs` is absent or empty. Never a "no backlog items" placeholder.
 */
export function BacklogChipRow({ refs }: { refs?: BacklogChipRef[] }) {
  if (!refs || refs.length === 0) return null;

  return (
    <div>
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Worked on this entry</p>
      <div className="flex flex-wrap gap-2">
        {refs.map((ref) => (
          <BacklogChip key={`${ref.label}-${ref.status}`} {...ref} />
        ))}
      </div>
    </div>
  );
}
