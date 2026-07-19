import { Link } from 'react-router-dom';
import { getCastMemberByName } from '@/content/cast';
import { CharacterAvatar } from './ui/CharacterAvatar';

const STAMP_ROTATIONS = [-4, 3, -3];
const MAX_VISIBLE_STAMPS = 3;

/** "X and Y" (2) / "X, Y, and Z" (3+, Oxford comma) — design-brief §5's
 * home-hero passport-stamp cluster naming convention, reused verbatim. */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

/**
 * BylineGroup (docs/blog-format-v2.md §2) — the top-of-post byline for a
 * 2+ author post (`post.authors.length > 1`, BlogPost.tsx). A single-author
 * post keeps using the existing `Byline` unchanged.
 *
 * Visual treatment: 100% `CharacterAvatar` reuse — the exact "passport
 * stamps" motif design-brief §5 already specifies for the Home hero's
 * avatar cluster (`CastStrip.tsx`: overlapping stamps, slight rotation),
 * at the smaller `size="byline"` (56px) scale with ~30% overlap
 * (`-ml-4` = 16px ≈ 28% of 56px). Caps the visible stamp cluster at 3 with
 * a "+N" suffix, the same overflow convention `ProjectCard`'s stack chips
 * already use.
 *
 * `authors` is the post's already-normalized raw name list (`post.authors:
 * string[]`, loader.ts) — resolved against `cast.ts` here, the same way
 * `Byline`/`ProvenanceStrip` already resolve a single `author` string.
 *
 * Semantics: one group-level `aria-label` ("Written by X and Y") on the
 * `<ul role="list">`, plus each avatar individually reachable and
 * individually labeled (mirrors `CastStrip`'s existing per-avatar
 * `aria-label` pattern) — one accessible group name, not N redundant
 * "Written by" announcements.
 */
export function BylineGroup({ authors, date }: { authors: string[]; date: string }) {
  const resolved = authors.map((name) => ({ name, member: getCastMemberByName(name) }));
  const displayNames = resolved.map(({ name, member }) => member?.firstName ?? name);
  const groupLabel = `Written by ${joinNames(displayNames)}`;

  const visible = resolved.slice(0, MAX_VISIBLE_STAMPS);
  const overflow = resolved.length - visible.length;

  return (
    <div className="mb-4">
      <ul role="list" aria-label={groupLabel} className="mb-2 flex items-center">
        {visible.map(({ name, member }, index) => (
          <li key={name} className={index > 0 ? '-ml-4' : ''}>
            {member ? (
              <Link
                to="/cast"
                className="relative inline-flex rounded-full focus-visible:outline-offset-4"
                aria-label={`${member.firstName} — view the Cast page`}
              >
                <CharacterAvatar
                  id={member.id}
                  tintVar={member.tintVar}
                  name={member.name}
                  size="byline"
                  rotate={STAMP_ROTATIONS[index % STAMP_ROTATIONS.length]}
                />
              </Link>
            ) : (
              <span
                role="img"
                aria-label={name}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-paper-raised font-mono text-xs text-ink-muted ring-2 ring-[var(--ink)]/20"
              >
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </li>
        ))}
        {overflow > 0 && (
          <li
            aria-hidden="true"
            className="-ml-4 flex h-14 w-14 items-center justify-center rounded-full border border-hairline bg-paper-raised font-mono text-xs text-ink-muted"
          >
            +{overflow}
          </li>
        )}
      </ul>
      <p className="font-mono text-sm font-semibold text-ink">{joinNames(displayNames)}</p>
      <p className="mt-0.5 font-mono text-xs text-ink-muted">{date}</p>
    </div>
  );
}
