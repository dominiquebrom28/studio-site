import type { CharacterEntry } from '@/content/cast';
import { CharacterAvatar } from './ui/CharacterAvatar';
import { Badge } from './ui/Badge';

/**
 * Cards are informational/non-interactive in v1 (design-brief §5 Cast —
 * no per-character filtered post view, deferred). Heading level is a prop,
 * same mechanism as ProjectCard/PostCard — not hardcoded — since "correct
 * because /cast happens to only have an <h1> before these cards" is a
 * latent heading-skip bug waiting for the page to grow a heading above the
 * grid (see .card-title comment in index.css for why the tag varies by
 * call site, WCAG heading order).
 */
export function CharacterCard({
  member,
  lead = false,
  headingLevel = 2,
}: {
  member: CharacterEntry;
  lead?: boolean;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <article
      className={`rounded-sm border-t-[3px] border-hairline bg-paper-raised p-5 shadow-[var(--shadow-card)] ${
        lead ? 'sm:flex sm:items-start sm:gap-6' : ''
      }`}
      style={{ borderTopColor: `var(--${member.tintVar})` }}
    >
      <div className={`mb-4 flex items-center gap-4 ${lead ? 'sm:mb-0 sm:flex-col sm:items-start' : ''}`}>
        <CharacterAvatar
          id={member.id}
          tintVar={member.tintVar}
          name={member.name}
          size={lead ? 'hero' : 'card'}
          interactiveTilt
        />
      </div>
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.06em] text-ink-muted">{member.role}</p>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Heading className="card-title">{member.name}</Heading>
          {lead && (
            <Badge tone="tint" tintVar={member.tintVar}>
              Leads
            </Badge>
          )}
        </div>
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.06em] text-ink">{member.voiceTag}</p>
        <p className="mb-3 text-sm text-ink-muted">{member.runningBit}</p>
        <p className="font-mono text-[11px] text-ink-muted">sourced: {member.citation}</p>
      </div>
    </article>
  );
}
