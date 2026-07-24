import { useRef } from 'react';
import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import type { Project } from '@/content';
import { Chip } from './ui/Badge';
import { statusLabel, statusToneClass } from '@/content/status';
import { soloBuildLabel } from '@/content/soloBuild';

const BACK_EASE = [0.34, 1.56, 0.64, 1] as const;
const SETTLE_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * `ProjectHero` (docs/project-page-v2.md §6/§7) — the cover/H1/status/stack/
 * links markup, shared by both templates so hero motion lives in exactly
 * one place. Renders the single `<h1>` for the page.
 *
 * Non-negotiable (spec §5.3, §3.1), and NOT just for the cover image:
 * nothing in this component ever animates `opacity` — every entrance here
 * (eyebrow row, status/date, H1, stack chips, cover) moves only
 * `scale`/`translateY`/`rotate`. `initial` is applied synchronously as an
 * inline style by Framer Motion the moment this mounts (no rAF/timer
 * required to observe it) — so if `initial` ever sets `opacity: 0`, that IS
 * the frozen-forever state under throttled/suspended rAF, not a transient
 * one. Every un-animated starting state below is the exact same readable
 * content the animated end state is, just at a different scale/position/
 * rotation — nothing is `opacity: 0` anywhere in this file (see the
 * top-level non-negotiables in the task brief).
 */
export function ProjectHero({ project }: { project: Project }) {
  const prefersReducedMotion = useReducedMotion();
  const coverWrapperRef = useRef<HTMLDivElement>(null);

  // Continuous, scroll-linked parallax (spec §5.2 "Hero cover parallax") —
  // 0.15-0.2x scroll, clamped ±40px. Disabled entirely under reduced motion
  // (the wrapper just never receives a transform).
  const { scrollY } = useScroll();
  const parallaxRaw = useTransform(scrollY, (v) => v * 0.175);
  const parallaxY = useTransform(parallaxRaw, (v) => Math.max(-40, Math.min(40, v)));

  const eyebrowLabel = soloBuildLabel(project.template);

  const eyebrowMotion = prefersReducedMotion
    ? { initial: { y: 0 }, animate: { y: 0 } }
    : { initial: { y: 16 }, animate: { y: 0 }, transition: { duration: 0.35, ease: 'easeOut' as const } };

  const titleMotion = prefersReducedMotion
    ? { initial: { y: 0 }, animate: { y: 0 } }
    : {
        initial: { y: 16 },
        animate: { y: 0 },
        transition: { duration: 0.35, ease: 'easeOut' as const, delay: 0.04 },
      };

  function stampMotion(index: number) {
    if (prefersReducedMotion) {
      return { initial: { scale: 1, rotate: -2 }, animate: { scale: 1, rotate: -2 } };
    }
    return {
      initial: { scale: 1.15, rotate: -6 },
      animate: { scale: 1, rotate: -2 },
      transition: { duration: 0.35, ease: BACK_EASE, delay: index * 0.04 },
    };
  }

  return (
    <div className="mb-10">
      <m.div className="mb-3 flex flex-wrap items-center gap-2" {...eyebrowMotion}>
        {/* Gated on `project.soloBuild` (BACKLOG P1 positioning-disambiguation)
            — this chip used to be unconditional page furniture, true only
            because every project that existed happened to be solo work. A
            team-built project must not inherit this claim. */}
        {project.soloBuild && (
          <m.span
            {...stampMotion(0)}
            className="inline-flex items-center rounded-full border border-hairline bg-paper-raised px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted"
          >
            {eyebrowLabel}
          </m.span>
        )}
        <m.span
          {...stampMotion(1)}
          className={`font-mono text-[11px] font-semibold uppercase tracking-[0.06em] ${statusToneClass[project.status]}`}
        >
          ● {statusLabel[project.status]}
        </m.span>
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{project.date}</span>
      </m.div>

      <m.h1 className="mb-4" {...titleMotion}>
        {project.title}
      </m.h1>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {project.stack.map((tech, index) => (
          <m.span key={tech} {...stampMotion(index + 2)}>
            <Chip>{tech}</Chip>
          </m.span>
        ))}
      </div>

      {(project.repo || project.liveUrl) && (
        <div className="mb-6 flex flex-wrap gap-x-5 gap-y-1">
          {project.repo && (
            <a
              href={project.repo}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center font-mono text-sm text-marker-700 hover:underline"
            >
              Repository →
            </a>
          )}
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center font-mono text-sm text-marker-700 hover:underline"
            >
              Live →
            </a>
          )}
        </div>
      )}

      <div ref={coverWrapperRef} className="aspect-[16/9] w-full overflow-hidden rounded-sm bg-paper-raised">
        <m.div className="h-full w-full" style={prefersReducedMotion ? undefined : { y: parallaxY }}>
          {project.cover ? (
            <m.img
              src={project.cover}
              alt={`${project.title} cover`}
              className="h-full w-full object-cover"
              // Likely the page's LCP element — never lazy, high fetch
              // priority so it never contends with the (lazy) media gallery.
              fetchPriority="high"
              initial={prefersReducedMotion ? { scale: 1, y: 0 } : { scale: 1.04, y: 4 }}
              animate={{ scale: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.7, ease: SETTLE_EASE }}
            />
          ) : (
            <m.div
              className="flex h-full w-full items-center justify-center font-mono text-xs uppercase tracking-[0.06em] text-ink-muted"
              initial={prefersReducedMotion ? { scale: 1, y: 0 } : { scale: 1.04, y: 4 }}
              animate={{ scale: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.7, ease: SETTLE_EASE }}
            >
              Dom&rsquo;s AI Studio — no cover yet
            </m.div>
          )}
        </m.div>
      </div>
    </div>
  );
}
