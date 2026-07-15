import { Link, useParams } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Chip } from '@/components/ui/Badge';
import { Markdown } from '@/components/Markdown';
import { ProvenanceStrip } from '@/components/ProvenanceStrip';
import { Seo } from '@/components/Seo';
import { getPostBySlug } from '@/content';
import NotFound from './NotFound';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogPost() {
  const { slug = '' } = useParams();
  const post = getPostBySlug(slug);

  if (!post) return <NotFound />;

  return (
    <Container narrow className="py-12 sm:py-16">
      <Seo title={post.title} description={post.summary} />
      <Link to="/blog" className="mb-6 inline-block font-mono text-sm text-ink-muted hover:text-ink hover:underline">
        ← Logbook
      </Link>

      <h1 className="mb-2">{post.title}</h1>
      <p className="mb-4 font-mono text-sm text-ink-muted">{formatDate(post.date)}</p>

      {post.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </div>
      )}

      <div className="mb-8">
        <ProvenanceStrip author={post.author} />
      </div>

      <Markdown ruled>{post.body}</Markdown>

      <div className="mt-12 border-t border-hairline pt-8">
        <p className="font-hand text-2xl text-marker-700">— {post.author}</p>
        <p className="mt-1 font-mono text-sm text-ink-muted">Signed, {post.author}</p>
      </div>
    </Container>
  );
}
