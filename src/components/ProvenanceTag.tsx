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
 * - `not-stated` — `Badge` muted at 60% opacity, the quietest tag, for
 *   honest silence.
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
      <Badge tone="muted" className="opacity-60">
        {LABEL['not-stated']}
      </Badge>
    );
  }

  return <Badge tone="muted">{LABEL.logged}</Badge>;
}
