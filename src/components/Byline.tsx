import { Link } from 'react-router-dom';
import type { CharacterEntry } from '@/content/cast';
import { CharacterAvatar } from './ui/CharacterAvatar';

/**
 * Byline (design-brief §6): avatar + name + short title underneath in
 * `--ink-muted`, linking to the character's Cast entry.
 *
 * Bug fix (QA browser pass, 2026-07-18): this used to render its own
 * "Written by {Name}" sentence, and `ProvenanceStrip` — rendered directly
 * beneath it, both on mobile and in the desktop rail card — carries its own
 * "Written by {author}" as the first field of its ledger. At 1280px both
 * were visible at once, so the sentence appeared twice, stacked, on the same
 * screen. Decision: `ProvenanceStrip` owns "Written by" (it's the ledger/
 * audit-trail sentence the provenance strip exists to state); `Byline` is
 * the warm, human-scale credit — avatar + name + title only, no "Written
 * by" prefix — the same register a masthead byline uses ("Jane Doe,
 * Editor"), not a duplicate of the ledger's own sentence.
 *
 * Uses `member.title` (short, byline-safe) rather than `member.role` (the
 * full job-description sentence reserved for the Cast page's mono eyebrow —
 * `role` collapsed this row and the signature block into an unreadable
 * run-on before `title` was added).
 *
 * Handles an author who isn't one of the nine studio characters (e.g. "Dom",
 * the human) gracefully: no avatar stamp (those are reserved for the AI
 * cast, design-brief §7), no Cast link, no fabricated title — just the name
 * and date as plain text.
 */
export function Byline({ author, date, member }: { author: string; date: string; member?: CharacterEntry }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {member && (
        <Link
          to="/cast"
          className="shrink-0 rounded-full focus-visible:outline-offset-4"
          aria-label={`${member.name} — view the Cast page`}
        >
          <CharacterAvatar id={member.id} tintVar={member.tintVar} name={member.name} size="byline" />
        </Link>
      )}
      <div>
        <p className="font-mono text-sm font-semibold text-ink">
          {member ? (
            <Link to="/cast" className="hover:underline">
              {author}
            </Link>
          ) : (
            author
          )}
        </p>
        <p className="mt-0.5 font-mono text-xs text-ink-muted">
          {member ? `${member.title} · ` : ''}
          {date}
        </p>
      </div>
    </div>
  );
}
