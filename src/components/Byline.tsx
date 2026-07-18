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
 * Names v2 (2026-07-18, docs/persona-bible.md "Names (v2)"): the byline
 * format is `{firstName}, {name}` everywhere, comma apposition, newsroom
 * style — `firstName` (e.g. "Vera") takes the prominent linked slot,
 * `name` (the discipline string, e.g. "designer") is the secondary mono
 * line underneath, replacing the old `member.title` compression there —
 * `title` stays on the type for the Cast page/signature-block use, but this
 * row now reads the same discipline word the byline format spec calls for.
 *
 * Handles an author who isn't one of the ten studio characters (e.g. "Dom",
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
          aria-label={`${member.firstName} — view the Cast page`}
        >
          <CharacterAvatar id={member.id} tintVar={member.tintVar} name={member.name} size="byline" />
        </Link>
      )}
      <div>
        <p className="font-mono text-sm font-semibold text-ink">
          {member ? (
            <Link to="/cast" className="hover:underline">
              {member.firstName}
            </Link>
          ) : (
            author
          )}
        </p>
        <p className="mt-0.5 font-mono text-xs text-ink-muted">
          {member ? `${member.name} · ` : ''}
          {date}
        </p>
      </div>
    </div>
  );
}
