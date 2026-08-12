import { Link } from 'react-router-dom';
import type { Post } from '@/content';
import { getCastMemberByName } from '@/content/cast';
import { CharacterAvatar } from './ui/CharacterAvatar';
import { Badge, Chip } from './ui/Badge';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PostCard({
  post,
  headingLevel = 3,
}: {
  post: Post;
  /** Correct semantic heading level for this card's context — see .card-title
   * comment in index.css for why this must vary by call site (WCAG heading order). */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  // Resolve the primary author to a cast character so the blog index carries
  // the same avatar-stamp byline the post page does (design-brief §5) — the
  // one page the ten characters were entirely absent from before. No nested
  // <Link> here: the whole card is already a link, so the stamp is a plain
  // stamp, not a Cast link. A non-cast author (e.g. "Dom") falls back to
  // plain text, exactly like Byline does.
  const member = getCastMemberByName(post.author);
  const extraAuthors = post.authors.length - 1;

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group relative block rounded-sm border border-hairline bg-paper-raised p-4 shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-150 ease-out hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 active:shadow-[var(--shadow-card-active)] active:translate-y-px motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0"
    >
      <span className="mb-1 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
        {formatDate(post.date)}
        {post.tldr && (
          // Reuses TLDRBlock's own `marker-700` eyebrow tint (via
          // Badge tone="tint") so the card-level chip and the in-post
          // TL;DR block read as the same device, not two unrelated
          // ones. Derived from `post.tldr` presence — no separate
          // frontmatter flag, so this can never drift from whether a
          // TLDRBlock actually renders on the post page.
          <Badge tone="tint" tintVar="marker-700">
            TL;DR
          </Badge>
        )}
      </span>
      <Heading className="card-title mb-1">{post.title}</Heading>
      <p className="mb-3 line-clamp-2 text-sm text-ink-muted">{post.summary}</p>
      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-ink-muted">
        {member ? (
          <span className="inline-flex items-center gap-1.5">
            <CharacterAvatar id={member.id} tintVar={member.tintVar} name={member.name} size="inline" />
            <span>
              {member.firstName}
              {extraAuthors > 0 && ` +${extraAuthors}`}
            </span>
          </span>
        ) : (
          <span>
            by {post.author}
            {extraAuthors > 0 && ` +${extraAuthors}`}
          </span>
        )}
        {post.tags.length > 0 && <span aria-hidden="true">·</span>}
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </div>
      </div>
    </Link>
  );
}
