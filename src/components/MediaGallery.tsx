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

function StopGlyph(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className={props.className}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function GalleryItem({ item }: { item: ProjectMediaItem }) {
  const [isPlaying, setIsPlaying] = useState(false);
  // Announcement text starts `null` (nothing rendered in the live region at
  // mount) and is only set on an actual toggle, so a screen reader never
  // hears a spurious "Animation stopped" the moment the page loads — only
  // real state changes get announced.
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const isAnimation = item.kind === 'animation';
  // Static-first treatment for GIFs (design-brief §9 / DOM-4 perf+a11y
  // gate): a GIF autoplays the instant it loads and, unlike video, can never
  // be paused mid-play — that's motion the reader never consented to, and a
  // real LCP risk if it happened to land above the fold. So an animation
  // item never renders its real `src` until the reader explicitly activates
  // this control; until then it shows `poster` (a static extracted first
  // frame, see CAPTIONS.md addendum, required by the schema for every
  // `kind: "animation"` item). This is stricter than only honoring
  // `prefers-reduced-motion` — nobody gets uninvited motion, not just
  // reduced-motion users.
  const showRealSrc = !isAnimation || isPlaying;
  const displaySrc = showRealSrc ? item.src : (item.poster ?? item.src);

  // One PERSISTENT control, never unmounted — toggling `isPlaying` only ever
  // changes this same <button>'s size/position/label/icon, it never swaps a
  // conditionally-rendered element out for a bare image. A keyboard user who
  // just pressed Enter/Space on "Play" never has focus dumped to <body>:
  // the element they activated is still there afterwards, now offering
  // "Stop" instead — and there's now an actual way to stop the motion once
  // started, which a one-shot "Play" button never offered.
  function toggle() {
    setIsPlaying((wasPlaying) => {
      const nowPlaying = !wasPlaying;
      setAnnouncement(nowPlaying ? 'Animation playing.' : 'Animation stopped.');
      return nowPlaying;
    });
  }

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
        {isAnimation && (
          <button
            type="button"
            onClick={toggle}
            aria-pressed={isPlaying}
            aria-label={isPlaying ? `Stop animation — ${item.caption}` : `Play animation — ${item.caption}`}
            className={
              isPlaying
                ? // Playing: shrink to a corner control so it stops covering
                  // the animation it just started, but stays a real ≥44×44px
                  // target and the exact same DOM node (no remount).
                  'absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink/25 bg-paper-raised text-ink shadow-[var(--shadow-card)] transition-colors duration-150 ease-out hover:bg-paper'
                : // Not playing: the whole poster is one big "play" invitation.
                  'absolute inset-0 flex flex-col items-center justify-center gap-2 bg-paper/55 transition-colors duration-150 ease-out hover:bg-paper/70'
            }
          >
            {isPlaying ? (
              <StopGlyph />
            ) : (
              <>
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink/25 bg-paper-raised pl-1 text-ink shadow-[var(--shadow-card)]">
                  <PlayGlyph />
                </span>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink" aria-hidden="true">
                  Play animation
                </span>
              </>
            )}
          </button>
        )}
        {isAnimation && (
          <span role="status" aria-live="polite" className="sr-only">
            {announcement}
          </span>
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
