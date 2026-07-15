import { Link } from 'react-router-dom';
import type { Post } from '@/content';
import { Chip } from './ui/Badge';

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

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group relative block rounded-sm border border-hairline bg-paper-raised p-4 shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-150 ease-out hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 active:shadow-[var(--shadow-card-active)] active:translate-y-px motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0"
    >
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
        {formatDate(post.date)}
      </span>
      <Heading className="card-title mb-1">{post.title}</Heading>
      <p className="mb-3 line-clamp-2 text-sm text-ink-muted">{post.summary}</p>
      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-ink-muted">
        <span>by {post.author}</span>
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
