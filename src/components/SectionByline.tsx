import { getCastMemberByName } from '@/content/cast';
import { CharacterAvatar } from './ui/CharacterAvatar';

/** Oxford-comma join: `[A]` → "A", `[A,B]` → "A & B", `[A,B,C]` → "A, B, & C". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;
}

/**
 * SectionByline (docs/blog-format-v2.md §2) — "let multiple team members
 * tell their part": a compact credit line directly under an `##` heading,
 * naming whose expertise that section speaks from.
 *
 * Authored as `*Section by: {Name}[, {Name}...]*`, the first non-blank
 * line after a heading (`content/toc.ts`'s `scanSectionBylines`, the same
 * line-based scan the codebase already uses for heading ids — no new
 * remark plugin). `Markdown.tsx`'s `p` renderer strips the matched line
 * and renders this component in its place.
 *
 * Semantics — the noise-machine guardrail (binding, §2/§5): plain inline
 * reading-order content, NOT a landmark. No `<aside>`, no `role="note"` —
 * just a `<p>` in normal document flow, so a post with six attributed
 * sections adds zero new items to a screen-reader user's landmarks list.
 *
 * Graceful degradation: an unresolved name (e.g. "Dom", or a typo) renders
 * as plain text with no avatar — same pattern `Byline.tsx` already uses.
 * Deliberately no link to `/cast` (recommendation, §2) — a post with many
 * attributed sections shouldn't gain a tab stop per section.
 */
export function SectionByline({ names }: { names: string[] }) {
  const resolved = names.map((raw) => ({ raw, member: getCastMemberByName(raw) }));
  const displayNames = resolved.map(({ raw, member }) => (member ? `${member.firstName}, ${member.name}` : raw));
  const avatarMember = resolved.find((entry) => entry.member)?.member;

  return (
    <p className="mb-4 flex items-center gap-2 font-mono text-[13px] text-ink-muted">
      {avatarMember && (
        <CharacterAvatar id={avatarMember.id} tintVar={avatarMember.tintVar} name={avatarMember.name} size="inline" />
      )}
      <span>{joinNames(displayNames)}</span>
    </p>
  );
}
