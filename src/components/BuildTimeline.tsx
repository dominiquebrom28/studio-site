import { useRef } from 'react';
import { m, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import type { CommitBurst, ProcessPhase, Project } from '@/content/schemas';
import {
  buildTimelineScaffold,
  numberPhasesChronologically,
  phaseAnchorPosition,
  type NumberedPhase,
  type TimelineScaffold,
  type TimelineTick,
} from '@/lib/timeline';

/**
 * `BuildTimeline` (docs/project-page-v2.md §2.2) — the process
 * visualization centrepiece. The scaffold (commit dates/counts/gaps) is
 * always recorded (roman, `aria-hidden` graphic); phase narratives are the
 * studio's interpretive read (italic, real in-flow text, never hidden).
 *
 * LAYOUT, deliberate deviation from spec §2.2 (2026-08-06, ported from the
 * abandoned team/2026-07-19-project-page-v2 tail — see
 * docs/buildmode-tail-assessment.md §5a): §2.2 originally called for phase
 * captions positioned around the desktop rule, alternating above/below with
 * `MarginNote` connectors. That produced real, measured, character-level
 * text overlap on `/projects/mensapp` and `/projects/studio-site` — both
 * have 5 phases clustered early in a long date domain, and N
 * absolutely-positioned, fixed-width caption boxes anchored to N
 * arbitrarily close points on one rule has no correct general packing
 * solution; every additional clustered phase makes it worse.
 *
 * So: the rule keeps every commit-scaffold detail (`TimelineRule`, tick
 * dots, gap labels, the "still open" terminus) exactly as it was — that IS
 * the honest visualization and none of it overlaps. Small numbered markers
 * on the rule (`DesktopPhaseNumberMarker`) now replace phase captions
 * there; the narratives themselves moved into an ordered list in normal
 * document flow below the rule (`DesktopPhaseListItem`), each item carrying
 * the same number as its rule marker. A flow list cannot overlap,
 * structurally, at any phase count or clustering — trading the spec's
 * alternating-captions composition (a genuinely nicer look on evenly-spread
 * phases, which none of today's six projects have) for a layout that's
 * always readable. `docs/project-page-v2.md` §2.2 has been amended to
 * describe this layout.
 *
 * Two sibling presentations of the SAME data still exist for mobile vs.
 * desktop — a `lg:hidden` vertical flow (ticks + captions in normal reading
 * order, one DOM location) and a `hidden lg:block` rule-plus-list (a second
 * DOM location). Exactly one is ever visible/in the accessibility tree at a
 * given viewport width (the other is `display: none`, fully removed from
 * it — not merely visually hidden) — the same standard "responsive
 * duplicate content" pattern the codebase already uses for the
 * mobile/desktop meta blocks in ProjectDetail.tsx. No content is read
 * twice by assistive tech; this is presentational duplication, not an
 * accessibility violation.
 *
 * The `<details>` commit-log disclosure below is rendered once (not
 * duplicated per breakpoint) — it's the accessibility floor AND Dom's
 * fact-check surface (spec §2.2), independent of which presentation is
 * showing.
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
/* Desktop: the rule (unchanged, honest visualization) + an ordered list   */
/* of phase narratives in normal flow beneath it — see the deviation note  */
/* on `BuildTimeline` above for why this replaced alternating captions.    */
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
  // The entire "layout" a phase needs now: a chronological number, nothing
  // more — see `numberPhasesChronologically`'s doc comment in
  // `src/lib/timeline.ts` for why there's no side/lane/height/clearance
  // math here anymore.
  const numberedPhases = numberPhasesChronologically(phases, scaffold);

  return (
    // `mb-6`: without it the `<ol>` below butts directly against
    // `CommitLog`'s `<details>` at 0px — measured via a real Chromium
    // render at 1280px, not the docs/buildmode-tail-assessment.md §4
    // measurement (that one compared against unported `main`'s old
    // `pt-[22rem] pb-[22rem]` caption box, whose own padding happened to
    // supply this clearance; it doesn't carry over to this box, which no
    // longer needs project-dependent padding for caption height at all).
    // Deliberately a plain container margin, not a special case on
    // `CommitLog` itself — section-to-section spacing is this component's
    // job, not the disclosure's.
    <div className="mb-6 hidden lg:block">
      {/* The rule graphic — proportional positions, ticks, burst-count
          badges, gap labels, the cleanup-sweep flag, and now a small
          numbered marker per phase, pairing it to its list item below.
          Nothing here needs project-dependent clearance any more (phase
          text no longer lives in this box), so the vertical padding is a
          small fixed constant, sized only for this graphic's own
          decorative elements. The extra `pr-24` reserves room for the
          "still open" terminus label so it never bleeds past the column's
          right edge. */}
      <div className="relative mb-8 py-9 pr-24">
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
          {numberedPhases.map((numberedPhase) => (
            <DesktopPhaseNumberMarker key={numberedPhase.number} numberedPhase={numberedPhase} />
          ))}
        </div>
      </div>

      {/* Real content — one list item per phase, in the SAME chronological
          order and carrying the SAME number as its rule marker above. An
          `<ol>` in normal document flow cannot overlap, at any phase count
          or clustering. */}
      <ol className="flex flex-col gap-5">
        {numberedPhases.map((numberedPhase) => (
          <DesktopPhaseListItem key={`${numberedPhase.phase.from}-${numberedPhase.phase.title}`} numberedPhase={numberedPhase} />
        ))}
      </ol>
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

/** Decorative-only (`aria-hidden`) — the visual pointer from a rule
 * position to its matching numbered list item below. The number itself is
 * real content only in `DesktopPhaseListItem`; this is purely a "look
 * here" marker, same reasoning as the tick dots and gap labels it sits
 * alongside. Deliberately distinct in shape/size from a plain commit-burst
 * tick dot so it doesn't read as just another commit. */
function DesktopPhaseNumberMarker({ numberedPhase }: { numberedPhase: NumberedPhase }) {
  return (
    <span
      className="absolute top-1/2 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-marker-700/60 bg-paper font-mono text-[9px] font-semibold leading-none text-marker-700"
      style={{ left: `${numberedPhase.position * 100}%` }}
    >
      {numberedPhase.number}
    </span>
  );
}

/** One phase's real content, in the ordered list beneath the rule — never
 * overlaps anything, regardless of how tightly its phases cluster on the
 * rule above, because it's normal document flow. Carries the same number
 * as its `DesktopPhaseNumberMarker`, its real date range, its tone label,
 * and the narrative itself. */
function DesktopPhaseListItem({ numberedPhase }: { numberedPhase: NumberedPhase }) {
  const { phase, number } = numberedPhase;
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
    <m.li className="flex gap-3" {...motionProps}>
      {/* `aria-hidden`: the `<ol>`/`<li>` pairing already gives assistive
          tech this item's ordinal position ("N of TOTAL") — a second,
          redundant spoken "1" here would double up, not clarify. */}
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-marker-700/60 bg-paper font-mono text-[10px] font-semibold leading-none text-marker-700"
      >
        {number}
      </span>
      <div>
        <p className="mb-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
          {phase.to && phase.to !== phase.from ? `${phase.from} – ${phase.to}` : phase.from} · {TONE_LABEL[phase.tone]}
        </p>
        <p className="text-sm italic leading-snug text-ink">{phase.narrative}</p>
      </div>
    </m.li>
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
