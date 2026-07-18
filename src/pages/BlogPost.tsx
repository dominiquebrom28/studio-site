import { useRef, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Post } from '@/content';
import { Container } from '@/components/ui/Container';
import { Chip } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Markdown } from '@/components/Markdown';
import { ProvenanceStrip } from '@/components/ProvenanceStrip';
import { Byline } from '@/components/Byline';
import { Seo } from '@/components/Seo';
import { getPostBySlug, getAdjacentPosts } from '@/content';
import { getCastMemberByName } from '@/content/cast';
import { extractTableOfContents } from '@/content/toc';
import NotFound from './NotFound';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Prev/next post nav (design-brief §5: "prev/next post nav" at the end of
 * the post). Dead-ends at both edges rather than wrapping — see the
 * `getAdjacentPosts` doc comment in `content/index.ts` for the reasoning.
 * Renders nothing when neither neighbor exists (e.g. only one post total). */
function PostNav({ older, newer }: { older?: Post; newer?: Post }) {
  if (!older && !newer) return null;

  return (
    <nav aria-label="More logbook entries" className="mt-10 border-t border-hairline pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {older && (
            <Link
              to={`/blog/${older.slug}`}
              className="inline-flex min-h-11 flex-col justify-center font-mono text-sm text-marker-700 hover:underline"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                ← Older entry
              </span>
              {older.title}
            </Link>
          )}
        </div>
        <div className="sm:text-right">
          {newer && (
            <Link
              to={`/blog/${newer.slug}`}
              className="inline-flex min-h-11 flex-col justify-center font-mono text-sm text-marker-700 hover:underline sm:items-end"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                Newer entry →
              </span>
              {newer.title}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

/**
 * Share affordance (design-brief §5/§8): mailto + copy-link ONLY — no social
 * buttons, no third-party scripts, no tracking pixel (spec §8/§5 rule these
 * out entirely). The copy-link confirmation is an `aria-live="polite"`
 * region that's always mounted (so assistive tech gets the update) and
 * fades via opacity only (150ms in / 200ms out, per §8's toast row) — the
 * `motion-reduce:` variant drops that to an instant show/hide, and the
 * site-wide reduced-motion rule in `index.css` covers the transition
 * duration as a second layer. Deliberate deviation from §8's literal "400ms
 * hold": that number reads as a generic toast default, not one calibrated
 * for a copy-link message a user has to actually read — this uses a 2.5s
 * hold so the confirmation doesn't vanish before it's legible.
 */
function ShareRow({ title }: { title: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  async function handleCopy() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus('idle'), 2500);
  }

  const mailHref = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.href : '',
  )}`;

  return (
    <div className="mt-10 border-t border-hairline pt-6">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Share this entry</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button href={mailHref} variant="secondary">
          Email this post
        </Button>
        <Button type="button" variant="secondary" onClick={handleCopy}>
          Copy link
        </Button>
      </div>
      <p
        aria-live="polite"
        className={`mt-2 min-h-[1.5em] font-mono text-xs transition-opacity motion-reduce:transition-none ${
          status === 'idle' ? 'opacity-0 duration-200' : 'opacity-100 duration-150'
        }`}
      >
        {status === 'copied' && <span className="text-success">Link copied to clipboard.</span>}
        {status === 'error' && (
          <span className="text-error">Couldn&rsquo;t copy — copy the address from your browser&rsquo;s bar instead.</span>
        )}
      </p>
    </div>
  );
}

export default function BlogPost() {
  const { slug = '' } = useParams();
  const post = getPostBySlug(slug);

  if (!post) return <NotFound />;

  const castMember = getCastMemberByName(post.author);
  const { newer, older } = getAdjacentPosts(post.slug);
  const toc = extractTableOfContents(post.body);
  const showToc = toc.length >= 3;

  return (
    <Container className="py-12 sm:py-16">
      <Seo title={post.title} description={post.summary} />
      <Link to="/blog" className="mb-6 inline-block font-mono text-sm text-ink-muted hover:text-ink hover:underline">
        ← Logbook
      </Link>

      <div className="grid gap-10 lg:grid-cols-[68%_32%]">
        <div>
          <h1 className="mb-4">{post.title}</h1>

          {/* Mobile/tablet — brief §5 mobile flow: H1 → byline row →
              provenance strip → tag chips. The sticky rail below carries the
              equivalent (byline + full provenance card) at lg+, so this
              block is hidden there to avoid rendering the same provenance
              content twice at one width (the exact bug the 2026-07-17
              projects-page pass caught — see reports/2026-07-17.md). */}
          <div className="mb-6 lg:hidden">
            <Byline author={post.author} date={formatDate(post.date)} member={castMember} />
            <ProvenanceStrip author={post.author} />
          </div>

          {post.tags.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Chip key={tag}>{tag}</Chip>
              ))}
            </div>
          )}

          <Markdown ruled>{post.body}</Markdown>

          <div className="mt-12 border-t border-hairline pt-8">
            <p className="font-hand text-2xl text-marker-700">— {post.author}</p>
            <p className="mt-1 font-mono text-sm text-ink-muted">
              Signed, {post.author}
              {castMember ? `, ${castMember.title}` : ''}
            </p>
          </div>

          <PostNav older={older} newer={newer} />
          <ShareRow title={post.title} />
        </div>

        {/* Desktop rail (design-brief §5, ≥1024px): full provenance card —
            avatar, role, date, the provenance ledger — plus an
            auto-generated table of contents once the post has 3+ H2s. No
            "graded-paper PASS/round/score" badge: the brief names one, but
            `content/posts/*.md` frontmatter (spec §3.2) carries no real
            Judge-verdict field for posts, and the studio's "never invent
            results" rule overrides the layout brief here — same call the
            2026-07-17 projects-page pass made for project-detail provenance. */}
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="rounded-sm border border-hairline bg-paper-raised p-5 shadow-[var(--shadow-card)]">
            <Byline author={post.author} date={formatDate(post.date)} member={castMember} />
            <ProvenanceStrip author={post.author} />
          </div>

          {showToc && (
            <nav aria-label="Table of contents" className="mt-6 border-t border-hairline pt-5">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                In this entry
              </p>
              <ul className="flex flex-col">
                {toc.map((entry) => (
                  <li key={entry.id}>
                    <a
                      href={`#${entry.id}`}
                      className="inline-flex min-h-11 items-center font-mono text-sm text-marker-700 hover:underline"
                    >
                      {entry.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </aside>
      </div>
    </Container>
  );
}
