import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import type { CommitBurst, ProcessPhase, Project } from '@/content/schemas';
import { buildTimelineScaffold, positionForDate, type TimelineScaffold, type TimelineTick } from '@/lib/timeline';

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
  // specific "framer" feeling Dom named: the rule advances AND reverses
  // with scroll direction. Always called (rules-of-hooks) even under
  // reduced motion; its output is simply never read into a style value in
  // that branch (see `drawStyle` below), which is cheaper and safer than
  // conditionally skipping the hook.
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

function phaseAnchorPosition(phase: ProcessPhase, scaffold: TimelineScaffold): number {
  const fromPos = positionForDate(phase.from, scaffold);
  if (!phase.to) return fromPos;
  const toPos = positionForDate(phase.to, scaffold);
  return (fromPos + toPos) / 2;
}

/** Shared reveal-on-draw values for a single tick/gap/phase, gated to how
 * far the (scroll-linked, or instantly-complete under reduced motion) rule
 * has drawn past its position. Always calls the same two `useTransform`
 * hooks regardless of `reduced` — only the CONSUMED style differs. */
function useRevealAtPosition(progress: MotionValue<number>, position: number, reduced: boolean) {
  const start = Math.max(position - 0.035, 0);
  const opacity = useTransform(progress, [start, position], [0, 1]);
  const scale = useTransform(progress, [start, position], [0.6, 1]);
  return reduced ? { opacity: 1, scale: 1 } : { opacity, scale };
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
  const ruleStyle = reduced ? { scaleX: 1 } : { scaleX: progress };

  return (
    <div className="relative mb-6 hidden pt-24 pb-24 lg:block" aria-hidden={false}>
      {/* Decorative scaffold — rule, ticks, connectors. Real content (phase
          captions) lives outside this aria-hidden wrapper below. */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2" aria-hidden="true">
        <motion.div className="h-px w-full origin-left bg-ink/30" style={ruleStyle} />
        {scaffold.ticks.map((tick) => (
          <DesktopTickDot key={tick.date} tick={tick} progress={progress} reduced={reduced} />
        ))}
        {scaffold.isOpenEnded && (
          <span
            className="absolute top-1/2 -translate-y-1/2 translate-x-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted"
            style={{ left: '100%' }}
          >
            → still open
          </span>
        )}
        {scaffold.gaps.map((gap) => (
          <GapLabel key={gap.position} gap={gap} progress={progress} reduced={reduced} axis="x" />
        ))}
      </div>

      {/* Real content — phase captions, alternating above (even index) /
          below (odd index) the rule, connected by a decorative aria-hidden
          SVG line (the design-brief §6 `MarginNote` connector device). */}
      {phases.map((phase, index) => (
        <DesktopPhaseCaption key={`${phase.from}-${phase.title}`} phase={phase} index={index} scaffold={scaffold} />
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
    <motion.div
      className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center"
      style={{ left: `${tick.position * 100}%`, opacity: reveal.opacity, scale: reveal.scale }}
    >
      <span
        className={`rounded-full border-2 border-paper ${tick.isCleanupSweep ? 'bg-marker-700' : 'bg-ink'}`}
        style={{ width: size, height: size }}
      />
    </motion.div>
  );
}

function GapLabel({
  gap,
  progress,
  reduced,
  axis,
}: {
  gap: { position: number; days: number };
  progress: MotionValue<number>;
  reduced: boolean;
  axis: 'x' | 'y';
}) {
  const reveal = useRevealAtPosition(progress, gap.position, reduced);
  const positionStyle = axis === 'x' ? { left: `${gap.position * 100}%` } : { top: `${gap.position * 100}%` };

  return (
    <motion.span
      className={`absolute whitespace-nowrap font-mono text-[11px] text-ink-muted ${
        axis === 'x' ? 'top-4 -translate-x-1/2' : 'left-8 -translate-y-1/2'
      }`}
      style={{ ...positionStyle, opacity: reveal.opacity }}
      transition={reduced ? undefined : { duration: 0.5, delay: 0.15 }}
    >
      {gap.days} days
    </motion.span>
  );
}

function DesktopPhaseCaption({
  phase,
  index,
  scaffold,
}: {
  phase: ProcessPhase;
  index: number;
  scaffold: TimelineScaffold;
}) {
  const prefersReducedMotion = useReducedMotion();
  const position = phaseAnchorPosition(phase, scaffold);
  const above = index % 2 === 0;

  const motionProps = prefersReducedMotion
    ? { initial: { opacity: 1, y: 0 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } }
    : {
        initial: { opacity: 0, y: above ? 16 : -16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-40px' },
        transition: { duration: 0.35, ease: 'easeOut' as const },
      };

  return (
    <motion.div
      className={`absolute w-56 -translate-x-1/2 text-center ${above ? 'bottom-[calc(50%+28px)]' : 'top-[calc(50%+28px)]'}`}
      style={{ left: `${position * 100}%` }}
      {...motionProps}
    >
      {/* Hand-drawn-style connector to the rule (design-brief §6 MarginNote
          device) — purely decorative. */}
      <svg
        aria-hidden="true"
        width="2"
        height="28"
        viewBox="0 0 2 28"
        className={`mx-auto text-marker-700/50 ${above ? 'mb-1 rotate-[1.5deg]' : 'mt-1 -rotate-[1.5deg] rotate-180'}`}
      >
        <line x1="1" y1="0" x2="1" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{TONE_LABEL[phase.tone]}</p>
      <p className="text-sm italic leading-snug text-ink">{phase.narrative}</p>
    </motion.div>
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
  const ruleStyle = reduced ? { scaleY: 1 } : { scaleY: progress };

  // Interleave ticks and phases into one date-ordered flow so a phase
  // caption reads directly after the commit(s) it's describing (spec §2.2:
  // "Mobile: inline below their anchor... never a separate tab stop").
  type Row = { position: number; kind: 'tick'; tick: TimelineTick } | { position: number; kind: 'phase'; phase: ProcessPhase };
  const rows: Row[] = [
    ...scaffold.ticks.map((tick): Row => ({ position: tick.position, kind: 'tick', tick })),
    ...phases.map((phase): Row => ({ position: phaseAnchorPosition(phase, scaffold), kind: 'phase', phase })),
  ].sort((a, b) => a.position - b.position);

  return (
    <div className="relative pl-8 lg:hidden">
      <div className="pointer-events-none absolute inset-y-0 left-[15px] w-px" aria-hidden="true">
        <motion.div className="h-full w-px origin-top bg-ink/30" style={ruleStyle} />
      </div>

      <div className="flex flex-col gap-4">
        {rows.map((row, index) =>
          row.kind === 'tick' ? (
            <MobileTickRow key={`tick-${row.tick.date}-${index}`} tick={row.tick} progress={progress} reduced={reduced} />
          ) : (
            <MobilePhaseRow key={`phase-${row.phase.from}-${row.phase.title}`} phase={row.phase} />
          ),
        )}
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

function MobileTickRow({
  tick,
  progress,
  reduced,
}: {
  tick: TimelineTick;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const reveal = useRevealAtPosition(progress, tick.position, reduced);

  return (
    <motion.p
      className="relative font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted"
      style={{ opacity: reveal.opacity }}
    >
      <span
        aria-hidden="true"
        className={`absolute -left-8 top-1 h-2 w-2 rounded-full ${tick.isCleanupSweep ? 'bg-marker-700' : 'bg-ink'}`}
      />
      {tick.date}
      <CommitCountBadge count={tick.count} />
      {tick.isCleanupSweep && <SweepFlag />}
    </motion.p>
  );
}

function MobilePhaseRow({ phase }: { phase: ProcessPhase }) {
  const prefersReducedMotion = useReducedMotion();
  const motionProps = prefersReducedMotion
    ? { initial: { opacity: 1, y: 0 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } }
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-40px' },
        transition: { duration: 0.35, ease: 'easeOut' as const },
      };

  return (
    <motion.div className="pl-1" {...motionProps}>
      <p className="mb-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{TONE_LABEL[phase.tone]}</p>
      <p className="text-sm italic leading-snug text-ink">{phase.narrative}</p>
    </motion.div>
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
