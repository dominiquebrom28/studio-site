import { Link } from 'react-router-dom';
import type { Project } from '@/content';
import { statusLabel, statusToneClass } from '@/content/status';
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
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
            {project.date.slice(0, 4)}
          </span>
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
