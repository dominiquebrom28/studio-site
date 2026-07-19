import { motion, useReducedMotion } from 'framer-motion';

/**
 * `SingleSittingStamp` (docs/project-page-v2.md §2.4/§7) — the entire
 * Process section for the single-sitting template (currently only Chart
 * Token Playground). Reserved for projects where a timeline is LITERALLY
 * impossible (one commit, nothing to draw a scaffold on) — `template` is a
 * human-set frontmatter flag, never an auto-computed commit-count
 * threshold (Portfolio/PizzaParty have 4-5 real commits and get the full
 * `BuildTimeline` instead, even though they're also single-afternoon builds).
 *
 * Visual: same index-card corner language as the projects-index empty-state
 * stamp (radius-sm, `shadow-card`, rotated -2deg) — a big mono numeral, the
 * label "COMMIT," and one honest logged line beneath in roman. Where
 * file-timestamp evidence exists (`sessionsNote`), it renders as a small
 * annex line explicitly labeled as a weaker, different source — never
 * merged into the same visual language as a real commit tick.
 */
export function SingleSittingStamp({
  commitDate,
  repoCreatedDate,
  sessionsNote,
}: {
  commitDate: string;
  repoCreatedDate?: string;
  sessionsNote?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  const motionProps = prefersReducedMotion
    ? { initial: { scale: 1, rotate: -2 }, whileInView: { scale: 1, rotate: -2 }, viewport: { once: true } }
    : {
        initial: { scale: 1.1, rotate: 0 },
        whileInView: { scale: 1, rotate: -2 },
        viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as const },
      };

  return (
    <motion.div
      className="mx-auto w-fit rounded-sm border border-hairline bg-paper-raised px-8 py-6 text-center shadow-[var(--shadow-card)]"
      {...motionProps}
    >
      <p className="font-mono text-6xl font-semibold leading-none text-ink">1</p>
      <p className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">Commit</p>

      <p className="mt-4 text-sm text-ink">
        Committed <span className="font-semibold">{commitDate}</span>
        {repoCreatedDate && repoCreatedDate !== commitDate && <> — repo created {repoCreatedDate}</>}.
      </p>

      {sessionsNote && (
        <p className="mt-3 border-t border-hairline pt-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
          {sessionsNote} — from file timestamps, not commits
        </p>
      )}
    </motion.div>
  );
}
