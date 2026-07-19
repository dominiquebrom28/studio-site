import { useState } from 'react';
import type { ProjectMediaItem } from '@/content/schemas';
import { sortForGallery } from '@/content/media';

const viewportLabel: Record<ProjectMediaItem['viewport'], string> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
};

/**
 * Per-project screenshot/animation gallery (DOM-4). Renders nothing when a
 * project has no media yet — four of the six projects don't (SoulForge,
 * PizzaParty, MensApp, LoveDiary) and an empty gallery frame or "coming
 * soon" filler would read as a promise the studio hasn't kept. No media,
 * no section: the prose write-up simply carries the page on its own, same
 * as it did before this pass.
 */
export function MediaGallery({ items }: { items: ProjectMediaItem[] }) {
  if (items.length === 0) return null;

  const ordered = sortForGallery(items);

  return (
    <div className="mb-8">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Media</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {ordered.map((item) => (
          <GalleryItem key={item.src} item={item} />
        ))}
      </div>
    </div>
  );
}

function PlayGlyph(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className={props.className}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
    </svg>
  );
}

function GalleryItem({ item }: { item: ProjectMediaItem }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isAnimation = item.kind === 'animation';
  // Static-first treatment for GIFs (design-brief §9 / DOM-4 perf+a11y
  // gate): a GIF autoplays the instant it loads and, unlike video, can never
  // be paused afterwards — that's motion the reader never consented to, and
  // a real LCP risk if it happened to land above the fold. So an animation
  // item never renders its real `src` until the reader explicitly clicks
  // "play"; until then it shows `poster` (a static extracted first frame,
  // see CAPTIONS.md addendum). This is stricter than only honoring
  // `prefers-reduced-motion` — nobody gets uninvited motion, not just
  // reduced-motion users — and it composes cleanly with the motion query:
  // the click is a deliberate user action, not an automatic reveal, so nothing
  // here needs to additionally branch on the media query.
  const showRealSrc = !isAnimation || isPlaying;
  const displaySrc = showRealSrc ? item.src : (item.poster ?? item.src);

  return (
    <figure className="overflow-hidden rounded-sm border border-hairline bg-paper-raised shadow-[var(--shadow-card)]">
      <div className="relative w-full" style={{ aspectRatio: `${item.width} / ${item.height}` }}>
        <img
          src={displaySrc}
          alt={item.alt}
          width={item.width}
          height={item.height}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {isAnimation && !isPlaying && (
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
            aria-label={`Play animation — ${item.caption}`}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-paper/55 transition-colors duration-150 ease-out hover:bg-paper/70"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink/25 bg-paper-raised pl-1 text-ink shadow-[var(--shadow-card)]">
              <PlayGlyph />
            </span>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink">
              Play animation
            </span>
          </button>
        )}
      </div>
      <figcaption className="p-3">
        <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
          <span>{isAnimation ? 'Animation' : 'Screenshot'}</span>
          <span aria-hidden="true">·</span>
          <span>{viewportLabel[item.viewport]}</span>
        </div>
        <p className="text-sm text-ink-muted">{item.caption}</p>
      </figcaption>
    </figure>
  );
}
