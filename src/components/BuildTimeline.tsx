import { useRef } from 'react';
import { m, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import type { CommitBurst, ProcessPhase, Project } from '@/content/schemas';
import {
  buildTimelineScaffold,
  layoutPhaseCaptions,
  phaseAnchorPosition,
  type PhaseCaptionAssignment,
  type TimelineScaffold,
  type TimelineTick,
} from '@/lib/timeline';

/**
 * `BuildTimeline` (docs/project-page-v2.md §2.2) — the process
 * visualization centrepiece. The scaffold (commit dates/counts/gaps) is
 * always recorded (roman, `aria-hidden` graphic); phase captions riding on
 * top are the studio's interpretive read (italic, real in-flow text, never
 * hidden).
 *
 * LAYOUT APPROACH (flagged for Dom's visual sign-off, same as the spec's own
 * "taste call" framing for the media scatter layout): rather than one set of
 * caption nodes whose CSS `position` flips between flow/absolute at the `lg`
 * breakpoint, this renders two sibling presentations of the SAME data — a
 * `lg:hidden` vertical flow (ticks + captions in normal reading order, one
 * DOM location) and a `hidden lg:block` horizontal graphic (alternating
 * above/below captions with SVG connectors, a second DOM location). Exactly
 * one is ever visible/in the accessibility tree at a given viewport width
 * (the other is `display: none`, fully removed from it — not merely
 * visually hidden) — the same standard "responsive duplicate content"
 * pattern the codebase already uses for the mobile/desktop meta blocks in
 * ProjectDetail.tsx. No content is read twice by assistive tech; this is
 * presentational duplication, not an accessibility violation.
 *
 * The `<details>` commit-log disclosure below the graphic is rendered once
 * (not duplicated per breakpoint) — it's the accessibility floor AND Dom's
 * fact-check surface (spec §2.2), independent of which graphic is showing.
 */
export function BuildTimeline({
  commits,
  phases,
  status,
}: {
  commits: CommitBurst[];
  phases: ProcessPhase[];
  status: Project['status'];
}) {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const scaffold = buildTimelineScaffold(commits, status);

  // Scroll-linked, not scroll-triggered (spec §2.2/§5.1) — this is the
  // specific "framer" feeling Dom named: advances AND reverses with scroll
  // direction. As of the 2026-07-19 P0 audit (and its follow-up) this
  // drives ONLY decorative, textless, `aria-hidden` layers that carry zero
  // information — the desktop tick-dot scale pop, and the accent sweep
  // overlaid on each (always fully drawn) base rule. See
  // `useRevealAtPosition`'s and `TimelineRule`'s doc comments for why
  // nothing that carries meaning reads from this value. Always called
  // (rules-of-hooks) even under reduced motion; its output is simply never
  // read into a style value in that branch, which is cheaper and safer
  // than conditionally skipping the hook.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start 0.8', 'end 0.3'] });

  return (
    <div ref={sectionRef} className="mb-10">
      <DesktopTimeline scaffold={scaffold} phases={phases} progress={scrollYProgress} reduced={!!prefersReducedMotion} />
      <MobileTimeline scaffold={scaffold} phases={phases} progress={scrollYProgress} reduced={!!prefersReducedMotion} />
      <CommitLog commits={commits} isOpenEnded={scaffold.isOpenEnded} />
    </div>
  );
}

const TONE_LABEL: Record<ProcessPhase['tone'], string> = {
  build: 'Build',
  silence: 'Silence',
  pivot: 'Pivot',
  cleanup: 'Cleanup',
  reactivation: 'Reactivation',
};

/** Shared reveal-on-draw value for a single decorative tick dot, gated to
 * how far the (scroll-linked, or instantly-complete under reduced motion)
 * rule has drawn past its position — SCALE ONLY, floor 0.6 (never 0).
 * Deliberately not `opacity`: `progress` sits at 0 before the reader has
 * scrolled at all (or forever, if scroll/rAF is dead), and this value is
 * read directly into a `style` prop with no animation frame required to
 * observe it — an `opacity` mapped from the same input would make every
 * tick invisible at rest, the exact class of bug this file was audited
 * for (2026-07-19). A scale floor of 0.6 keeps the (purely decorative,
 * `aria-hidden`) dot visibly present at every point in that range instead. */
function useRevealAtPosition(progress: MotionValue<number>, position: number, reduced: boolean) {
  const start = Math.max(position - 0.035, 0);
  const scale = useTransform(progress, [start, position], [0.6, 1]);
  return reduced ? { scale: 1 } : { scale };
}

function CommitCountBadge({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <span className="ml-1 inline-flex items-center rounded-full border border-hairline bg-paper px-1.5 font-mono text-[10px] font-semibold text-ink-muted">
      ×{count}
    </span>
  );
}

function SweepFlag() {
  return (
    <span className="ml-1.5 inline-flex -rotate-1 items-center rounded-full border border-marker-700/40 bg-[color-mix(in_srgb,var(--marker-700)_12%,var(--paper-raised))] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.05em] text-ink">
      Cleanup sweep
    </span>
  );
}

/**
 * The scaffold's rule, desktop (horizontal) and mobile (vertical) alike —
 * two layers, resolving the 2026-07-19 P0 audit's timeline finding without
 * dropping the scroll-linked "draw as you scroll, retrace on scroll back
 * up" feel Dom asked for by name (design-brief's "framer" feel; spec
 * §2.2's centrepiece; measured working correctly in real Chrome —
 * 0 → 0.19 → 0.49 → 0.79 → 1.0 down, identically back up):
 *
 * - BASE layer — plain, static, ALWAYS fully drawn (`--hairline`-family
 *   `ink/30`, never bound to scroll). This is the scaffold that makes tick
 *   and gap positions legible — real meaning, not decoration — so its
 *   visibility can never depend on scroll position or an animation frame
 *   actually running. (A rule bound straight to `scrollYProgress` sits at
 *   `scale{X,Y}: 0` — zero width/height, i.e. invisible — until the reader
 *   scrolls, or forever if rAF never runs: the same "un-animated state
 *   isn't the same content" failure as the page's opacity fades, just
 *   expressed as a transform.)
 * - ACCENT layer — `m.div`, `--marker-600` (design-brief §4 riso vocabulary,
 *   no new color introduced), `scale{X,Y}` bound straight to `progress`,
 *   `aria-hidden` and textless — carries zero information. THIS is where
 *   the scroll-linked sweep lives: advances and reverses with scroll
 *   direction, and if rAF is dead it simply never appears — the base rule
 *   underneath still reads perfectly on its own either way. Skipped
 *   entirely (not rendered at all) under reduced motion, per Dom's
 *   instruction to show only the base rule in that case.
 */
function TimelineRule({
  axis,
  progress,
  reduced,
}: {
  axis: 'x' | 'y';
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const sizeClass = axis === 'x' ? 'h-px w-full' : 'h-full w-px';
  const originClass = axis === 'x' ? 'origin-left' : 'origin-top';
  const scaleKey = axis === 'x' ? 'scaleX' : 'scaleY';

  return (
    <div className={`relative ${sizeClass}`}>
      {/* `data-timeline-rule` is a test hook only (no visual/behavioral
          effect) — see src/smoke/motion-resting-state.smoke.test.tsx's
          "base rule stays fully drawn" case, which asserts the BASE layer
          specifically never carries a scroll-bound `scale{X,Y}` inline
          style, so a future re-binding of this element to `progress`
          fails loudly instead of silently reintroducing the 2026-07-19
          bug. */}
      <div data-timeline-rule="base" className="absolute inset-0 bg-ink/30" />
      {!reduced && (
        <m.div
          data-timeline-rule="accent"
          className={`absolute inset-0 ${originClass} bg-marker-600`}
          style={{ [scaleKey]: progress }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Desktop: horizontal rule, alternating above/below phase captions        */
/* ---------------------------------------------------------------------- */

function DesktopTimeline({
  scaffold,
  phases,
  progress,
  reduced,
}: {
  scaffold: TimelineScaffold;
  phases: ProcessPhase[];
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  // Side/lane assignment (collision-avoidance) + the resulting vertical
  // clearance both live in `src/lib/timeline.ts` as pure, unit-tested
  // functions — see that file's "Desktop caption collision-avoidance"
  // section for the full reasoning. `clearancePx` replaces the previous
  // flat `pt-[22rem] pb-[22rem]` (352px): it's content-derived per project,
  // applied to BOTH paddingTop and paddingBottom (kept symmetric on purpose
  // — see `TimelineCaptionLayout.clearancePx`'s doc comment) so the rule's
  // plain `top: 50%` stays exactly centered.
  const layout = layoutPhaseCaptions(phases, scaffold);

  return (
    <div
      className="relative mb-6 hidden pr-24 lg:block"
      style={{ paddingTop: layout.clearancePx, paddingBottom: layout.clearancePx }}
    >
      {/* Decorative scaffold — rule, ticks, connectors. Real content (phase
          captions) lives outside this aria-hidden wrapper below. The extra
          `pr-24` on the outer container reserves room for the "still open"
          terminus label so it never bleeds past the column's right edge —
          it's positioned at the rule's end (100%), inside that reserved
          space, never outside the component's own box. */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2" aria-hidden="true">
        <TimelineRule axis="x" progress={progress} reduced={reduced} />
        {scaffold.ticks.map((tick) => (
          <DesktopTickDot key={tick.date} tick={tick} progress={progress} reduced={reduced} />
        ))}
        {scaffold.isOpenEnded && (
          <span
            className="absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted"
          >
            → still open
          </span>
        )}
        {scaffold.gaps.map((gap) => (
          <GapLabel key={gap.position} gap={gap} />
        ))}
      </div>

      {/* Real content — phase captions, packed onto a side + lane by
          `layoutPhaseCaptions` so no two ever overlap, connected by a
          decorative aria-hidden SVG line (the design-brief §6 `MarginNote`
          connector device) whose length grows with the caption's lane. */}
      {layout.assignments.map((assignment) => (
        <DesktopPhaseCaption
          key={`${assignment.phase.from}-${assignment.phase.title}`}
          assignment={assignment}
          offsetPx={(assignment.side === 'above' ? layout.above : layout.below).offsets[assignment.lane]}
        />
      ))}
    </div>
  );
}

function DesktopTickDot({
  tick,
  progress,
  reduced,
}: {
  tick: TimelineTick;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const reveal = useRevealAtPosition(progress, tick.position, reduced);
  const size = tick.count > 4 ? 14 : tick.count > 1 ? 11 : 8;

  return (
    <m.div
      className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center"
      style={{ left: `${tick.position * 100}%`, scale: reveal.scale }}
    >
      <span
        className={`rounded-full border-2 border-paper ${tick.isCleanupSweep ? 'bg-marker-700' : 'bg-ink'}`}
        style={{ width: size, height: size }}
      />
    </m.div>
  );
}

/** Desktop-only — positioned along the horizontal rule at the gap's real
 * midpoint. Mobile's equivalent is `MobileGapRow`, a plain flow row (no
 * absolute positioning needed once the rail is vertical and already in
 * document order).
 *
 * Always rendered, no motion: this is real text ("N days") a sighted
 * reader needs to read regardless of scroll position, so it can't be
 * gated behind a scroll-driven `opacity` that sits at 0 until scrolled
 * (or forever, under throttled/suspended rAF) — the same class of bug the
 * 2026-07-19 P0 audit found in the page's fade-in entrances. */
function GapLabel({ gap }: { gap: { position: number; days: number } }) {
  return (
    <span
      className="absolute top-4 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] text-ink-muted"
      style={{ left: `${gap.position * 100}%` }}
    >
      {gap.days} days
    </span>
  );
}

function DesktopPhaseCaption({
  assignment,
  offsetPx,
}: {
  assignment: PhaseCaptionAssignment;
  /** Distance (px) from the rule's centerline to this caption's near edge —
   * also the connector SVG's length. Grows per lane (see
   * `computeSideCaptionLayout` in `src/lib/timeline.ts`) so a caption pushed
   * into a second lane still reads as connected to the rule, just further
   * out, rather than floating. */
  offsetPx: number;
}) {
  const { phase, position, side } = assignment;
  const prefersReducedMotion = useReducedMotion();
  const isAbove = side === 'above';

  const motionProps = prefersReducedMotion
    ? { initial: { y: 0 }, whileInView: { y: 0 }, viewport: { once: true } }
    : {
        initial: { y: isAbove ? 16 : -16 },
        whileInView: { y: 0 },
        viewport: { once: true, margin: '-40px' },
        transition: { duration: 0.35, ease: 'easeOut' as const },
      };

  return (
    <m.div
      className="absolute w-56 -translate-x-1/2 text-center"
      style={{
        left: `${position * 100}%`,
        [isAbove ? 'bottom' : 'top']: `calc(50% + ${offsetPx}px)`,
      }}
      {...motionProps}
    >
      {/* Hand-drawn-style connector to the rule (design-brief §6 MarginNote
          device) — purely decorative. Its length matches `offsetPx`, so a
          caption stacked into a further-out lane gets a visibly longer
          connector rather than looking disconnected from the rule. */}
      <svg
        aria-hidden="true"
        width="2"
        height={offsetPx}
        viewBox={`0 0 2 ${offsetPx}`}
        className={`mx-auto text-marker-700/50 ${isAbove ? 'mb-1 rotate-[1.5deg]' : 'mt-1 -rotate-[1.5deg] rotate-180'}`}
      >
        <line x1="1" y1="0" x2="1" y2={offsetPx} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{TONE_LABEL[phase.tone]}</p>
      <p className="text-sm italic leading-snug text-ink">{phase.narrative}</p>
    </m.div>
  );
}

/* ---------------------------------------------------------------------- */
/* Mobile: vertical rule, inline flow captions                             */
/* ---------------------------------------------------------------------- */

function MobileTimeline({
  scaffold,
  phases,
  progress,
  reduced,
}: {
  scaffold: TimelineScaffold;
  phases: ProcessPhase[];
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  // Interleave ticks, gaps, and phases into one date-ordered flow so a
  // phase caption reads directly after the commit(s) it's describing
  // (spec §2.2: "Mobile: inline below their anchor... never a separate tab
  // stop") and a gap's duration is stamped in the same honest position it
  // occupies on the desktop rule, not silently dropped on mobile.
  type Row =
    | { position: number; kind: 'tick'; tick: TimelineTick }
    | { position: number; kind: 'phase'; phase: ProcessPhase }
    | { position: number; kind: 'gap'; gap: { position: number; days: number } };
  const rows: Row[] = [
    ...scaffold.ticks.map((tick): Row => ({ position: tick.position, kind: 'tick', tick })),
    ...phases.map((phase): Row => ({ position: phaseAnchorPosition(phase, scaffold), kind: 'phase', phase })),
    ...scaffold.gaps.map((gap): Row => ({ position: gap.position, kind: 'gap', gap })),
  ].sort((a, b) => a.position - b.position);

  return (
    <div className="relative pl-8 lg:hidden">
      <div className="pointer-events-none absolute inset-y-0 left-[15px] w-px" aria-hidden="true">
        <TimelineRule axis="y" progress={progress} reduced={reduced} />
      </div>

      <div className="flex flex-col gap-4">
        {rows.map((row, index) => {
          if (row.kind === 'tick') {
            return <MobileTickRow key={`tick-${row.tick.date}-${index}`} tick={row.tick} />;
          }
          if (row.kind === 'gap') {
            return <MobileGapRow key={`gap-${row.gap.position}`} gap={row.gap} />;
          }
          return <MobilePhaseRow key={`phase-${row.phase.from}-${row.phase.title}`} phase={row.phase} />;
        })}
        {scaffold.isOpenEnded && (
          <p className="relative font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
            <span aria-hidden="true" className="absolute -left-8 top-1 h-2 w-2 rounded-full border-2 border-ink/40" />
            → still open
          </p>
        )}
      </div>
    </div>
  );
}

// Always rendered, no motion — same reasoning as `GapLabel`: the tick date
// is real text a reader needs to read, so it never sits behind a
// scroll-driven `opacity` that starts at (or freezes at) 0.
function MobileTickRow({ tick }: { tick: TimelineTick }) {
  return (
    <p className="relative font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
      <span
        aria-hidden="true"
        className={`absolute -left-8 top-1 h-2 w-2 rounded-full ${tick.isCleanupSweep ? 'bg-marker-700' : 'bg-ink'}`}
      />
      {tick.date}
      <CommitCountBadge count={tick.count} />
      {tick.isCleanupSweep && <SweepFlag />}
    </p>
  );
}

/** The mobile-flow equivalent of `GapLabel` — a plain flow row (no absolute
 * positioning needed; the vertical rail is already reading order), so a
 * ≥14-day silence gets its duration stamped on mobile exactly as it does on
 * the desktop rule, not silently dropped. Always rendered, no motion — same
 * reasoning as `GapLabel`/`MobileTickRow` above. */
function MobileGapRow({ gap }: { gap: { position: number; days: number } }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{gap.days} days of silence</p>
  );
}

function MobilePhaseRow({ phase }: { phase: ProcessPhase }) {
  const prefersReducedMotion = useReducedMotion();
  const motionProps = prefersReducedMotion
    ? { initial: { y: 0 }, whileInView: { y: 0 }, viewport: { once: true } }
    : {
        initial: { y: 16 },
        whileInView: { y: 0 },
        viewport: { once: true, margin: '-40px' },
        transition: { duration: 0.35, ease: 'easeOut' as const },
      };

  return (
    <m.div className="pl-1" {...motionProps}>
      <p className="mb-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{TONE_LABEL[phase.tone]}</p>
      <p className="text-sm italic leading-snug text-ink">{phase.narrative}</p>
    </m.div>
  );
}

/* ---------------------------------------------------------------------- */
/* The mandatory accessible/fact-check disclosure                          */
/* ---------------------------------------------------------------------- */

function CommitLog({ commits, isOpenEnded }: { commits: CommitBurst[]; isOpenEnded: boolean }) {
  const sorted = [...commits].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  return (
    <details className="group rounded-sm border border-hairline bg-paper-raised">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 font-mono text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="transition-transform duration-150 ease-out group-open:rotate-90">
          →
        </span>
        Show the commit log
      </summary>
      <div className="border-t border-hairline px-4 py-3">
        <ul className="flex flex-col gap-1.5 font-mono text-sm text-ink">
          {sorted.map((commit) => (
            <li key={commit.date}>
              {commit.date} · {commit.count} commit{commit.count === 1 ? '' : 's'}
              {commit.isCleanupSweep && ' · cleanup sweep'}
              {commit.commitUrl && (
                <>
                  {' · '}
                  <a href={commit.commitUrl} target="_blank" rel="noreferrer" className="text-marker-700 hover:underline">
                    view commit →
                  </a>
                </>
              )}
            </li>
          ))}
          {isOpenEnded && <li className="text-ink-muted">→ still open, as of today</li>}
        </ul>
      </div>
    </details>
  );
}
