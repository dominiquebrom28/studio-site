import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import type { ProjectMediaItem } from '@/content/schemas';
import { sortForGallery } from '@/content/media';

const viewportLabel: Record<ProjectMediaItem['viewport'], string> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
};

/** Alternating rotation for the desktop scatter layout (docs/project-page-v2.md
 * §4.2) — never more than ±2deg, so it reads as loosely-arranged snapshots
 * clipped into a logbook, not a tilted-tiles gimmick. */
const ROTATIONS = [-2, 1.5, -1] as const;

/**
 * Per-project screenshot/animation gallery v2 (docs/project-page-v2.md §4).
 * LAYOUT/EMPTY-STATE UPGRADE ONLY — the click-to-play internals
 * (`GalleryItem`'s poster-first render, the single persistent Play/Stop
 * button, `showRealSrc`'s no-autoplay-on-load guarantee, focus retention)
 * are byte-for-byte the same logic as before this pass; see that function's
 * own doc comment for why each piece exists.
 *
 * No longer returns `null` when empty (spec §4.1's core complaint — four of
 * six projects have no media, and a bare `null` reads as "the gallery was
 * never built," not an edition choice). Renders `EmptyGalleryStamp` instead.
 *
 * TASTE CALL FLAGGED FOR DOM (spec §4.2): the scatter/overlap desktop layout
 * below is the higher-risk, higher-reward call the spec explicitly flags.
 * If it reads too scrapbook-y once seen in a real browser, the documented
 * fallback is the same rotation/framing/motion ingredients in a simple
 * non-overlapping row (drop the `lg:-ml-*` overlap classes and `zIndex`
 * stagger below, keep everything else) — noted here since this pass can't
 * be visually verified without a browser (see the frontend-dev report).
 */
export function MediaGallery({ items }: { items: ProjectMediaItem[] }) {
  if (items.length === 0) {
    return <EmptyGalleryStamp />;
  }

  const ordered = sortForGallery(items);

  return (
    <div className="mb-10">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Media</p>
      <div className="flex flex-col gap-6 sm:grid sm:grid-cols-2 sm:gap-5 lg:flex lg:flex-row lg:flex-wrap lg:items-start lg:gap-y-8">
        {ordered.map((item, index) => (
          <GalleryItem key={item.src} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}

/** The designed empty state (spec §4.2) — same index-card/rotated-stamp
 * family as the projects-index "nothing logged yet" empty state, so an
 * edition choice reads as deliberate rather than a build that never
 * happened. */
function EmptyGalleryStamp() {
  return (
    <div className="mb-10">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Media</p>
      <div className="w-fit -rotate-2 rounded-sm border border-hairline bg-paper-raised px-5 py-4 shadow-[var(--shadow-card)]">
        <span className="inline-block rounded-full border border-hairline bg-paper px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
          No screens logged
        </span>
        <p className="mt-2 text-sm text-ink-muted">This one&rsquo;s process-only.</p>
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

function GalleryItem({ item, index }: { item: ProjectMediaItem; index: number }) {
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

  const prefersReducedMotion = useReducedMotion();
  const isMobileCapture = item.viewport === 'mobile';
  const rotation = ROTATIONS[index % ROTATIONS.length];

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

  const entranceMotion = prefersReducedMotion
    ? { initial: { opacity: 1, y: 0 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } }
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-40px' },
        transition: { duration: 0.3, ease: 'easeOut' as const, delay: index * 0.08 },
      };

  return (
    <m.figure
      className={`overflow-hidden rounded-sm border shadow-[var(--shadow-card)] ${
        isMobileCapture ? 'border-2 border-hairline sm:w-56 lg:w-56' : 'border-hairline lg:w-80'
      } bg-paper-raised`}
      style={{ transform: `rotate(${rotation}deg)`, zIndex: index + 1 }}
      {...entranceMotion}
    >
      <div className={`relative ${index > 0 ? 'lg:-ml-10' : ''}`}>
        {isMobileCapture && (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center rounded-full border border-hairline bg-paper/90 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
            Mobile
          </span>
        )}
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
                  <m.span
                    className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink/25 bg-paper-raised pl-1 text-ink shadow-[var(--shadow-card)]"
                    // A single non-looping pulse the first time this item
                    // enters the viewport (spec §4.2/§5.2) — an invitation,
                    // never ambient/repeating m. Disabled entirely
                    // under reduced m.
                    whileInView={prefersReducedMotion ? undefined : { scale: [1, 1.06, 1] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  >
                    <PlayGlyph />
                  </m.span>
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
      </div>
    </m.figure>
  );
}
