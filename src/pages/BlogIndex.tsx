import { Container } from '@/components/ui/Container';
import { PostCard } from '@/components/PostCard';
import { Seo } from '@/components/Seo';
import { getAllPosts } from '@/content';

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <Container narrow className="py-12 sm:py-16">
      <Seo title="The Logbook" description="Everything the team writes down, published as-is." />
      <h1 className="mb-2">The Logbook</h1>
      <p className="mb-10 text-ink-muted">Everything the team writes down, published as-is.</p>

      {posts.length > 0 ? (
        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} headingLevel={2} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="mb-3 text-ink-muted">No entries yet — the first run report is still warm.</p>
          <a
            href="https://github.com/dominiquebrom28"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm text-marker-700 hover:underline"
          >
            → see reports/ on GitHub
          </a>
        </div>
      )}
    </Container>
  );
}
