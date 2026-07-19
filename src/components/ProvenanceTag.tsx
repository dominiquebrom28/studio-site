import type { Provenance } from '@/content/schemas';
import { Badge } from './ui/Badge';

/**
 * `ProvenanceTag` (docs/project-page-v2.md §1A / §7) — a thin wrapper over
 * the existing `Badge`, not a new visual primitive. Used sparingly (2-3
 * times a page): the eyebrow slot on "Why this exists" and "The Brief"
 * only — never sprinkled through body prose, which carries the same
 * recorded/inferred signal via italic vs. roman instead (§1B).
 *
 * Three tones, all built from `Badge`'s EXISTING tone system:
 * - `logged` — `Badge` muted (the same `--ink-muted`/`--hairline` treatment
 *   every other muted badge on the site already uses).
 * - `read` — `Badge`'s `tint` tone at `--marker-700`, the same accent
 *   already reserved for links/active states — "this is us talking"
 *   borrows the exact ink as "click this."
 * - `not-stated` — a deliberate DEVIATION from the spec's literal "`Badge`
 *   muted at 60% opacity": hand-computing that pairing (§2's WCAG-rigor
 *   precedent) shows `--ink-muted` text at 60% opacity over `--paper` lands
 *   at roughly **2.7:1** — a real AA text-contrast failure (needs 4.5:1 at
 *   this 11px size), not a legal "quiet" reading. Opacity is applied to the
 *   BORDER only (a non-text, decorative element, exempt to the lower 3:1
 *   non-text threshold and trivially clearing it even dimmed) while the
 *   label text stays full-strength `--ink-muted` — same visual intent
 *   ("the quietest tag, for honest silence") without the contrast
 *   regression. Flagged for Dom/designer sign-off, not silently patched.
 */
const LABEL: Record<Provenance, string> = {
  logged: 'LOGGED',
  read: 'OUR READ',
  'not-stated': 'NOT STATED',
};

export function ProvenanceTag({ source }: { source: Provenance }) {
  if (source === 'read') {
    return (
      <Badge tone="tint" tintVar="marker-700">
        {LABEL.read}
      </Badge>
    );
  }

  if (source === 'not-stated') {
    return (
      <Badge tone="muted" className="border-hairline/50 border-dashed">
        {LABEL['not-stated']}
      </Badge>
    );
  }

  return <Badge tone="muted">{LABEL.logged}</Badge>;
}
