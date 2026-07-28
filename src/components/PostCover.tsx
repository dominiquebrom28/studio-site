import type { Post } from '@/content';

/**
 * PostCover — renders `PostFrontmatterSchema`'s `cover` field (schemas.ts),
 * which existed on every post's schema but was set by zero posts and
 * rendered nowhere until BACKLOG P1 "dead-field / retired-device cleanup."
 * design-brief §5 places it explicitly in the reading order — mobile: "tag
 * chips → optional cover → `Prose` body"; blog-format-v2.md §1 step 7/8
 * pins the exact position more precisely (both mobile and the desktop main
 * column): tags → cover → TL;DR → body. `BlogPost.tsx` renders this one
 * instance directly in the shared main column (not split `lg:hidden` /
 * rail like `Byline`/`ProvenanceStrip`), so it's already correct at both
 * mobile and desktop widths without a breakpoint-gated duplicate.
 *
 * Genuinely optional, unlike `ProjectHero`'s cover: a project always
 * renders a cover slot (real image or the "no cover yet" placeholder,
 * ProjectHero.tsx) because the hero is fixed page furniture at a reserved
 * aspect ratio. A blog post has no such reserved slot in the reading
 * flow — most posts still have no cover today — so an absent `post.cover`
 * renders nothing at all: no placeholder, no reserved box, no layout gap.
 *
 * Visual treatment matches the existing image-block convention this
 * codebase already uses for content images (`ProjectHero`'s cover frame /
 * `MediaGallery`'s figure frame): `rounded-sm`, `overflow-hidden`,
 * `object-cover`, `--paper-raised` backing. Static only — no parallax/
 * scroll motion (`ProjectHero`'s scroll-linked parallax is that
 * component's own hero-specific treatment, not a shared convention).
 *
 * `alt`: design-brief §9's binding rule — "cover images get real alt text
 * from frontmatter (fall back to the project/post title, never empty
 * `alt`)." `PostFrontmatterSchema` has no dedicated alt-type field for the
 * post cover today (only `ProjectMediaItemSchema` gallery items carry a
 * per-image `alt`), so this always falls back to `post.title`; if a future
 * content pass adds one, wire it in here first.
 */
export function PostCover({ post }: { post: Pick<Post, 'cover' | 'title'> }) {
  if (!post.cover) return null;

  return (
    <div className="mb-8 aspect-[16/9] w-full overflow-hidden rounded-sm bg-paper-raised">
      <img src={post.cover} alt={post.title} className="h-full w-full object-cover" />
    </div>
  );
}
