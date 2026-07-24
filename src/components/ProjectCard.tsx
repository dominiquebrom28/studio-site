import { Link } from 'react-router-dom';
import type { Project } from '@/content';
import { statusLabel, statusToneClass } from '@/content/status';
import { soloBuildLabel } from '@/content/soloBuild';
import { Chip } from './ui/Badge';

export function ProjectCard({
  project,
  headingLevel = 3,
}: {
  project: Project;
  /** Correct semantic heading level for this card's context — see .card-title
   * comment in index.css for why this must vary by call site (WCAG heading order). */
  headingLevel?: 2 | 3;
}) {
  const visibleStack = project.stack.slice(0, 4);
  const extra = project.stack.length - visibleStack.length;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <Link
      to={`/projects/${project.slug}`}
      className="group relative block rounded-sm border border-hairline bg-paper-raised shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-150 ease-out hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 active:shadow-[var(--shadow-card-active)] active:translate-y-px motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0"
    >
      <div className="aspect-[16/10] overflow-hidden rounded-t-sm bg-paper">
        {project.cover ? (
          <img
            src={project.cover}
            alt={`${project.title} cover`}
            className="h-full w-full object-cover transition-transform duration-150 ease-out group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-xs uppercase tracking-[0.06em] text-ink-muted">
            No cover yet
          </div>
        )}
      </div>
      <div className="p-4">
        {/* Eyebrow row (design-brief §3 card pattern: mono label(s) before
            the headline). `flex-wrap` so the solo-build tag — the longest
            item here — drops to its own line on narrow cards instead of
            overflowing or forcing a horizontal scroll (BACKLOG P1
            positioning-disambiguation: this must survive a 320px card with
            zero layout breakage, not just the widest grid column). */}
        <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* Gated on `project.soloBuild`, driven by content frontmatter —
                never a hard-coded slug list (see src/content/soloBuild.ts).
                Reuses the exact wording that already shipped on the detail
                page's hero (`ProjectHero`) so a reader sees one consistent
                claim in both places. */}
            {project.soloBuild && <Chip>{soloBuildLabel(project.template)}</Chip>}
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
              {project.date.slice(0, 4)}
            </span>
          </div>
          <span className={`font-mono text-[11px] font-semibold uppercase tracking-[0.06em] ${statusToneClass[project.status]}`}>
            ● {statusLabel[project.status]}
          </span>
        </div>
        <Heading className="card-title mb-1">{project.title}</Heading>
        <p className="mb-3 line-clamp-2 text-sm text-ink-muted">{project.summary}</p>
        <div className="flex flex-wrap gap-1.5">
          {visibleStack.map((tech) => (
            <Chip key={tech}>{tech}</Chip>
          ))}
          {extra > 0 && <Chip>+{extra}</Chip>}
        </div>
      </div>
    </Link>
  );
}
